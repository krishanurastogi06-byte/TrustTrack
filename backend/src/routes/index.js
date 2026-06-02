const express = require('express');
const health = require('./health');
const auth = require('./auth');
const campaigns = require('./campaigns');
const milestones = require('./milestones');
const uploads = require('./uploads');
const proofs = require('./proofs');
const admin = require('./admin');
const donations = require('./donations');
const transactions = require('./transactions');
const webhooks = require('./webhooks');
const ngo = require('./ngo');
const donors = require('./donors');
const notifications = require('./notificationRoutes');

const router = express.Router();

router.use('/api', health);
router.use('/api/auth', auth);
router.use('/api', auth);
router.use('/api', campaigns);
router.use('/api', milestones);
router.use('/api/uploads', uploads);
router.use('/api', proofs);
router.use('/api/admin', admin);
router.use('/api', donations);
router.use('/api', transactions);
router.use('/api/webhooks', webhooks);
router.use('/api/ngo', ngo);
router.use('/api/donor', donors);
router.use('/api/notifications', notifications);

// TODO: mount other route modules here (auth, campaigns, donations...)

router.get('/', (req, res) => res.json({ message: 'TrustTrack API' }));

module.exports = router;
