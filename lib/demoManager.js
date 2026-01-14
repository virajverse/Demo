// Demo Process Manager
// Handles starting/stopping server-side demos

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DemoManager {
    constructor() {
        this.processes = new Map(); // demoName -> { port, process, type }
        this.nextPort = 4000;
        this.portFile = path.join(__dirname, '.demo-ports.json');
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

    detectDemoType(demoPath) {
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

        // Check for server.js or index.js
        if (fs.existsSync(path.join(demoPath, 'server.js'))) return 'nodejs';
        if (fs.existsSync(path.join(demoPath, 'index.js'))) return 'nodejs';

        return 'static';
    }

    async startDemo(demoName) {
        const demoPath = path.join(__dirname, '..', demoName);

        if (!fs.existsSync(demoPath)) {
            throw new Error('Demo not found');
        }

        const demoType = this.detectDemoType(demoPath);

        if (demoType === 'static') {
            // Static demos don't need a process
            return { type: 'static', url: `/${demoName}` };
        }

        // Check if already running
        if (this.processes.has(demoName)) {
            const info = this.processes.get(demoName);
            return { type: demoType, port: info.port, url: `http://localhost:${info.port}` };
        }

        // Allocate port
        const port = this.nextPort++;
        this.savePorts();

        // Load demo config as environment variables
        const configPath = path.join(demoPath, '.config.json');
        let envVars = { ...process.env, PORT: port };

        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                envVars = { ...envVars, ...config };
            } catch (err) {
                console.error('Failed to load demo config:', err);
            }
        }

        // Start the process
        let command, args;

        if (demoType === 'nextjs') {
            command = 'npm';
            args = ['run', 'dev', '--', '-p', port.toString()];
        } else {
            command = 'node';
            args = ['server.js']; // or index.js
        }

        const proc = spawn(command, args, {
            cwd: demoPath,
            env: envVars,
            stdio: 'pipe'
        });

        proc.stdout.on('data', (data) => {
            console.log(`[${demoName}] ${data.toString().trim()}`);
        });

        proc.stderr.on('data', (data) => {
            console.error(`[${demoName}] ERROR: ${data.toString().trim()}`);
        });

        proc.on('exit', (code) => {
            console.log(`[${demoName}] Process exited with code ${code}`);
            this.processes.delete(demoName);
        });

        this.processes.set(demoName, { port, process: proc, type: demoType });

        return { type: demoType, port, url: `http://localhost:${port}` };
    }

    stopDemo(demoName) {
        if (!this.processes.has(demoName)) {
            return false;
        }

        const info = this.processes.get(demoName);
        info.process.kill();
        this.processes.delete(demoName);
        return true;
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
        for (const [name, info] of this.processes.entries()) {
            info.process.kill();
        }
        this.processes.clear();
    }
}

module.exports = new DemoManager();
