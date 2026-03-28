const Campaign = require('../models/Campaign');
const Milestone = require('../models/Milestone');
const Proof = require('../models/Proof');

async function createCampaign(data) {
  const campaign = new Campaign(data);
  return campaign.save();
}

async function getCampaignById(id) {
  return Campaign.findById(id).populate('ngo', 'email profile walletAddress');
}

async function getCampaignWithMilestones(id) {
  const [campaign, milestones] = await Promise.all([
    getCampaignById(id),
    Milestone.find({ campaign: id }).sort({ createdAt: 1 }),
  ]);

  return { campaign, milestones };
}

async function findCampaigns({ page = 1, perPage = 10, search, category, ngoId, status } = {}) {
  const filter = {};
  if (category) filter.category = category;
  if (ngoId) filter.ngo = ngoId;
  if (status) filter.status = status;
  if (search) filter.$text = { $search: search };

  const skip = (page - 1) * perPage;
  const [items, total] = await Promise.all([
    Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    Campaign.countDocuments(filter),
  ]);
  return { items, total };
}

async function updateCampaign(id, patch) {
  return Campaign.findByIdAndUpdate(id, patch, { new: true });
}

async function syncCampaignMilestones(campaignId, milestones = []) {
  const existing = await Milestone.find({ campaign: campaignId });
  const existingMap = new Map(existing.map((m) => [String(m._id), m]));

  const keepIds = new Set();

  for (const raw of milestones) {
    const item = {
      id: raw.id ? String(raw.id) : undefined,
      title: String(raw.title || '').trim(),
      description: String(raw.description || raw.title || '').trim(),
      amount: Number(raw.amount),
    };

    if (item.id && existingMap.has(item.id)) {
      await Milestone.findByIdAndUpdate(item.id, {
        title: item.title,
        description: item.description,
        amount: item.amount,
      });
      keepIds.add(item.id);
      continue;
    }

    const created = await Milestone.create({
      campaign: campaignId,
      title: item.title,
      description: item.description,
      amount: item.amount,
    });
    keepIds.add(String(created._id));
  }

  const toDelete = existing.filter((m) => !keepIds.has(String(m._id))).map((m) => m._id);
  if (toDelete.length) {
    await Milestone.deleteMany({ _id: { $in: toDelete } });
  }

  return Milestone.find({ campaign: campaignId }).sort({ createdAt: 1 });
}

async function deleteCampaign(id) {
  // Remove proofs tied to campaign milestones, then milestones, then campaign.
  const milestoneIds = await Milestone.find({ campaign: id }).distinct('_id');
  if (milestoneIds.length) {
    await Proof.deleteMany({ milestone: { $in: milestoneIds } });
    await Milestone.deleteMany({ _id: { $in: milestoneIds } });
  }
  return Campaign.findByIdAndDelete(id);
}

module.exports = {
  createCampaign,
  getCampaignById,
  getCampaignWithMilestones,
  findCampaigns,
  updateCampaign,
  syncCampaignMilestones,
  deleteCampaign,
};
