const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const methodOverride = require('method-override');
const path = require('path');
const fsSync = require('fs');
require('dotenv').config();

// Import routes
const apiRoutes = require('./src/routes');

// Import middleware
const { requestLogger } = require('./src/middleware/common');

// Import services
const Database = require('./src/models/Database');
const youtubeService = require('./src/services/youtubeService');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure upload directories from environment
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const transcodedDir = process.env.TRANSCODED_DIR || path.join(__dirname, 'transcoded');

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

// Create uploads directory if it doesn't exist
if (!fsSync.existsSync(uploadsDir)) {
    fsSync.mkdirSync(uploadsDir, { recursive: true });
}

// Create transcoded directory if it doesn't exist
if (!fsSync.existsSync(transcodedDir)) {
    fsSync.mkdirSync(transcodedDir, { recursive: true });
}

// Database initialization
async function initDatabase() {
    try {
        const connected = await Database.testConnection();
        if (!connected) {
            console.warn('Database connection failed - running in development mode without database');
            console.warn('To use full functionality, start the database with: docker-compose up mariadb');
        } else {
            console.log('Database connected successfully');
        }
        
        // Test YouTube API connection
        await youtubeService.testConnection();
        
    } catch (error) {
        console.warn('Failed to initialize database:', error.message);
        console.warn('Running in development mode without database');
        console.warn('To use full functionality, start the database with: docker-compose up mariadb');
    }
}

// Basic routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

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







