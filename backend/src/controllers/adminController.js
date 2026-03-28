const Proof = require('../models/Proof');
const Milestone = require('../models/Milestone');
const Campaign = require('../models/Campaign');
const { success, fail } = require('../lib/apiResponse');
const ngoService = require('../services/ngoService');
const auditLogService = require('../services/auditLogService');
const fundRequestService = require('../services/fundRequestService');
const campaignService = require('../services/campaignService');
const blockchainService = require('../services/blockchainService');

async function updateCampaignStateFromMilestones(campaignId) {
  if (!campaignId) return;
  const milestones = await Milestone.find({ campaign: campaignId }).select('status');
  if (!milestones.length) return;

  const allCompleted = milestones.every((m) => m.status === 'completed');
  if (allCompleted) {
    await Campaign.findByIdAndUpdate(campaignId, { status: 'completed' });
  }
}

async function listProofs(req, res, next) {
  try {
    const { status } = req.query;
    const q = {};
    if (status) q.status = status;
    const proofs = await Proof.find(q).populate('milestone uploader').sort({ createdAt: -1 }).limit(200);
    return success(res, { data: proofs, legacyKey: 'data' });
  } catch (err) {
    next(err);
  }
}

async function listNgos(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const perPage = Math.min(Number(req.query.perPage || 20), 100);
    const verificationStatus = req.query.verificationStatus;

    const { items, total } = await ngoService.listNgos({ verificationStatus, page, perPage });
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

async function listVerifiedNgos(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const perPage = Math.min(Number(req.query.perPage || 20), 100);

    const { items, total } = await ngoService.listNgos({
      verificationStatus: 'approved',
      page,
      perPage,
    });

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

async function verifyNgo(req, res, next) {
  try {
    const status = req.body?.status || 'approved';
    const ngo = await ngoService.setNgoVerification(req.params.id, status);
    if (!ngo) return fail(res, { status: 404, error: 'NGO not found', code: 'NGO_NOT_FOUND' });

    await req.audit({
      action: status === 'approved' ? 'VERIFY_NGO_APPROVED' : 'VERIFY_NGO_REJECTED',
      entityType: 'User',
      entityId: ngo._id,
      metadata: { verificationStatus: ngo.verificationStatus },
    });

    return success(res, {
      data: ngo,
      legacyKey: 'ngo',
      message: `NGO ${status}`,
    });
  } catch (err) {
    next(err);
  }
}

async function rejectNgo(req, res, next) {
  try {
    const ngo = await ngoService.setNgoVerification(req.params.id, 'rejected');
    if (!ngo) return fail(res, { status: 404, error: 'NGO not found', code: 'NGO_NOT_FOUND' });

    await req.audit({
      action: 'VERIFY_NGO_REJECTED',
      entityType: 'User',
      entityId: ngo._id,
      metadata: { verificationStatus: ngo.verificationStatus },
    });

    return success(res, {
      data: ngo,
      legacyKey: 'ngo',
      message: 'NGO rejected',
    });
  } catch (err) {
    next(err);
  }
}

async function getNgoCampaignsWithVerifiedProofs(req, res, next) {
  try {
    const data = await ngoService.getNgoCampaignsWithVerifiedProofs(req.params.id);
    if (!data) {
      return fail(res, { status: 404, error: 'NGO not found', code: 'NGO_NOT_FOUND' });
    }

    return success(res, {
      data: data.campaigns,
      legacyKey: 'items',
      extra: { ngo: data.ngo },
    });
  } catch (err) {
    next(err);
  }
}

async function removeNgo(req, res, next) {
  try {
    const result = await ngoService.removeNgoAndData(req.params.id);
    if (!result) {
      return fail(res, { status: 404, error: 'NGO not found', code: 'NGO_NOT_FOUND' });
    }

    await req.audit({
      action: 'REMOVE_NGO',
      entityType: 'User',
      entityId: req.params.id,
      metadata: {
        removedCampaigns: result.removedCampaigns,
        removedMilestones: result.removedMilestones,
      },
    });

    return success(res, {
      data: result,
      message: 'NGO removed successfully',
      legacyKey: 'result',
    });
  } catch (err) {
    next(err);
  }
}

async function listAuditLogs(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const perPage = Math.min(Number(req.query.perPage || 25), 100);
    const { action, entityType } = req.query;

    const { items, total } = await auditLogService.listAuditLogs({ page, perPage, action, entityType });
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

async function releaseMilestoneFunds(req, res, next) {
  try {
    const updated = await fundRequestService.releaseFunds({
      milestoneId: req.params.id,
      adminId: req.user.sub,
      decision: req.body.decision,
      txHash: req.body.txHash,
      remarks: req.body.remarks,
    });

    await req.audit({
      action: req.body.decision === 'approve' ? 'RELEASE_FUNDS_APPROVED' : 'RELEASE_FUNDS_REJECTED',
      entityType: 'Milestone',
      entityId: updated._id,
      metadata: {
        fundRequestStatus: updated.fundRequest.status,
        txHash: updated.fundRequest.txHash,
        releasedAmount: updated.fundRequest.releasedAmount,
      },
    });

    return success(res, {
      data: updated,
      legacyKey: 'milestone',
      message: req.body.decision === 'approve' ? 'Funds released' : 'Fund request rejected',
    });
  } catch (err) {
    next(err);
  }
}

async function releaseMilestoneFundsManual(req, res, next) {
  try {
    const { milestone, blockchain } = await fundRequestService.releaseApprovedMilestoneFunds({
      milestoneId: req.params.id,
      adminId: req.user.sub,
    });

    await req.audit({
      action: 'RELEASE_MILESTONE_FUNDS',
      entityType: 'Milestone',
      entityId: milestone._id,
      metadata: {
        status: milestone.status,
        isPaid: milestone.isPaid,
        txHash: blockchain.txHash,
        campaignChainId: blockchain.campaignChainId,
      },
    });

    return success(res, {
      data: milestone,
      legacyKey: 'milestone',
      extra: { txHash: blockchain.txHash, campaignChainId: blockchain.campaignChainId },
      message: 'Funds released successfully',
    });
  } catch (err) {
    next(err);
  }
}

async function listAdminCampaigns(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const perPage = Math.min(Number(req.query.perPage || 20), 100);
    const { search, category, status } = req.query;

    const { items, total } = await campaignService.findCampaigns({
      page,
      perPage,
      search,
      category,
      status,
    });

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

async function verifyCampaign(req, res, next) {
  try {
    const campaignId = req.params.id;
    const updated = await campaignService.updateCampaign(campaignId, { status: 'published' });
    if (!updated) {
      return fail(res, { status: 404, error: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });
    }

    await req.audit({
      action: 'VERIFY_CAMPAIGN',
      entityType: 'Campaign',
      entityId: updated._id,
      metadata: { status: updated.status },
    });

    return success(res, {
      data: updated,
      legacyKey: 'campaign',
      message: 'Campaign verified',
    });
  } catch (err) {
    next(err);
  }
}

async function rejectCampaign(req, res, next) {
  try {
    const campaignId = req.params.id;
    const updated = await campaignService.updateCampaign(campaignId, { status: 'cancelled' });
    if (!updated) {
      return fail(res, { status: 404, error: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });
    }

    await req.audit({
      action: 'REJECT_CAMPAIGN',
      entityType: 'Campaign',
      entityId: updated._id,
      metadata: { status: updated.status },
    });

    return success(res, {
      data: updated,
      legacyKey: 'campaign',
      message: 'Campaign rejected',
    });
  } catch (err) {
    next(err);
  }
}

async function verifyProof(req, res, next) {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const proof = await Proof.findById(id).populate('milestone');
    if (!proof) return fail(res, { status: 404, error: 'Proof not found', code: 'PROOF_NOT_FOUND' });
    const previousStatus = proof.status;
    proof.status = 'verified';
    proof.remarks = remarks;
    await proof.save();

    if (proof.milestone) {
      await Milestone.findByIdAndUpdate(proof.milestone._id, { status: 'approved', isPaid: false });
      await updateCampaignStateFromMilestones(proof.milestone.campaign);
    }

    await req.audit({
      action: 'VERIFY_PROOF',
      entityType: 'Proof',
      entityId: proof._id,
      metadata: {
        previousStatus,
        newStatus: proof.status,
        remarks,
      },
    });

    return success(res, { data: proof, message: 'Proof verified', legacyKey: 'data' });
  } catch (err) {
    next(err);
  }
}

async function rejectProof(req, res, next) {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const proof = await Proof.findById(id).populate('milestone');
    if (!proof) return fail(res, { status: 404, error: 'Proof not found', code: 'PROOF_NOT_FOUND' });
    const previousStatus = proof.status;
    proof.status = 'rejected';
    proof.remarks = remarks;
    await proof.save();

    if (proof.milestone) {
      await Milestone.findByIdAndUpdate(proof.milestone._id, { status: 'rejected' });
      await Campaign.findByIdAndUpdate(proof.milestone.campaign, { status: 'published' });
    }

    await req.audit({
      action: 'REJECT_PROOF',
      entityType: 'Proof',
      entityId: proof._id,
      metadata: {
        previousStatus,
        newStatus: proof.status,
        remarks,
      },
    });

    return success(res, { data: proof, message: 'Proof rejected', legacyKey: 'data' });
  } catch (err) {
    next(err);
  }
}

async function getContractBalance(req, res, next) {
  try {
    const balance = await blockchainService.getContractBalance();
    return success(res, {
      data: {
        balanceEth: balance.balanceEth,
        balanceWei: balance.balanceWei,
        contractAddress: balance.address,
      },
      legacyKey: 'balance',
      message: 'Contract balance retrieved',
    });
  } catch (err) {
    next(err);
  }
}

async function getCampaignFundsDetails(req, res, next) {
  try {
    const campaigns = await Campaign.find({ status: 'published' })
      .populate('ngo', 'email profile walletAddress')
      .select('title slug ngoWalletAddress fundingGoal status');

    if (!campaigns.length) {
      return success(res, {
        data: [],
        legacyKey: 'campaigns',
        message: 'No campaigns found',
      });
    }

    // Fetch blockchain data for each campaign
    const campaignFunds = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          const blockchainData = await blockchainService.getCampaignFunds(campaign._id);
          
          // Fetch all milestones for this campaign
          const milestones = await Milestone.find({ campaign: campaign._id });
          const lockedFunds = milestones
            .filter((m) => !m.isPaid && m.fundRequest?.status !== 'rejected')
            .reduce((sum, m) => sum + Number(m.amount || 0), 0);
          
          const releasedFunds = milestones
            .filter((m) => m.isPaid)
            .reduce((sum, m) => sum + Number(m.fundRequest?.releasedAmount || 0), 0);

          return {
            campaignId: campaign._id,
            title: campaign.title,
            slug: campaign.slug,
            ngoWalletAddress: campaign.ngoWalletAddress,
            ngo: campaign.ngo,
            contractBalanceEth: blockchainData.fundsEth,
            contractBalanceWei: blockchainData.fundsWei,
            lockedFunds,
            releasedFunds,
            fundingGoal: campaign.fundingGoal,
          };
        } catch (error) {
          // Return campaign without blockchain data if fetch fails
          return {
            campaignId: campaign._id,
            title: campaign.title,
            slug: campaign.slug,
            ngoWalletAddress: campaign.ngoWalletAddress,
            ngo: campaign.ngo,
            contractBalanceEth: 'N/A',
            contractBalanceWei: 'N/A',
            lockedFunds: 0,
            releasedFunds: 0,
            fundingGoal: campaign.fundingGoal,
            error: error?.message,
          };
        }
      })
    );

    return success(res, {
      data: campaignFunds,
      legacyKey: 'campaigns',
      message: 'Campaign funds details retrieved',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProofs,
  verifyProof,
  rejectProof,
  listNgos,
  listVerifiedNgos,
  verifyNgo,
  rejectNgo,
  getNgoCampaignsWithVerifiedProofs,
  removeNgo,
  listAuditLogs,
  releaseMilestoneFunds,
  releaseMilestoneFundsManual,
  listAdminCampaigns,
  verifyCampaign,
  rejectCampaign,
  getContractBalance,
  getCampaignFundsDetails,
};
