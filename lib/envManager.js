// Environment Variables Manager
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EnvManager {
    constructor() {
        this.ENCRYPTION_KEY = process.env.ENV_ENCRYPTION_KEY || 'default-32-char-encryption-key!!'; // Should be 32 chars
        this.ALGORITHM = 'aes-256-cbc';
    }

    // Get env file path for a demo
    getEnvFilePath(demoName) {
        return path.join(__dirname, '..', demoName, '.env');
    }

    // Get encrypted env config path
    getEnvConfigPath(demoName) {
        return path.join(__dirname, '..', demoName, '.env.config.json');
    }

    // Encrypt sensitive values
    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
            const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        } catch (err) {
            console.error('Encryption error:', err);
            return text; // Fallback to plain text
        }
    }

    // Decrypt sensitive values
    decrypt(text) {
        try {
            if (!text.includes(':')) return text;
            const parts = text.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
            const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (err) {
            console.error('Decryption error:', err);
            return text; // Fallback
        }
    }

    // Read environment variables for a demo
    getEnvVars(demoName) {
        const envPath = this.getEnvFilePath(demoName);
        const configPath = this.getEnvConfigPath(demoName);

        if (!fs.existsSync(envPath)) {
            return [];
        }

        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

        // Load encryption config
        let encryptedKeys = {};
        if (fs.existsSync(configPath)) {
            try {
                encryptedKeys = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (e) { }
        }

        const vars = [];
        lines.forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();

                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }

                vars.push({
                    key,
                    value,
                    encrypted: encryptedKeys[key] === true,
                    masked: encryptedKeys[key] === true // Mask in UI if encrypted
                });
            }
        });

        return vars;
    }

    // Save environment variables for a demo
    saveEnvVars(demoName, vars) {
        const envPath = this.getEnvFilePath(demoName);
        const configPath = this.getEnvConfigPath(demoName);

        let envContent = '# Environment Variables\n';
        envContent += `# Generated on ${new Date().toISOString()}\n\n`;

        const encryptedKeys = {};

        vars.forEach(({ key, value, encrypted }) => {
            if (!key) return;

            let finalValue = value;

            // Encrypt if marked as sensitive
            if (encrypted) {
                finalValue = this.encrypt(value);
                encryptedKeys[key] = true;
            }

            // Wrap in quotes if contains spaces
            if (finalValue.includes(' ')) {
                finalValue = `"${finalValue}"`;
            }

            envContent += `${key}=${finalValue}\n`;
        });

        // Save .env file
        fs.writeFileSync(envPath, envContent, 'utf8');

        // Save encryption config
        fs.writeFileSync(configPath, JSON.stringify(encryptedKeys, null, 2), 'utf8');

        return true;
    }

    // Get decrypted value for runtime use
    getDecryptedEnvVars(demoName) {
        const vars = this.getEnvVars(demoName);
        const decrypted = {};

        vars.forEach(({ key, value, encrypted }) => {
            decrypted[key] = encrypted ? this.decrypt(value) : value;
        });

        return decrypted;
    }

    // Delete a specific env var
    deleteEnvVar(demoName, keyToDelete) {
        const vars = this.getEnvVars(demoName);
        const filtered = vars.filter(v => v.key !== keyToDelete);
        return this.saveEnvVars(demoName, filtered);
    }

    // Import .env file
    importEnvFile(demoName, fileContent) {
        const lines = fileContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        const vars = [];

        lines.forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let key = match[1].trim();
                let value = match[2].trim();

                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }

                // Auto-detect sensitive keys
                const sensitivePatterns = ['key', 'secret', 'password', 'token', 'api'];
                const encrypted = sensitivePatterns.some(pattern =>
                    key.toLowerCase().includes(pattern)
                );

                vars.push({ key, value, encrypted });
            }
        });

        return this.saveEnvVars(demoName, vars);
    }

    // Export as downloadable .env file (decrypted)
    exportEnvFile(demoName) {
        const vars = this.getDecryptedEnvVars(demoName);
        let content = '# Environment Variables\n';
        content += `# Exported from ${demoName} on ${new Date().toISOString()}\n\n`;

        Object.entries(vars).forEach(([key, value]) => {
            const finalValue = value.includes(' ') ? `"${value}"` : value;
            content += `${key}=${finalValue}\n`;
        });

        return content;
    }
}

module.exports = new EnvManager();
