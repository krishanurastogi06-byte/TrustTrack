const AuditLog = require('../models/AuditLog');

async function listAuditLogs({ page = 1, perPage = 25, action, entityType } = {}) {
  const filter = {};
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;

  const skip = (page - 1) * perPage;
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'email role profile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage),
    AuditLog.countDocuments(filter),
  ]);

  return { items, total, page, perPage };
}

module.exports = { listAuditLogs };
