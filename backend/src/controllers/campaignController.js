const campaignService = require('../services/campaignService');
const blockchainService = require('../services/blockchainService');
const { success, fail } = require('../lib/apiResponse');
const User = require('../models/User');
const { inrToEth } = require('../lib/currency');

async function createCampaign(req, res, next) {
  try {
    const ngo = await User.findById(req.user?.sub);
    if (!ngo || ngo.role !== 'ngo') {
      return fail(res, { status: 403, error: 'Only NGOs can create campaigns', code: 'FORBIDDEN' });
    }
    if (!ngo.isVerified || ngo.verificationStatus !== 'approved') {
      return fail(res, {
        status: 403,
        error: 'NGO is not verified to create campaigns',
        code: 'NGO_NOT_VERIFIED',
      });
    }

    if (!ngo.walletAddress) {
      return fail(res, {
        status: 409,
        error: 'NGO wallet address is required before campaign creation',
        code: 'NGO_WALLET_NOT_CONFIGURED',
      });
    }

    const fundingGoalINR = Number(req.body.fundingGoalINR ?? req.body.fundingGoal);

    const data = {
      ...req.body,
      fundingGoal: fundingGoalINR,
      fundingGoalINR,
      fundingGoalETH: inrToEth(fundingGoalINR),
      ngo: req.user?.sub,
      ngoWalletAddress: ngo.walletAddress,
    };
    const created = await campaignService.createCampaign(data);

    await req.audit({
      action: 'CREATE_CAMPAIGN',
      entityType: 'Campaign',
      entityId: created._id,
      metadata: { ngoId: req.user?.sub },
    });

    const notificationService = require('../services/notificationService');
    const ngoName = ngo.profile?.organizationName || ngo.profile?.name || ngo.email;
    await notificationService.notifyAdmins({
        title: "New Campaign Created",
        message: `Campaign: ${ngoName}, ${created.title}, and ${created.fundingGoalETH} ETH`,
        type: "info",
        link: "/admin/campaigns"
    });

    return success(res, { status: 201, data: created, legacyKey: 'campaign', message: 'Campaign created' });
  } catch (err) {
    next(err);
  }
}

async function listCampaigns(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const perPage = Math.min(Number(req.query.perPage || 10), 100);
    const { search, category, ngoId, status: queryStatus } = req.query;

    // Public and donor-facing listings should only show admin-verified campaigns by default.
    // NGO-specific listings can show all statuses for owner management.
    const status = queryStatus ? queryStatus : (ngoId ? undefined : 'published');

    const { items, total } = await campaignService.findCampaigns({ page, perPage, search, category, ngoId, status });
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

async function getCampaign(req, res, next) {
  try {
    const id = req.params.id;
    const { campaign, milestones } = await campaignService.getCampaignWithMilestones(id);
    if (!campaign) return fail(res, { status: 404, error: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });

    let contractAddress = null;
    try {
      contractAddress = blockchainService.getConfiguredContractAddress();
    } catch (_err) {
      contractAddress = null;
    }

    return success(res, {
      data: campaign,
      legacyKey: 'campaign',
      extra: { milestones, contractAddress },
    });
  } catch (err) {
    next(err);
  }
}

async function updateCampaign(req, res, next) {
  try {
    const id = req.params.id;
    const { milestones, ...campaignPatch } = req.body || {};

    if (Array.isArray(milestones)) {
      const seen = new Set();
      for (const m of milestones) {
        const normalizedTitle = String(m?.title || '').trim().toLowerCase();
        if (!normalizedTitle) {
          return fail(res, { status: 400, error: 'Milestone title is required', code: 'VALIDATION_ERROR' });
        }
        if (seen.has(normalizedTitle)) {
          return fail(res, {
            status: 400,
            error: 'Duplicate milestone titles are not allowed',
            code: 'DUPLICATE_MILESTONES',
          });
        }
        seen.add(normalizedTitle);
      }
    }

    const updated = Object.keys(campaignPatch).length
      ? await campaignService.updateCampaign(id, campaignPatch)
      : await campaignService.getCampaignById(id);
    if (!updated) return fail(res, { status: 404, error: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });

    const updatedMilestones = Array.isArray(milestones)
      ? await campaignService.syncCampaignMilestones(id, milestones)
      : await campaignService.getCampaignWithMilestones(id).then((result) => result.milestones);

    return success(res, {
      data: updated,
      legacyKey: 'campaign',
      message: 'Campaign updated',
      extra: { milestones: updatedMilestones },
    });
  } catch (err) {
    next(err);
  }
}

async function removeCampaign(req, res, next) {
  try {
    const id = req.params.id;
    const removed = await campaignService.deleteCampaign(id);
    if (!removed) return fail(res, { status: 404, error: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });
    return success(res, {
      data: { id: removed._id },
      legacyKey: 'campaign',
      message: 'Campaign deleted',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCampaign, listCampaigns, getCampaign, updateCampaign, removeCampaign };
