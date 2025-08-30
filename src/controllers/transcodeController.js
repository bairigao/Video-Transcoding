const path = require('path');
const Video = require('../models/Video');
const TranscodeJob = require('../models/TranscodeJob');
const transcodeService = require('../services/transcodeService');
const FileUtils = require('../utils/fileUtils');
const { formatJobsForApi } = require('../utils/formatters');
const config = require('../../config/app');

class TranscodeController {
    /**
     * Start video transcoding
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async startTranscode(req, res) {
        try {
            const { videoId, format } = req.body;

            if (!videoId || !format) {
                return res.status(400).json({ error: 'Video ID and format are required' });
            }

            if (!transcodeService.isValidFormat(format)) {
                return res.status(400).json({ 
                    error: `Unsupported format. Allowed: ${config.allowedFormats.join(', ')}` 
                });
            }

            // Find the video
            const video = await Video.findById(videoId);
            if (!video || video.user_id !== req.user.id) {
                return res.status(404).json({ error: 'Video not found' });
            }

            // Generate job ID and output filename
            const jobId = Date.now().toString();
            const outputFilename = transcodeService.generateOutputFilename(video.filename, format);
            const inputPath = path.join(config.uploadsDir, video.filename);
            const outputPath = path.join(config.transcodedDir, outputFilename);

            // Create job record in database
            const jobData = {
                id: jobId,
                videoId: videoId,
                userId: req.user.id,
                inputPath: inputPath,
                outputPath: outputPath,
                outputFilename: outputFilename,
                format: format.toLowerCase(),
                status: 'processing'
            };

            await TranscodeJob.create(jobData);

            // Start transcoding process
            await transcodeService.startTranscode(jobData);

            res.json({
                message: 'Transcoding started',
                jobId: jobId,
                status: 'processing'
            });

        } catch (error) {
            console.error('Transcode error:', error);
            res.status(500).json({ error: 'Failed to start transcoding' });
        }
    }

    /**
     * List user's transcode jobs
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async listJobs(req, res) {
        try {
            const userJobs = await TranscodeJob.findByUserId(req.user.id);
            const formattedJobs = formatJobsForApi(userJobs);
            res.json({ jobs: formattedJobs });
        } catch (error) {
            console.error('Jobs list error:', error);
            res.status(500).json({ error: 'Failed to retrieve jobs' });
        }
    }

    /**
     * Delete transcode job
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async deleteJob(req, res) {
        try {
            const { jobId } = req.params;
            
            // Find the transcode job
            const job = await TranscodeJob.findById(jobId);
            
            if (!job || job.user_id !== req.user.id) {
                return res.status(404).json({ error: 'Transcode job not found' });
            }
            
            // Delete the transcoded file if it exists
            if (job.output_filename) {
                const transcodedPath = path.join(config.transcodedDir, job.output_filename);
                await FileUtils.deleteFileIfExists(transcodedPath);
            }
            
            // Remove the job from database
            await TranscodeJob.delete(jobId, req.user.id);
            
            res.json({ message: 'Transcoded video deleted successfully' });
            
        } catch (error) {
            console.error('Delete transcode job error:', error);
            res.status(500).json({ error: 'Failed to delete transcoded video' });
        }
    }
}

module.exports = TranscodeController;