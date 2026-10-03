const path = require('path');
const { loadJSON, saveJSON, appendToFile } = require('./fileSystem');
const db = require('./db');

const stateFile = path.join(__dirname, '..', 'deployments.json');
const logDir = path.join(__dirname, '..', 'deployment-logs');

const loadState = () => loadJSON(stateFile, []);

const saveState = (state) => saveJSON(stateFile, state);

const appendLog = (id, message) => {
  const logPath = path.join(logDir, `${id}.log`);
  const line = `[${new Date().toISOString()}] ${message}`;
  appendToFile(logPath, line);
};

async function createDeployment({ type, demoName, title, backendUrl, apiUrl, status, team = null }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id,
    type,
    demoName,
    title: title || demoName,
    backendUrl: backendUrl || null,
    apiUrl: apiUrl || null,
    url: null,
    status: status || 'pending',
    team,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (db.isConnected()) {
    await db.run(
      `INSERT INTO deployments (id, type, demoName, title, backendUrl, apiUrl, url, status, team, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.type, record.demoName, record.title, record.backendUrl, record.apiUrl, record.url, record.status, record.team, record.createdAt, record.updatedAt]
    );
    appendLog(record.id, `Deployment created in DB: ${JSON.stringify(record)}`);
    return record;
  }

  const state = loadState();
  state.push(record);
  saveState(state);
  appendLog(id, `Deployment created: ${JSON.stringify(record)}`);
  return record;
}

async function updateDeployment(id, patch) {
  const now = new Date().toISOString();
  if (db.isConnected()) {
    const existing = await db.get('SELECT * FROM deployments WHERE id = ?', [id]);
    if (!existing) return null;
    const updates = {
      ...existing,
      ...patch,
      updatedAt: now
    };
    await db.run(
      `UPDATE deployments SET type = ?, demoName = ?, title = ?, backendUrl = ?, apiUrl = ?, url = ?, status = ?, team = ?, updatedAt = ? WHERE id = ?`,
      [updates.type, updates.demoName, updates.title, updates.backendUrl, updates.apiUrl, updates.url, updates.status, updates.team, updates.updatedAt, id]
    );
    if (patch.log) appendLog(id, patch.log);
    return updates;
  }

  const state = loadState();
  const idx = state.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  state[idx] = { ...state[idx], ...patch, updatedAt: now };
  saveState(state);
  if (patch.log) appendLog(id, patch.log);
  return state[idx];
}

async function getDeployment(id) {
  if (db.isConnected()) {
    const row = await db.get('SELECT * FROM deployments WHERE id = ?', [id]);
    return row || null;
  }

  const state = loadState();
  return state.find((d) => d.id === id) || null;
}

async function getAll() {
  if (db.isConnected()) {
    const rows = await db.all('SELECT * FROM deployments');
    return rows;
  }

  return loadState();
}

const getLogFile = (id) => {
  const logPath = path.join(logDir, `${id}.log`);
  if (!fs.existsSync(logPath)) return '';
  return fs.readFileSync(logPath, 'utf8');
};

module.exports = { createDeployment, updateDeployment, getDeployment, getAll, getLog: getLogFile, appendLog };