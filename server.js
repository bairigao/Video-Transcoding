const express = require('express');
const jwt = require('jsonwebtoken');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const methodOverride = require('method-override');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const db = require('./database');
const youtubeService = require('./youtube-service');
require('dotenv').config();

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Configure upload directories from environment
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const transcodedDir = process.env.TRANSCODED_DIR || path.join(__dirname, 'transcoded');

// Middleware
app.use(cors());
app.use(methodOverride('_method'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});
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
// Remove the old LowDB code and hardcoded users as they're now in MariaDB

// Initialize database
async function initDatabase() {
    try {
        const connected = await db.testConnection();
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

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Utility function to generate unique filename
function generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    return `${nameWithoutExt}_${timestamp}_${randomString}${extension}`;
}

// Basic routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await db.getUser(username);
        
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
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
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get YouTube related content for a video
app.get('/api/videos/:videoId/related', authenticateToken, async (req, res) => {
    try {
        const { videoId } = req.params;
        
        // Get the video metadata
        const video = await db.getVideoById(videoId);
        
        if (!video || video.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Video not found' });
        }
        
        // Get related YouTube content
        const relatedVideos = await youtubeService.getVideoSuggestions({
            originalName: video.original_name,
            filename: video.filename
        });
        
        res.json({ 
            relatedVideos,
            video: {
                id: video.id,
                originalName: video.original_name,
                filename: video.filename
            }
        });
        
    } catch (error) {
        console.error('YouTube related content error:', error);
        res.status(500).json({ error: 'Failed to fetch related content' });
    }
});

// Upload video endpoint
app.post('/api/upload', authenticateToken, async (req, res) => {
    try {
        if (!req.files || !req.files.video) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const videoFile = req.files.video;
        const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'];
        
        if (!allowedTypes.includes(videoFile.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Only video files are allowed.' });
        }

        const uniqueFilename = generateUniqueFilename(videoFile.name);
        const uploadPath = path.join(uploadsDir, uniqueFilename);

        await videoFile.mv(uploadPath);

        // Save video metadata to database
        const videoData = {
            id: Date.now().toString(),
            originalName: videoFile.name,
            filename: uniqueFilename,
            userId: req.user.id,
            username: req.user.username,
            size: videoFile.size,
            mimetype: videoFile.mimetype
        };

        await db.createVideo(videoData);

        res.json({
            message: 'Video uploaded successfully',
            videoId: videoData.id,
            filename: uniqueFilename
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload video' });
    }
});

// List user's videos endpoint
app.get('/api/videos', authenticateToken, async (req, res) => {
    try {
        const userVideos = await db.getVideosByUserId(req.user.id);
        // Convert snake_case to camelCase for frontend compatibility
        const formattedVideos = userVideos.map(video => ({
            id: video.id,
            originalName: video.original_name,
            filename: video.filename,
            userId: video.user_id,
            username: video.username,
            size: video.size,
            uploadDate: video.upload_date,
            mimetype: video.mimetype
        }));
        res.json({ videos: formattedVideos });
    } catch (error) {
        console.error('List videos error:', error);
        res.status(500).json({ error: 'Failed to retrieve videos' });
    }
});

// Request video transcoding endpoint
app.post('/api/transcode', authenticateToken, async (req, res) => {
    try {
        const { videoId, format } = req.body;

        if (!videoId || !format) {
            return res.status(400).json({ error: 'Video ID and format are required' });
        }

        const allowedFormats = ['mp4', 'avi', 'mov', 'webm'];
        if (!allowedFormats.includes(format.toLowerCase())) {
            return res.status(400).json({ error: 'Unsupported format. Allowed: mp4, avi, mov, webm' });
        }

        // Find the video
        const video = await db.getVideoById(videoId);
        if (!video || video.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const inputPath = path.join(uploadsDir, video.filename);
        const outputFilename = `${path.parse(video.filename).name}_transcoded.${format}`;
        const outputPath = path.join(transcodedDir, outputFilename);

        // Check if input file exists
        if (!fsSync.existsSync(inputPath)) {
            return res.status(404).json({ error: 'Original video file not found' });
        }
        
        // Check file size and readability
        try {
            const stats = fsSync.statSync(inputPath);
            console.log(`Input file stats: size=${stats.size}, path=${inputPath}`);
        } catch (error) {
            console.error('Error reading file stats:', error);
            return res.status(500).json({ error: 'Cannot read input file' });
        }

        // Create transcode job
        const jobId = Date.now().toString();
        const transcodeJob = {
            id: jobId,
            videoId: videoId,
            userId: req.user.id,
            inputPath: inputPath,
            outputPath: outputPath,
            outputFilename: outputFilename,
            format: format,
            status: 'processing'
        };

        await db.createTranscodeJob(transcodeJob);

        // Start transcoding process
        console.log(`Starting transcoding: ${inputPath} -> ${outputPath}`);
        console.log(`FFmpeg path: ${ffmpegInstaller.path}`);
        
        ffmpeg(inputPath)
            .output(outputPath)
            .on('start', (commandLine) => {
                console.log('Spawned Ffmpeg with command: ' + commandLine);
            })
            .on('progress', (progress) => {
                console.log('Processing: ' + progress.percent + '% done');
            })
            .on('end', async () => {
                console.log('Transcoding finished successfully');
                // Update job status
                await db.updateTranscodeJobStatus(jobId, 'completed', null, new Date());
            })
            .on('error', async (err, stdout, stderr) => {
                console.error('Transcoding error:', err.message);
                console.error('ffmpeg stdout:', stdout);
                console.error('ffmpeg stderr:', stderr);
                // Update job status
                await db.updateTranscodeJobStatus(jobId, 'failed', err.message, new Date());
            })
            .run();

        res.json({
            message: 'Transcoding started',
            jobId: jobId,
            status: 'processing'
        });

    } catch (error) {
        console.error('Transcode error:', error);
        res.status(500).json({ error: 'Failed to start transcoding' });
    }
});

// Get all transcode jobs for user
app.get('/api/jobs', authenticateToken, async (req, res) => {
    try {
        const userJobs = await db.getTranscodeJobsByUserId(req.user.id);
        // Convert snake_case to camelCase for frontend compatibility
        const formattedJobs = userJobs.map(job => ({
            id: job.id,
            videoId: job.video_id,
            userId: job.user_id,
            inputPath: job.input_path,
            outputPath: job.output_path,
            outputFilename: job.output_filename,
            format: job.format,
            status: job.status,
            error: job.error_message,
            createdAt: job.created_at,
            completedAt: job.completed_at
        }));
        res.json({ jobs: formattedJobs });
    } catch (error) {
        console.error('Jobs list error:', error);
        res.status(500).json({ error: 'Failed to retrieve jobs' });
    }
});

// Download original video
app.get('/api/download/original/:filename', authenticateToken, async (req, res) => {
    try {
        const { filename } = req.params;
        const video = await db.getVideoByFilename(filename, req.user.id);
        
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }
        
        const filePath = path.join(uploadsDir, filename);
        
        if (!fsSync.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }
        
        res.download(filePath);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// Download transcoded video
app.get('/api/download/transcoded/:filename', authenticateToken, async (req, res) => {
    try {
        const { filename } = req.params;
        const job = await db.getTranscodeJobByFilename(filename, req.user.id);
        
        if (!job) {
            return res.status(404).json({ error: 'Transcoded video not found or not ready' });
        }
        
        const filePath = path.join(transcodedDir, filename);
        
        if (!fsSync.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }
        
        res.download(filePath);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// Delete original video
app.delete('/api/videos/:videoId', authenticateToken, async (req, res) => {
    try {
        const { videoId } = req.params;
        
        // Find the video
        const video = await db.getVideoById(videoId);
        
        if (!video || video.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Video not found' });
        }
        
        // Delete the physical file
        const filePath = path.join(uploadsDir, video.filename);
        if (fsSync.existsSync(filePath)) {
            await fs.unlink(filePath);
        }
        
        // Remove video from database
        await db.deleteVideo(videoId, req.user.id);
        
        // Note: Transcoded files are kept and can be deleted individually
        // Users can manage transcoded videos separately via the jobs interface
        
        res.json({ message: 'Original video deleted successfully. Transcoded videos remain available.' });
        
    } catch (error) {
        console.error('Delete video error:', error);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

// Delete individual transcoded video
app.delete('/api/jobs/:jobId', authenticateToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        
        // Find the transcode job
        const job = await db.getTranscodeJobById(jobId);
        
        if (!job || job.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Transcode job not found' });
        }
        
        // Delete the transcoded file if it exists
        if (job.output_filename) {
            const transcodedPath = path.join(transcodedDir, job.output_filename);
            if (fsSync.existsSync(transcodedPath)) {
                await fs.unlink(transcodedPath);
            }
        }
        
        // Remove the job from database
        await db.deleteTranscodeJob(jobId, req.user.id);
        
        res.json({ message: 'Transcoded video deleted successfully' });
        
    } catch (error) {
        console.error('Delete transcode job error:', error);
        res.status(500).json({ error: 'Failed to delete transcoded video' });
    }
});

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