# Video Transcoding Application

A comprehensive cloud-ready video transcoding application with YouTube integration, built with Node.js, Express, MariaDB, and Docker.

## 🚀 Features

### Core Functionality
- **Video Upload**: Upload videos without size restrictions
- **Video Transcoding**: Convert videos between MP4, AVI, MOV, and WebM formats using FFmpeg
- **User Authentication**: JWT-based authentication with session management
- **File Management**: Download original and transcoded videos, delete individual files
- **Progress Tracking**: Real-time transcoding job status monitoring

### Advanced Features
- **YouTube Integration**: Display related YouTube content based on uploaded videos
- **Database**: MariaDB for persistent data storage with proper indexing
- **Infrastructure as Code**: Docker Compose deployment with environment configuration
- **Responsive Design**: Mobile-friendly web interface
- **RESTful API**: Complete API endpoints for all operations

## 🛠 Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MariaDB 10.11
- **Video Processing**: FFmpeg, fluent-ffmpeg
- **Authentication**: JWT (jsonwebtoken)
- **External API**: YouTube Data API v3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Containerization**: Docker, Docker Compose
- **Environment**: Environment variables for configuration

## 📋 Prerequisites

- Docker and Docker Compose
- YouTube Data API v3 key (for related content feature)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd video-transcoding-app
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env file with your configuration
```

**Required Environment Variables:**
```env
YOUTUBE_API_KEY=your-youtube-api-key-here
DB_PASSWORD=your-secure-database-password
DB_ROOT_PASSWORD=your-secure-root-password
JWT_SECRET=your-secure-jwt-secret
```

### 3. Deploy with Docker
```bash
./deploy.sh
```

Or manually:
```bash
docker-compose up -d
```

### 4. Access Application
- **Web Interface**: http://localhost:3000
- **Database**: localhost:3306

## 👥 Default User Accounts

| Username | Password    | Role  |
|----------|-------------|-------|
| admin    | password123 | Admin |
| user1    | userpass1   | User  |
| user2    | userpass2   | User  |

## 🔌 API Endpoints

### Authentication
- `POST /api/login` - User login
- `GET /api/health` - Health check

### Video Management
- `POST /api/upload` - Upload video
- `GET /api/videos` - List user's videos
- `DELETE /api/videos/:videoId` - Delete original video
- `GET /api/videos/:videoId/related` - Get YouTube related content

### Transcoding
- `POST /api/transcode` - Start video transcoding
- `GET /api/jobs` - List transcoding jobs
- `DELETE /api/jobs/:jobId` - Delete transcoded video

### Downloads
- `GET /api/download/original/:filename` - Download original video
- `GET /api/download/transcoded/:filename` - Download transcoded video

## 🏗 Architecture

### Application Structure
```
├── server.js              # Main application server
├── database.js            # MariaDB database layer
├── youtube-service.js     # YouTube API integration
├── docker-compose.yml     # Docker services configuration
├── Dockerfile             # Application container
├── deploy.sh              # Deployment script
├── public/                # Frontend assets
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── docker/
    └── init.sql           # Database initialization
```

### Database Schema
- **users**: User authentication data
- **videos**: Video metadata and file information
- **transcode_jobs**: Transcoding job status and configuration

### Docker Services
- **app**: Node.js application container
- **mariadb**: MariaDB database container
- **volumes**: Persistent storage for videos and database

## 🌟 Key Features Explained

### YouTube Integration
When viewing video details, the application:
1. Extracts keywords from the video filename
2. Queries YouTube Data API for related content
3. Displays thumbnails, titles, and links to related videos
4. Provides fallback to trending content if no matches found

### Infrastructure as Code
- **Environment Variables**: All configuration through environment files
- **Docker Compose**: Complete application stack definition
- **Health Checks**: Container health monitoring
- **Volume Persistence**: Data persistence across container restarts
- **Network Isolation**: Secure inter-service communication

### Video Processing Pipeline
1. **Upload**: File validation and storage
2. **Metadata**: Database record creation
3. **Transcoding**: Asynchronous FFmpeg processing
4. **Status Tracking**: Real-time job monitoring
5. **Delivery**: Secure download endpoints

## 🔧 Development

### Local Development (without Docker)
```bash
# Install dependencies
npm install

# Setup local MariaDB
# Configure .env for local database

# Start application
npm start
```

### Database Migration
The application automatically creates tables on startup. For production deployments, consider running migrations separately.

## 📊 Monitoring and Logs

### View Application Logs
```bash
docker-compose logs -f app
```

### View Database Logs
```bash
docker-compose logs -f mariadb
```

### Health Monitoring
- Application: `GET /api/health`
- Database: Built-in Docker health checks

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **User Isolation**: Users can only access their own files
- **File Validation**: MIME type and extension checking
- **Path Security**: Secure file path handling
- **Environment Secrets**: Sensitive data in environment variables

## 🚀 AWS Migration Ready

The application is designed for easy AWS migration:

- **MariaDB**: Can use AWS RDS MariaDB
- **File Storage**: Can integrate with AWS S3
- **Container**: Ready for AWS ECS/EKS
- **Environment**: Supports AWS Parameter Store/Secrets Manager

### AWS RDS Migration
1. Create AWS RDS MariaDB instance
2. Update `DB_HOST` environment variable
3. Ensure security group allows connection
4. Run database initialization scripts

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check if MariaDB container is running
docker-compose ps

# Check database logs
docker-compose logs mariadb
```

**YouTube API Not Working**
- Verify API key in .env file
- Check API quota in Google Console
- Ensure YouTube Data API v3 is enabled

**Transcoding Failures**
- Check FFmpeg installation in container
- Verify input video file integrity
- Check available disk space

### Reset Application
```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions:
- Check the troubleshooting section
- Review application logs
- Create an issue in the repository