const express = require('express');
const { uploadHandler, getLocalUpload } = require('../controllers/uploadController');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, uploadHandler);
router.get('/local/:fileName', getLocalUpload);

module.exports = router;
