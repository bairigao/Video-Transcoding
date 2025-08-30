# 🚀 AWS Deployment Guide - Video Transcoding Application

This guide will walk you through deploying your video transcoding application on AWS using Docker containers, ECR, and EC2.

## 📋 Prerequisites

- AWS CLI configured with CAB432 account credentials
- Docker installed locally
- Access to CAB432 AWS account
- Ubuntu 24.04 EC2 instance (t3.medium or larger recommended)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AWS ECR       │    │   EC2 Instance   │    │   Docker        │
│   (Image Repo)  │───▶│   Ubuntu 24.04   │───▶│   Containers    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                │                 │
                                                │  App Container  │
                                                │  MariaDB        │
                                                └─────────────────┘
```

## 🗃️ Application Components

- **Frontend**: HTML/CSS/JavaScript interface
- **Backend**: Node.js/Express REST API
- **Database**: MariaDB container
- **Processing**: FFmpeg video transcoding
- **External API**: YouTube integration

---

# 📖 Step-by-Step Deployment

## Step 1: 🐳 Create ECR Repository

### 1.1 Create ECR Repository
```bash
# Replace 'your-repo-name' with your desired repository name
aws ecr create-repository --repository-name video-transcoding-app --region us-east-1
```

### 1.2 Get ECR Login Token
```bash
# Get login command for ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com
```

**Note**: Replace `<ACCOUNT_ID>` with your actual AWS account ID from the ECR repository URI.

---

## Step 2: 🔨 Build and Push Docker Image

### 2.1 Build Local Image
```bash
# Navigate to your project directory
cd /path/to/your/CAB432/project

# Build the Docker image
docker build -t video-transcoding-app .
```

### 2.2 Tag Image for ECR
```bash
# Tag your image with ECR repository URI
docker tag video-transcoding-app:latest 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com:latest
```

### 2.3 Push to ECR
```bash
# Push the image to ECR
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com:latest
```

---

## Step 3: 🖥️ Set Up EC2 Instance

### 3.1 Launch EC2 Instance
1. **AMI**: Ubuntu Server 24.04 LTS
2. **Instance Type**: t3.medium (minimum) or t3.large (recommended)
3. **Storage**: 20GB+ EBS volume
4. **Security Group**: 
   - Port 22 (SSH)
   - Port 3000 (Application)
   - Port 3307 (MariaDB - if external access needed)

### 3.2 Security Group Configuration
```bash
# Create security group
aws ec2 create-security-group \
    --group-name video-transcoding-sg \
    --description "Security group for video transcoding app"

# Add rules
aws ec2 authorize-security-group-ingress \
    --group-name video-transcoding-sg \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-name video-transcoding-sg \
    --protocol tcp \
    --port 3000 \
    --cidr 0.0.0.0/0
```

---

## Step 4: ⚙️ Configure EC2 Instance

### 4.1 Connect to EC2 Instance
```bash
# SSH into your EC2 instance
ssh -i your-key-pair.pem ubuntu@<EC2_PUBLIC_IP>
```

### 4.2 Install Docker and Docker Compose
```bash
# Update package list
sudo apt update

# Install Docker
sudo apt install -y docker.io

# Install Docker Compose
sudo apt install -y docker-compose

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Restart to apply group changes
sudo systemctl restart docker
newgrp docker
```

### 4.3 Install AWS CLI
```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt install -y unzip
unzip awscliv2.zip
sudo ./aws/install
```

### 4.4 Configure AWS CLI
```bash
# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

---

## Step 5: 🚀 Deploy Application

### 5.1 Login to ECR from EC2
```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

### 5.2 Create Deployment Files

#### Create docker-compose.yml
```bash
# Create project directory
mkdir ~/video-transcoding-app
cd ~/video-transcoding-app

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # MariaDB Database Service
  mariadb:
    image: mariadb:10.11
    container_name: video-transcoding-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    ports:
      - "${DB_PORT}:3306"
    volumes:
      - mariadb_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - video-transcoding-network
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      start_period: 10s
      interval: 10s
      timeout: 5s
      retries: 3

  # Video Transcoding Application Service
  app:
    image: <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/video-transcoding-app:latest
    container_name: video-transcoding-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=${PORT}
      - JWT_SECRET=${JWT_SECRET}
      - YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
      - DB_HOST=mariadb
      - DB_PORT=3306
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - UPLOADS_DIR=/app/uploads
      - TRANSCODED_DIR=/app/transcoded
    ports:
      - "${PORT}:3000"
    volumes:
      - video_uploads:/app/uploads
      - video_transcoded:/app/transcoded
    depends_on:
      mariadb:
        condition: service_healthy
    networks:
      - video-transcoding-network

volumes:
  mariadb_data:
    driver: local
  video_uploads:
    driver: local
  video_transcoded:
    driver: local

networks:
  video-transcoding-network:
    driver: bridge
EOF
```

#### Create Environment File
```bash
# Create .env file
cat > .env << 'EOF'
# Application Configuration
PORT=3000
NODE_ENV=production
JWT_SECRET=your-production-jwt-secret-key-change-this

# YouTube API Configuration
YOUTUBE_API_KEY=AIzaSyARKffKN_skkn9qowyPWjF-beEvRK4JL2k

# Database Configuration (MariaDB)
DB_HOST=mariadb
DB_PORT=3307
DB_NAME=video_transcoding
DB_USER=video_user
DB_PASSWORD=secure_video_password_123
DB_ROOT_PASSWORD=secure_root_password_456

# File Storage Configuration
UPLOADS_DIR=/app/uploads
TRANSCODED_DIR=/app/transcoded
EOF
```

#### Create Database Initialization Script
```bash
# Create init.sql file
cat > init.sql << 'EOF'
-- Initialize Video Transcoding Database
USE video_transcoding;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
    id VARCHAR(50) PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    size BIGINT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mimetype VARCHAR(100) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_upload_date (upload_date)
);

-- Create transcode_jobs table
CREATE TABLE IF NOT EXISTS transcode_jobs (
    id VARCHAR(50) PRIMARY KEY,
    video_id VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    input_path VARCHAR(500) NOT NULL,
    output_path VARCHAR(500) NOT NULL,
    output_filename VARCHAR(255) NOT NULL,
    format VARCHAR(10) NOT NULL,
    status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Insert default users (passwords should be hashed in production)
INSERT IGNORE INTO users (id, username, password) VALUES 
(1, 'admin', 'password123'),
(2, 'user1', 'userpass1'),
(3, 'user2', 'userpass2');
EOF
```

### 5.3 Pull and Deploy
```bash
# Pull the latest image from ECR
docker pull <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/video-transcoding-app:latest

# Start the application
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## Step 6: ✅ Verify Deployment

### 6.1 Health Check
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test from external (replace with your EC2 public IP)
curl http://<EC2_PUBLIC_IP>:3000/api/health
```

### 6.2 Access Application
1. Open browser to `http://<EC2_PUBLIC_IP>:3000`
2. Login with default credentials:
   - Username: `admin` / Password: `password123`
   - Username: `user1` / Password: `userpass1`
   - Username: `user2` / Password: `userpass2`

### 6.3 Test Functionality
1. **Upload** a video file
2. **Transcode** to different format
3. **Download** original and transcoded files
4. **View YouTube** related content
5. **Delete** videos and jobs

---

## 🛠️ Management Commands

### Application Management
```bash
# Stop application
docker-compose down

# Restart application
docker-compose restart

# Update application (after pushing new image)
docker-compose pull
docker-compose up -d

# View real-time logs
docker-compose logs -f app

# Execute commands in container
docker-compose exec app bash
```

### Database Management
```bash
# Connect to database
docker-compose exec mariadb mysql -u root -p video_transcoding

# Backup database
docker-compose exec mariadb mysqldump -u root -p video_transcoding > backup.sql

# View database logs
docker-compose logs mariadb
```

---

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill process if needed
sudo kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check MariaDB container status
docker-compose ps mariadb

# View MariaDB logs
docker-compose logs mariadb

# Restart MariaDB
docker-compose restart mariadb
```

#### ECR Authentication Issues
```bash
# Re-authenticate with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

#### Storage Issues
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a

# Check volume usage
docker volume ls
```

---

## 🔒 Security Considerations

### Production Security
1. **Change Default Passwords**: Update all default passwords in `.env`
2. **JWT Secret**: Use a strong, unique JWT secret
3. **Database Security**: Use strong database passwords
4. **Firewall**: Configure proper security group rules
5. **SSL/TLS**: Consider adding HTTPS with reverse proxy (nginx)

### Recommended Security Group Rules
```bash
# Allow HTTP (port 3000) from anywhere
0.0.0.0/0:3000

# Allow SSH only from your IP
<YOUR_IP>/32:22

# Database port (3307) should NOT be accessible from internet
# Only allow from application container (handled by Docker network)
```

---

## 📈 Monitoring and Logs

### Application Logs
```bash
# View all logs
docker-compose logs

# Follow app logs
docker-compose logs -f app

# View last 100 lines
docker-compose logs --tail=100 app
```

### System Monitoring
```bash
# Monitor container resources
docker stats

# Check system resources
top
htop
df -h
free -h
```

---

## 🚀 Quick Deployment Script

Create a deployment script for easy redeployment:

```bash
# Create deploy.sh
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying Video Transcoding Application..."

# Variables (replace with your values)
ACCOUNT_ID="YOUR_ACCOUNT_ID"
REGION="us-east-1"
REPO_NAME="video-transcoding-app"

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Pull latest image
echo "📥 Pulling latest image..."
docker pull $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Start new containers
echo "▶️ Starting new containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Health check
echo "🔍 Performing health check..."
if curl -f http://localhost:3000/api/health; then
    echo "✅ Deployment successful!"
    echo "🌐 Application available at: http://$(curl -s http://checkip.amazonaws.com):3000"
else
    echo "❌ Health check failed!"
    docker-compose logs
    exit 1
fi
EOF

# Make executable
chmod +x deploy.sh
```

---

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] AWS CLI configured
- [ ] Docker installed locally
- [ ] ECR repository created
- [ ] Image built and pushed to ECR
- [ ] EC2 instance launched with Ubuntu 24.04
- [ ] Security group configured

### Deployment
- [ ] Connected to EC2 instance
- [ ] Docker and Docker Compose installed
- [ ] AWS CLI configured on EC2
- [ ] ECR authentication completed
- [ ] Deployment files created
- [ ] Application deployed
- [ ] Health check passed

### Post-Deployment
- [ ] Application accessible via browser
- [ ] Login functionality working
- [ ] File upload working
- [ ] Video transcoding working
- [ ] YouTube integration working
- [ ] Database persistence working

---

## 🎯 Performance Optimization

### Recommended EC2 Instance Types
- **Development**: t3.medium (2 vCPU, 4 GB RAM)
- **Production**: t3.large (2 vCPU, 8 GB RAM)
- **High Load**: c5.xlarge (4 vCPU, 8 GB RAM)

### Storage Optimization
- Use **gp3** EBS volumes for better performance
- Minimum **20 GB** storage for application and videos
- Consider **EFS** for shared storage across multiple instances

---

## 💡 Tips for Success

1. **Test Locally First**: Always test your Docker setup locally before deploying
2. **Port Consistency**: Use the same port mappings throughout development and production
3. **Environment Variables**: Use `.env` files for configuration management
4. **Health Checks**: Implement proper health checks for monitoring
5. **Logging**: Ensure comprehensive logging for troubleshooting
6. **Backup Strategy**: Regular database backups
7. **Documentation**: Keep this guide updated with any changes

---

**🎉 Congratulations! Your video transcoding application is now deployed on AWS!**

For support or questions, refer to the troubleshooting section or check the application logs.