const fs = require('fs');
const path = require('path');

const auditLogDir = path.join(__dirname, '..', 'audit-logs');
if (!fs.existsSync(auditLogDir)) fs.mkdirSync(auditLogDir, { recursive: true });

function appendAuditEvent(event) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    ...event
  };
  const file = path.join(auditLogDir, `${new Date().toISOString().slice(0, 10)}.jsonl`);
  fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf8');
}

function getAllEvents() {
  const files = fs.readdirSync(auditLogDir).filter((name) => name.endsWith('.jsonl'));
  let events = [];
  for (const file of files) {
    const lines = fs.readFileSync(path.join(auditLogDir, file), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        events.push(JSON.parse(line));
      } catch (err) {
        // ignore invalid
      }
    }
  }
  return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getEventsByTeam(team) {
  return getAllEvents().filter((event) => event.team === team);
}

module.exports = { appendAuditEvent, getAllEvents, getEventsByTeam };