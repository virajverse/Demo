/**
 * Migration: Add API usage tracking for audit
 * 
 * This is an EXAMPLE migration template.
 * Copy and modify for your database schema changes.
 */

module.exports = {
    up: (db, callback) => {
        // Example: Add api_usage table
        const sql = `
            CREATE TABLE IF NOT EXISTS api_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint TEXT NOT NULL,
                method TEXT NOT NULL,
                user_email TEXT,
                status_code INTEGER,
                response_time_ms INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp);
            CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);
        `;
        
        db.exec(sql, callback);
    },
    
    down: (db, callback) => {
        // Rollback: Drop table if migration fails
        db.run('DROP TABLE IF EXISTS api_usage', callback);
    }
};
