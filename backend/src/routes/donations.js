const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const donationController = require('../controllers/donationController');
const { createDonationSchema, confirmDonationSchema, donationIdParamSchema, listDonationsQuerySchema } = require('../validation/donation');

const router = express.Router();

router.get('/donations', auth, validate(listDonationsQuerySchema, 'query'), donationController.listDonations);
router.get('/donations/:id', auth, validate(donationIdParamSchema, 'params'), donationController.getDonation);
router.post('/donations', auth, validate(createDonationSchema), donationController.createDonation);
router.post('/donations/confirm', auth, validate(confirmDonationSchema), donationController.confirmDonation);

module.exports = router;
