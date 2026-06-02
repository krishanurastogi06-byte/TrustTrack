const Donation = require('../models/Donation');
const Transaction = require('../models/Transaction');
const Campaign = require('../models/Campaign');
const blockchainService = require('./blockchainService');

function assertPositiveAmount(amountEth) {
  const amount = Number(amountEth);
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error('Donation amount must be greater than zero');
    err.status = 400;
    err.code = 'INVALID_DONATION_AMOUNT';
    throw err;
  }
  return amount;
}

async function assertDonationWithinCampaignLimit(campaignId, amountEth) {
  const campaign = await Campaign.findById(campaignId).select('_id fundingGoalETH raisedETH');
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.status = 404;
    err.code = 'CAMPAIGN_NOT_FOUND';
    throw err;
  }

  const fundingGoalETH = Number(campaign.fundingGoalETH || 0);
  const raisedETH = Number(campaign.raisedETH || 0);
  const remainingETH = fundingGoalETH - raisedETH;

  if (remainingETH <= 0) {
    const err = new Error('Campaign is already fully funded');
    err.status = 409;
    err.code = 'CAMPAIGN_FULLY_FUNDED';
    throw err;
  }

  if (Number(amountEth) > remainingETH + 1e-12) {
    const err = new Error('Donation exceeds remaining campaign goal');
    err.status = 409;
    err.code = 'DONATION_EXCEEDS_REMAINING_GOAL';
    err.meta = { remainingETH };
    throw err;
  }

  return { campaign, remainingETH };
}

async function applyCampaignFundingProgress(campaignId, donatedAmountEth) {
  const campaign = await Campaign.findById(campaignId).select('_id fundingGoalETH raisedETH fundedPercentage');
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.status = 404;
    err.code = 'CAMPAIGN_NOT_FOUND';
    throw err;
  }

  campaign.raisedETH = Number(campaign.raisedETH || 0) + Number(donatedAmountEth || 0);
  const goalEth = Number(campaign.fundingGoalETH || 0);
  campaign.fundedPercentage = goalEth > 0
    ? Math.min((campaign.raisedETH / goalEth) * 100, 100)
    : 0;

  await campaign.save();
  console.log('[donationService] Campaign updated', {
    campaignId: String(campaign._id),
    raisedETH: campaign.raisedETH,
    fundingGoalETH: goalEth,
    fundedPercentage: campaign.fundedPercentage,
  });
}

async function createDonation(data) {
  const campaign = await Campaign.findById(data.campaign).select('_id contractCampaignId');
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.status = 404;
    err.code = 'CAMPAIGN_NOT_FOUND';
    throw err;
  }

  if (blockchainService.isOnChainSyncEnabled()) {
    if (!campaign.contractCampaignId) {
      const err = new Error('Campaign is missing contractCampaignId');
      err.status = 409;
      err.code = 'CONTRACT_CAMPAIGN_ID_MISSING';
      throw err;
    }

    if (data.contractCampaignId && String(data.contractCampaignId) !== String(campaign.contractCampaignId)) {
      const err = new Error('Provided contractCampaignId does not match campaign mapping');
      err.status = 409;
      err.code = 'CONTRACT_CAMPAIGN_ID_MISMATCH';
      throw err;
    }
  }

  console.log('[donationService] Campaign mapping for donation', {
    campaignDbId: String(campaign._id),
    contractCampaignId: String(campaign.contractCampaignId),
  });

  let normalizedAmountEth = assertPositiveAmount(data.amountETH ?? data.amount ?? 0);
  const isConfirmed = data.status === 'confirmed';

  if (isConfirmed) {
    if (!data.txHash) {
      const err = new Error('txHash is required for confirmed donations');
      err.status = 400;
      err.code = 'TX_HASH_REQUIRED';
      throw err;
    }
    if (blockchainService.isOnChainSyncEnabled()) {
      const onchain = await blockchainService.assertConfirmedDonationTransaction({
        txHash: data.txHash,
        campaignId: campaign.contractCampaignId,
        expectedAmountEth: normalizedAmountEth,
      });
      normalizedAmountEth = Number(onchain.amountEth);
    }
  }

  let saved;
  const existing = data.txHash ? await Donation.findOne({ txHash: data.txHash }) : null;

  if (existing) {
    const wasConfirmed = existing.status === 'confirmed';

    if (wasConfirmed && isConfirmed) {
      console.log('[donationService] Duplicate confirmed txHash, skipping campaign increment', {
        txHash: data.txHash,
        donationId: String(existing._id),
      });
      return existing;
    }

    if (isConfirmed) {
      await assertDonationWithinCampaignLimit(data.campaign, normalizedAmountEth);
    }

    existing.campaign = data.campaign;
    existing.donor = data.donor;
    existing.amount = normalizedAmountEth;
    existing.amountETH = normalizedAmountEth;
    existing.currency = data.currency || 'ETH';
    existing.status = data.status || existing.status;
    existing.message = data.message;
    existing.metadata = data.metadata;
    existing.confirmedAt = existing.status === 'confirmed' ? (data.confirmedAt || existing.confirmedAt || new Date()) : undefined;
    saved = await existing.save();
    console.log('[donationService] Donation saved', {
      donationId: String(saved._id),
      txHash: saved.txHash,
      status: saved.status,
      amountETH: saved.amountETH,
      mode: 'update',
    });

    if (!wasConfirmed && saved.status === 'confirmed') {
      await applyCampaignFundingProgress(saved.campaign, saved.amountETH);
    }
  } else {
    if (isConfirmed) {
      await assertDonationWithinCampaignLimit(data.campaign, normalizedAmountEth);
    }

    const donation = new Donation({
      ...data,
      amount: normalizedAmountEth,
      amountETH: normalizedAmountEth,
    });
    saved = await donation.save();
    console.log('[donationService] Donation saved', {
      donationId: String(saved._id),
      txHash: saved.txHash,
      status: saved.status,
      amountETH: saved.amountETH,
      mode: 'create',
    });

    if (saved.status === 'confirmed') {
      await applyCampaignFundingProgress(saved.campaign, saved.amountETH);
    }
  }

  if (saved.txHash) {
    await Transaction.findOneAndUpdate(
      { txHash: saved.txHash },
      {
        donation: saved._id,
        campaign: saved.campaign,
        donor: saved.donor,
      },
      { new: true }
    );
  }

  return saved;
}

async function getDonationById(id) {
  return Donation.findById(id).populate('campaign donor');
}

async function findDonations({ page = 1, perPage = 10, campaignId, donorId, status } = {}) {
  const filter = {};
  if (campaignId) filter.campaign = campaignId;
  if (donorId) filter.donor = donorId;
  if (status) filter.status = status;

  const skip = (page - 1) * perPage;
  const [items, total] = await Promise.all([
    Donation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).populate('campaign donor').lean(),
    Donation.countDocuments(filter),
  ]);

  return { items, total };
}

module.exports = { createDonation, getDonationById, findDonations };
