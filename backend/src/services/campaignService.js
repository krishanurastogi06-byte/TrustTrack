const Campaign = require('../models/Campaign');
const Milestone = require('../models/Milestone');
const Proof = require('../models/Proof');
const { inrToEth } = require('../lib/currency');
const blockchainService = require('./blockchainService');

async function createCampaign(data) {
  const fundingGoalINR = Number(data.fundingGoalINR ?? data.fundingGoal ?? 0);
  const fundingGoalETH = Number(data.fundingGoalETH ?? inrToEth(fundingGoalINR));

  const campaign = new Campaign({
    ...data,
    fundingGoal: fundingGoalINR,
    fundingGoalINR,
    fundingGoalETH,
    contractCampaignId: null, // Will be set by blockchain registration
  });

  if (blockchainService.isOnChainSyncEnabled()) {
    console.log('[campaignService] Creating campaign, will register on-chain and auto-generate contractCampaignId');
    const registerResult = await blockchainService.registerCampaignOnChain({
      ngoAddress: campaign.ngoWalletAddress,
    });
    
    if (!registerResult.skipped) {
      campaign.contractCampaignId = registerResult.contractCampaignId;
      console.log('[campaignService] Campaign registered on-chain with contractCampaignId:', registerResult.contractCampaignId);
    }
  }

  return campaign.save();
}

async function getCampaignById(id) {
  return Campaign.findById(id).populate('ngo', 'email profile walletAddress');
}

async function getCampaignWithMilestones(id) {
  const [campaign, milestones] = await Promise.all([
    getCampaignById(id),
    Milestone.find({ campaign: id }).sort({ order: 1, createdAt: 1 }),
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
    Campaign.find(filter)
      .populate('ngo', 'email profile walletAddress')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    Campaign.countDocuments(filter),
  ]);
  return { items, total };
}

async function updateCampaign(id, patch) {
  const nextPatch = { ...patch };

  if (nextPatch.fundingGoalINR != null || nextPatch.fundingGoal != null) {
    const fundingGoalINR = Number(nextPatch.fundingGoalINR ?? nextPatch.fundingGoal);
    nextPatch.fundingGoal = fundingGoalINR;
    nextPatch.fundingGoalINR = fundingGoalINR;
    nextPatch.fundingGoalETH = inrToEth(fundingGoalINR);

    const current = await Campaign.findById(id).select('raisedETH');
    const raisedETH = Number(current?.raisedETH || 0);
    nextPatch.fundedPercentage = nextPatch.fundingGoalETH > 0
      ? Math.min((raisedETH / nextPatch.fundingGoalETH) * 100, 100)
      : 0;
  }

  return Campaign.findByIdAndUpdate(id, nextPatch, { new: true });
}

async function syncCampaignMilestones(campaignId, milestones = []) {
  const campaign = await Campaign.findById(campaignId).select('_id contractCampaignId ngoWalletAddress');
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.status = 404;
    err.code = 'CAMPAIGN_NOT_FOUND';
    throw err;
  }

  if (!campaign.contractCampaignId) {
    const err = new Error('Campaign must have contractCampaignId before milestone sync');
    err.status = 409;
    err.code = 'CAMPAIGN_NOT_ONCHAIN';
    throw err;
  }

  console.log('[syncCampaignMilestones] Using contractCampaignId:', campaign.contractCampaignId);

  const existing = await Milestone.find({ campaign: campaignId });
  const existingMap = new Map(existing.map((m) => [String(m._id), m]));

  const keepIds = new Set();

  for (let idx = 0; idx < milestones.length; idx += 1) {
    const raw = milestones[idx];
    const item = {
      id: raw.id ? String(raw.id) : undefined,
      title: String(raw.title || '').trim(),
      description: String(raw.description || raw.title || '').trim(),
      milestoneAmountINR: Number(raw.milestoneAmountINR ?? raw.amount),
      order: Number.isInteger(Number(raw.order)) && Number(raw.order) > 0 ? Number(raw.order) : idx + 1,
    };

    item.milestoneAmountETH = Number(raw.milestoneAmountETH ?? inrToEth(item.milestoneAmountINR));
    item.amount = item.milestoneAmountETH;

    if (item.id && existingMap.has(item.id)) {
      // Update existing milestone
      const existingMilestone = existingMap.get(item.id);
      let contractMilestoneId = existingMilestone.contractMilestoneId;

      // If milestone doesn't have contractMilestoneId, register it on-chain
      if (!contractMilestoneId && blockchainService.isOnChainSyncEnabled()) {
        console.log('[syncCampaignMilestones] Registering existing milestone on-chain');
        const registerResult = await blockchainService.registerMilestoneOnChain({
          contractCampaignId: campaign.contractCampaignId,
          amountEth: item.amount,
        });
        if (!registerResult.skipped) {
          contractMilestoneId = registerResult.contractMilestoneId;
          console.log('[syncCampaignMilestones] Existing milestone registered with contractMilestoneId:', contractMilestoneId);
        }
      }

      await Milestone.findByIdAndUpdate(item.id, {
        title: item.title,
        description: item.description,
        amount: item.amount,
        milestoneAmountINR: item.milestoneAmountINR,
        milestoneAmountETH: item.milestoneAmountETH,
        contractCampaignId: String(campaign.contractCampaignId),
        contractMilestoneId,
        order: item.order,
      });
      keepIds.add(item.id);
      continue;
    }

    // Create new milestone and register on-chain
    const generatedMilestoneId = new Milestone()._id;
    let contractMilestoneId = null;

    if (blockchainService.isOnChainSyncEnabled()) {
      console.log('[syncCampaignMilestones] Creating new milestone and registering on-chain');
      const registerResult = await blockchainService.registerMilestoneOnChain({
        contractCampaignId: campaign.contractCampaignId,
        amountEth: item.amount,
      });
      if (!registerResult.skipped) {
        contractMilestoneId = registerResult.contractMilestoneId;
        console.log('[syncCampaignMilestones] New milestone registered with contractMilestoneId:', contractMilestoneId);
      }
    }

    const created = await Milestone.create({
      _id: generatedMilestoneId,
      campaign: campaignId,
      title: item.title,
      description: item.description,
      amount: item.amount,
      milestoneAmountINR: item.milestoneAmountINR,
      milestoneAmountETH: item.milestoneAmountETH,
      contractCampaignId: String(campaign.contractCampaignId),
      contractMilestoneId,
      order: item.order,
    });
    keepIds.add(String(created._id));
  }

  const toDelete = existing.filter((m) => !keepIds.has(String(m._id))).map((m) => m._id);
  if (toDelete.length) {
    await Milestone.deleteMany({ _id: { $in: toDelete } });
  }

  return Milestone.find({ campaign: campaignId }).sort({ order: 1, createdAt: 1 });
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
