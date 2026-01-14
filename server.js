const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { spawn } = require('child_process');
const demoManager = require('./lib/demoManager');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Track running demo processes
const demoProcesses = new Map(); // demoName -> { port, process, type }
let nextDemoPort = 4000; // Start allocating ports from 4000

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Security Headers (Production)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Multer Setup for Zip Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Authentication Middleware
const authMiddleware = (req, res, next) => {
    const authCookie = req.cookies.auth;
    if (authCookie === process.env.SECRET_KEY) {
        next();
    } else {
        res.redirect('/admin/login.html');
    }
};

// API Middleware (returns JSON errors instead of redirects)
const apiAuthMiddleware = (req, res, next) => {
    const authCookie = req.cookies.auth;
    if (authCookie === process.env.SECRET_KEY) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- Routes ---

// Serve Redirect Logic Globally
app.use('/common', express.static(path.join(__dirname, 'common')));

// 1. Admin Login Page
app.get('/admin/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// 2. Admin Dashboard (Protected)
app.get('/admin', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});
app.get('/admin/dashboard.html', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// 3. Login API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        res.cookie('auth', process.env.SECRET_KEY, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Credentials' });
    }
});

// 4. Logout API
app.post('/api/logout', (req, res) => {
    res.clearCookie('auth');
    res.json({ success: true });
});

// 5. List Demos API
app.get('/api/demos', apiAuthMiddleware, (req, res) => {
    const items = fs.readdirSync(__dirname, { withFileTypes: true });
    const demos = items
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .filter(name => !['node_modules', 'uploads', 'admin', 'common', '.git', 'lib'].includes(name))
        .map(name => {
            try {
                const demoPath = path.join(__dirname, name);
                const type = demoManager.detectDemoType(demoPath);

                // Check for custom URL in .config.json
                let customUrl = null;
                const configPath = path.join(demoPath, '.config.json');
                if (fs.existsSync(configPath)) {
                    try {
                        const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        customUrl = conf.customUrl;
                    } catch (e) { }
                }

                return { name, type, customUrl };
            } catch (err) {
                console.error(`Error processing demo ${name}:`, err);
                return { name, type: 'error' };
            }
        });
    res.json({ demos });
});

// 5b. Public List Demos API
app.get('/api/public/demos', (req, res) => {
    const items = fs.readdirSync(__dirname, { withFileTypes: true });
    const demos = items
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .filter(name => !['node_modules', 'uploads', 'admin', 'common', '.git', 'lib'].includes(name))
        .map(name => {
            try {
                const demoPath = path.join(__dirname, name);
                const type = demoManager.detectDemoType(demoPath);
                let customUrl = null;
                const configPath = path.join(demoPath, '.config.json');
                if (fs.existsSync(configPath)) {
                    try {
                        const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        customUrl = conf.customUrl;
                    } catch (e) { }
                }
                return { name, type, customUrl };
            } catch (err) {
                return { name, type: 'error' };
            }
        });
    res.json({ demos });
});

// 6. Upload API
app.post('/api/upload', apiAuthMiddleware, upload.single('demoZip'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
        const zipPath = req.file.path;
        const zip = new AdmZip(zipPath);

        // Extract to named directory
        let safeName = path.parse(req.file.originalname).name;
        safeName = safeName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const targetDir = path.join(__dirname, safeName);

        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);

        zip.extractAllTo(targetDir, true);

        // Delete zip file after extraction
        fs.unlinkSync(zipPath);

        res.json({ success: true, message: 'Demo uploaded and extracted successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error unpacking zip file' });
    }
});

// 7. Delete Demo API
app.post('/api/delete', apiAuthMiddleware, (req, res) => {
    const { folderName } = req.body;

    // Basic safety check
    if (!folderName || ['node_modules', 'uploads', 'admin', 'common', 'server.js', '.env', 'package.json'].includes(folderName)) {
        return res.status(400).json({ success: false, message: 'Cannot delete restricted items' });
    }

    const targetPath = path.join(__dirname, folderName);

    if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Folder not found' });
    }
});

// 8. Get Demo Config API
app.get('/api/config/:demoName', (req, res) => {
    const { demoName } = req.params;
    const configPath = path.join(__dirname, demoName, '.config.json');

    // Check if demo exists
    const demoPath = path.join(__dirname, demoName);
    if (!fs.existsSync(demoPath) || !fs.lstatSync(demoPath).isDirectory()) {
        return res.status(404).json({ error: 'Demo not found' });
    }

    // Return config if exists, otherwise return empty object
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            res.json({ config });
        } catch (err) {
            res.json({ config: {} });
        }
    } else {
        res.json({ config: {} });
    }
});

// 9. Update Demo Config API (Admin Only)
app.post('/api/config/:demoName', apiAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    const { config } = req.body;

    const demoPath = path.join(__dirname, demoName);
    if (!fs.existsSync(demoPath) || !fs.lstatSync(demoPath).isDirectory()) {
        return res.status(404).json({ success: false, message: 'Demo not found' });
    }

    const configPath = path.join(demoPath, '.config.json');

    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to save config' });
    }
});

// 10. Start Demo (Admin Only)
app.post('/api/demo/start/:demoName', apiAuthMiddleware, async (req, res) => {
    const { demoName } = req.params;

    try {
        const result = await demoManager.startDemo(demoName);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 11. Stop Demo (Admin Only)
app.post('/api/demo/stop/:demoName', apiAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    const stopped = demoManager.stopDemo(demoName);

    if (stopped) {
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Demo not running' });
    }
});

// 12. Get Demo Status
app.get('/api/demo/status/:demoName', apiAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    const demoPath = path.join(__dirname, demoName);
    const demoType = demoManager.detectDemoType(demoPath);
    const info = demoManager.getDemoInfo(demoName);

    if (info) {
        res.json({ running: true, type: demoType, ...info });
    } else {
        res.json({ running: false, type: demoType });
    }
});

// 13. Get All Running Demos
app.get('/api/demo/running', apiAuthMiddleware, (req, res) => {
    const running = demoManager.getAllRunning();
    res.json({ demos: running });
});

// 14. Rename Demo API
app.post('/api/rename', apiAuthMiddleware, (req, res) => {
    const { oldName, newName } = req.body;

    // Safety checks
    if (!oldName || !newName) return res.status(400).json({ success: false, message: 'Invalid names' });
    if (['node_modules', 'uploads', 'admin', 'common', 'server.js', '.env', 'package.json', 'lib'].includes(newName)) {
        return res.status(400).json({ success: false, message: 'Restricted name' });
    }

    const oldPath = path.join(__dirname, oldName);
    const newPath = path.join(__dirname, newName);

    if (!fs.existsSync(oldPath)) return res.status(404).json({ success: false, message: 'Demo not found' });
    if (fs.existsSync(newPath)) return res.status(400).json({ success: false, message: 'Name already exists' });

    // Stop if running
    const wasRunning = demoManager.getDemoInfo(oldName);
    if (wasRunning) {
        demoManager.stopDemo(oldName);
    }

    try {
        fs.renameSync(oldPath, newPath);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Rename failed' });
    }
});

// Serve Admin Static Assets
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Middleware to inject Back Button into all Demo HTML files
app.use(async (req, res, next) => {
    if (req.method !== 'GET') return next();

    // Ignore API, Admin, and Landing Page
    if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path === '/' || req.path === '/index.html') return next();

    // Prevent directory traversal
    const safePath = path.normalize(req.path).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(__dirname, safePath);

    // Handle Directory Index
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    // Only process existing HTML files
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile() && (filePath.endsWith('.html') || filePath.endsWith('.htm'))) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');

            // Script to inject
            const injection = `
            <style>
                .taliyo-back-btn { position: fixed; top: 20px; left: 20px; z-index: 2147483647; width: 45px; height: 45px; background: #0f172a; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 4px 20px rgba(0,0,0,0.4); transition: all 0.2s ease; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
                .taliyo-back-btn:hover { transform: scale(1.1); background: #1e293b; }
                .taliyo-back-btn svg { width: 24px; height: 24px; stroke-width: 2.5; }
            </style>
            <a href="javascript:void(0)" onclick="const p=new URLSearchParams(window.location.search); window.location.href=p.get('return')||'/';" class="taliyo-back-btn" title="Back to Gallery">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </a>
            `;

            if (content.includes('</body>')) {
                content = content.replace('</body>', injection + '</body>');
            } else {
                content += injection;
            }

            res.send(content);
            return;
        } catch (err) { next(); }
    } else {
        next();
    }
});

// Serve All Other Static Files (Actual Demos + Landing Page)
app.use(express.static(__dirname));

// Only listen when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Admin Panel: http://localhost:${PORT}/admin`);
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    demoManager.stopAll();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down gracefully...');
    demoManager.stopAll();
    process.exit(0);
});

// Export for Vercel
module.exports = app;
