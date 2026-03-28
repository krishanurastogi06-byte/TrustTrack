const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    summary: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: String, index: true },
    coverImage: { type: String },
    fundingGoal: { type: Number, required: true, min: 0 },
    ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ngoWalletAddress: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: ['draft', 'published', 'completed', 'cancelled'], default: 'draft' },
    tags: [String],
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// text index for search
CampaignSchema.index({ title: 'text', summary: 'text', description: 'text' });

module.exports = mongoose.model('Campaign', CampaignSchema);
