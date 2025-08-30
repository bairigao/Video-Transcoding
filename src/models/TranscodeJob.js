const Database = require('./Database');

class TranscodeJob {
    // Create new transcode job
    static async create(jobData) {
        const sql = `
            INSERT INTO transcode_jobs (id, video_id, user_id, input_path, output_path, output_filename, format, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            jobData.id,
            jobData.videoId,
            jobData.userId,
            jobData.inputPath,
            jobData.outputPath,
            jobData.outputFilename,
            jobData.format,
            jobData.status
        ];
        await Database.query(sql, params);
        return jobData;
    }

    // Get transcode jobs by user ID with video details
    static async findByUserId(userId) {
        const sql = `
            SELECT tj.*, v.original_name as original_video_name, v.filename as original_filename
            FROM transcode_jobs tj
            LEFT JOIN videos v ON tj.video_id = v.id
            WHERE tj.user_id = ? 
            ORDER BY tj.created_at DESC
        `;
        return await Database.query(sql, [userId]);
    }

    // Get transcode job by ID
    static async findById(jobId) {
        const sql = 'SELECT * FROM transcode_jobs WHERE id = ?';
        const jobs = await Database.query(sql, [jobId]);
        return jobs[0];
    }

    // Get transcode job by filename and user ID
    static async findByFilename(filename, userId) {
        const sql = 'SELECT * FROM transcode_jobs WHERE output_filename = ? AND user_id = ? AND status = "completed"';
        const jobs = await Database.query(sql, [filename, userId]);
        return jobs[0];
    }

    // Update transcode job status
    static async updateStatus(jobId, status, errorMessage = null, completedAt = null) {
        // Ensure we have valid values or null (not undefined)
        const safeErrorMessage = errorMessage || null;
        let safeCompletedAt = completedAt || null;
        const safeJobId = jobId;
        
        // Validate required parameters
        if (!safeJobId || !status) {
            throw new Error('JobId and status are required for updateStatus');
        }
        
        // Convert ISO 8601 timestamp to MySQL-compatible format
        if (safeCompletedAt && typeof safeCompletedAt === 'string') {
            try {
                // Convert ISO string to MySQL datetime format (YYYY-MM-DD HH:MM:SS)
                const date = new Date(safeCompletedAt);
                safeCompletedAt = date.toISOString().slice(0, 19).replace('T', ' ');
                console.log(`Converting timestamp ${completedAt} to MySQL format: ${safeCompletedAt}`);
            } catch (error) {
                console.warn(`Invalid date format: ${safeCompletedAt}, setting to current time`);
                const now = new Date();
                safeCompletedAt = now.toISOString().slice(0, 19).replace('T', ' ');
            }
        }
        
        const sql = `
            UPDATE transcode_jobs 
            SET status = ?, error_message = ?, completed_at = ? 
            WHERE id = ?
        `;
        const params = [status, safeErrorMessage, safeCompletedAt, safeJobId];
        
        console.log(`Updating job ${safeJobId} with status: ${status}, error: ${safeErrorMessage}, completed: ${safeCompletedAt}`);
        
        await Database.query(sql, params);
    }

    // Delete transcode job
    static async delete(jobId, userId) {
        const sql = 'DELETE FROM transcode_jobs WHERE id = ? AND user_id = ?';
        const result = await Database.query(sql, [jobId, userId]);
        return result.affectedRows > 0;
    }

    // Get transcode jobs by video ID
    static async findByVideoId(videoId, userId) {
        const sql = 'SELECT * FROM transcode_jobs WHERE video_id = ? AND user_id = ?';
        return await Database.query(sql, [videoId, userId]);
    }
}

module.exports = TranscodeJob;