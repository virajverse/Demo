// Deployment Version Manager
// Tracks versions of each deployment and enables rollback capability

const path = require('path');
const { loadJSON, saveJSON } = require('./fileSystem');

const stateFile = path.join(__dirname, '..', 'deployment-versions.json');

const loadVersions = () => loadJSON(stateFile, {});

const saveVersions = (state) => saveJSON(stateFile, state);

const createVersion = (deploymentId, metadata) => {
  const state = loadVersions();
  if (!state[deploymentId]) state[deploymentId] = [];
  
  const versionId = `v${Date.now()}`;
  const version = {
    versionId,
    timestamp: new Date().toISOString(),
    metadata: metadata || {},
    source: metadata?.source || 'manual',
    artifacts: metadata?.artifacts || {}
  };
  
  state[deploymentId].push(version);
  // Keep last 10 versions
  if (state[deploymentId].length > 10) {
    state[deploymentId] = state[deploymentId].slice(-10);
  }
  
  saveVersions(state);
  return version;
};

const getVersions = (deploymentId) => {
  const state = loadVersions();
  return (state[deploymentId] || []).reverse(); // newest first
};

const getVersion = (deploymentId, versionId) => {
  const state = loadVersions();
  if (!state[deploymentId]) return null;
  return state[deploymentId].find(v => v.versionId === versionId);
};

const rollbackToVersion = (deploymentId, versionId) => {
  const version = getVersion(deploymentId, versionId);
  if (!version) throw new Error('Version not found');
  return {
    success: true,
    message: `Rolled back to ${versionId}`,
    version,
    rollbackedAt: new Date().toISOString()
  };
};

module.exports = { createVersion, getVersions, getVersion, rollbackToVersion };