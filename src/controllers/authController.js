const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../../config/app');

class AuthController {
    /**
     * Handle user login
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            const user = await User.findByUsername(username);
            
            if (!user || user.password !== password) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: user.id, username: user.username },
                config.jwtSecret,
                { expiresIn: '24h' }
            );

            res.json({ 
                message: 'Login successful',
                token,
                user: { id: user.id, username: user.username }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
}

module.exports = AuthController;