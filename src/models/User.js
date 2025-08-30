const Database = require('./Database');

class User {
    // Get user by username
    static async findByUsername(username) {
        const sql = 'SELECT * FROM users WHERE username = ?';
        const users = await Database.query(sql, [username]);
        return users[0];
    }

    // Get user by ID
    static async findById(id) {
        const sql = 'SELECT * FROM users WHERE id = ?';
        const users = await Database.query(sql, [id]);
        return users[0];
    }

    // Create new user (for future use)
    static async create(userData) {
        const sql = `
            INSERT INTO users (username, password)
            VALUES (?, ?)
        `;
        const params = [userData.username, userData.password];
        await Database.query(sql, params);
        return userData;
    }
}

module.exports = User;