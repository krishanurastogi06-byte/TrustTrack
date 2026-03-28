const Milestone = require('../models/Milestone');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const blockchainService = require('./blockchainService');
const walletService = require('./walletService');

async function requestFunds({ milestoneId, requesterId }) {
  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) {
    const err = new Error('Milestone not found');
    err.status = 404;
    err.code = 'MILESTONE_NOT_FOUND';
    throw err;
  }

  if (!['verified', 'approved'].includes(milestone.status)) {
    const err = new Error('Funds can only be requested for verified milestones');
    err.status = 409;
    err.code = 'INVALID_MILESTONE_STATE';
    throw err;
  }

  if (milestone.isPaid) {
    const err = new Error('Funds already released for this milestone');
    err.status = 409;
    err.code = 'FUNDS_ALREADY_RELEASED';
    throw err;
  }

  if (milestone.fundRequest && milestone.fundRequest.status === 'pending') {
    const err = new Error('Fund request already pending for this milestone');
    err.status = 409;
    err.code = 'FUND_REQUEST_ALREADY_PENDING';
    throw err;
  }

  if (milestone.fundRequest && milestone.fundRequest.status === 'released') {
    const err = new Error('Funds already released for this milestone');
    err.status = 409;
    err.code = 'FUNDS_ALREADY_RELEASED';
    throw err;
  }

  milestone.fundRequest = {
    status: 'pending',
    requestedBy: requesterId,
    requestedAt: new Date(),
    releasedAmount: 0,
  };

  await milestone.save();
  return milestone;
}

async function releaseFunds({ milestoneId, adminId, decision, txHash, remarks }) {
  const milestone = await Milestone.findById(milestoneId).populate('campaign');
  if (!milestone) {
    const err = new Error('Milestone not found');
    err.status = 404;
    err.code = 'MILESTONE_NOT_FOUND';
    throw err;
  }

  if (!['verified', 'approved'].includes(milestone.status)) {
    const err = new Error('Only verified milestone funds can be released');
    err.status = 409;
    err.code = 'INVALID_MILESTONE_STATE';
    throw err;
  }

  if (!milestone.fundRequest || milestone.fundRequest.status !== 'pending') {
    const err = new Error('No pending fund request for this milestone');
    err.status = 409;
    err.code = 'FUND_REQUEST_NOT_PENDING';
    throw err;
  }

  if (decision === 'approve') {
    milestone.fundRequest.status = 'released';
    milestone.fundRequest.releasedBy = adminId;
    milestone.fundRequest.releasedAt = new Date();
    milestone.fundRequest.releasedAmount = milestone.amount;
    milestone.fundRequest.txHash = txHash;
    milestone.fundRequest.remarks = remarks;
    milestone.isPaid = true;
    milestone.status = 'completed';

    // Add funds to NGO wallet
    try {
      const campaign = milestone.campaign || (await Campaign.findById(milestone.campaign));
      if (campaign) {
        await walletService.addBalance(campaign.ngo, milestone.amount, `Milestone ${milestone.title} released`);
      }
    } catch (err) {
      // Log error but don't fail the entire transaction
      console.error('Failed to update NGO wallet balance:', err.message);
    }
  } else if (decision === 'reject') {
    milestone.fundRequest.status = 'rejected';
    milestone.fundRequest.releasedBy = adminId;
    milestone.fundRequest.releasedAt = new Date();
    milestone.fundRequest.releasedAmount = 0;
    milestone.fundRequest.txHash = undefined;
    milestone.fundRequest.remarks = remarks;
  } else {
    const err = new Error('Invalid release decision');
    err.status = 400;
    err.code = 'INVALID_RELEASE_DECISION';
    throw err;
  }

  await milestone.save();

  if (decision === 'approve') {
    const milestones = await Milestone.find({ campaign: milestone.campaign }).select('status');
    const allCompleted = milestones.length > 0 && milestones.every((m) => m.status === 'completed');
    if (allCompleted) {
      await Campaign.findByIdAndUpdate(milestone.campaign, { status: 'completed' });
    }
  }

  return milestone;
}

async function releaseApprovedMilestoneFunds({ milestoneId, adminId }) {
  const milestone = await Milestone.findById(milestoneId).populate('campaign');
  if (!milestone) {
    const err = new Error('Milestone not found');
    err.status = 404;
    err.code = 'MILESTONE_NOT_FOUND';
    throw err;
  }

  if (!['approved', 'verified'].includes(milestone.status)) {
    const err = new Error('Only approved milestones can be released');
    err.status = 409;
    err.code = 'INVALID_MILESTONE_STATE';
    throw err;
  }

  if (milestone.isPaid || milestone.fundRequest?.status === 'released') {
    const err = new Error('Funds already released for this milestone');
    err.status = 409;
    err.code = 'FUNDS_ALREADY_RELEASED';
    throw err;
  }

  const campaign = milestone.campaign || (await Campaign.findById(milestone.campaign));
  if (!campaign) {
    const err = new Error('Campaign not found for milestone');
    err.status = 404;
    err.code = 'CAMPAIGN_NOT_FOUND';
    throw err;
  }

  const ngo = await User.findById(campaign.ngo).select('_id role walletAddress');
  if (!ngo || ngo.role !== 'ngo') {
    const err = new Error('Campaign NGO not found');
    err.status = 404;
    err.code = 'NGO_NOT_FOUND';
    throw err;
  }

  const ngoWalletAddress = campaign.ngoWalletAddress || ngo?.walletAddress;
  if (!ngoWalletAddress) {
    const err = new Error('NGO wallet address is not configured');
    err.status = 409;
    err.code = 'NGO_WALLET_NOT_CONFIGURED';
    throw err;
  }

  if (!campaign.ngoWalletAddress) {
    campaign.ngoWalletAddress = ngoWalletAddress;
    await campaign.save();
  }

  const onchain = await blockchainService.releaseMilestoneFunds({
    milestoneId: milestone._id,
    campaignId: campaign._id,
    ngoAddress: ngoWalletAddress,
    milestoneAmountEth: milestone.amount,
  });

  milestone.isPaid = true;
  milestone.status = 'completed';
  milestone.fundRequest = {
    status: 'released',
    requestedBy: milestone.fundRequest?.requestedBy,
    requestedAt: milestone.fundRequest?.requestedAt,
    releasedBy: adminId,
    releasedAt: new Date(),
    releasedAmount: milestone.amount,
    txHash: onchain.txHash,
    remarks: 'Released by admin after proof approval',
  };
  await milestone.save();

  // Add funds to NGO wallet
  try {
    await walletService.addBalance(campaign.ngo, milestone.amount, `Milestone ${milestone.title} released`);
  } catch (err) {
    // Log error but don't fail the entire transaction
    console.error('Failed to update NGO wallet balance:', err.message);
  }

  const milestones = await Milestone.find({ campaign: campaign._id }).select('status');
  const allCompleted = milestones.length > 0 && milestones.every((m) => m.status === 'completed');
  if (allCompleted) {
    await Campaign.findByIdAndUpdate(campaign._id, { status: 'completed' });
  }

  return { milestone, blockchain: onchain };
}

module.exports = { requestFunds, releaseFunds, releaseApprovedMilestoneFunds };
