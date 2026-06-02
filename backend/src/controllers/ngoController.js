const Milestone = require('../models/Milestone');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const fundRequestService = require('../services/fundRequestService');
const ngoFundsService = require('../services/ngoFundsService');
const walletService = require('../services/walletService');
const { success, fail } = require('../lib/apiResponse');

async function requestMilestoneFunds(req, res, next) {
  try {
    const milestone = await Milestone.findById(req.params.id).populate('campaign');
    if (!milestone) {
      return fail(res, { status: 404, error: 'Milestone not found', code: 'MILESTONE_NOT_FOUND' });
    }

    const campaign = milestone.campaign || (await Campaign.findById(milestone.campaign));
    if (!campaign) {
      return fail(res, { status: 404, error: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });
    }

    if (String(campaign.ngo) !== String(req.user.sub)) {
      return fail(res, { status: 403, error: 'Forbidden: not campaign owner', code: 'FORBIDDEN' });
    }

    const updated = await fundRequestService.requestFunds({
      milestoneId: milestone._id,
      requesterId: req.user.sub,
    });

    await req.audit({
      action: 'REQUEST_MILESTONE_FUNDS',
      entityType: 'Milestone',
      entityId: updated._id,
      metadata: {
        fundRequestStatus: updated.fundRequest.status,
      },
    });

    return success(res, {
      data: updated,
      legacyKey: 'milestone',
      message: 'Fund request submitted',
    });
  } catch (err) {
    next(err);
  }
}

async function getNgoProfile(req, res, next) {
  try {
    const ngoId = req.params.id || req.user.sub;
    
    if (req.params.id && String(req.params.id) !== String(req.user.sub)) {
      return fail(res, { status: 403, error: 'Forbidden: cannot view other NGO profiles', code: 'FORBIDDEN' });
    }

    const ngo = await User.findOne({ _id: ngoId, role: 'ngo' });
    if (!ngo) {
      return fail(res, { status: 404, error: 'NGO not found', code: 'NGO_NOT_FOUND' });
    }

    let walletConflictWithDonor = false;
    if (ngo.walletAddress) {
      walletConflictWithDonor = !!(await User.exists({
        _id: { $ne: ngo._id },
        role: 'donor',
        walletAddress: ngo.walletAddress,
      }));
    }

    const ngoPayload = ngo.toJSON();
    ngoPayload.walletConflictWithDonor = walletConflictWithDonor;

    return success(res, {
      data: ngoPayload,
      legacyKey: 'profile',
      message: 'NGO profile retrieved',
    });
  } catch (err) {
    next(err);
  }
}

async function updateNgoProfile(req, res, next) {
  try {
    const ngoId = req.params.id || req.user.sub;
    
    if (req.params.id && String(req.params.id) !== String(req.user.sub)) {
      return fail(res, { status: 403, error: 'Forbidden: cannot update other NGO profiles', code: 'FORBIDDEN' });
    }

    const ngo = await User.findOne({ _id: ngoId, role: 'ngo' });
    if (!ngo) {
      return fail(res, { status: 404, error: 'NGO not found', code: 'NGO_NOT_FOUND' });
    }

    const updateData = {};

    if (req.body.profile) {
      if (req.body.profile.name) {
        updateData['profile.name'] = req.body.profile.name;
      }
      if (req.body.profile.organizationName) {
        updateData['profile.organizationName'] = req.body.profile.organizationName;
      }
      if (req.body.profile.phone) {
        updateData['profile.phone'] = req.body.profile.phone;
      }
    }

    if (req.body.walletAddress) {
      const nextWalletAddress = req.body.walletAddress.toLowerCase();

      const addressInUseByOthers = await User.exists({
        _id: { $ne: ngo._id },
        walletAddress: nextWalletAddress,
      });

      if (addressInUseByOthers) {
        return fail(res, {
          status: 409,
          error: 'Wallet address is already linked to another user',
          code: 'WALLET_ADDRESS_ALREADY_IN_USE',
        });
      }

      updateData.walletAddress = nextWalletAddress;
    }

    if (Object.keys(updateData).length === 0) {
      return fail(res, { status: 400, error: 'No valid update fields provided', code: 'INVALID_UPDATE' });
    }

    const updated = await User.findByIdAndUpdate(ngoId, updateData, { new: true });

    await req.audit({
      action: 'UPDATE_NGO_PROFILE',
      entityType: 'User',
      entityId: ngo._id,
      metadata: {
        updatedFields: Object.keys(updateData),
      },
    });

    return success(res, {
      data: updated,
      legacyKey: 'profile',
      message: 'NGO profile updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

async function getFundsSummary(req, res, next) {
  try {
    const ngoId = req.user.sub;
    const summary = await ngoFundsService.getNgoFundsSummary(ngoId);

    return success(res, {
      data: summary,
      legacyKey: 'summary',
      message: 'NGO funds summary retrieved',
    });
  } catch (err) {
    next(err);
  }
}

async function getWallet(req, res, next) {
  try {
    const ngoId = req.user.sub;
    const wallet = await walletService.getOrCreateWallet(ngoId);

    return success(res, {
      data: wallet,
      legacyKey: 'wallet',
      message: 'NGO wallet retrieved',
    });
  } catch (err) {
    next(err);
  }
}

async function getWalletBalance(req, res, next) {
  try {
    const ngoId = req.user.sub;
    const wallet = await walletService.getOrCreateWallet(ngoId);

    return success(res, {
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
        transactionCount: wallet.transactionCount,
        lastTransactionAt: wallet.lastTransactionAt,
      },
      legacyKey: 'balance',
      message: 'NGO wallet balance retrieved',
    });
  } catch (err) {
    next(err);
  }
}

async function listPublicNgos(req, res, next) {
  try {
    const ngos = await User.find({ role: 'ngo', verificationStatus: 'approved' })
      .select('profile email _id createdAt');

    return success(res, {
      data: ngos,
      legacyKey: 'items',
      message: 'Verified NGOs retrieved',
    });
  } catch (err) {
    next(err);
  }
}


module.exports = { 
  requestMilestoneFunds, 
  getNgoProfile,
  updateNgoProfile,
  getFundsSummary,
  getWallet,
  getWalletBalance,
  listPublicNgos,
};
