const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestoneController');
const validate = require('../middleware/validate');
const {
	createMilestoneSchema,
	updateMilestoneSchema,
	campaignMilestoneParamSchema,
	milestoneIdParamSchema,
} = require('../validation/milestone');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

// Create and list milestones under campaign
// Only the campaign owner (NGO) or admin can add milestones
const ensureCampaignOwnerOrAdmin = require('../middleware/ownership');
router.post(
	'/campaigns/:campaignId/milestones',
	auth,
	validate(campaignMilestoneParamSchema, 'params'),
	ensureCampaignOwnerOrAdmin('campaignId'),
	validate(createMilestoneSchema),
	milestoneController.addMilestone
);
router.get('/campaigns/:campaignId/milestones', validate(campaignMilestoneParamSchema, 'params'), milestoneController.listMilestones);

// Milestone operations
router.get('/milestones/:id', validate(milestoneIdParamSchema, 'params'), milestoneController.getMilestone);
router.patch('/milestones/:id', auth, validate(milestoneIdParamSchema, 'params'), validate(updateMilestoneSchema), milestoneController.updateMilestone);
router.delete('/milestones/:id', auth, validate(milestoneIdParamSchema, 'params'), roles('admin'), milestoneController.removeMilestone);

module.exports = router;
