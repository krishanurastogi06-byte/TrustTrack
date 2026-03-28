const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const walletService = require('./walletService');
const logger = require('../lib/logger');

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '7d';

function resolveRegistrationRole(requestedRole) {
  if (!requestedRole || requestedRole === 'admin') {
    return 'donor';
  }
  return requestedRole;
}

async function registerUser({ email, password, role = 'donor', profile = {}, walletAddress }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 400;
    throw err;
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const safeRole = resolveRegistrationRole(role);
  const user = new User({ email, passwordHash, role: safeRole, profile, walletAddress });
  await user.save();

  // Automatically create wallet for all users (especially important for NGOs)
  await walletService.createWallet(user._id);

  return user;
}

async function verifyCredentials(email, password) {
  const user = await User.findOne({ email });
  if (!user) return null;
  if (user.isActive === false) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

function generateAccessToken(user) {
  const payload = { sub: user._id.toString(), role: user.role };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: ACCESS_EXPIRES });
}

function generateRefreshToken(user) {
  const payload = { sub: user._id.toString() };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: REFRESH_EXPIRES });
}

async function saveRefreshToken(userId, token) {
  await User.updateOne({ _id: userId }, { $push: { refreshTokens: { token } } });
}

async function revokeRefreshToken(userId, token) {
  await User.updateOne({ _id: userId }, { $pull: { refreshTokens: { token } } });
}

async function refreshTokens(oldToken) {
  try {
    const decoded = jwt.verify(oldToken, config.jwtSecret);
    const user = await User.findById(decoded.sub);
    if (!user) throw new Error('Invalid refresh token');

    // Check token exists in list
    const found = user.refreshTokens.find((r) => r.token === oldToken);
    if (!found) throw new Error('Refresh token revoked');

    // issue new tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user._id, refreshToken);
    // revoke old
    await revokeRefreshToken(user._id, oldToken);
    return { accessToken, refreshToken };
  } catch (err) {
    logger.warn('Refresh token error: %o', err);
    const e = new Error('Invalid refresh token');
    e.status = 401;
    throw e;
  }
}

module.exports = {
  registerUser,
  verifyCredentials,
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  revokeRefreshToken,
  refreshTokens,
  resolveRegistrationRole,
};
