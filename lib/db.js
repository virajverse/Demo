const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let db = null;
let connected = false;
let dbType = process.env.DB_TYPE || 'json';

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');

function connectSqlite() {
  try {
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.warn('SQLite connection error:', err.message);
        connected = false;
        return;
      }
      connected = true;
      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
          email TEXT PRIMARY KEY,
          password TEXT NOT NULL,
          fullName TEXT,
          role TEXT DEFAULT 'user',
          teams TEXT DEFAULT '[]',
          createdAt TEXT,
          deployments TEXT
        )`);

        // upgrade old users table schema safely when existing table lacks columns
        db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {});
        db.run(`ALTER TABLE users ADD COLUMN teams TEXT DEFAULT '[]'`, (err) => {});

        db.run(`CREATE TABLE IF NOT EXISTS deployments (
          id TEXT PRIMARY KEY,
          type TEXT,
          demoName TEXT,
          title TEXT,
          backendUrl TEXT,
          apiUrl TEXT,
          url TEXT,
          status TEXT,
          team TEXT DEFAULT NULL,
          createdAt TEXT,
          updatedAt TEXT
        )`);

        db.run(`ALTER TABLE deployments ADD COLUMN team TEXT DEFAULT NULL`, (err) => {});

        db.run(`CREATE TABLE IF NOT EXISTS custom_domains (
          deploymentId TEXT,
          domain TEXT,
          primaryDomain INTEGER,
          ssl INTEGER,
          sslExpiry TEXT,
          verified INTEGER,
          dnsRecords TEXT,
          createdAt TEXT,
          PRIMARY KEY (deploymentId, domain)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS webhooks (
          webhookId TEXT PRIMARY KEY,
          deploymentId TEXT,
          provider TEXT,
          repoUrl TEXT,
          secret TEXT,
          branches TEXT,
          createdAt TEXT,
          lastTriggered TEXT,
          enabled INTEGER
        )`);
      });
    });
  } catch (err) {
    console.warn('SQLite module not available:', err.message);
    connected = false;
  }
}

function init() {
  if (dbType.toLowerCase() === 'sqlite') {
    connectSqlite();
  } else {
    connected = false;
  }
}

function isConnected() {
  return connected;
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('No database connection'));
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('No database connection'));
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('No database connection'));
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function close() {
  if (db) {
    db.close();
    db = null;
    connected = false;
  }
}

init();

module.exports = { isConnected, run, get, all, close, dbType };