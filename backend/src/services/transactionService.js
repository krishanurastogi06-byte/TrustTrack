const Donation = require('../models/Donation');
const Transaction = require('../models/Transaction');

async function createTransaction(data) {
  const tx = await Transaction.findOneAndUpdate(
    { txHash: data.txHash },
    { ...data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return tx;
}

async function getTransactionByHash(txHash) {
  return Transaction.findOne({ txHash });
}

async function updateTransactionByHash(txHash, patch) {
  const tx = await Transaction.findOneAndUpdate({ txHash }, patch, { new: true });
  return tx;
}

async function mirrorConfirmedDonation(tx) {
  if (!tx || tx.status !== 'confirmed' || !tx.campaign || !tx.donor) return null;

  const existing = await Donation.findOne({ txHash: tx.txHash });
  if (existing) {
    existing.status = 'confirmed';
    existing.confirmedAt = new Date();
    const saved = await existing.save();
    await Transaction.updateOne({ _id: tx._id }, { donation: saved._id });
    return saved;
  }

  const created = await Donation.create({
    campaign: tx.campaign,
    donor: tx.donor,
    amount: tx.amount,
    currency: 'ETH',
    txHash: tx.txHash,
    status: 'confirmed',
    metadata: tx.metadata,
    confirmedAt: new Date(),
  });

  await Transaction.updateOne({ _id: tx._id }, { donation: created._id });
  return created;
}

module.exports = { createTransaction, getTransactionByHash, updateTransactionByHash, mirrorConfirmedDonation };
