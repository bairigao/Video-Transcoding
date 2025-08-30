const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');
const fs = require('fs');
const config = require('../../config/app');
const TranscodeJob = require('../models/TranscodeJob');

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Log FFmpeg configuration for debugging
console.log('FFmpeg path configured:', ffmpegInstaller.path);

class TranscodeService {
    /**
     * Start video transcoding process
     * @param {Object} jobData - Transcoding job data
     * @returns {Promise} Promise that resolves when transcoding process is initiated
     */
    static async startTranscode(jobData) {
        const jobId = jobData.id || jobData.jobId;  // Handle both property names for compatibility
        const inputPath = jobData.inputPath;
        const outputPath = jobData.outputPath;
        const format = jobData.format;
        const fs = require('fs');
        const path = require('path');

        // Validate required parameters
        if (!jobId) {
            throw new Error('Job ID is required for transcoding');
        }
        if (!inputPath || !outputPath || !format) {
            throw new Error('Input path, output path, and format are required');
        }

        console.log(`Job ${jobId}: Initializing transcoding with data:`, {
            jobId,
            inputPath,
            outputPath,
            format
        });

        // Validate input file exists
        if (!fs.existsSync(inputPath)) {
            throw new Error(`Input file not found: ${inputPath}`);
        }

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            let command = ffmpeg(inputPath);
            let processStarted = false;

            console.log(`Job ${jobId}: Starting transcoding from ${inputPath} to ${outputPath}`);

            // Set format-specific options BEFORE setting up output
            switch (format.toLowerCase()) {
                case 'mp4':
                    command = command.videoCodec('libx264').audioCodec('aac')
                        .outputOptions(['-movflags', 'faststart']); // Optimize for web streaming
                    break;
                case 'avi':
                    command = command.videoCodec('libxvid').audioCodec('libmp3lame');
                    break;
                case 'mov':
                    command = command.videoCodec('libx264').audioCodec('aac')
                        .outputOptions(['-movflags', 'faststart']);
                    break;
                default:
                    command = command.videoCodec('libx264').audioCodec('aac')
                        .outputOptions(['-movflags', 'faststart']);
            }

            command
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log(`Job ${jobId}: FFmpeg process started with command:`, commandLine);
                    processStarted = true;
                    resolve(); // Resolve when process starts successfully
                })
                .on('progress', (progress) => {
                    const percent = Math.round(progress.percent || 0);
                    console.log(`Job ${jobId}: ${percent}% complete`);
                    // You can emit progress events here if needed for real-time updates
                })
                .on('end', async () => {
                    console.log(`Job ${jobId}: Transcoding completed successfully`);
                    try {
                        // Generate MySQL-compatible timestamp
                        const now = new Date();
                        const mysqlTimestamp = now.toISOString().slice(0, 19).replace('T', ' ');
                        
                        await TranscodeJob.updateStatus(
                            jobId, 
                            'completed', 
                            null, 
                            mysqlTimestamp
                        );
                        console.log(`Job ${jobId}: Status updated to completed`);
                    } catch (error) {
                        console.error(`Job ${jobId}: Error updating job status:`, error);
                    }
                })
                .on('error', async (err) => {
                    console.error(`Job ${jobId}: Transcoding failed:`, err.message);
                    try {
                        await TranscodeJob.updateStatus(jobId, 'failed', err.message);
                        console.log(`Job ${jobId}: Status updated to failed`);
                    } catch (error) {
                        console.error(`Job ${jobId}: Error updating job status:`, error);
                    }
                    
                    // If the process hasn't started yet, reject the promise
                    if (!processStarted) {
                        reject(err);
                    }
                })
                .on('stderr', (stderrLine) => {
                    // Log FFmpeg stderr for debugging but don't treat as error
                    if (stderrLine.includes('Error') || stderrLine.includes('error')) {
                        console.warn(`Job ${jobId}: FFmpeg warning:`, stderrLine);
                    }
                })
                .run();
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

    /**
     * Get FFmpeg information for debugging
     * @returns {Promise<Object>} FFmpeg version info
     */
    static async getFFmpegInfo() {
        return new Promise((resolve, reject) => {
            ffmpeg.getAvailableFormats((err, formats) => {
                if (err) {
                    reject(err);
                } else {
                    ffmpeg.getAvailableCodecs((err, codecs) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ formats, codecs });
                        }
                    });
                }
            });
        });
    }
}

module.exports = TranscodeService;