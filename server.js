const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const methodOverride = require('method-override');
const path = require('path');
require('dotenv').config();

// Import configuration and routes
const config = require('./config/app');
const apiRoutes = require('./src/routes');
const Database = require('./src/models/Database');
const youtubeService = require('./src/services/youtubeService');
const FileUtils = require('./src/utils/fileUtils');
const { requestLogger, errorHandler, apiNotFound } = require('./src/middleware/common');

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(methodOverride('_method'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(fileUpload({
    createParentPath: true
    // No file size limit
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Create necessary directories
FileUtils.ensureDirectoryExists(config.uploadsDir);
FileUtils.ensureDirectoryExists(config.transcodedDir);

// Initialize database
async function initDatabase() {
    try {
        const connected = await Database.testConnection();
        if (!connected) {
            throw new Error('Failed to connect to database');
        }
        console.log('Database connected successfully');
        
        // Test YouTube API connection
        await youtubeService.testConnection();
        
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler for API routes
app.use('/api/*', apiNotFound);

// Start server
function startServer() {
    try {
        initDatabase();
        
        console.log('Routes registered, starting server...');
        
        app.listen(PORT, () => {
            console.log(`Video transcoding server running on port ${PORT}`);
            console.log(`Access the web interface at: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();







