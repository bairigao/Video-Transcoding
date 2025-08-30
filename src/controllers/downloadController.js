const path = require('path');
const Video = require('../models/Video');
const TranscodeJob = require('../models/TranscodeJob');
const config = require('../../config/app');

class DownloadController {
    /**
     * Download original video file
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async downloadOriginal(req, res) {
        try {
            const { filename } = req.params;
            
            // Find the video by filename and user
            const video = await Video.findByFilename(filename, req.user.id);
            if (!video) {
                return res.status(404).json({ error: 'Video not found' });
            }
            
            const filePath = path.join(config.uploadsDir, filename);
            res.download(filePath, video.original_name, (err) => {
                if (err) {
                    console.error('Download error:', err);
                    if (!res.headersSent) {
                        res.status(404).json({ error: 'File not found' });
                    }
                }
            });
            
        } catch (error) {
            console.error('Download original error:', error);
            res.status(500).json({ error: 'Failed to download file' });
        }
    }

    /**
     * Download transcoded video file
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async downloadTranscoded(req, res) {
        try {
            const { filename } = req.params;
            
            // Find the transcode job by filename and user
            const job = await TranscodeJob.findByFilename(filename, req.user.id);
            if (!job) {
                return res.status(404).json({ error: 'Transcoded video not found' });
            }
            
            const filePath = path.join(config.transcodedDir, filename);
            const downloadName = `transcoded_${job.format}_${filename}`;
            
            res.download(filePath, downloadName, (err) => {
                if (err) {
                    console.error('Download error:', err);
                    if (!res.headersSent) {
                        res.status(404).json({ error: 'File not found' });
                    }
                }
            });
            
        } catch (error) {
            console.error('Download transcoded error:', error);
            res.status(500).json({ error: 'Failed to download file' });
        }
    }
}

module.exports = DownloadController;