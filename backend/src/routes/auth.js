const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, refreshSchema, updateWalletSchema, updateProfileSchema, changePasswordSchema } = require('../validation/auth');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.get('/me', auth, authController.me);
router.put('/me', auth, validate(updateProfileSchema), authController.updateProfile);
router.put('/me/wallet', auth, validate(updateWalletSchema), authController.updateWallet);
router.put('/me/password', auth, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
