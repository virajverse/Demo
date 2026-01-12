<?php
/**
 * Taliyo Technologies - Demo Router
 * Securely routes requests to isolated demo folders
 * Handles paths with spaces and protects assets
 */
session_start();

// 1. Parse Path from REQUEST_URI to handle spaces securely
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = '/demos/';

// Decode URL to get the actual filesystem path characters
$requestPath = urldecode(parse_url($requestUri, PHP_URL_PATH));

// Check if request actually starts with our base path
if (strpos($requestPath, $basePath) !== 0) {
    // Should not happen due to .htaccess, but safety first
    include 'error.php';
    exit;
}

// Extract the relative path inside demos/ (e.g., "Folder Name/index.html")
$path = substr($requestPath, strlen($basePath));

if (empty($path)) {
    header("Location: ../index.php");
    exit;
}

// 2. Extract Demo Name
$parts = explode('/', ltrim($path, '/'));
$demoName = $parts[0];

// 3. Security Checks
// Prevent directory traversal
if (strpos($path, '..') !== false) {
    include 'error.php';
    exit;
}

// Block sensitive files (dotfiles, git, etc)
if (preg_match('/(^|\/)\./', $path)) {
    // Exception: Allow .htaccess ?? No, never.
    // Exception: Allow .well-known ?? Maybe.
    // For now, block all dotfiles like .env, .git
    http_response_code(403);
    echo "Forbidden";
    exit;
}

// Block README.md or other internal docs if desired (optional, but requested "Premium")
if (preg_match('/README\.md$/i', $path)) {
   // exit; // Uncomment to strict block
}

// 4. Access Control
$isPublicAsset = false;
$fileName = basename($path);

// Allow thumbnails to be loaded publicly for the Hub
if (strtolower($fileName) === 'thumb.jpg' || strtolower($fileName) === 'thumbnail.jpg') {
    $isPublicAsset = true;
}

if (!$isPublicAsset) {
    // Check for Access Cookie (Vercel Stateless Support)
    $cookieName = "access_" . md5($demoName);
    
    if (!isset($_COOKIE[$cookieName]) || $_COOKIE[$cookieName] !== 'granted') {
        // Not authorized
        include 'error.php';
        exit;
    }
}

// 5. Resolve File Path
$baseDemosDir = __DIR__ . '/demos/';
// Use realpath logic carefully. realpath() returns false if file doesn't exist.
$targetFile = $baseDemosDir . $path; // We verified traversal above with '..' check
$realBase = realpath($baseDemosDir);
$realTarget = realpath($targetFile);

// Security: Ensure the file is actually within the demos directory
if (!$realTarget || strpos($realTarget, $realBase) !== 0) {
    // File not found or escaped jail
    include 'error.php';
    exit;
}

// 6. Directory Handling (Trailing Slash Strategy)
if (is_dir($realTarget)) {
    // If URL doesn't end in slash, redirect (unless it looks like a file extension? No, trust is_dir)
    // We check $requestUri because $path strips query strings etc (handled by parse_url)
    $currentUrlPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (substr($currentUrlPath, -1) !== '/') {
        $queryString = $_SERVER['QUERY_STRING'];
        $newUrl = $currentUrlPath . '/' . ($queryString ? '?' . $queryString : '');
        header("Location: " . $newUrl);
        exit;
    }
    
    // Look for index file
    $foundIndex = false;
    foreach (['index.php', 'index.html', 'index.htm'] as $index) {
        if (file_exists($realTarget . DIRECTORY_SEPARATOR . $index)) {
            $realTarget .= DIRECTORY_SEPARATOR . $index;
            $foundIndex = true;
            break;
        }
    }
    if (!$foundIndex) {
        // Directory listing forbidden
        include 'error.php';
        exit;
    }
}

// 7. Serve Content
$extension = strtolower(pathinfo($realTarget, PATHINFO_EXTENSION));
$mimeTypes = [
    'html' => 'text/html',
    'htm'  => 'text/html',
    'php'  => 'text/html', // Will be executed
    'css'  => 'text/css',
    'js'   => 'application/javascript',
    'json' => 'application/json',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'gif'  => 'image/gif',
    'svg'  => 'image/svg+xml',
    'ico'  => 'image/x-icon',
    'pdf'  => 'application/pdf',
    'zip'  => 'application/zip',
    'woff' => 'font/woff',
    'woff2'=> 'font/woff2',
    'ttf'  => 'font/ttf',
    'otf'  => 'font/otf',
    'eot'  => 'application/vnd.ms-fontobject',
    'wav'  => 'audio/wav',
    'mp3'  => 'audio/mpeg',
    'mp4'  => 'video/mp4',
    'webm' => 'video/webm',
];

$contentType = $mimeTypes[$extension] ?? 'application/octet-stream';

if ($extension === 'php') {
    // Execute PHP
    // Important: Set CWD so relative includes work
    chdir(dirname($realTarget));
    
    // We DO NOT set Content-Type header for PHP, let the script decide (defaults to text/html usually)
    // But we might want to clean output buffer?
    include $realTarget;
} else {
    // Serve Static with Injection
    if ($extension === 'html' || $extension === 'htm') {
        // Read file content
        $content = file_get_contents($realTarget);
        
        // Inject Protection Script (if not already present to avoid duplicates)
        if (strpos($content, 'advanced-protection.js') === false) {
            $script = '<script src="/advanced-protection.js"></script>';
            // Attempt to inject before </body>
            if (strpos($content, '</body>') !== false) {
                $content = str_replace('</body>', $script . '</body>', $content);
            } else {
                // If no body tag, append to end
                $content .= $script;
            }
        }

        header("Content-Type: $contentType");
        // Remove Content-Length as we modified size
        // header("Content-Length: " . strlen($content)); 
        
        // Cache control
        header("Cache-Control: public, max-age=3600");
        
        echo $content;
    } else {
        // Standard binary/text serve
        header("Content-Type: $contentType");
        header("Content-Length: " . filesize($realTarget));
        
        // Cache control
        if (in_array($extension, ['css', 'js', 'jpg', 'jpeg', 'png', 'svg', 'woff', 'woff2'])) {
            header("Cache-Control: public, max-age=86400");
        } else {
            header("Cache-Control: no-cache, must-revalidate");
        }
        
        readfile($realTarget);
    }
}
