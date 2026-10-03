// Domain Manager
// Maps custom domains to deployments with optional SSL

const path = require('path');
const { loadJSON, saveJSON } = require('./fileSystem');

const stateFile = path.join(__dirname, '..', 'custom-domains.json');

const loadDomains = () => loadJSON(stateFile, {});

const saveDomains = (state) => saveJSON(stateFile, state);

const addDomain = (deploymentId, domain, options) => {
  const state = loadDomains();
  
  // Validate domain format
  if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(domain.toLowerCase())) {
    throw new Error('Invalid domain format');
  }
  
  if (!state[deploymentId]) state[deploymentId] = [];
  
  // Check if domain already exists elsewhere
  for (const depId in state) {
    if (state[depId].some(d => d.domain === domain)) {
      throw new Error('Domain already in use');
    }
  }
  
  const domainEntry = {
    domain,
    primary: options?.primary || false,
    ssl: options?.ssl || false,
    sslExpiry: null,
    createdAt: new Date().toISOString(),
    verified: false,
    dnsRecords: []
  };
  
  // If primary, unset other primary
  if (domainEntry.primary) {
    state[deploymentId].forEach(d => d.primary = false);
  }
  
  state[deploymentId].push(domainEntry);
  saveDomains(state);
  return domainEntry;
};

const getDomains = (deploymentId) => {
  const state = loadDomains();
  return state[deploymentId] || [];
};

const getDomain = (deploymentId, domain) => {
  const domains = getDomains(deploymentId);
  return domains.find(d => d.domain === domain.toLowerCase());
};

const removeDomain = (deploymentId, domain) => {
  const state = loadDomains();
  if (!state[deploymentId]) return false;
  state[deploymentId] = state[deploymentId].filter(d => d.domain !== domain.toLowerCase());
  saveDomains(state);
  return true;
};

const verifyDomain = (deploymentId, domain, dnsRecords) => {
  const state = loadDomains();
  if (!state[deploymentId]) return false;
  
  const idx = state[deploymentId].findIndex(d => d.domain === domain.toLowerCase());
  if (idx < 0) return false;
  
  state[deploymentId][idx].verified = true;
  state[deploymentId][idx].dnsRecords = dnsRecords || [];
  saveDomains(state);
  return true;
};

const setPrimaryDomain = (deploymentId, domain) => {
  const state = loadDomains();
  if (!state[deploymentId]) return false;
  
  state[deploymentId].forEach(d => d.primary = false);
  const idx = state[deploymentId].findIndex(d => d.domain === domain.toLowerCase());
  if (idx < 0) return false;
  
  state[deploymentId][idx].primary = true;
  saveDomains(state);
  return true;
};

module.exports = { addDomain, getDomains, getDomain, removeDomain, verifyDomain, setPrimaryDomain };