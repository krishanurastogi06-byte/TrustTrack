const milestoneService = require('../services/milestoneService');
const { success, fail } = require('../lib/apiResponse');
const logger = require('../lib/logger');

async function addMilestone(req, res, next) {
  try {
    const campaignId = req.params.campaignId;
    const data = req.body;
    const created = await milestoneService.createMilestone(campaignId, data);

    await req.audit({
      action: 'CREATE_MILESTONE',
      entityType: 'Milestone',
      entityId: created._id,
      metadata: { campaignId },
    });

    return success(res, { status: 201, data: created, legacyKey: 'milestone', message: 'Milestone created' });
  } catch (err) {
    logger.error('Milestone creation failed', {
      campaignId: req.params?.campaignId,
      milestoneTitle: String(req.body?.title || '').trim(),
      milestoneOrder: Number(req.body?.order || 0) || null,
      error: err?.message,
      code: err?.code,
      details: err?.details,
    });
    next(err);
  }
}

async function listMilestones(req, res, next) {
  try {
    const campaignId = req.params.campaignId;
    const items = await milestoneService.listMilestonesForCampaign(campaignId);
    return success(res, { data: items, legacyKey: 'items' });
  } catch (err) {
    next(err);
  }
}

async function getMilestone(req, res, next) {
  try {
    const id = req.params.id;
    const m = await milestoneService.getMilestoneById(id);
    if (!m) return fail(res, { status: 404, error: 'Milestone not found', code: 'MILESTONE_NOT_FOUND' });
    return success(res, { data: m, legacyKey: 'milestone' });
  } catch (err) {
    next(err);
  }
}

async function updateMilestone(req, res, next) {
  try {
    const id = req.params.id;
    const updated = await milestoneService.updateMilestone(id, req.body);
    if (!updated) return fail(res, { status: 404, error: 'Milestone not found', code: 'MILESTONE_NOT_FOUND' });
    return success(res, { data: updated, legacyKey: 'milestone', message: 'Milestone updated' });
  } catch (err) {
    next(err);
  }
}

async function removeMilestone(req, res, next) {
  try {
    const id = req.params.id;
    const removed = await milestoneService.deleteMilestone(id);
    if (!removed) return fail(res, { status: 404, error: 'Milestone not found', code: 'MILESTONE_NOT_FOUND' });
    return success(res, { data: null, message: 'Milestone deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { addMilestone, listMilestones, getMilestone, updateMilestone, removeMilestone };
