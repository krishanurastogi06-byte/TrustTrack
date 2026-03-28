const transactionService = require('../services/transactionService');
const { success, fail } = require('../lib/apiResponse');

async function createTransaction(req, res, next) {
  try {
    const tx = await transactionService.createTransaction({
      txHash: req.body.txHash,
      from: req.body.from,
      to: req.body.to,
      amount: req.body.amount,
      status: req.body.status || 'pending',
      network: req.body.network,
      campaign: req.body.campaignId,
      donor: req.user.sub,
      blockNumber: req.body.blockNumber,
      metadata: req.body.metadata,
    });

    await req.audit({
      action: 'transaction.created',
      entityType: 'Transaction',
      entityId: tx._id,
      metadata: { txHash: tx.txHash, status: tx.status },
    });

    if (tx.status === 'confirmed') {
      await transactionService.mirrorConfirmedDonation(tx);
    }

    return success(res, { status: 201, data: tx, legacyKey: 'transaction', message: 'Transaction recorded' });
  } catch (err) {
    next(err);
  }
}

async function patchTransaction(req, res, next) {
  try {
    const txHash = req.params.txHash;
    const currentTx = await transactionService.getTransactionByHash(txHash);
    if (!currentTx) return fail(res, { status: 404, error: 'Transaction not found', code: 'TRANSACTION_NOT_FOUND' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = String(currentTx.donor) === String(req.user.sub);
    if (!isAdmin && !isOwner) {
      return fail(res, { status: 403, error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const tx = await transactionService.updateTransactionByHash(txHash, {
      status: req.body.status,
      blockNumber: req.body.blockNumber,
      confirmations: req.body.confirmations,
      receipt: req.body.receipt,
      error: req.body.error,
      metadata: req.body.metadata,
    });

    if (tx.status === 'confirmed') {
      await transactionService.mirrorConfirmedDonation(tx);
    }

    await req.audit({
      action: 'transaction.updated',
      entityType: 'Transaction',
      entityId: tx._id,
      metadata: { txHash: tx.txHash, status: tx.status },
    });

    return success(res, { data: tx, legacyKey: 'transaction', message: 'Transaction updated' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createTransaction, patchTransaction };
