const mysql = require('mysql2/promise');
const dbConfig = require('../../config/database');

// Create connection pool
const pool = mysql.createPool(dbConfig);

class Database {
    constructor() {
        this.pool = pool;
    }

    async query(sql, params = []) {
        try {
            // Log query for debugging (only in development)
            if (process.env.NODE_ENV === 'development') {
                console.log('Executing SQL:', sql);
                console.log('Parameters:', params);
            }
            
            // Validate parameters - ensure no undefined values
            const safeParams = params.map(param => param === undefined ? null : param);
            
            const [rows] = await this.pool.execute(sql, safeParams);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            console.error('SQL:', sql);
            console.error('Parameters:', params);
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