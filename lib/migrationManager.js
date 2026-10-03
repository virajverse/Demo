/**
 * Database Migration Manager (Priority 5)
 * Manages database schema versions and auto-applies migrations
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

// Ensure migrations directory exists
if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

class MigrationManager {
    /**
     * Initialize migration tracking table
     */
    static async init() {
        try {
            db.run(`
                CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    migration_name TEXT UNIQUE NOT NULL,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'pending'
                )
            `);
            console.log('[Migration] Tracking table initialized');
        } catch (err) {
            console.error('[Migration] Failed to initialize table:', err);
        }
    }

    /**
     * Get applied migrations
     */
    static async getAppliedMigrations() {
        return new Promise((resolve, reject) => {
            db.all(`SELECT migration_name FROM ${MIGRATIONS_TABLE} WHERE status = 'applied' ORDER BY applied_at`, 
                (err, rows) => {
                    if (err) reject(err);
                    resolve((rows || []).map(r => r.migration_name));
                }
            );
        });
    }

    /**
     * Get pending migrations
     */
    static async getPendingMigrations() {
        const applied = await this.getAppliedMigrations();
        const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.js'));
        return files.filter(f => !applied.includes(f));
    }

    /**
     * Run a single migration
     */
    static async runMigration(filename) {
        return new Promise((resolve, reject) => {
            try {
                const migrationPath = path.join(MIGRATIONS_DIR, filename);
                const migration = require(migrationPath);

                if (!migration.up) {
                    reject(new Error(`Migration ${filename} missing up() function`));
                    return;
                }

                migration.up(db, (err) => {
                    if (err) {
                        db.run(`
                            INSERT INTO ${MIGRATIONS_TABLE} (migration_name, status)
                            VALUES (?, 'failed')
                        `, [filename]);
                        reject(err);
                    } else {
                        db.run(`
                            INSERT INTO ${MIGRATIONS_TABLE} (migration_name, status)
                            VALUES (?, 'applied')
                        `, [filename], (err) => {
                            if (err) reject(err);
                            else {
                                console.log(`[Migration] ✓ Applied: ${filename}`);
                                resolve();
                            }
                        });
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Run all pending migrations
     */
    static async runAll() {
        try {
            await this.init();
            const pending = await this.getPendingMigrations();

            if (pending.length === 0) {
                console.log('[Migration] No pending migrations');
                return;
            }

            console.log(`[Migration] Running ${pending.length} migration(s)...`);

            for (const migration of pending) {
                try {
                    await this.runMigration(migration);
                } catch (err) {
                    console.error(`[Migration] Error in ${migration}:`, err);
                    throw err;
                }
            }

            console.log('[Migration] All migrations completed successfully');
        } catch (err) {
            console.error('[Migration] Failed:', err);
            throw err;
        }
    }

    /**
     * Create a new migration file template
     */
    static createMigrationFile(name) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `${timestamp}_${name}.js`;
        const filepath = path.join(MIGRATIONS_DIR, filename);

        const template = `/**
 * Migration: ${name}
 */

module.exports = {
    up: (db, callback) => {
        // Write your migration logic here
        // Example: db.run('ALTER TABLE users ADD COLUMN new_field TEXT', callback);
        callback();
    },
    down: (db, callback) => {
        // Write rollback logic here
        callback();
    }
};
`;

        fs.writeFileSync(filepath, template);
        console.log(`[Migration] Created: ${filename}`);
        return filename;
    }

    /**
     * Get migration status
     */
    static async status() {
        await this.init();
        const applied = await this.getAppliedMigrations();
        const pending = await this.getPendingMigrations();

        console.log('\n=== Migration Status ===');
        console.log(`Applied: ${applied.length}`);
        applied.forEach(m => console.log(`  ✓ ${m}`));
        console.log(`\nPending: ${pending.length}`);
        pending.forEach(m => console.log(`  ⏳ ${m}`));
    }
}

module.exports = MigrationManager;
