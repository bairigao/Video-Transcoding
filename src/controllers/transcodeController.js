const path = require('path');
const fs = require('fs');
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

            // Ensure required directories exist
            if (!fs.existsSync(config.uploadsDir)) {
                fs.mkdirSync(config.uploadsDir, { recursive: true });
            }
            if (!fs.existsSync(config.transcodedDir)) {
                fs.mkdirSync(config.transcodedDir, { recursive: true });
            }

            // Generate job ID and output filename
            const jobId = Date.now().toString();
            const outputFilename = transcodeService.generateOutputFilename(video.filename, format);
            const inputPath = path.join(config.uploadsDir, video.filename);
            const outputPath = path.join(config.transcodedDir, outputFilename);

            // Validate input file exists
            if (!fs.existsSync(inputPath)) {
                return res.status(404).json({ error: 'Original video file not found' });
            }

            // Check if there's already a processing job for this video and format
            const existingJobs = await TranscodeJob.findByVideoId(videoId, req.user.id);
            const processingJob = existingJobs.find(job => 
                job.format === format.toLowerCase() && job.status === 'processing'
            );
            
            if (processingJob) {
                return res.status(409).json({ 
                    error: 'A transcoding job for this video and format is already in progress',
                    jobId: processingJob.id
                });
            }

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
            try {
                await transcodeService.startTranscode(jobData);
                
                res.json({
                    message: 'Transcoding started successfully',
                    jobId: jobId,
                    status: 'processing',
                    format: format.toLowerCase()
                });
            } catch (transcodeError) {
                // If transcoding fails to start, update job status and clean up
                await TranscodeJob.updateStatus(jobId, 'failed', transcodeError.message);
                throw transcodeError;
            }

        } catch (error) {
            console.error('Transcode error:', error);
            res.status(500).json({ 
                error: 'Failed to start transcoding', 
                details: error.message 
            });
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

    /**
     * Get transcoding status
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getJobStatus(req, res) {
        try {
            const { jobId } = req.params;
            
            const job = await TranscodeJob.findById(jobId);
            
            if (!job || job.user_id !== req.user.id) {
                return res.status(404).json({ error: 'Transcode job not found' });
            }
            
            res.json({
                jobId: job.id,
                status: job.status,
                format: job.format,
                createdAt: job.created_at,
                completedAt: job.completed_at,
                errorMessage: job.error_message,
                outputFilename: job.output_filename
            });
            
        } catch (error) {
            console.error('Get job status error:', error);
            res.status(500).json({ error: 'Failed to get job status' });
        }
    }

    /**
     * Health check for transcoding service
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async healthCheck(req, res) {
        try {
            // Check if FFmpeg is available
            const ffmpegInfo = await transcodeService.getFFmpegInfo();
            
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                ffmpeg: {
                    available: true,
                    path: require('@ffmpeg-installer/ffmpeg').path,
                    formatsCount: Object.keys(ffmpegInfo.formats || {}).length,
                    codecsCount: Object.keys(ffmpegInfo.codecs || {}).length
                },
                directories: {
                    uploads: fs.existsSync(config.uploadsDir),
                    transcoded: fs.existsSync(config.transcodedDir)
                }
            });
            
        } catch (error) {
            console.error('Health check error:', error);
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    }
}

module.exports = TranscodeController;