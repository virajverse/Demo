/**
 * Database Backup Manager (Priority 5)
 * Handles automatic backups and maintenance
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');

const BACKUP_DIR = path.join(__dirname, '../database/backups');
const DB_FILE = path.join(__dirname, '../database/taliyo.db');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

class BackupManager {
    /**
     * Create a database backup
     */
    static backup(label = 'manual') {
        return new Promise((resolve, reject) => {
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const backupName = `backup_${label}_${timestamp}.db`;
                const backupPath = path.join(BACKUP_DIR, backupName);

                // Use SQL VACUUM to optimize and then backup
                db.run('VACUUM', (err) => {
                    if (err) {
                        console.warn('[Backup] VACUUM warning:', err);
                    }

                    // Copy database file
                    fs.copyFile(DB_FILE, backupPath, (err) => {
                        if (err) {
                            console.error('[Backup] Failed:', err);
                            reject(err);
                        } else {
                            const size = fs.statSync(backupPath).size;
                            console.log(`[Backup] ✓ Created: ${backupName} (${(size / 1024 / 1024).toFixed(2)} MB)`);
                            resolve(backupName);
                        }
                    });
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Get all backups with metadata
     */
    static listBackups() {
        try {
            const files = fs.readdirSync(BACKUP_DIR)
                .filter(f => f.startsWith('backup_'))
                .map(f => {
                    const filepath = path.join(BACKUP_DIR, f);
                    const stats = fs.statSync(filepath);
                    return {
                        name: f,
                        size: stats.size,
                        sizeHuman: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
                        created: stats.mtime
                    };
                })
                .sort((a, b) => b.created - a.created);

            return files;
        } catch (err) {
            console.error('[Backup] List failed:', err);
            return [];
        }
    }

    /**
     * Restore from backup
     */
    static restore(backupName) {
        return new Promise((resolve, reject) => {
            try {
                const backupPath = path.join(BACKUP_DIR, backupName);
                
                if (!fs.existsSync(backupPath)) {
                    reject(new Error(`Backup not found: ${backupName}`));
                    return;
                }

                // Close current database
                db.close((err) => {
                    if (err) console.warn('[Backup] Close warning:', err);

                    // Backup current DB first
                    const currentBackup = `${DB_FILE}.${Date.now()}.bak`;
                    if (fs.existsSync(DB_FILE)) {
                        fs.copyFileSync(DB_FILE, currentBackup);
                    }

                    // Restore
                    fs.copyFileSync(backupPath, DB_FILE);
                    
                    // Reopen database
                    const sqlite3 = require('sqlite3').verbose();
                    db.db = new sqlite3.Database(DB_FILE, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log(`[Backup] ✓ Restored: ${backupName}`);
                            resolve();
                        }
                    });
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Cleanup old backups (keep last N)
     */
    static cleanup(keepCount = 10) {
        try {
            const backups = this.listBackups();
            
            if (backups.length > keepCount) {
                const toDelete = backups.slice(keepCount);
                toDelete.forEach(backup => {
                    const filepath = path.join(BACKUP_DIR, backup.name);
                    fs.unlinkSync(filepath);
                    console.log(`[Backup] Deleted old: ${backup.name}`);
                });
            }
        } catch (err) {
            console.error('[Backup] Cleanup failed:', err);
        }
    }

    /**
     * Schedule automatic backups
     */
    static scheduleDaily() {
        // Run backup at 2 AM every day
        const now = new Date();
        const scheduledTime = new Date(now);
        scheduledTime.setHours(2, 0, 0, 0);

        // If already past 2 AM, schedule for tomorrow
        if (scheduledTime < now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const timeUntilBackup = scheduledTime - now;

        setTimeout(() => {
            console.log('[Backup] Running daily backup...');
            this.backup('daily').catch(err => console.error('[Backup] Daily failed:', err));
            this.cleanup(10);

            // Reschedule for next day
            setInterval(() => {
                this.backup('daily').catch(err => console.error('[Backup] Daily failed:', err));
                this.cleanup(10);
            }, 24 * 60 * 60 * 1000);
        }, timeUntilBackup);

        console.log(`[Backup] Daily backup scheduled for ${scheduledTime.toLocaleTimeString()}`);
    }

    /**
     * Get database statistics
     */
    static getStats() {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as users_count,
                    (SELECT COUNT(*) FROM demos) as demos_count,
                    (SELECT COUNT(*) FROM deployments) as deployments_count,
                    (SELECT COUNT(*) FROM webhooks) as webhooks_count,
                    (SELECT COUNT(*) FROM crm_leads) as leads_count,
                    (SELECT COUNT(*) FROM audit_log) as audit_events_count
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows?.[0] || {});
            });
        });
    }
}

module.exports = BackupManager;
