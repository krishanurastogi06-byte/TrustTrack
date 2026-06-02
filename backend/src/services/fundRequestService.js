const Milestone = require('../models/Milestone');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const { ethers } = require('ethers');
const blockchainService = require('./blockchainService');
const walletService = require('./walletService');
const transactionService = require('./transactionService');

function normalizeWalletAddress(value, fieldName) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!ethers.isAddress(raw)) {
    const err = new Error(`${fieldName} is invalid`);
    err.status = 400;
    err.code = 'INVALID_WALLET_ADDRESS';
    throw err;
  }
  return ethers.getAddress(raw).toLowerCase();
}

function assertReleaseWalletMatch({ campaignWalletAddress, expectedNgoWalletAddress }) {
  const linkedWallet = normalizeWalletAddress(campaignWalletAddress, 'Campaign NGO wallet address');
  if (!linkedWallet) {
    const err = new Error('Campaign NGO wallet address is not configured');
    err.status = 409;
    err.code = 'NGO_WALLET_NOT_CONFIGURED';
    throw err;
  }

  if (!expectedNgoWalletAddress) {
    const err = new Error('NGO wallet address shown in table is required before releasing funds');
    err.status = 400;
    err.code = 'EXPECTED_NGO_WALLET_REQUIRED';
    throw err;
  }

  const expectedWallet = normalizeWalletAddress(expectedNgoWalletAddress, 'Expected NGO wallet address');
  if (linkedWallet !== expectedWallet) {
    const err = new Error('Wallet mismatch: campaign-linked NGO wallet does not match the wallet shown in table. Funds were not released.');
    err.status = 409;
    err.code = 'NGO_WALLET_MISMATCH';
    throw err;
  }

  return linkedWallet;
}

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

async function releaseFunds({ milestoneId, adminId, decision, txHash, remarks, expectedNgoWalletAddress }) {
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

  if (milestone.isPaid || milestone.fundRequest?.status === 'released') {
    const err = new Error('Funds already released for this milestone');
    err.status = 409;
    err.code = 'FUNDS_ALREADY_RELEASED';
    throw err;
  }

  if (!milestone.fundRequest || milestone.fundRequest.status !== 'pending') {
    const err = new Error('No pending fund request for this milestone');
    err.status = 409;
    err.code = 'FUND_REQUEST_NOT_PENDING';
    throw err;
  }

  if (decision === 'approve') {
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

    // Security: only campaign-linked wallet from DB can be release recipient.
    const ngoWalletAddress = assertReleaseWalletMatch({
      campaignWalletAddress: campaign.ngoWalletAddress,
      expectedNgoWalletAddress,
    });

    const contractCampaignId = campaign.contractCampaignId;
    const contractMilestoneId = milestone.contractMilestoneId;
    if (blockchainService.isOnChainSyncEnabled() && (!contractCampaignId || !contractMilestoneId)) {
      const err = new Error('Campaign or milestone not synced on-chain');
      err.status = 409;
      err.code = 'ONCHAIN_MAPPING_MISSING';
      throw err;
    }

    console.log({
      dbCampaignId: String(campaign._id),
      contractCampaignId,
      dbMilestoneId: String(milestone._id),
      contractMilestoneId,
    });

    console.log('Sending funds to:', ngoWalletAddress);

    const releaseState = await blockchainService.releaseMilestoneFundsOnChain({
      milestoneId: contractMilestoneId,
      campaignId: contractCampaignId,
      ngoAddress: ngoWalletAddress,
      amountEth: milestone.amount,
    });

    if (String(releaseState.toAddress || '').toLowerCase() !== String(ngoWalletAddress).toLowerCase()) {
      const err = new Error('On-chain release recipient does not match NGO wallet address');
      err.status = 409;
      err.code = 'RELEASE_RECIPIENT_MISMATCH';
      throw err;
    }

    const releasedAmountEth = Number(releaseState.releasedAmountEth || milestone.amount || 0);

    if (String(releaseState.fromAddress || '').toLowerCase() === String(ngoWalletAddress).toLowerCase()) {
      console.warn('Warning: admin wallet equals NGO wallet for release transaction');
    }

    console.log('Admin wallet used:', releaseState.fromAddress);
    console.log('Release tx hash:', releaseState.txHash);
    console.log('Amount transferred ETH:', releasedAmountEth);

    const txRecord = await transactionService.createTransaction({
      txHash: releaseState.txHash,
      from: releaseState.from,
      to: ngoWalletAddress,
      fromAddress: releaseState.fromAddress || releaseState.from,
      toAddress: ngoWalletAddress,
      amount: releasedAmountEth,
      status: 'confirmed',
      network: releaseState.network,
      campaign: campaign._id,
      milestone: milestone._id,
      ngoWallet: ngoWalletAddress,
      type: 'release',
      blockNumber: releaseState.blockNumber,
      confirmations: releaseState.confirmations,
      metadata: {
        type: 'release',
        campaignId: String(campaign._id),
        milestoneId: String(milestone._id),
        ngoWallet: ngoWalletAddress,
        fromAddress: releaseState.fromAddress || releaseState.from,
        toAddress: ngoWalletAddress,
        amountETH: releasedAmountEth,
        releasedAmountWei: releaseState.releasedAmountWei,
        campaignChainId: releaseState.campaignChainId,
        milestoneChainId: releaseState.milestoneChainId,
      },
      receipt: releaseState.receipt,
    });

    milestone.fundRequest.status = 'released';
    milestone.fundRequest.releasedBy = adminId;
    milestone.fundRequest.releasedAt = new Date();
    milestone.fundRequest.releasedAmount = releasedAmountEth;
    milestone.fundRequest.txHash = releaseState.txHash;
    milestone.fundRequest.remarks = remarks;
    milestone.isPaid = true;
    milestone.fundsReleased = true;
    milestone.txHash = releaseState.txHash;
    milestone.ngoWalletAddress = ngoWalletAddress;
    milestone.amountETH = releasedAmountEth;
    milestone.status = 'completed';

    // Add funds to NGO wallet
    try {
      const campaign = milestone.campaign || (await Campaign.findById(milestone.campaign));
      if (campaign) {
        await walletService.addBalance(campaign.ngo, releasedAmountEth, `Milestone ${milestone.title} released`);
      }
    } catch (err) {
      // Log error but don't fail the entire transaction
      console.error('Failed to update NGO wallet balance:', err.message);
    }

    milestone.$locals = {
      ...(milestone.$locals || {}),
      blockchainRelease: releaseState,
      releaseTransaction: txRecord,
      releaseWarning:
        String(releaseState.fromAddress || '').toLowerCase() === String(ngoWalletAddress).toLowerCase()
          ? 'Warning: admin wallet and NGO wallet are the same address.'
          : null,
    };
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

async function releaseApprovedMilestoneFunds({ milestoneId, adminId, txHash, remarks, expectedNgoWalletAddress }) {
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

  // Security: only campaign-linked wallet from DB can be release recipient.
  const ngoWalletAddress = assertReleaseWalletMatch({
    campaignWalletAddress: campaign.ngoWalletAddress,
    expectedNgoWalletAddress,
  });

  const contractCampaignId = campaign.contractCampaignId;
  const contractMilestoneId = milestone.contractMilestoneId;
  if (blockchainService.isOnChainSyncEnabled() && (!contractCampaignId || !contractMilestoneId)) {
    const err = new Error('Campaign or milestone not synced on-chain');
    err.status = 409;
    err.code = 'ONCHAIN_MAPPING_MISSING';
    throw err;
  }

  console.log({
    dbCampaignId: String(campaign._id),
    contractCampaignId,
    dbMilestoneId: String(milestone._id),
    contractMilestoneId,
  });

  console.log('Sending funds to:', ngoWalletAddress);

  const releaseState = await blockchainService.releaseMilestoneFundsOnChain({
    milestoneId: contractMilestoneId,
    campaignId: contractCampaignId,
    ngoAddress: ngoWalletAddress,
    amountEth: milestone.amount,
  });

  if (String(releaseState.toAddress || '').toLowerCase() !== String(ngoWalletAddress).toLowerCase()) {
    const err = new Error('On-chain release recipient does not match NGO wallet address');
    err.status = 409;
    err.code = 'RELEASE_RECIPIENT_MISMATCH';
    throw err;
  }

  const releasedAmountEth = Number(releaseState.releasedAmountEth || milestone.amount || 0);

  if (String(releaseState.fromAddress || '').toLowerCase() === String(ngoWalletAddress).toLowerCase()) {
    console.warn('Warning: admin wallet equals NGO wallet for release transaction');
  }

  console.log('Admin wallet used:', releaseState.fromAddress);
  console.log('Release tx hash:', releaseState.txHash);
  console.log('Amount transferred ETH:', releasedAmountEth);

  const txRecord = await transactionService.createTransaction({
    txHash: releaseState.txHash,
    from: releaseState.from,
    to: ngoWalletAddress,
    fromAddress: releaseState.fromAddress || releaseState.from,
    toAddress: ngoWalletAddress,
    amount: releasedAmountEth,
    status: 'confirmed',
    network: releaseState.network,
    campaign: campaign._id,
    milestone: milestone._id,
    ngoWallet: ngoWalletAddress,
    type: 'release',
    blockNumber: releaseState.blockNumber,
    confirmations: releaseState.confirmations,
    metadata: {
      type: 'release',
      campaignId: String(campaign._id),
      milestoneId: String(milestone._id),
      ngoWallet: ngoWalletAddress,
      fromAddress: releaseState.fromAddress || releaseState.from,
      toAddress: ngoWalletAddress,
      amountETH: releasedAmountEth,
      releasedAmountWei: releaseState.releasedAmountWei,
      campaignChainId: releaseState.campaignChainId,
      milestoneChainId: releaseState.milestoneChainId,
    },
    receipt: releaseState.receipt,
  });

  const onchain = {
    txHash: releaseState.txHash,
    fromAddress: releaseState.fromAddress || releaseState.from,
    toAddress: ngoWalletAddress,
    blockNumber: releaseState.blockNumber,
    confirmations: releaseState.confirmations,
    network: releaseState.network,
    campaignChainId: releaseState.campaignChainId,
    milestoneChainId: releaseState.milestoneChainId,
    releasedAmountWei: releaseState.releasedAmountWei,
    releasedAmountEth: releaseState.releasedAmountEth,
    ngoAddress: releaseState.ngoAddress,
  };

  milestone.isPaid = true;
  milestone.status = 'completed';
  milestone.fundRequest = {
    status: 'released',
    requestedBy: milestone.fundRequest?.requestedBy,
    requestedAt: milestone.fundRequest?.requestedAt,
    releasedBy: adminId,
    releasedAt: new Date(),
    releasedAmount: releasedAmountEth,
    txHash: onchain.txHash,
    remarks: remarks || 'Released by admin after proof approval',
  };
  milestone.fundsReleased = true;
  milestone.txHash = onchain.txHash;
  milestone.ngoWalletAddress = ngoWalletAddress;
  milestone.amountETH = releasedAmountEth;
  await milestone.save();

  // Add funds to NGO wallet
  try {
    await walletService.addBalance(campaign.ngo, releasedAmountEth, `Milestone ${milestone.title} released`);
  } catch (err) {
    // Log error but don't fail the entire transaction
    console.error('Failed to update NGO wallet balance:', err.message);
  }

  const milestones = await Milestone.find({ campaign: campaign._id }).select('status');
  const allCompleted = milestones.length > 0 && milestones.every((m) => m.status === 'completed');
  if (allCompleted) {
    await Campaign.findByIdAndUpdate(campaign._id, { status: 'completed' });
  }

  return {
    milestone,
    blockchain: onchain,
    transaction: txRecord,
    warning:
      String(onchain.fromAddress || '').toLowerCase() === String(ngoWalletAddress).toLowerCase()
        ? 'Warning: admin wallet and NGO wallet are the same address.'
        : null,
  };
}

module.exports = { requestFunds, releaseFunds, releaseApprovedMilestoneFunds };
