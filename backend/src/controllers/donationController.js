const donationService = require('../services/donationService');
const { success, fail } = require('../lib/apiResponse');
const Campaign = require('../models/Campaign');
const notificationService = require('../services/notificationService');

async function createDonation(req, res, next) {
  try {
    const donorId = req.user.role === 'donor' ? req.user.sub : req.body.donorId || req.user.sub;
    const amountETH = Number(req.body.amountETH ?? req.body.amount);
    const created = await donationService.createDonation({
      campaign: req.body.campaignId,
      contractCampaignId: req.body.contractCampaignId,
      donor: donorId,
      amount: amountETH,
      amountETH,
      currency: req.body.currency || 'ETH',
      txHash: req.body.txHash,
      status: req.body.status || 'pending',
      message: req.body.message,
      metadata: req.body.metadata,
      confirmedAt: req.body.status === 'confirmed' ? new Date() : undefined,
    });

    await req.audit({
      action: 'CREATE_DONATION',
      entityType: 'Donation',
      entityId: created._id,
      metadata: { campaignId: req.body.campaignId },
    });

    return success(res, { status: 201, data: created, legacyKey: 'donation', message: 'Donation created' });
  } catch (err) {
    next(err);
  }
}

async function confirmDonation(req, res, next) {
  try {
    const donorId = req.user.role === 'donor' ? req.user.sub : req.body.donorId || req.user.sub;
    const amountETH = Number(req.body.amountETH ?? req.body.amount);

    const created = await donationService.createDonation({
      campaign: req.body.campaignId,
      contractCampaignId: req.body.contractCampaignId,
      donor: donorId,
      amount: amountETH,
      amountETH,
      currency: req.body.currency || 'ETH',
      txHash: req.body.txHash,
      status: 'confirmed',
      message: req.body.message,
      metadata: req.body.metadata,
      confirmedAt: new Date(),
    });

    await req.audit({
      action: 'CONFIRM_DONATION',
      entityType: 'Donation',
      entityId: created._id,
      metadata: { campaignId: req.body.campaignId, txHash: req.body.txHash },
    });

    const campaign = await Campaign.findById(req.body.campaignId);
    if (campaign) {
      // Notify Donor
      await notificationService.createNotification({
        user: donorId,
        title: "Donation Successful",
        message: `Your donation of ${amountETH} ETH to '${campaign.title}' was successfully processed!`,
        type: "success",
        link: "/donor/donations"
      });

      // Notify NGO
      await notificationService.createNotification({
        user: campaign.ngo,
        title: "New Donation Received",
        message: `You received a new donation of ${amountETH} ETH for '${campaign.title}'.`,
        type: "success",
        link: "/ngo/campaigns"
      });

      // Notify Admin
      await notificationService.notifyAdmins({
        title: "Donation Deposited in Escrow",
        message: `${amountETH} ETH stored in Smart Contract Balance of '${campaign.title}'`,
        type: "info",
        link: "/admin/campaigns"
      });
    }

    return success(res, { status: 201, data: created, legacyKey: 'donation', message: 'Donation confirmed' });
  } catch (err) {
    next(err);
  }
}

async function listDonations(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const perPage = Math.min(Number(req.query.perPage || 10), 100);
    const donorId = req.user.role === 'donor' ? req.user.sub : req.query.donorId;
    const { campaignId, status } = req.query;

    const { items, total } = await donationService.findDonations({ page, perPage, campaignId, donorId, status });
    return success(res, {
      data: items,
      legacyKey: 'items',
      meta: { total, page, perPage },
      extra: { total, page, perPage },
    });
  } catch (err) {
    next(err);
  }
}

async function getDonation(req, res, next) {
  try {
    const donation = await donationService.getDonationById(req.params.id);
    if (!donation) return fail(res, { status: 404, error: 'Donation not found', code: 'DONATION_NOT_FOUND' });

    const isOwner = String(donation.donor?._id || donation.donor) === String(req.user.sub);
    if (!isOwner && req.user.role !== 'admin') {
      return fail(res, { status: 403, error: 'Forbidden', code: 'FORBIDDEN' });
    }

    return success(res, { data: donation, legacyKey: 'donation' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createDonation, confirmDonation, listDonations, getDonation };
