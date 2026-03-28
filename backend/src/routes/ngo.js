const express = require('express');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const validate = require('../middleware/validate');
const ngoController = require('../controllers/ngoController');
const { milestoneIdParamSchema, updateNgoProfileSchema, getNgoProfileParamSchema } = require('../validation/ngo');

const router = express.Router();

// Profile endpoints (NGO only)
router.get(
  '/profile',
  auth,
  roles('ngo'),
  ngoController.getNgoProfile
);

router.put(
  '/profile',
  auth,
  roles('ngo'),
  validate(updateNgoProfileSchema),
  ngoController.updateNgoProfile
);

// Funds summary (NGO only)
router.get(
  '/funds-summary',
  auth,
  roles('ngo'),
  ngoController.getFundsSummary
);

// Wallet endpoints (NGO only)
router.get(
  '/wallet',
  auth,
  roles('ngo'),
  ngoController.getWallet
);

router.get(
  '/wallet/balance',
  auth,
  roles('ngo'),
  ngoController.getWalletBalance
);

router.post(
  '/milestones/:id/request-funds',
  auth,
  roles('ngo'),
  validate(milestoneIdParamSchema, 'params'),
  ngoController.requestMilestoneFunds
);

module.exports = router;

