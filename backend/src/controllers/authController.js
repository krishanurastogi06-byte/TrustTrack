const authService = require('../services/authService');
const User = require('../models/User');
const { success, fail } = require('../lib/apiResponse');

async function register(req, res, next) {
  try {
    const { email, password, role, profile, walletAddress } = req.body;
    if (role === 'admin') {
      return fail(res, { status: 403, error: 'Admin self-registration is not allowed', code: 'ADMIN_REGISTRATION_FORBIDDEN' });
    }
    const user = await authService.registerUser({
      email,
      password,
      role: authService.resolveRegistrationRole(role),
      profile,
      walletAddress,
    });
    
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);
    await authService.saveRefreshToken(user._id, refreshToken);
    
    // Notify admins if it's an NGO
    if (user.role === 'ngo') {
        const notificationService = require('../services/notificationService');
        const ngoName = user.profile?.organizationName || user.profile?.name || user.email;
        const walletText = user.walletAddress ? "available" : "not available";
        await notificationService.notifyAdmins({
            title: "New NGO Registration",
            message: `NGO: ${ngoName}, and Wallet Address ${walletText}`,
            type: "info",
            link: "/admin/ngos"
        });
    }

    return success(res, {
      status: 201,
      data: { user: user.toJSON(), accessToken, refreshToken },
      extra: { user: user.toJSON(), accessToken, refreshToken },
      message: 'Registration successful',
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await authService.verifyCredentials(email, password);
    if (!user) return fail(res, { status: 401, error: 'Invalid credentials', code: 'AUTH_INVALID_CREDENTIALS' });

    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);
    await authService.saveRefreshToken(user._id, refreshToken);

    return success(res, {
      data: { user: user.toJSON(), accessToken, refreshToken },
      extra: { user: user.toJSON(), accessToken, refreshToken },
      message: 'Login successful',
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return fail(res, { status: 400, error: 'Missing refreshToken', code: 'REFRESH_TOKEN_REQUIRED' });
    const tokens = await authService.refreshTokens(refreshToken);
    return success(res, {
      data: tokens,
      extra: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
      message: 'Token refreshed',
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return fail(res, { status: 404, error: 'User not found', code: 'USER_NOT_FOUND' });
    return success(res, { data: user.toJSON(), legacyKey: 'user' });
  } catch (err) {
    next(err);
  }
}

async function updateWallet(req, res, next) {
  try {
    const walletAddress = String(req.body.walletAddress || '').toLowerCase();
    const userId = req.user.sub;

    const user = await User.findById(userId);
    if (!user) return fail(res, { status: 404, error: 'User not found', code: 'USER_NOT_FOUND' });

    const addressInUseByOthers = await User.exists({
      _id: { $ne: user._id },
      walletAddress,
    });

    if (addressInUseByOthers) {
      return fail(res, {
        status: 409,
        error: 'Wallet address is already linked to another user',
        code: 'WALLET_ADDRESS_ALREADY_IN_USE',
      });
    }

    user.walletAddress = walletAddress;
    await user.save();

    return success(res, {
      data: user.toJSON(),
      legacyKey: 'user',
      message: 'Wallet address updated',
    });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.user.sub;
    const { profile } = req.body;

    const user = await User.findById(userId);
    if (!user) return fail(res, { status: 404, error: 'User not found', code: 'USER_NOT_FOUND' });

    // Update only allowed fields
    if (profile.name) user.profile.name = profile.name;
    if (profile.organizationName) user.profile.organizationName = profile.organizationName;
    if (profile.phone) user.profile.phone = profile.phone;
    if (profile.bio) user.profile.bio = profile.bio;
    if (profile.avatar !== undefined) user.profile.avatar = profile.avatar;

    await user.save();

    return success(res, {
      data: user.toJSON(),
      legacyKey: 'user',
      message: 'Profile updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const userId = req.user.sub;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId).select('+passwordHash');
    if (!user) return fail(res, { status: 404, error: 'User not found', code: 'USER_NOT_FOUND' });

    const isMatch = await authService.verifyCredentials(user.email, currentPassword);
    if (!isMatch) {
      return fail(res, { status: 400, error: 'Current password is incorrect', code: 'AUTH_INVALID_CREDENTIALS' });
    }

    const bcrypt = require('bcryptjs');
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return success(res, { message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, me, updateWallet, updateProfile, changePassword };
