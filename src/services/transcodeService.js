const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');
const config = require('../../config/app');
const TranscodeJob = require('../models/TranscodeJob');

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

class TranscodeService {
    /**
     * Start video transcoding process
     * @param {Object} jobData - Transcoding job data
     * @returns {Promise} Promise that resolves when transcoding starts
     */
    static async startTranscode(jobData) {
        const { jobId, inputPath, outputPath, format } = jobData;

        return new Promise((resolve, reject) => {
            const command = ffmpeg(inputPath)
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log('FFmpeg process started:', commandLine);
                    resolve(); // Resolve immediately when process starts
                })
                .on('progress', (progress) => {
                    console.log(`Job ${jobId}: ${Math.round(progress.percent || 0)}% complete`);
                })
                .on('end', async () => {
                    console.log(`Job ${jobId}: Transcoding completed successfully`);
                    try {
                        await TranscodeJob.updateStatus(
                            jobId, 
                            'completed', 
                            null, 
                            new Date().toISOString()
                        );
                    } catch (error) {
                        console.error('Error updating job status:', error);
                    }
                })
                .on('error', async (err) => {
                    console.error(`Job ${jobId}: Transcoding failed:`, err.message);
                    try {
                        await TranscodeJob.updateStatus(jobId, 'failed', err.message);
                    } catch (error) {
                        console.error('Error updating job status:', error);
                    }
                });

            // Set format-specific options
            switch (format.toLowerCase()) {
                case 'mp4':
                    command.videoCodec('libx264').audioCodec('aac');
                    break;
                case 'avi':
                    command.videoCodec('libxvid').audioCodec('mp3');
                    break;
                case 'mov':
                    command.videoCodec('libx264').audioCodec('aac');
                    break;
                case 'webm':
                    command.videoCodec('libvpx').audioCodec('libvorbis');
                    break;
                default:
                    command.videoCodec('libx264').audioCodec('aac');
            }

            command.run();
        });
    }

    /**
     * Validate if format is supported
     * @param {string} format - Video format to validate
     * @returns {boolean} True if format is supported
     */
    static isValidFormat(format) {
        return config.allowedFormats.includes(format.toLowerCase());
    }

    /**
     * Generate output filename
     * @param {string} originalFilename - Original video filename
     * @param {string} format - Target format
     * @returns {string} Generated output filename
     */
    static generateOutputFilename(originalFilename, format) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const nameWithoutExt = path.parse(originalFilename).name;
        return `${nameWithoutExt}_transcoded_${timestamp}_${randomString}.${format}`;
    }
}

module.exports = TranscodeService;