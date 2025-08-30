const express = require('express');
const DownloadController = require('../controllers/downloadController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// All download routes require authentication
router.use(authenticateToken);

// GET /api/download/original/:filename
router.get('/original/:filename', DownloadController.downloadOriginal);

// GET /api/download/transcoded/:filename
router.get('/transcoded/:filename', DownloadController.downloadTranscoded);

module.exports = router;