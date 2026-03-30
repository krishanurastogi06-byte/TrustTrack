const express = require('express');
const {
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
} = require('../controllers/adminController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const { proofIdParamSchema, proofStatusQuerySchema, verifyRejectProofSchema } = require('../validation/proof');
const {
	ngoIdParamSchema,
	verifyNgoSchema,
	listNgosQuerySchema,
	listAuditLogsQuerySchema,
	listAdminCampaignsQuerySchema,
	milestoneIdParamSchema,
	campaignIdParamSchema,
	releaseFundsSchema,
	manualReleaseSchema,
} = require('../validation/admin');

const router = express.Router();

// protect all admin routes
router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/proofs', validate(proofStatusQuerySchema, 'query'), listProofs);
router.post('/proofs/:id/verify', validate(proofIdParamSchema, 'params'), validate(verifyRejectProofSchema), verifyProof);
router.post('/proofs/:id/reject', validate(proofIdParamSchema, 'params'), validate(verifyRejectProofSchema), rejectProof);

router.get('/ngos', validate(listNgosQuerySchema, 'query'), listNgos);
router.get('/ngos/verified', validate(listNgosQuerySchema, 'query'), listVerifiedNgos);
router.patch('/ngos/:id/verify', validate(ngoIdParamSchema, 'params'), verifyNgo);
router.patch('/ngos/:id/reject', validate(ngoIdParamSchema, 'params'), rejectNgo);
router.get('/ngos/:id/campaigns', validate(ngoIdParamSchema, 'params'), getNgoCampaignsWithVerifiedProofs);
router.delete('/ngos/:id', validate(ngoIdParamSchema, 'params'), removeNgo);

// Backward-compatible route (legacy clients may still post status body)
router.post('/ngos/:id/verify', validate(ngoIdParamSchema, 'params'), validate(verifyNgoSchema), verifyNgo);

router.get('/audit-logs', validate(listAuditLogsQuerySchema, 'query'), listAuditLogs);
router.get('/campaigns', validate(listAdminCampaignsQuerySchema, 'query'), listAdminCampaigns);
router.patch('/campaigns/:id/verify', validate(campaignIdParamSchema, 'params'), verifyCampaign);
router.patch('/campaigns/:id/reject', validate(campaignIdParamSchema, 'params'), rejectCampaign);

router.post(
	'/milestones/:id/release',
	validate(milestoneIdParamSchema, 'params'),
	validate(manualReleaseSchema),
	releaseMilestoneFundsManual
);

router.post(
	'/milestones/:id/release-funds',
	validate(milestoneIdParamSchema, 'params'),
	validate(releaseFundsSchema),
	releaseMilestoneFunds
);

// Contract and fund visibility endpoints
router.get('/contract-balance', getContractBalance);
router.get('/campaign-funds', getCampaignFundsDetails);

module.exports = router;
