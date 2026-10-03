// Health Check & Auto-Restart Manager
const http = require('http');
const EventEmitter = require('events');

class HealthMonitor extends EventEmitter {
    constructor(demoManager) {
        super();
        this.demoManager = demoManager;
        this.healthStatus = new Map(); // demoName -> { status, lastCheck, failCount }
        this.CHECK_INTERVAL = 30 * 1000; // 30 seconds
        this.MAX_FAIL_COUNT = 3;
        this.RESTART_COOLDOWN = 60 * 1000; // 1 minute cooldown between restarts
        this.lastRestartTime = new Map();
        this.monitorInterval = null;
    }

    start() {
        if (this.monitorInterval) return;

        console.log('[HealthMonitor] Starting health checks...');

        // Initial check
        this.checkAllDemos();

        // Periodic checks
        this.monitorInterval = setInterval(() => {
            this.checkAllDemos();
        }, this.CHECK_INTERVAL);
    }

    stop() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            console.log('[HealthMonitor] Stopped health checks');
        }
    }

    async checkAllDemos() {
        const running = this.demoManager.getAllRunning();

        for (const [demoName, info] of Object.entries(running)) {
            await this.checkDemo(demoName, info.port);
        }
    }

    async checkDemo(demoName, port) {
        const healthy = await this.ping(port);
        const status = this.healthStatus.get(demoName) || {
            status: 'unknown',
            lastCheck: null,
            failCount: 0,
            consecutiveSuccess: 0
        };

        status.lastCheck = new Date();

        if (healthy) {
            status.status = 'healthy';
            status.failCount = 0;
            status.consecutiveSuccess++;

            // Emit recovery event if it was previously unhealthy
            if (status.consecutiveSuccess === 1) {
                this.emit('recovered', { demoName, port });
                console.log(`[HealthMonitor] ✅ ${demoName} recovered`);
            }
        } else {
            status.failCount++;
            status.consecutiveSuccess = 0;
            status.status = 'unhealthy';

            console.log(`[HealthMonitor] ⚠️  ${demoName} failed health check (${status.failCount}/${this.MAX_FAIL_COUNT})`);

            // Emit warning
            this.emit('unhealthy', { demoName, port, failCount: status.failCount });

            // Auto-restart if max failures reached
            if (status.failCount >= this.MAX_FAIL_COUNT) {
                await this.handleFailure(demoName, port);
            }
        }

        this.healthStatus.set(demoName, status);
    }

    async ping(port, timeout = 5000) {
        return new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: port,
                path: '/',
                method: 'GET',
                timeout: timeout
            };

            const req = http.request(options, (res) => {
                resolve(res.statusCode >= 200 && res.statusCode < 500); // Consider 4xx as healthy
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });

            req.end();
        });
    }

    async handleFailure(demoName, port) {
        const lastRestart = this.lastRestartTime.get(demoName);
        const now = Date.now();

        // Check cooldown
        if (lastRestart && (now - lastRestart) < this.RESTART_COOLDOWN) {
            console.log(`[HealthMonitor] ⏳ ${demoName} in restart cooldown, skipping...`);
            return;
        }

        console.log(`[HealthMonitor] 🔄 Auto-restarting ${demoName}...`);

        try {
            // Stop the demo
            this.demoManager.stopDemo(demoName);

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Start the demo
            const result = await this.demoManager.startDemo(demoName);

            // Record restart time
            this.lastRestartTime.set(demoName, now);

            // Reset health status
            this.healthStatus.set(demoName, {
                status: 'restarted',
                lastCheck: new Date(),
                failCount: 0,
                consecutiveSuccess: 0
            });

            // Emit restart event
            this.emit('restarted', { demoName, result });

            console.log(`[HealthMonitor] ✅ ${demoName} restarted successfully on port ${result.port}`);

        } catch (err) {
            console.error(`[HealthMonitor] ❌ Failed to restart ${demoName}:`, err.message);

            // Emit failure event
            this.emit('restart-failed', { demoName, error: err.message });

            // Mark as critical
            const status = this.healthStatus.get(demoName);
            if (status) {
                status.status = 'critical';
                this.healthStatus.set(demoName, status);
            }
        }
    }

    getHealthStatus(demoName) {
        return this.healthStatus.get(demoName) || {
            status: 'unknown',
            lastCheck: null,
            failCount: 0
        };
    }

    getAllHealthStatus() {
        const result = {};
        for (const [name, status] of this.healthStatus.entries()) {
            result[name] = status;
        }
        return result;
    }

    // Manual health check for a specific demo
    async forceCheck(demoName) {
        const info = this.demoManager.getDemoInfo(demoName);
        if (!info) {
            throw new Error('Demo not running');
        }
        await this.checkDemo(demoName, info.port);
        return this.getHealthStatus(demoName);
    }

    // Reset health status (useful after manual intervention)
    resetHealth(demoName) {
        this.healthStatus.delete(demoName);
        this.lastRestartTime.delete(demoName);
    }
}

module.exports = HealthMonitor;
