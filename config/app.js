const path = require('path');
require('dotenv').config();

const config = {
    // Server configuration
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // File storage configuration
    uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads'),
    transcodedDir: process.env.TRANSCODED_DIR || path.join(__dirname, '..', 'transcoded'),
    
    // YouTube API configuration
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
    
    // File upload configuration
    allowedVideoTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'],
    allowedFormats: ['mp4', 'avi', 'mov', 'webm']
};

module.exports = config;