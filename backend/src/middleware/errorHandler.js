const logger = require('../lib/logger');
const { fail } = require('../lib/apiResponse');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error('Unhandled error: %o', err);
  const status = err.status || 500;
  fail(res, {
    status,
    error: err.message || 'Internal Server Error',
    details: err.details || undefined,
    code: err.code,
  });
}

module.exports = errorHandler;
