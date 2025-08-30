const Database = require('./Database');

class Video {
    // Create new video record
    static async create(videoData) {
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
        await Database.query(sql, params);
        return videoData;
    }

    // Get videos by user ID
    static async findByUserId(userId) {
        const sql = 'SELECT * FROM videos WHERE user_id = ? ORDER BY upload_date DESC';
        return await Database.query(sql, [userId]);
    }

    // Get video by ID
    static async findById(videoId) {
        const sql = 'SELECT * FROM videos WHERE id = ?';
        const videos = await Database.query(sql, [videoId]);
        return videos[0];
    }

    // Get video by filename and user ID
    static async findByFilename(filename, userId) {
        const sql = 'SELECT * FROM videos WHERE filename = ? AND user_id = ?';
        const videos = await Database.query(sql, [filename, userId]);
        return videos[0];
    }

    // Delete video
    static async delete(videoId, userId) {
        const sql = 'DELETE FROM videos WHERE id = ? AND user_id = ?';
        const result = await Database.query(sql, [videoId, userId]);
        return result.affectedRows > 0;
    }
}

module.exports = Video;