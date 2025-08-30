const express = require('express');
const TranscodeController = require('../controllers/transcodeController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Health check endpoint (no auth required)
router.get('/health', TranscodeController.healthCheck);

// All other transcode routes require authentication
router.use(authenticateToken);

// POST /api/transcode
router.post('/', TranscodeController.startTranscode);

// GET /api/jobs
router.get('/jobs', TranscodeController.listJobs);

// GET /api/jobs/:jobId/status
router.get('/jobs/:jobId/status', TranscodeController.getJobStatus);

// DELETE /api/jobs/:jobId
router.delete('/jobs/:jobId', TranscodeController.deleteJob);

module.exports = router;