const Milestone = require('../models/Milestone');
const Proof = require('../models/Proof');
const logger = require('../lib/logger');
const { inrToEth, ethToInr } = require('../lib/currency');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const blockchainService = require('./blockchainService');
const config = require('../config/env');

async function createMilestone(campaignId, data) {
  const campaign = await Campaign.findById(campaignId).select('_id ngo ngoWalletAddress contractCampaignId');
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.status = 404;
    err.code = 'CAMPAIGN_NOT_FOUND';
    throw err;
  }

  const ngo = await User.findById(campaign.ngo).select('_id role walletAddress');
  if (!ngo || ngo.role !== 'ngo') {
    const err = new Error('Campaign NGO owner is invalid');
    err.status = 409;
    err.code = 'CAMPAIGN_NGO_INVALID';
    throw err;
  }

  const hasEthPayload = data.amountETH != null || data.milestoneAmountETH != null || data.amount != null;
  const milestoneAmountETH = Number(
    hasEthPayload
      ? (data.amountETH ?? data.milestoneAmountETH ?? data.amount)
      : inrToEth(data.milestoneAmountINR)
  );
  const milestoneAmountINR = Number(
    data.milestoneAmountINR != null ? data.milestoneAmountINR : ethToInr(milestoneAmountETH)
  );

  if (!Number.isFinite(milestoneAmountETH) || milestoneAmountETH <= 0) {
    const err = new Error('Invalid milestone payload: amount must be greater than 0');
    err.status = 400;
    err.code = 'INVALID_MILESTONE_PAYLOAD';
    err.details = {
      campaignId: String(campaignId),
      milestoneTitle: String(data.title || '').trim(),
      milestoneOrder: Number(data.order || 0) || null,
      amount: data.amount,
      milestoneAmountETH: data.milestoneAmountETH,
      milestoneAmountINR: data.milestoneAmountINR,
    };
    throw err;
  }

  const normalizedTitle = String(data.title || '').trim();
  if (!normalizedTitle) {
    const err = new Error('Invalid milestone payload: title is required');
    err.status = 400;
    err.code = 'INVALID_MILESTONE_PAYLOAD';
    throw err;
  }

  const requestedOrder = Number(data.order || 0);
  const order = Number.isInteger(requestedOrder) && requestedOrder > 0
    ? requestedOrder
    : (await Milestone.countDocuments({ campaign: campaignId })) + 1;

  const contractCampaignId = campaign.contractCampaignId;
  const isDev = String(config.nodeEnv || '').toLowerCase() === 'development';
  
  if (!contractCampaignId) {
    if (isDev) {
      console.warn(`[milestoneService] Campaign ${campaignId} missing contractCampaignId. Skipping on-chain registration in dev mode.`);
    } else {
      const err = new Error('Campaign is missing contractCampaignId. Re-sync campaign on-chain before creating milestones.');
      err.status = 409;
      err.code = 'CONTRACT_CAMPAIGN_ID_MISSING';
      throw err;
    }
  }

  // Validate campaign linkage against chain before attempting milestone registration.
  if (contractCampaignId) {
    await blockchainService.assertCampaignRegistrationOnChain(contractCampaignId);
  }

  let contractMilestoneId = data.contractMilestoneId || null;
  if (blockchainService.isOnChainSyncEnabled() && !contractMilestoneId) {
    try {
      const registration = await blockchainService.registerMilestoneOnChain({
        contractCampaignId,
        amountEth: milestoneAmountETH,
      });
      if (!registration.skipped) {
        contractMilestoneId = registration.contractMilestoneId;
      }
    } catch (error) {
      logger.error('Milestone blockchain registration failed', {
        campaignId: String(campaign._id),
        contractCampaignId: String(contractCampaignId),
        milestoneTitle: normalizedTitle,
        milestoneOrder: order,
        reason: error?.message,
        code: error?.code,
      });

      if (error?.status && error?.code) throw error;

      const err = new Error('Blockchain milestone registration failed');
      err.status = 502;
      err.code = 'BLOCKCHAIN_MILESTONE_REGISTRATION_FAILED';
      err.details = {
        campaignId: String(campaign._id),
        contractCampaignId: String(contractCampaignId),
        milestoneTitle: normalizedTitle,
        milestoneOrder: order,
        reason: error?.message || 'Unknown blockchain error',
      };
      throw err;
    }
  }

  console.log('[milestoneService] Milestone registration', {
    campaignDbId: String(campaign._id),
    contractCampaignId,
    contractMilestoneId,
  });

  const generatedMilestoneId = new Milestone()._id;

  const m = new Milestone({
    ...data,
    _id: generatedMilestoneId,
    campaign: campaignId,
    title: normalizedTitle,
    description: normalizedTitle,
    amount: milestoneAmountETH,
    amountETH: milestoneAmountETH,
    milestoneAmountINR,
    milestoneAmountETH,
    contractCampaignId: String(contractCampaignId),
    contractMilestoneId,
    order,
    status: data.status || 'pending',
  });
  return m.save();
}

async function getMilestoneById(id) {
  return Milestone.findById(id).populate('proofs');
}

async function updateMilestone(id, patch) {
  const nextPatch = { ...patch };

  if (nextPatch.amountETH != null || nextPatch.milestoneAmountETH != null || nextPatch.amount != null || nextPatch.milestoneAmountINR != null) {
    const hasEthPayload = nextPatch.amountETH != null || nextPatch.milestoneAmountETH != null || nextPatch.amount != null;
    const milestoneAmountETH = Number(
      hasEthPayload
        ? (nextPatch.amountETH ?? nextPatch.milestoneAmountETH ?? nextPatch.amount)
        : inrToEth(nextPatch.milestoneAmountINR)
    );
    const milestoneAmountINR = Number(nextPatch.milestoneAmountINR ?? ethToInr(milestoneAmountETH));

    nextPatch.amount = milestoneAmountETH;
    nextPatch.amountETH = milestoneAmountETH;
    nextPatch.milestoneAmountETH = milestoneAmountETH;
    nextPatch.milestoneAmountINR = milestoneAmountINR;
  }

  return Milestone.findByIdAndUpdate(id, nextPatch, { new: true });
}

async function deleteMilestone(id) {
  await Proof.deleteMany({ milestone: id });
  return Milestone.findByIdAndDelete(id);
}

async function listMilestonesForCampaign(campaignId) {
  return Milestone.find({ campaign: campaignId }).sort({ order: 1, createdAt: 1 });
}

module.exports = { createMilestone, getMilestoneById, updateMilestone, deleteMilestone, listMilestonesForCampaign };
