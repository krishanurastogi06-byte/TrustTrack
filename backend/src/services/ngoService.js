const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Milestone = require('../models/Milestone');
const Proof = require('../models/Proof');
const Donation = require('../models/Donation');
const Transaction = require('../models/Transaction');

async function listNgos({ verificationStatus, page = 1, perPage = 20 } = {}) {
  const filter = { role: 'ngo' };
  if (verificationStatus) {
    filter.verificationStatus = verificationStatus;
  }

  const skip = (page - 1) * perPage;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage),
    User.countDocuments(filter),
  ]);

  return { items, total, page, perPage };
}

async function setNgoVerification(ngoId, status) {
  const mapped = {
    approved: { isVerified: true, verificationStatus: 'approved' },
    rejected: { isVerified: false, verificationStatus: 'rejected' },
  };

  const patch = mapped[status];
  if (!patch) {
    const err = new Error('Invalid verification status');
    err.status = 400;
    err.code = 'INVALID_VERIFICATION_STATUS';
    throw err;
  }

  return User.findOneAndUpdate(
    { _id: ngoId, role: 'ngo' },
    patch,
    { new: true }
  );
}

async function getNgoCampaignsWithVerifiedProofs(ngoId) {
  const ngo = await User.findOne({ _id: ngoId, role: 'ngo' }).select('_id email profile isVerified verificationStatus');
  if (!ngo) return null;

  const campaigns = await Campaign.find({ ngo: ngoId }).sort({ createdAt: -1 }).lean();
  const campaignIds = campaigns.map((c) => c._id);

  if (!campaignIds.length) {
    return { ngo, campaigns: [] };
  }

  const milestones = await Milestone.find({ campaign: { $in: campaignIds } }).select('_id campaign title').lean();
  const milestoneIds = milestones.map((m) => m._id);
  const milestoneMap = new Map(milestones.map((m) => [String(m._id), m]));

  const verifiedProofs = milestoneIds.length
    ? await Proof.find({ milestone: { $in: milestoneIds }, status: 'verified' })
      .select('_id milestone uploader cid filename mimeType size status remarks createdAt')
      .lean()
    : [];

  const proofsByCampaign = new Map();
  for (const proof of verifiedProofs) {
    const milestone = milestoneMap.get(String(proof.milestone));
    if (!milestone) continue;

    const campaignKey = String(milestone.campaign);
    if (!proofsByCampaign.has(campaignKey)) proofsByCampaign.set(campaignKey, []);
    proofsByCampaign.get(campaignKey).push({
      ...proof,
      milestoneTitle: milestone.title,
    });
  }

  const campaignItems = campaigns.map((campaign) => {
    const proofs = proofsByCampaign.get(String(campaign._id)) || [];
    return {
      ...campaign,
      verifiedProofCount: proofs.length,
      verifiedProofs: proofs,
    };
  });

  return {
    ngo,
    campaigns: campaignItems,
  };
}

async function removeNgoAndData(ngoId) {
  const ngo = await User.findOne({ _id: ngoId, role: 'ngo' }).select('_id');
  if (!ngo) return null;

  const campaignIds = await Campaign.find({ ngo: ngoId }).distinct('_id');
  const milestoneIds = campaignIds.length
    ? await Milestone.find({ campaign: { $in: campaignIds } }).distinct('_id')
    : [];

  const deleteOps = [
    Proof.deleteMany({ uploader: ngoId }),
    Transaction.deleteMany({ donor: ngoId }),
  ];

  if (milestoneIds.length) {
    deleteOps.push(Proof.deleteMany({ milestone: { $in: milestoneIds } }));
  }

  if (campaignIds.length) {
    deleteOps.push(Milestone.deleteMany({ campaign: { $in: campaignIds } }));
    deleteOps.push(Donation.deleteMany({ campaign: { $in: campaignIds } }));
    deleteOps.push(Transaction.deleteMany({ campaign: { $in: campaignIds } }));
    deleteOps.push(Campaign.deleteMany({ _id: { $in: campaignIds } }));
  }

  await Promise.all(deleteOps);
  await User.deleteOne({ _id: ngoId, role: 'ngo' });

  return {
    ngoId,
    removedCampaigns: campaignIds.length,
    removedMilestones: milestoneIds.length,
  };
}

module.exports = {
  listNgos,
  setNgoVerification,
  getNgoCampaignsWithVerifiedProofs,
  removeNgoAndData,
};
