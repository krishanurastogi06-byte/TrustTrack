const mongoose = require('mongoose');

const MilestoneSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected', 'completed', 'verified', 'released'],
      default: 'pending',
    },
    isPaid: { type: Boolean, default: false, index: true },
    proofs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proof' }],
    fundRequest: {
      status: { type: String, enum: ['none', 'pending', 'released', 'rejected'], default: 'none', index: true },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      requestedAt: { type: Date },
      releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      releasedAt: { type: Date },
      releasedAmount: { type: Number, min: 0 },
      txHash: { type: String },
      remarks: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Milestone', MilestoneSchema);
