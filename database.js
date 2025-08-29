const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'video_user',
    password: process.env.DB_PASSWORD || 'video_password',
    database: process.env.DB_NAME || 'video_transcoding',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Database helper functions
class Database {
    constructor() {
        this.pool = pool;
    }

    async query(sql, params = []) {
        try {
            const [rows] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    // User methods
    async getUser(username) {
        const sql = 'SELECT * FROM users WHERE username = ?';
        const users = await this.query(sql, [username]);
        return users[0];
    }

    async getUserById(id) {
        const sql = 'SELECT * FROM users WHERE id = ?';
        const users = await this.query(sql, [id]);
        return users[0];
    }

    // Video methods
    async createVideo(videoData) {
        const sql = `
            INSERT INTO videos (id, original_name, filename, user_id, username, size, mimetype)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            videoData.id,
            videoData.originalName,
            videoData.filename,
            videoData.userId,
            videoData.username,
            videoData.size,
            videoData.mimetype
        ];
        await this.query(sql, params);
        return videoData;
    }

    async getVideosByUserId(userId) {
        const sql = 'SELECT * FROM videos WHERE user_id = ? ORDER BY upload_date DESC';
        return await this.query(sql, [userId]);
    }

    async getVideoById(videoId) {
        const sql = 'SELECT * FROM videos WHERE id = ?';
        const videos = await this.query(sql, [videoId]);
        return videos[0];
    }

    async getVideoByFilename(filename, userId) {
        const sql = 'SELECT * FROM videos WHERE filename = ? AND user_id = ?';
        const videos = await this.query(sql, [filename, userId]);
        return videos[0];
    }

    async deleteVideo(videoId, userId) {
        const sql = 'DELETE FROM videos WHERE id = ? AND user_id = ?';
        const result = await this.query(sql, [videoId, userId]);
        return result.affectedRows > 0;
    }

    // Transcode job methods
    async createTranscodeJob(jobData) {
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
        await this.query(sql, params);
        return jobData;
    }

    async getTranscodeJobsByUserId(userId) {
        const sql = 'SELECT * FROM transcode_jobs WHERE user_id = ? ORDER BY created_at DESC';
        return await this.query(sql, [userId]);
    }

    async getTranscodeJobById(jobId) {
        const sql = 'SELECT * FROM transcode_jobs WHERE id = ?';
        const jobs = await this.query(sql, [jobId]);
        return jobs[0];
    }

    async getTranscodeJobByFilename(filename, userId) {
        const sql = 'SELECT * FROM transcode_jobs WHERE output_filename = ? AND user_id = ? AND status = "completed"';
        const jobs = await this.query(sql, [filename, userId]);
        return jobs[0];
    }

    async updateTranscodeJobStatus(jobId, status, errorMessage = null, completedAt = null) {
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

        await this.query(sql, params);
    }

    async deleteTranscodeJob(jobId, userId) {
        const sql = 'DELETE FROM transcode_jobs WHERE id = ? AND user_id = ?';
        const result = await this.query(sql, [jobId, userId]);
        return result.affectedRows > 0;
    }

    async getTranscodeJobsByVideoId(videoId, userId) {
        const sql = 'SELECT * FROM transcode_jobs WHERE video_id = ? AND user_id = ?';
        return await this.query(sql, [videoId, userId]);
    }

    // Test connection
    async testConnection() {
        try {
            await this.query('SELECT 1 as test');
            console.log('Database connection successful');
            return true;
        } catch (error) {
            console.error('Database connection failed:', error);
            return false;
        }
    }

    // Close connection pool
    async close() {
        await this.pool.end();
    }
}

module.exports = new Database();