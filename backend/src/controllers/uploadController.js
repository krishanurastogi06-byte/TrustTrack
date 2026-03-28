const multer = require('multer');
const ipfsService = require('../services/ipfsService');
const { success, fail } = require('../lib/apiResponse');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }).single('file');

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'storage', 'uploads');

function ensureLocalUploadDir() {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
}

function toSafeFilename(name = '') {
  return String(name || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function persistLocally(buffer, originalname) {
  ensureLocalUploadDir();
  const safeName = toSafeFilename(originalname);
  const stamp = Date.now();
  const nonce = crypto.randomBytes(4).toString('hex');
  const fileName = `${stamp}-${nonce}-${safeName}`;
  const filePath = path.join(LOCAL_UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  const cid = `local-${crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 24)}`;
  return { cid, fileName, filePath };
}

function uploadHandler(req, res, next) {
  upload(req, res, async function (err) {
    if (err) return next(err);
    if (!req.file) return fail(res, { status: 400, error: 'No file uploaded', code: 'FILE_REQUIRED' });
    try {
      const { buffer, originalname, mimetype, size } = req.file;
      let payload;

      try {
        const added = await ipfsService.addBuffer(buffer, originalname);
        const url = ipfsService.gatewayUrl(added.cid);
        payload = {
          cid: added.cid,
          path: added.path,
          size: added.size,
          url,
          filename: originalname,
          mimeType: mimetype,
          storage: 'ipfs',
        };
      } catch (ipfsErr) {
        const local = persistLocally(buffer, originalname);
        payload = {
          cid: local.cid,
          path: local.fileName,
          size,
          url: `/api/uploads/local/${encodeURIComponent(local.fileName)}`,
          filename: originalname,
          mimeType: mimetype,
          storage: 'local',
        };
      }

      return success(res, { status: 201, data: payload, extra: payload, message: 'File uploaded' });
    } catch (e) {
      next(e);
    }
  });
}

function getLocalUpload(req, res) {
  const fileName = toSafeFilename(req.params.fileName || '');
  if (!fileName) return fail(res, { status: 400, error: 'Invalid file name', code: 'INVALID_FILE' });

  const filePath = path.join(LOCAL_UPLOAD_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return fail(res, { status: 404, error: 'File not found', code: 'FILE_NOT_FOUND' });
  }

  return res.sendFile(filePath);
}

module.exports = { uploadHandler, getLocalUpload };
