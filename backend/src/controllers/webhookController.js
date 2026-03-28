const config = require('../config/env');
const transactionService = require('../services/transactionService');
const { success, fail } = require('../lib/apiResponse');

function assertWebhookAuthorized(req) {
  if (!config.webhookSecret) {
    const err = new Error('Webhook secret is not configured');
    err.status = 503;
    err.code = 'WEBHOOK_SECRET_NOT_CONFIGURED';
    throw err;
  }
  const token = req.headers['x-webhook-token'];
  if (token !== config.webhookSecret) {
    const err = new Error('Invalid webhook token');
    err.status = 401;
    err.code = 'WEBHOOK_UNAUTHORIZED';
    throw err;
  }
}

async function handleTransactionWebhook(req, res, next) {
  try {
    assertWebhookAuthorized(req);

    const { txHash, status, blockNumber, confirmations, receipt, error, metadata } = req.body;
    const tx = await transactionService.updateTransactionByHash(txHash, {
      status,
      blockNumber,
      confirmations,
      receipt,
      error,
      metadata,
    });

    if (!tx) return fail(res, { status: 404, error: 'Transaction not found', code: 'TRANSACTION_NOT_FOUND' });

    if (tx.status === 'confirmed') {
      await transactionService.mirrorConfirmedDonation(tx);
    }

    await req.audit({
      action: 'webhook.transaction.updated',
      entityType: 'Transaction',
      entityId: tx._id,
      metadata: { txHash: tx.txHash, status: tx.status },
    });

    return success(res, { data: tx, legacyKey: 'transaction', message: 'Webhook processed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { handleTransactionWebhook };
