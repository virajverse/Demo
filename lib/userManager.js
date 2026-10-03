const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword, verifyPassword } = require('./crypto');
const db = require('./db');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function loadUsersJson() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error loading users:', err);
    }
    return {};
}

function saveUsersJson(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Error saving users:', err);
        throw err;
    }
}

async function migrateJsonToDb() {
    if (!db.isConnected()) return;
    const users = loadUsersJson();
    const existing = await db.all('SELECT email FROM users');
    if (existing.length > 0) return;

    for (const email of Object.keys(users)) {
        const user = users[email];
        await db.run(
            'INSERT OR REPLACE INTO users (email, password, fullName, role, teams, createdAt, deployments) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                user.email,
                user.password,
                user.fullName,
                user.role || 'user',
                JSON.stringify(user.teams || []),
                user.createdAt,
                JSON.stringify(user.deployments || [])
            ]
        );
    }
}

class UserManager {
    constructor() {
        this.users = loadUsersJson();
        this.sessions = {}; // token -> { userId, email, createdAt }

        if (db.isConnected()) {
            migrateJsonToDb().catch((err) => {
                console.warn('User migration to DB failed:', err.message);
            });
        }
    }

    async _getUserFromDb(email) {
        if (!db.isConnected()) return null;
        const row = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!row) return null;
        return {
            email: row.email,
            password: row.password,
            fullName: row.fullName,
            role: row.role || 'user',
            teams: JSON.parse(row.teams || '[]'),
            createdAt: row.createdAt,
            deployments: JSON.parse(row.deployments || '[]')
        };
    }

    async _saveUserToDb(user) {
        if (!db.isConnected()) return;
        await db.run(
            'INSERT OR REPLACE INTO users (email, password, fullName, role, teams, createdAt, deployments) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                user.email,
                user.password,
                user.fullName,
                user.role || 'user',
                JSON.stringify(user.teams || []),
                user.createdAt,
                JSON.stringify(user.deployments || [])
            ]
        );
    }

    async signup(email, password, fullName = '') {
        if (!email || !password) {
            throw new Error('Email and password required');
        }

        let role = 'user';
        if (db.isConnected()) {
            const existingUsers = await this.getAllUsers();
            if (existingUsers.length === 0) role = 'admin';
        } else if (Object.keys(this.users).length === 0) {
            role = 'admin';
        }

        if (db.isConnected()) {
            const existing = await this._getUserFromDb(email);
            if (existing) {
                throw new Error('User already exists');
            }
            const hashedPassword = hashPassword(password);
            const user = {
                email,
                password: hashedPassword,
                fullName: fullName || email.split('@')[0],
                role,
                teams: [],
                createdAt: new Date().toISOString(),
                deployments: []
            };
            await this._saveUserToDb(user);
            return { email, fullName: user.fullName, role };
        }

        if (this.users[email]) {
            throw new Error('User already exists');
        }

        const hashedPassword = hashPassword(password);
        this.users[email] = {
            email,
            password: hashedPassword,
            fullName: fullName || email.split('@')[0],
            role,
            teams: [],
            createdAt: new Date().toISOString(),
            deployments: []
        };

        saveUsersJson(this.users);
        return { email, fullName: this.users[email].fullName };
    }

    async login(email, password) {
        if (!email || !password) {
            throw new Error('Email and password required');
        }

        let user;
        if (db.isConnected()) {
            user = await this._getUserFromDb(email);
        } else {
            user = this.users[email];
        }

        if (!user) {
            throw new Error('User not found');
        }

        if (!verifyPassword(password, user.password)) {
            throw new Error('Invalid password');
        }

        const session = {
            token: generateToken(),
            email,
            fullName: user.fullName,
            role: user.role || 'user',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        this.sessions[session.token] = session;
        return session;
    }

    verifySession(token) {
        const session = this.sessions[token];
        if (!session) {
            return null;
        }

        if (new Date(session.expiresAt) < new Date()) {
            delete this.sessions[token];
            return null;
        }

        return session;
    }

    logout(token) {
        delete this.sessions[token];
    }

    async getUser(email) {
        if (db.isConnected()) {
            return this._getUserFromDb(email);
        }

        return this.users[email] || null;
    }

    async updateProfile(email, updates) {
        if (db.isConnected()) {
            const user = await this._getUserFromDb(email);
            if (!user) throw new Error('User not found');
            Object.assign(user, updates);
            await this._saveUserToDb(user);
            return user;
        }

        if (!this.users[email]) {
            throw new Error('User not found');
        }

        Object.assign(this.users[email], updates);
        saveUsersJson(this.users);
        return this.users[email];
    }

    async setRole(email, role) {
        if (!['user', 'manager', 'admin'].includes(role)) {
            throw new Error('Invalid role');
        }

        const user = await this.getUser(email);
        if (!user) throw new Error('User not found');

        return this.updateProfile(email, { role });
    }

    async addTeam(email, team) {
        const user = await this.getUser(email);
        if (!user) throw new Error('User not found');

        const teams = new Set(user.teams || []);
        teams.add(team);
        return this.updateProfile(email, { teams: Array.from(teams) });
    }

    async removeTeam(email, team) {
        const user = await this.getUser(email);
        if (!user) throw new Error('User not found');

        const teams = (user.teams || []).filter(t => t !== team);
        return this.updateProfile(email, { teams });
    }

    async addDeployment(email, deploymentId) {
        if (db.isConnected()) {
            const user = await this._getUserFromDb(email);
            if (!user) throw new Error('User not found');
            if (!user.deployments.includes(deploymentId)) {
                user.deployments.push(deploymentId);
                await this._saveUserToDb(user);
            }
            return;
        }

        if (!this.users[email]) {
            throw new Error('User not found');
        }

        if (!this.users[email].deployments.includes(deploymentId)) {
            this.users[email].deployments.push(deploymentId);
            saveUsersJson(this.users);
        }
    }

    async getUserDeployments(email) {
        if (db.isConnected()) {
            const user = await this._getUserFromDb(email);
            if (!user) throw new Error('User not found');
            return user.deployments || [];
        }

        if (!this.users[email]) {
            throw new Error('User not found');
        }

        return this.users[email].deployments || [];
    }

    async removeDeployment(email, deploymentId) {
        if (db.isConnected()) {
            const user = await this._getUserFromDb(email);
            if (!user) throw new Error('User not found');
            user.deployments = (user.deployments || []).filter(id => id !== deploymentId);
            await this._saveUserToDb(user);
            return;
        }

        if (!this.users[email]) {
            throw new Error('User not found');
        }

        this.users[email].deployments = (this.users[email].deployments || []).filter(id => id !== deploymentId);
        saveUsersJson(this.users);
    }

    async getAllUsers() {
        if (db.isConnected()) {
            const rows = await db.all('SELECT email, fullName, role, teams, createdAt, deployments FROM users');
            return rows.map((row) => ({
                email: row.email,
                fullName: row.fullName,
                role: row.role || 'user',
                teams: JSON.parse(row.teams || '[]'),
                createdAt: row.createdAt,
                deploymentCount: JSON.parse(row.deployments || '[]').length
            }));
        }

        return Object.values(this.users).map(user => ({
            email: user.email,
            fullName: user.fullName,
            role: user.role || 'user',
            teams: user.teams || [],
            createdAt: user.createdAt,
            deploymentCount: (user.deployments || []).length
        }));
    }

    clearAllSessions() {
        this.sessions = {};
    }
}

module.exports = new UserManager();
