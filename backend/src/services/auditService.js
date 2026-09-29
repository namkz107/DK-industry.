const AuditLog = require('../models/AuditLog');

async function writeAudit({ actor, action, entity, entityId, summary, metadata = {}, session = null }) {
  const created = await AuditLog.create(
    [{ actor, action, entity, entityId, summary, metadata }],
    session ? { session } : undefined
  );
  return created[0];
}

module.exports = { writeAudit };
