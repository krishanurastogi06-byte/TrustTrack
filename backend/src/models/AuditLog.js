const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    method: { type: String },
    path: { type: String },
    userAgent: { type: String },
    statusCode: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', AuditLogSchema);
