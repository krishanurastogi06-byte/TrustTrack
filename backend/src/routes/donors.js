const express = require('express');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const walletService = require('../services/walletService');
const { success } = require('../lib/apiResponse');

const router = express.Router();

// Wallet endpoints (Donor only)
router.get(
  '/wallet',
  auth,
  roles('donor'),
  async (req, res, next) => {
    try {
      const donorId = req.user.sub;
      const wallet = await walletService.getOrCreateWallet(donorId);
      return success(res, {
        data: wallet,
        legacyKey: 'wallet',
        message: 'Donor wallet retrieved',
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/wallet/balance',
  auth,
  roles('donor'),
  async (req, res, next) => {
    try {
      const donorId = req.user.sub;
      const wallet = await walletService.getOrCreateWallet(donorId);
      return success(res, {
        data: {
          balance: wallet.balance,
          currency: wallet.currency,
          transactionCount: wallet.transactionCount,
          lastTransactionAt: wallet.lastTransactionAt,
        },
        legacyKey: 'balance',
        message: 'Donor wallet balance retrieved',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
