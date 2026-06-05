const Proof = require('../models/Proof');
const Milestone = require('../models/Milestone');
const { success, fail } = require('../lib/apiResponse');

async function createProofForMilestone(req, res, next) {
  try {
    const { milestoneId } = req.params;
    const { cid, filename, mimeType, size, remarks } = req.body;
    const userId = req.user && req.user.sub;

    const milestone = await Milestone.findById(milestoneId).populate({
      path: 'campaign',
      populate: { path: 'ngo' }
    });
    if (!milestone) {
      return fail(res, { status: 404, error: 'Milestone not found', code: 'MILESTONE_NOT_FOUND' });
    }

    // Only the NGO who owns the campaign (or admin) can submit proof
    if (String(milestone.campaign?.ngo?._id || milestone.campaign?.ngo) !== String(userId) && req.user.role !== 'admin') {
      return fail(res, {
        status: 403,
        error: 'Not allowed to submit proof for this milestone',
        code: 'FORBIDDEN',
      });
    }

    const proof = await Proof.create({
      milestone: milestone._id,
      uploader: userId,
      cid,
      filename,
      mimeType,
      size,
      remarks,
    });

    // Keep relationship and workflow status in sync.
    if (!milestone.proofs.some((id) => String(id) === String(proof._id))) {
      milestone.proofs.push(proof._id);
    }
    milestone.status = 'submitted';
    await milestone.save();

    await req.audit({
      action: 'SUBMIT_PROOF',
      entityType: 'Proof',
      entityId: proof._id,
      metadata: {
        milestoneId,
        cid,
      },
    });

    const notificationService = require('../services/notificationService');
    const campaign = milestone.campaign;
    const ngo = campaign?.ngo;
    const ngoName = ngo?.profile?.organizationName || ngo?.profile?.name || ngo?.email || 'Unknown NGO';
    const campaignName = campaign?.title || 'Unknown Campaign';
    const milestoneName = milestone.title || 'Unknown Milestone';
    const amount = `${milestone.amountETH || milestone.amount || 0} ETH`;

    await notificationService.notifyAdmins({
        title: "New Proof Uploaded",
        message: `Proof: ${campaignName}, ${ngoName}, ${milestoneName}, and ${amount}`,
        type: "info",
        link: "/admin/proofs"
    });

    return success(res, {
      status: 201,
      data: proof,
      message: 'Proof submitted',
      legacyKey: 'data',
    });
  } catch (err) {
    next(err);
  }
}

async function listMyProofs(req, res, next) {
  try {
    const userId = req.user && req.user.sub;
    const { status, campaignId } = req.query;

    const filter = { uploader: userId };
    if (status) filter.status = status;

    let proofs = await Proof.find(filter)
      .populate({
        path: 'milestone',
        select: 'title campaign',
        populate: { path: 'campaign', select: 'title ngo' },
      })
      .sort({ createdAt: -1 })
      .limit(200);

    if (campaignId) {
      proofs = proofs.filter((p) => String(p?.milestone?.campaign?._id || p?.milestone?.campaign) === String(campaignId));
    }

    return success(res, {
      data: proofs,
      legacyKey: 'items',
      message: 'Proofs fetched',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createProofForMilestone, listMyProofs };
