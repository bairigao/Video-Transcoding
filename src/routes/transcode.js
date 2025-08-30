const express = require('express');
const TranscodeController = require('../controllers/transcodeController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// All transcode routes require authentication
router.use(authenticateToken);

// POST /api/transcode
router.post('/', TranscodeController.startTranscode);

// GET /api/jobs
router.get('/jobs', TranscodeController.listJobs);

// DELETE /api/jobs/:jobId
router.delete('/jobs/:jobId', TranscodeController.deleteJob);

module.exports = router;