const mysql = require('mysql2/promise');
const dbConfig = require('../config/database');

// Create connection pool
const pool = mysql.createPool(dbConfig);

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