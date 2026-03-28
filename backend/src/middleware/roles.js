const { fail } = require('../lib/apiResponse');

module.exports = function (...allowed) {
  return function (req, res, next) {
    if (!req.user) return fail(res, { status: 401, error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    if (allowed.length === 0) return next();
    if (!allowed.includes(req.user.role)) return fail(res, { status: 403, error: 'Forbidden', code: 'FORBIDDEN' });
    return next();
  };
};
