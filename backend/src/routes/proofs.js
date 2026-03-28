const express = require('express');
const { createProofForMilestone, listMyProofs } = require('../controllers/proofController');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { proofMilestoneParamSchema, createProofSchema, myProofsQuerySchema } = require('../validation/proof');

const router = express.Router();

// GET /api/proofs/me
router.get('/proofs/me', requireAuth, validate(myProofsQuerySchema, 'query'), listMyProofs);

// POST /api/milestones/:milestoneId/proofs
router.post(
	'/milestones/:milestoneId/proofs',
	requireAuth,
	validate(proofMilestoneParamSchema, 'params'),
	validate(createProofSchema),
	createProofForMilestone
);

module.exports = router;
