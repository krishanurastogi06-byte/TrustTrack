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

module.exports = { register, login, refresh, me };
