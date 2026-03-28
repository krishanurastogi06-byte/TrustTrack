const AuditLog = require('../models/AuditLog');
const logger = require('../lib/logger');

function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
}

function auditContext(req, res, next) {
  req.audit = async function audit(payload) {
    try {
      const actor = req.user && req.user.sub ? req.user.sub : undefined;
      await AuditLog.create({
        actor,
        action: payload.action,
        entityType: payload.entityType,
        entityId: String(payload.entityId),
        metadata: payload.metadata,
        ip: getRequestIp(req),
        method: req.method,
        path: req.originalUrl,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
      });
    } catch (err) {
      // Do not block business flow if audit persistence fails.
      logger.warn('Failed to persist audit log', { error: err.message });
    }
  };

  next();
}

module.exports = auditContext;
