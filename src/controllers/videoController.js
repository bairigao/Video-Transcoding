const path = require('path');
const Video = require('../models/Video');
const TranscodeJob = require('../models/TranscodeJob');
const youtubeService = require('../services/youtubeService');
const transcodeService = require('../services/transcodeService');
const FileUtils = require('../utils/fileUtils');
const { formatVideosForApi } = require('../utils/formatters');
const config = require('../../config/app');

class VideoController {
    /**
     * Upload video file
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async upload(req, res) {
        try {
            if (!req.files || !req.files.video) {
                return res.status(400).json({ error: 'No video file uploaded' });
            }

            const videoFile = req.files.video;
            
            if (!FileUtils.validateFileType(videoFile.mimetype, config.allowedVideoTypes)) {
                return res.status(400).json({ error: 'Invalid file type. Only video files are allowed.' });
            }

            const uniqueFilename = FileUtils.generateUniqueFilename(videoFile.name);
            const uploadPath = path.join(config.uploadsDir, uniqueFilename);

            await videoFile.mv(uploadPath);

            // Save video metadata to database
            const videoData = {
                id: Date.now().toString(),
                originalName: videoFile.name,
                filename: uniqueFilename,
                userId: req.user.id,
                username: req.user.username,
                size: videoFile.size,
                mimetype: videoFile.mimetype
            };

            await Video.create(videoData);

            res.json({
                message: 'Video uploaded successfully',
                videoId: videoData.id,
                filename: uniqueFilename
            });

        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'Failed to upload video' });
        }
    }

    /**
     * List user's videos
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async list(req, res) {
        try {
            const userVideos = await Video.findByUserId(req.user.id);
            const formattedVideos = formatVideosForApi(userVideos);
            res.json({ videos: formattedVideos });
        } catch (error) {
            console.error('List videos error:', error);
            res.status(500).json({ error: 'Failed to retrieve videos' });
        }
    }

    /**
     * Delete video
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async delete(req, res) {
        try {
            const { videoId } = req.params;
            
            // Find the video
            const video = await Video.findById(videoId);
            
            if (!video || video.user_id !== req.user.id) {
                return res.status(404).json({ error: 'Video not found' });
            }
            
            // Delete the physical file
            const filePath = path.join(config.uploadsDir, video.filename);
            await FileUtils.deleteFileIfExists(filePath);
            
            // Remove video from database
            await Video.delete(videoId, req.user.id);
            
            res.json({ message: 'Original video deleted successfully. Transcoded videos remain available.' });
            
        } catch (error) {
            console.error('Delete video error:', error);
            res.status(500).json({ error: 'Failed to delete video' });
        }
    }

    /**
     * Get YouTube related content for a video
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getRelatedContent(req, res) {
        try {
            const { videoId } = req.params;
            
            // Get the video metadata
            const video = await Video.findById(videoId);
            
            if (!video || video.user_id !== req.user.id) {
                return res.status(404).json({ error: 'Video not found' });
            }
            
            // Get related YouTube content
            const relatedVideos = await youtubeService.getVideoSuggestions({
                originalName: video.original_name,
                filename: video.filename
            });
            
            res.json({ 
                relatedVideos,
                video: {
                    id: video.id,
                    originalName: video.original_name,
                    filename: video.filename
                }
            });
            
        } catch (error) {
            console.error('YouTube related content error:', error);
            res.status(500).json({ error: 'Failed to fetch related content' });
        }
    }
}

module.exports = VideoController;