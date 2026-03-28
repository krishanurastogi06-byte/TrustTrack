const Transaction = require('../models/Transaction');
const logger = require('../lib/logger');
const blockchainService = require('./blockchainService');
const transactionService = require('./transactionService');

async function reconcilePendingTransactions({ limit = 25 } = {}) {
  const pending = await Transaction.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(limit);
  const summary = { checked: pending.length, confirmed: 0, failed: 0, pending: 0, errors: 0 };

  for (const tx of pending) {
    try {
      const state = await blockchainService.getTransactionStatus(tx.txHash);
      if (state.status === 'pending') {
        summary.pending += 1;
        continue;
      }

      const updated = await transactionService.updateTransactionByHash(tx.txHash, {
        status: state.status,
        blockNumber: state.blockNumber,
        confirmations: state.confirmations,
        receipt: state.receipt,
      });

      if (updated && updated.status === 'confirmed') {
        await transactionService.mirrorConfirmedDonation(updated);
      }

      if (state.status === 'confirmed') summary.confirmed += 1;
      if (state.status === 'failed') summary.failed += 1;
    } catch (err) {
      summary.errors += 1;
      logger.warn('Reconciliation failed for tx', { txHash: tx.txHash, error: err.message });
    }
  }

  return summary;
}

module.exports = { reconcilePendingTransactions };
