const path = require('path');
const { loadJSON, saveJSON } = require('./fileSystem');

const CRM_FILE = path.join(__dirname, '..', 'data', 'crm.json');

function loadCRM() {
    return loadJSON(CRM_FILE, []);
}

function saveCRM(data) {
    saveJSON(CRM_FILE, data);
}

function getAllLeads() {
    return loadCRM();
}

function getLead(id) {
    return loadCRM().find((lead) => lead.id === id);
}

function addLead({ name, email, company, status = 'new', team = null }) {
    const data = loadCRM();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const lead = { id, name, email, company, status, team, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.push(lead);
    saveCRM(data);
    return lead;
}

function updateLead(id, updates) {
    const data = loadCRM();
    const idx = data.findIndex((l) => l.id === id);
    if (idx < 0) return null;
    data[idx] = { ...data[idx], ...updates, updatedAt: new Date().toISOString() };
    saveCRM(data);
    return data[idx];
}

function deleteLead(id) {
    let data = loadCRM();
    data = data.filter((l) => l.id !== id);
    saveCRM(data);
    return true;
}

module.exports = { getAllLeads, getLead, addLead, updateLead, deleteLead };