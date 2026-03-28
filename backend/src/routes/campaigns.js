const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const validate = require('../middleware/validate');
const {
	createCampaignSchema,
	updateCampaignSchema,
	campaignIdParamSchema,
	listCampaignsQuerySchema,
} = require('../validation/campaign');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

// Public list & detail
router.get('/campaigns', validate(listCampaignsQuerySchema, 'query'), campaignController.listCampaigns);
router.get('/campaigns/:id', validate(campaignIdParamSchema, 'params'), campaignController.getCampaign);

// Protected: NGO can create campaigns
router.post('/campaigns', auth, roles('ngo'), validate(createCampaignSchema), campaignController.createCampaign);

// Protected update/delete: owner or admin
const ensureCampaignOwnerOrAdmin = require('../middleware/ownership');

router.put(
	'/campaigns/:id',
	auth,
	validate(campaignIdParamSchema, 'params'),
	ensureCampaignOwnerOrAdmin('id'),
	validate(updateCampaignSchema),
	campaignController.updateCampaign
);
router.patch(
	'/campaigns/:id',
	auth,
	validate(campaignIdParamSchema, 'params'),
	ensureCampaignOwnerOrAdmin('id'),
	validate(updateCampaignSchema),
	campaignController.updateCampaign
);
router.delete(
	'/campaigns/:id',
	auth,
	validate(campaignIdParamSchema, 'params'),
	ensureCampaignOwnerOrAdmin('id'),
	campaignController.removeCampaign
);

module.exports = router;
