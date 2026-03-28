const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    txHash: { type: String, required: true, unique: true, index: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending', index: true },
    network: { type: Number },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', index: true },
    blockNumber: { type: Number },
    confirmations: { type: Number },
    error: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    receipt: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
