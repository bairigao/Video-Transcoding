const express = require('express');
const authRoutes = require('./auth');
const videoRoutes = require('./videos');
const transcodeRoutes = require('./transcode');
const downloadRoutes = require('./download');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/videos', videoRoutes);
router.use('/transcode', transcodeRoutes);
router.use('/download', downloadRoutes);


router.post('/login', authRoutes);
router.get('/jobs', transcodeRoutes);
router.delete('/jobs/:jobId', transcodeRoutes);
router.post('/upload', videoRoutes);

module.exports = router;