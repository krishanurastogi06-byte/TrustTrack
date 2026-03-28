const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'ETH' },
    txHash: { type: String, index: true },
    status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending', index: true },
    message: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    confirmedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Donation', DonationSchema);
