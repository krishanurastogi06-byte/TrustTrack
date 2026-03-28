const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { fail } = require('../lib/apiResponse');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) {
    return fail(res, { status: 401, error: 'Missing authorization token', code: 'AUTH_MISSING_TOKEN' });
  }
  const token = h.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.sub).select('_id role isActive');
    if (!user || user.isActive === false) {
      return fail(res, { status: 401, error: 'Invalid token user', code: 'AUTH_INVALID_USER' });
    }

    req.user = {
      sub: user._id.toString(),
      role: user.role,
    };
    next();
  } catch (err) {
    return fail(res, { status: 401, error: 'Invalid token', code: 'AUTH_INVALID_TOKEN' });
  }
}

module.exports = authMiddleware;
