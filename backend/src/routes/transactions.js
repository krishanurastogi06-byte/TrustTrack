const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const transactionController = require('../controllers/transactionController');
const { createTransactionSchema, updateTransactionSchema, transactionTxHashParamSchema } = require('../validation/transaction');

const router = express.Router();

router.post('/transactions', auth, validate(createTransactionSchema), transactionController.createTransaction);
router.patch(
	'/transactions/:txHash',
	auth,
	validate(transactionTxHashParamSchema, 'params'),
	validate(updateTransactionSchema),
	transactionController.patchTransaction
);

module.exports = router;
