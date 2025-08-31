/**
 * Format video data for API response
 * @param {Object} video - Raw video data from database
 * @returns {Object} Formatted video data
 */
const formatVideoForApi = (video) => {
    return {
        id: video.id,
        originalName: video.original_name,
        filename: video.filename,
        userId: video.user_id,
        username: video.username,
        size: video.size,
        uploadDate: video.upload_date,
        mimetype: video.mimetype
    };
};

/**
 * Format multiple videos for API response
 * @param {Array} videos - Array of raw video data from database
 * @returns {Array} Array of formatted video data
 */
const formatVideosForApi = (videos) => {
    return videos.map(formatVideoForApi);
};

/**
 * Format transcode job data for API response
 * @param {Object} job - Raw job data from database
 * @returns {Object} Formatted job data
 */
const formatJobForApi = (job) => {
    return {
        id: job.id,
        videoId: job.video_id, // May be null if original video was deleted
        userId: job.user_id,
        inputPath: job.input_path,
        outputPath: job.output_path,
        outputFilename: job.output_filename,
        format: job.format,
        status: job.status,
        errorMessage: job.error_message,
        createdAt: job.created_at,
        completedAt: job.completed_at,
        originalVideoName: job.original_video_name || 'Deleted Video',
        originalFilename: job.original_filename
    };
};

/**
 * Format multiple jobs for API response
 * @param {Array} jobs - Array of raw job data from database
 * @returns {Array} Array of formatted job data
 */
const formatJobsForApi = (jobs) => {
    return jobs.map(formatJobForApi);
};

module.exports = {
    formatVideoForApi,
    formatVideosForApi,
    formatJobForApi,
    formatJobsForApi
};