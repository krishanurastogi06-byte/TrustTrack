function success(res, { status = 200, data = null, message = '', meta, legacyKey, extra } = {}) {
  const body = { success: true, data, message };
  if (meta !== undefined) body.meta = meta;
  if (legacyKey) body[legacyKey] = data;
  if (extra && typeof extra === 'object') {
    Object.assign(body, extra);
  }
  return res.status(status).json(body);
}

function fail(res, { status = 400, error = 'Request failed', details, code } = {}) {
  const body = { success: false, error };
  if (details !== undefined) body.details = details;
  if (code !== undefined) body.code = code;
  return res.status(status).json(body);
}

module.exports = { success, fail };