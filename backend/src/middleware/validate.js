const { ZodError } = require('zod');
const { fail } = require('../lib/apiResponse');
const logger = require('../lib/logger');

module.exports = function (schema, source = 'body') {
  return async function (req, res, next) {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields = err.errors.map((issue) => issue.path?.join('.') || '<root>').filter(Boolean);
        logger.warn('Request validation failed', {
          source,
          fields,
          issues: err.errors,
        });

        return fail(res, { status: 400, error: 'Validation failed', details: err.errors, code: 'VALIDATION_ERROR' });
      }
      next(err);
    }
  };
};
