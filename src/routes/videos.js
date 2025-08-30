const express = require('express');
const VideoController = require('../controllers/videoController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// All video routes require authentication
router.use(authenticateToken);

// POST /api/videos/upload
router.post('/upload', VideoController.upload);

// GET /api/videos
router.get('/', VideoController.list);

// GET /api/videos/:videoId/related
router.get('/:videoId/related', VideoController.getRelatedContent);

// DELETE /api/videos/:videoId
router.delete('/:videoId', VideoController.delete);

module.exports = router;