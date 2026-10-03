// Shared worker logic for Railway and Vercel
const fs = require('fs');
const path = require('path');

const lockFile = path.join(__dirname, '..', 'worker.lock');

const runTask = async () => {
  const started = new Date().toISOString();
  console.log(`[worker] started at ${started}`);

  // Example shared work and extensible tasks
  const stats = {
    timestamp: started,
    handledDemos: 0,
    activeDemos: 0,
    errors: []
  };

  try {
    // 1. gather all demo folders (except system folders)
    const root = path.join(__dirname, '..');
    const items = fs.readdirSync(root, { withFileTypes: true });

    const demoFolders = items
      .filter(item => item.isDirectory())
      .map(item => item.name)
      .filter(name => !['node_modules', 'uploads', 'admin', 'common', '.git', 'lib'].includes(name));

    stats.activeDemos = demoFolders.length;

    // 2. sample task: touch a file in each demo folder for heartbeat
    for (const demo of demoFolders) {
      try {
        const demoStatPath = path.join(root, demo, '.worker-heartbeat');
        fs.writeFileSync(demoStatPath, `beat:${new Date().toISOString()}`);
        stats.handledDemos += 1;
      } catch (innerErr) {
        stats.errors.push({ demo, error: innerErr.message });
      }
    }
  } catch (err) {
    stats.errors.push({ error: err.message });
    throw err;
  }

  stats.finished = new Date().toISOString();
  return stats;
};

const isRunning = () => {
  if (fs.existsSync(lockFile)) {
    const delta = Date.now() - fs.statSync(lockFile).mtimeMs;
    if (delta < 1000 * 60) return true;
  }
  return false;
};

const startBackgroundWorker = async () => {
  if (isRunning()) {
    return { status: 'busy', message: 'Worker already running' };
  }

  fs.writeFileSync(lockFile, String(Date.now()));
  try {
    const result = await runTask();
    return { status: 'ok', ...result };
  } finally {
    try { fs.unlinkSync(lockFile); } catch (e) { }
  }
};

module.exports = { runTask, startBackgroundWorker, isRunning };