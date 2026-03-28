const express = require('express');
const validate = require('../middleware/validate');
const { handleTransactionWebhook } = require('../controllers/webhookController');
const { transactionWebhookSchema } = require('../validation/webhook');

const router = express.Router();

router.post('/transactions', validate(transactionWebhookSchema), handleTransactionWebhook);

module.exports = router;
