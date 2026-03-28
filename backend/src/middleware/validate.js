const { ZodError } = require('zod');
const { fail } = require('../lib/apiResponse');

module.exports = function (schema, source = 'body') {
  return async function (req, res, next) {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return fail(res, { status: 400, error: 'Validation failed', details: err.errors, code: 'VALIDATION_ERROR' });
      }
      next(err);
    }
  };
};
