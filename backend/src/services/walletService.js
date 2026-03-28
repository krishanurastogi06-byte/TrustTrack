const Wallet = require('../models/Wallet');
const User = require('../models/User');

async function createWallet(userId) {
  const existing = await Wallet.findOne({ userId });
  if (existing) {
    return existing;
  }

  const wallet = new Wallet({
    userId,
    balance: 0,
    currency: 'ETH',
    transactionCount: 0,
  });

  await wallet.save();
  await User.findByIdAndUpdate(userId, { wallet: wallet._id });
  return wallet;
}

async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await createWallet(userId);
  }
  return wallet;
}

async function getWalletByUserId(userId) {
  return Wallet.findOne({ userId });
}

async function addBalance(userId, amount, description = '') {
  const wallet = await getOrCreateWallet(userId);
  wallet.balance += amount;
  wallet.transactionCount += 1;
  wallet.lastTransactionAt = new Date();
  await wallet.save();
  return wallet;
}

async function subtractBalance(userId, amount, description = '') {
  const wallet = await getOrCreateWallet(userId);
  if (wallet.balance < amount) {
    const err = new Error('Insufficient wallet balance');
    err.status = 409;
    err.code = 'INSUFFICIENT_BALANCE';
    throw err;
  }
  wallet.balance -= amount;
  wallet.transactionCount += 1;
  wallet.lastTransactionAt = new Date();
  await wallet.save();
  return wallet;
}

module.exports = {
  createWallet,
  getOrCreateWallet,
  getWalletByUserId,
  addBalance,
  subtractBalance,
};
