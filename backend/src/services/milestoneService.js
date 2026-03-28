const Milestone = require('../models/Milestone');
const Proof = require('../models/Proof');

async function createMilestone(campaignId, data) {
  const m = new Milestone({ ...data, campaign: campaignId });
  return m.save();
}

async function getMilestoneById(id) {
  return Milestone.findById(id).populate('proofs');
}

async function updateMilestone(id, patch) {
  return Milestone.findByIdAndUpdate(id, patch, { new: true });
}

async function deleteMilestone(id) {
  await Proof.deleteMany({ milestone: id });
  return Milestone.findByIdAndDelete(id);
}

async function listMilestonesForCampaign(campaignId) {
  return Milestone.find({ campaign: campaignId }).sort({ createdAt: 1 });
}

module.exports = { createMilestone, getMilestoneById, updateMilestone, deleteMilestone, listMilestonesForCampaign };
