const mongoose = require('mongoose');

const ProofSchema = new mongoose.Schema(
  {
    milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', required: true, index: true },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cid: { type: String, required: true },
    filename: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    remarks: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Proof', ProofSchema);
