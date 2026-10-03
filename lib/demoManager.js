// Demo Process Manager
// Handles starting/stopping server-side demos

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

class DemoManager {
    constructor() {
        this.processes = new Map(); // demoName -> { port, process, type }
        this.nextPort = 4000;
        this.portFile = path.join(__dirname, '.demo-ports.json');
        this.logs = new Map(); // demoName -> [] (Ring Buffer)
        this.loadPorts();
    }

    loadPorts() {
        try {
            if (fs.existsSync(this.portFile)) {
                const data = JSON.parse(fs.readFileSync(this.portFile, 'utf8'));
                this.nextPort = data.nextPort || 4000;
                // Don't restore processes on restart - they're dead anyway
            }
        } catch (err) {
            console.error('Failed to load port data:', err);
        }
    }

    savePorts() {
        try {
            fs.writeFileSync(this.portFile, JSON.stringify({ nextPort: this.nextPort }), 'utf8');
        } catch (err) {
            console.error('Failed to save port data:', err);
        }
    }

    async findFreePort(startPort) {
        return new Promise((resolve) => {
            const tryPort = (port) => {
                const server = net.createServer();
                server.unref();
                server.on('error', () => {
                    tryPort(port + 1);
                });
                server.listen(port, () => {
                    const { port: p } = server.address();
                    server.close(() => {
                        resolve(p);
                    });
                });
            };
            tryPort(startPort);
        });
    }

    detectDemoType(demoPath) {
        // Check for Next.js Standalone Build
        if (fs.existsSync(path.join(demoPath, 'standalone', 'server.js'))) {
            return 'nextjs-standalone';
        }

        // Check for package.json
        const packagePath = path.join(demoPath, 'package.json');
        if (fs.existsSync(packagePath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

                // Check for common server frameworks
                const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

                if (deps.next) return 'nextjs';
                if (deps.express || deps.koa || deps.fastify) return 'nodejs';
                if (pkg.scripts && pkg.scripts.start) return 'nodejs';
            } catch (err) {
                console.error('Error reading package.json:', err);
            }
        }

        // Check for Laravel framework
        if (fs.existsSync(path.join(demoPath, 'artisan'))) {
            return 'laravel';
        }

        // Check for PHP Web applications (Core PHP, WordPress, etc.)
        if (fs.existsSync(path.join(demoPath, 'public', 'index.php')) || fs.existsSync(path.join(demoPath, 'index.php'))) {
            return 'php';
        }

        // Check for Python apps (Flask, FastAPI, etc.)
        if (fs.existsSync(path.join(demoPath, 'app.py')) || fs.existsSync(path.join(demoPath, 'main.py'))) {
            return 'python';
        }

        // Check for server.js or index.js
        if (fs.existsSync(path.join(demoPath, 'server.js'))) return 'nodejs';
        if (fs.existsSync(path.join(demoPath, 'index.js'))) return 'nodejs';

        return 'static';
    }

    addLog(demoName, message, type = 'info') {
        if (!this.logs.has(demoName)) {
            this.logs.set(demoName, []);
        }
        const logEntry = {
            time: new Date().toISOString(),
            type,
            msg: message
        };
        const buffer = this.logs.get(demoName);
        buffer.push(logEntry);
        if (buffer.length > 200) buffer.shift(); // Keep last 200 lines
    }

    getDemoLogs(demoName) {
        return this.logs.get(demoName) || [];
    }



    // Locks to prevent duplicate start attempts
    startPromises = new Map();

    async startDemo(demoName) {
        // Return existing promise if already starting
        if (this.startPromises.has(demoName)) {
            this.addLog(demoName, 'Joining existing start process...', 'system');
            return this.startPromises.get(demoName);
        }

        const startPromise = (async () => {
            const demoPath = path.join(__dirname, '..', demoName);

            if (!fs.existsSync(demoPath)) {
                throw new Error('Demo not found');
            }

            const demoType = this.detectDemoType(demoPath);

            if (demoType === 'static') {
                return { type: 'static', url: `/${demoName}` };
            }

            // Check if already running
            if (this.processes.has(demoName)) {
                const info = this.processes.get(demoName);
                this.updateActivity(demoName);
                return { type: demoType, port: info.port, url: `http://localhost:${info.port}` };
            }

            this.addLog(demoName, 'Starting demo...', 'system');

            try {
                // Allocate Check Port
                const port = await this.findFreePort(this.nextPort);
                this.nextPort = port + 1;
                this.savePorts();

                // Safe isolated environment variables for child demo
                const configPath = path.join(demoPath, '.config.json');
                const envFilePath = path.join(demoPath, '.env');
                const envExamplePath = path.join(demoPath, '.env.example');

                // If Laravel and .env missing but .env.example exists, copy it
                if (demoType === 'laravel' && !fs.existsSync(envFilePath) && fs.existsSync(envExamplePath)) {
                    try {
                        fs.copyFileSync(envExamplePath, envFilePath);
                        this.addLog(demoName, 'Created .env from .env.example', 'system');
                    } catch (_) {}
                }

                let envVars = {
                    PORT: port.toString(),
                    NODE_ENV: 'production',
                    APP_ENV: 'production',
                    PATH: process.env.PATH || '',
                    SystemRoot: process.env.SystemRoot || '',
                    HOME: process.env.HOME || '',
                    USERPROFILE: process.env.USERPROFILE || '',
                    // Default database settings
                    DB_HOST: process.env.DEMO_DB_HOST || '127.0.0.1',
                    DB_PORT: process.env.DEMO_DB_PORT || '3306',
                    DB_USERNAME: process.env.DEMO_DB_USER || 'root',
                    DB_PASSWORD: process.env.DEMO_DB_PASSWORD || '',
                    // Default Redis settings
                    REDIS_HOST: process.env.DEMO_REDIS_HOST || '127.0.0.1',
                    REDIS_PORT: process.env.DEMO_REDIS_PORT || '6379',
                    REDIS_PASSWORD: process.env.DEMO_REDIS_PASSWORD || '',
                    REDIS_CLIENT: 'predis'
                };

                // Load custom .env file if present
                if (fs.existsSync(envFilePath)) {
                    try {
                        const envContent = fs.readFileSync(envFilePath, 'utf8');
                        envContent.split(/\r?\n/).forEach(line => {
                            const trimmed = line.trim();
                            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                                const idx = trimmed.indexOf('=');
                                const k = trimmed.slice(0, idx).trim();
                                let v = trimmed.slice(idx + 1).trim();
                                if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                                    v = v.slice(1, -1);
                                }
                                envVars[k] = v;
                            }
                        });
                        this.addLog(demoName, 'Loaded environment variables from .env', 'system');
                    } catch (err) {
                        this.addLog(demoName, `Error reading .env: ${err.message}`, 'error');
                    }
                }

                // Zero-Config Database for Laravel
                if (demoType === 'laravel') {
                    if (!envVars.APP_KEY || envVars.APP_KEY.trim() === '') {
                        const crypto = require('crypto');
                        envVars.APP_KEY = 'base64:' + crypto.randomBytes(32).toString('base64');
                    }
                    if (!envVars.DB_CONNECTION || envVars.DB_CONNECTION === 'sqlite') {
                        envVars.DB_CONNECTION = 'sqlite';
                        const dbDir = path.join(demoPath, 'database');
                        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
                        const sqliteFile = path.join(dbDir, 'database.sqlite');
                        if (!fs.existsSync(sqliteFile)) {
                            try { fs.writeFileSync(sqliteFile, ''); } catch (_) {}
                        }
                        envVars.DB_DATABASE = sqliteFile;
                    }
                }

                // Load .config.json overrides
                if (fs.existsSync(configPath)) {
                    try {
                        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        envVars = { ...envVars, ...config };
                    } catch (err) {
                        this.addLog(demoName, `Config Error: ${err.message}`, 'error');
                    }
                }

                // Auto-install missing dependencies if package.json or composer.json exist
                if (['nodejs', 'nextjs'].includes(demoType) && fs.existsSync(path.join(demoPath, 'package.json')) && !fs.existsSync(path.join(demoPath, 'node_modules'))) {
                    this.addLog(demoName, 'Installing Node dependencies (npm install)...', 'system');
                    try {
                        execSync('npm install --omit=dev --no-audit --no-fund', { cwd: demoPath, stdio: 'ignore', timeout: 120000 });
                        this.addLog(demoName, 'npm install completed.', 'system');
                    } catch (e) {
                        this.addLog(demoName, `npm install notice: ${e.message}`, 'error');
                    }
                }

                if ((demoType === 'laravel' || demoType === 'php') && fs.existsSync(path.join(demoPath, 'composer.json')) && !fs.existsSync(path.join(demoPath, 'vendor'))) {
                    this.addLog(demoName, 'Installing PHP dependencies (composer install)...', 'system');
                    try {
                        execSync('composer install --no-dev --no-interaction --quiet', { cwd: demoPath, stdio: 'ignore', timeout: 120000 });
                        this.addLog(demoName, 'composer install completed.', 'system');
                    } catch (e) {
                        this.addLog(demoName, `composer install notice: ${e.message}`, 'error');
                    }
                }

                // Prepare Command based on framework
                let command, args, runCwd = demoPath;

                if (demoType === 'laravel') {
                    command = 'php';
                    args = ['artisan', 'serve', `--port=${port}`, '--host=127.0.0.1'];
                } else if (demoType === 'php') {
                    command = 'php';
                    const hasPublic = fs.existsSync(path.join(demoPath, 'public', 'index.php'));
                    const docRoot = hasPublic ? 'public' : '.';
                    args = ['-S', `127.0.0.1:${port}`, '-t', docRoot];
                } else if (demoType === 'python') {
                    command = 'python';
                    const entry = fs.existsSync(path.join(demoPath, 'app.py')) ? 'app.py' : 'main.py';
                    args = [entry, '--port', port.toString()];
                } else if (demoType === 'nextjs') {
                    command = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
                    args = ['run', 'dev', '--', '-p', port.toString()];
                } else if (demoType === 'nextjs-standalone') {
                    command = /^win/.test(process.platform) ? 'node.exe' : 'node';
                    args = ['server.js'];
                    runCwd = path.join(demoPath, 'standalone');
                } else {
                    command = /^win/.test(process.platform) ? 'node.exe' : 'node';
                    args = ['server.js'];
                }

                this.addLog(demoName, `--- Spawning ${demoType} on port ${port} ---`, 'system');

                const isWin = /^win/.test(process.platform);
                const proc = spawn(command, args, { cwd: runCwd, env: envVars, stdio: 'pipe', shell: isWin });

                proc.stdout.on('data', d => {
                    const msg = d.toString().trim();
                    if (msg) { console.log(`[${demoName}] ${msg}`); this.addLog(demoName, msg, 'stdout'); }
                });

                proc.stderr.on('data', d => {
                    const msg = d.toString().trim();
                    if (msg) { console.error(`[${demoName}] ERR: ${msg}`); this.addLog(demoName, msg, 'stderr'); }
                });

                proc.on('exit', code => {
                    this.addLog(demoName, `Exited with code ${code}`, code === 0 ? 'system' : 'error');
                    this.processes.delete(demoName);
                    this.activity.delete(demoName);
                });

                this.processes.set(demoName, { port, process: proc, type: demoType });
                this.updateActivity(demoName);

                // Wait for port to be ready (Health Check)
                await this.waitForPort(port);

                if (!this.monitorInterval) {
                    this.monitorInterval = setInterval(() => this.monitor(), 60 * 1000);
                }

                return { type: demoType, port, url: `http://localhost:${port}` };
            } catch (err) {
                this.addLog(demoName, `Start Failed: ${err.message}`, 'error');
                throw err;
            }
        })();

        // Store promise
        this.startPromises.set(demoName, startPromise);

        // Clear promise on completion (success or fail)
        startPromise.finally(() => {
            this.startPromises.delete(demoName);
        });

        return startPromise;
    }

    async waitForPort(port, retries = 30) {
        for (let i = 0; i < retries; i++) {
            try {
                await new Promise((resolve, reject) => {
                    const socket = net.createConnection(port);
                    socket.on('connect', () => { socket.end(); resolve(); });
                    socket.on('error', reject);
                });
                return;
            } catch (e) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        throw new Error('Timeout waiting for port ' + port);
    }

    stopDemo(demoName) {
        if (!this.processes.has(demoName)) return false;
        this.addLog(demoName, 'Stopping demo...', 'system');
        const info = this.processes.get(demoName);
        // Force kill for windows sometimes needed, but try normal first
        try { process.kill(info.process.pid); } catch (e) { }
        try { info.process.kill(); } catch (e) { }
        this.processes.delete(demoName);
        this.activity.delete(demoName);
        return true;
    }

    // --- Auto-Stop Logic ---
    activity = new Map();
    TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes

    updateActivity(demoName) {
        if (this.processes.has(demoName)) {
            this.activity.set(demoName, Date.now());
        }
    }

    monitor() {
        const now = Date.now();
        for (const [name, lastActive] of this.activity.entries()) {
            if (now - lastActive > this.TIMEOUT_MS) {
                console.log(`[Auto-Stop] Stopping ${name} due to inactivity...`);
                this.addLog(name, 'Auto-stopping due to inactivity', 'system');
                this.stopDemo(name);
            }
        }
        if (this.processes.size === 0 && this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }


    getDemoInfo(demoName) {
        if (!this.processes.has(demoName)) {
            return null;
        }
        const info = this.processes.get(demoName);
        return { port: info.port, type: info.type, running: true };
    }

    getAllRunning() {
        const result = {};
        for (const [name, info] of this.processes.entries()) {
            result[name] = { port: info.port, type: info.type };
        }
        return result;
    }

    stopAll() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        for (const [name, info] of this.processes.entries()) {
            try { info.process.kill(); } catch (e) { }
        }
        this.processes.clear();
        this.activity.clear();
    }
    registerHeartbeat(name) { this.updateActivity(name); }
}



module.exports = new DemoManager();
