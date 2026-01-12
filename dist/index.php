<?php
/**
 * Taliyo Technologies - Demo Hub
 * Premium showcase for independent demo websites
 */
session_start();

// Handle demo unlocking
if (isset($_GET['unlock'])) {
    $demoToUnlock = $_GET['unlock'];
    // Verify it exists in the demos folder
    if (is_dir(__DIR__ . '/demos/' . $demoToUnlock)) {
        // Vercel Stateless Fix: Use Cookies instead of Session
        // Cookie name: access_DemoName, Value: true, Expires: 1 hour
        $cookieName = "access_" . md5($demoToUnlock); // MD5 for safe cookie names
        setcookie($cookieName, "granted", [
            'expires' => time() + 3600,
            'path' => '/',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        
        header("Location: /demos/" . $demoToUnlock . "/");
        exit;
    }
}

// Scan for demos
$demos = [];
$demosDir = __DIR__ . '/demos';
if (is_dir($demosDir)) {
    $folders = array_diff(scandir($demosDir), array('..', '.'));
    foreach ($folders as $folder) {
        if (is_dir($demosDir . '/' . $folder)) {
            // Clean up name: Replace hyphens and underscores with spaces
            $name = str_replace(['-', '_'], ' ', $folder);
            $name = ucwords(strtolower($name));
            
            // Determine tier and tech
            $tier = 'Standard';
            $tech = 'HTML / CSS / JS';
            $color = 'var(--primary)';

            if (stripos($folder, 'starter') !== false) {
                $tier = 'Starter';
                $color = '#94a3b8';
            } elseif (stripos($folder, 'professional') !== false) {
                $tier = 'Professional';
                $color = '#6366f1';
            } elseif (stripos($folder, 'business') !== false) {
                $tier = 'Business';
                $color = '#10b981';
            }
            
            // Try to find a thumbnail
            $thumb = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426'; // Default
            if (file_exists($demosDir . '/' . $folder . '/thumb.jpg')) {
                $thumb = 'demos/' . $folder . '/thumb.jpg';
            }
            
            $demos[] = [
                'id' => $folder,
                'name' => $name,
                'thumbnail' => $thumb,
                'tech' => $tech,
                'tier' => $tier,
                'color' => $color
            ];
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Demo Hub | Taliyo Technologies</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --bg: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --text: #f8fafc;
            --text-dim: #94a3b8;
            --accent: #10b981;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.6;
            overflow-x: hidden;
            background-image: 
                radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 100% 100%, rgba(16, 185, 129, 0.1) 0%, transparent 50%);
            min-height: 100vh;
        }

        header {
            padding: 4rem 2rem 2rem;
            text-align: center;
            max-width: 1000px;
            margin: 0 auto;
        }

        .logo {
            font-size: 1.2rem;
            font-weight: 800;
            letter-spacing: 2px;
            color: var(--primary);
            text-transform: uppercase;
            margin-bottom: 1rem;
            display: inline-block;
        }

        h1 {
            font-size: 3.5rem;
            font-weight: 800;
            margin-bottom: 1.5rem;
            letter-spacing: -1px;
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        p.subtitle {
            font-size: 1.2rem;
            color: var(--text-dim);
            max-width: 600px;
            margin: 0 auto 3rem;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .demo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 2rem;
        }

        .demo-card {
            background: var(--card-bg);
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            backdrop-filter: blur(10px);
        }

        .demo-card:hover {
            transform: translateY(-10px);
            border-color: var(--primary);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.2);
        }

        .demo-thumb {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .demo-info {
            padding: 1.5rem;
        }

        .demo-info h3 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            color: #fff;
        }

        .demo-info p {
            color: var(--text-dim);
            font-size: 0.9rem;
            margin-bottom: 1.5rem;
        }

        .demo-tech {
            display: inline-block;
            padding: 0.2rem 0.8rem;
            background: rgba(99, 102, 241, 0.1);
            color: var(--primary);
            border-radius: 50px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }

        .view-btn {
            display: inline-block;
            width: 100%;
            padding: 0.8rem;
            background: var(--primary);
            color: white;
            text-align: center;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            transition: background 0.3s;
        }

        .view-btn:hover {
            background: var(--primary-dark);
        }

        .empty-state {
            text-align: center;
            padding: 5rem;
            color: var(--text-dim);
        }

        footer {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--text-dim);
            font-size: 0.9rem;
        }

        /* Glassmorphism background blur */
        .blob {
            position: absolute;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
            z-index: -1;
            filter: blur(50px);
        }

        .blob-1 { top: -100px; left: -100px; }
        .blob-2 { bottom: -100px; right: -100px; }

        @media (max-width: 768px) {
            h1 { font-size: 2.5rem; }
            .demo-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>

    <?php
    // Configuration
    $HUB_PASSWORD = "admin"; // CHANGE THIS PASSWORD
    $BYPASS_KEY = "taliyo-secret-access"; // Use ?auth=taliyo-secret-access to bypass
    
    // Handle Login Logic
    if (isset($_GET['auth']) && $_GET['auth'] === $BYPASS_KEY) {
        $_SESSION['hub_authenticated'] = true;
    }
    
    if (isset($_POST['hub_password'])) {
        if ($_POST['hub_password'] === $HUB_PASSWORD) {
            $_SESSION['hub_authenticated'] = true;
            header("Location: /"); // Clear post data
            exit;
        } else {
            $error_msg = "Incorrect Password";
        }
    }
    
    // If NOT Authenticated, Show Login Screen
    if (!isset($_SESSION['hub_authenticated']) || $_SESSION['hub_authenticated'] !== true):
    ?>
    
    <div class="container" style="display: flex; height: 100vh; align-items: center; justify-content: center; flex-direction: column;">
        <div class="demo-card" style="padding: 3rem; text-align: center; max-width: 400px; width: 100%;">
            <div class="logo">Taliyo Technologies</div>
            <h2 style="margin-bottom: 2rem;">Hub Access</h2>
            
            <?php if(isset($error_msg)): ?>
                <div style="background: rgba(220, 38, 38, 0.2); color: #f87171; padding: 0.5rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.9rem;">
                    <?php echo $error_msg; ?>
                </div>
            <?php endif; ?>
            
            <form method="POST">
                <input type="password" name="hub_password" placeholder="Enter Access Password" required 
                       style="width: 100%; padding: 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; margin-bottom: 1.5rem; outline: none; font-family: inherit;">
                <button type="submit" class="view-btn" style="border: none; cursor: pointer;">Unlock Dashboard</button>
            </form>
            <p style="margin-top: 2rem; font-size: 0.8rem; color: var(--text-dim);">Restricted access for authorized personnel only.</p>
        </div>
    </div>
    
    <?php else: ?>
    <!-- Authenticated Content -->

    <header>
        <div class="logo">Taliyo Technologies</div>
        <h1>Project Showcase</h1>
        <p class="subtitle">Experience our latest digital innovations in specialized, sandboxed environments.</p>
    </header>

    <main class="container">
        <?php if (empty($demos)): ?>
            <div class="empty-state">
                <p>No demos available at the moment. Check back soon!</p>
            </div>
        <?php else: ?>
            <div class="demo-grid">
                <?php foreach ($demos as $demo): ?>
                <div class="demo-card">
                    <img src="<?php echo htmlspecialchars($demo['thumbnail']); ?>" alt="<?php echo htmlspecialchars($demo['name']); ?>" class="demo-thumb">
                    <div class="demo-info">
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                            <span class="demo-tech"><?php echo htmlspecialchars($demo['tech']); ?></span>
                            <span class="demo-tech" style="background: <?php echo $demo['color']; ?>22; color: <?php echo $demo['color']; ?>; border: 1px solid <?php echo $demo['color']; ?>44;">
                                <?php echo htmlspecialchars($demo['tier']); ?>
                            </span>
                        </div>
                        <h3><?php echo htmlspecialchars($demo['name']); ?></h3>
                        <p>Fully independent application with isolated environment and secure routing.</p>
                        <a href="?unlock=<?php echo urlencode($demo['id']); ?>" class="view-btn" style="background: <?php echo $demo['color']; ?>;">Launch Demo Instance</a>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </main>
    <?php endif; ?>

    <footer>
        <p>&copy; <?php echo date('Y'); ?> Taliyo Technologies. All Rights Reserved.</p>
        <p style="margin-top: 0.5rem; font-size: 0.8rem; opacity: 0.5;">Powered by Advanced Routing & Sandboxing Technology</p>
    </footer>
    <script src="/advanced-protection.js"></script>
</body>
</html>
