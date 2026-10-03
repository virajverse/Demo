// Analytics Manager - Track demo usage and performance
const fs = require('fs');
const path = require('path');

class AnalyticsManager {
    constructor() {
        this.dataDir = path.join(__dirname, '..', '.analytics');
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    getDataFilePath(demoName) {
        return path.join(this.dataDir, `${demoName}.json`);
    }

    loadDemoData(demoName) {
        const filePath = this.getDataFilePath(demoName);
        if (!fs.existsSync(filePath)) {
            return {
                demoName,
                totalVisits: 0,
                uniqueVisitors: new Set(),
                visits: [],
                responseTime: [],
                firstVisit: null,
                lastVisit: null
            };
        }

        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Convert unique visitors array back to Set
            data.uniqueVisitors = new Set(data.uniqueVisitors || []);
            return data;
        } catch (err) {
            console.error(`Failed to load analytics for ${demoName}:`, err);
            return {
                demoName,
                totalVisits: 0,
                uniqueVisitors: new Set(),
                visits: [],
                responseTime: [],
                firstVisit: null,
                lastVisit: null
            };
        }
    }

    saveDemoData(demoName, data) {
        const filePath = this.getDataFilePath(demoName);
        try {
            // Convert Set to array for JSON serialization
            const saveData = {
                ...data,
                uniqueVisitors: Array.from(data.uniqueVisitors)
            };
            fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2), 'utf8');
        } catch (err) {
            console.error(`Failed to save analytics for ${demoName}:`, err);
        }
    }

    // Track a visit
    trackVisit(demoName, visitorIP, userAgent, responseTime = null) {
        const data = this.loadDemoData(demoName);

        const now = new Date().toISOString();

        // Update counters
        data.totalVisits++;
        data.uniqueVisitors.add(visitorIP);

        // Record visit
        data.visits.push({
            timestamp: now,
            ip: this.anonymizeIP(visitorIP),
            userAgent: userAgent || 'Unknown',
            responseTime: responseTime
        });

        // Track response time
        if (responseTime !== null) {
            data.responseTime.push({
                timestamp: now,
                duration: responseTime
            });
        }

        // Update first/last visit
        if (!data.firstVisit) {
            data.firstVisit = now;
        }
        data.lastVisit = now;

        // Limit history to last 1000 visits
        if (data.visits.length > 1000) {
            data.visits = data.visits.slice(-1000);
        }

        if (data.responseTime.length > 1000) {
            data.responseTime = data.responseTime.slice(-1000);
        }

        this.saveDemoData(demoName, data);
    }

    // Anonymize IP for privacy (keep first 3 octets)
    anonymizeIP(ip) {
        if (!ip) return 'Unknown';
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
        }
        return ip; // IPv6 or other format
    }

    // Get analytics summary
    getAnalytics(demoName) {
        const data = this.loadDemoData(demoName);

        // Calculate stats
        const avgResponseTime = data.responseTime.length > 0
            ? data.responseTime.reduce((sum, r) => sum + r.duration, 0) / data.responseTime.length
            : 0;

        // Group visits by date
        const visitsByDate = {};
        data.visits.forEach(visit => {
            const date = visit.timestamp.split('T')[0];
            visitsByDate[date] = (visitsByDate[date] || 0) + 1;
        });

        // Group visits by hour (last 24 hours)
        const visitsByHour = Array(24).fill(0);
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        data.visits.forEach(visit => {
            const visitTime = new Date(visit.timestamp);
            if (visitTime >= last24h) {
                const hour = visitTime.getHours();
                visitsByHour[hour]++;
            }
        });

        // Browser stats
        const browsers = {};
        data.visits.forEach(visit => {
            const ua = visit.userAgent || 'Unknown';
            let browser = 'Other';

            if (ua.includes('Chrome')) browser = 'Chrome';
            else if (ua.includes('Firefox')) browser = 'Firefox';
            else if (ua.includes('Safari')) browser = 'Safari';
            else if (ua.includes('Edge')) browser = 'Edge';

            browsers[browser] = (browsers[browser] || 0) + 1;
        });

        return {
            demoName,
            totalVisits: data.totalVisits,
            uniqueVisitors: data.uniqueVisitors.size,
            firstVisit: data.firstVisit,
            lastVisit: data.lastVisit,
            avgResponseTime: Math.round(avgResponseTime),
            visitsByDate,
            visitsByHour,
            browsers,
            recentVisits: data.visits.slice(-10).reverse() // Last 10 visits
        };
    }

    // Get analytics for all demos
    getAllAnalytics() {
        const result = {};

        if (!fs.existsSync(this.dataDir)) {
            return result;
        }

        const files = fs.readdirSync(this.dataDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const demoName = file.replace('.json', '');
                result[demoName] = this.getAnalytics(demoName);
            }
        });

        return result;
    }

    // Reset analytics for a demo
    resetAnalytics(demoName) {
        const filePath = this.getDataFilePath(demoName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    // Export to CSV
    exportToCSV(demoName) {
        const data = this.loadDemoData(demoName);

        let csv = 'Timestamp,IP,User Agent,Response Time (ms)\n';

        data.visits.forEach(visit => {
            const responseTime = visit.responseTime !== null ? visit.responseTime : 'N/A';
            csv += `"${visit.timestamp}","${visit.ip}","${visit.userAgent}",${responseTime}\n`;
        });

        return csv;
    }

    // Get top demos by visits
    getTopDemos(limit = 10) {
        const allAnalytics = this.getAllAnalytics();
        const demos = Object.values(allAnalytics);

        demos.sort((a, b) => b.totalVisits - a.totalVisits);

        return demos.slice(0, limit);
    }
}

module.exports = new AnalyticsManager();
