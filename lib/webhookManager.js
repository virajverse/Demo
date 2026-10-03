// Webhook Manager for CI/CD Integration
// Handles GitHub, GitLab push events and triggers auto-deployment

const path = require('path');
const crypto = require('crypto');
const { loadJSON, saveJSON } = require('./fileSystem');

const stateFile = path.join(__dirname, '..', 'webhooks.json');

const loadWebhooks = () => loadJSON(stateFile, {});

const saveWebhooks = (state) => saveJSON(stateFile, state);

const createWebhook = ({ deploymentId, provider, repoUrl, secret, branches }) => {
  const state = loadWebhooks();
  if (!state[deploymentId]) state[deploymentId] = [];
  
  const webhookId = `wh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const webhook = {
    webhookId,
    provider, // 'github' | 'gitlab'
    repoUrl,
    secret: secret || crypto.randomBytes(32).toString('hex'),
    branches: branches || ['main', 'master', 'develop'],
    createdAt: new Date().toISOString(),
    lastTriggered: null,
    enabled: true
  };
  
  state[deploymentId].push(webhook);
  saveWebhooks(state);
  return webhook;
};

const getWebhooks = (deploymentId) => {
  const state = loadWebhooks();
  return state[deploymentId] || [];
};

const getWebhook = (deploymentId, webhookId) => {
  const webhooks = getWebhooks(deploymentId);
  return webhooks.find(w => w.webhookId === webhookId);
};

const verifyGitHubSignature = (payload, signature, secret) => {
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `sha256=${hash}` === signature;
};

const verifyGitLabSignature = (payload, token, secret) => {
  return token === secret;
};

const updateWebhookTrigger = (deploymentId, webhookId) => {
  const state = loadWebhooks();
  if (!state[deploymentId]) return null;
  const idx = state[deploymentId].findIndex(w => w.webhookId === webhookId);
  if (idx < 0) return null;
  
  state[deploymentId][idx].lastTriggered = new Date().toISOString();
  saveWebhooks(state);
  return state[deploymentId][idx];
};

const deleteWebhook = (deploymentId, webhookId) => {
  const state = loadWebhooks();
  if (!state[deploymentId]) return false;
  state[deploymentId] = state[deploymentId].filter(w => w.webhookId !== webhookId);
  saveWebhooks(state);
  return true;
};

module.exports = { createWebhook, getWebhooks, getWebhook, updateWebhookTrigger, deleteWebhook, verifyGitHubSignature, verifyGitLabSignature };