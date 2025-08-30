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

    // Get transcode jobs by user ID
    static async findByUserId(userId) {
        const sql = 'SELECT * FROM transcode_jobs WHERE user_id = ? ORDER BY created_at DESC';
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
        let sql = 'UPDATE transcode_jobs SET status = ?';
        let params = [status];

        if (errorMessage) {
            sql += ', error_message = ?';
            params.push(errorMessage);
        }

        if (completedAt) {
            sql += ', completed_at = ?';
            params.push(completedAt);
        }

        sql += ' WHERE id = ?';
        params.push(jobId);

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