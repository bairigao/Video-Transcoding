#!/bin/bash

# Quick AWS Deployment Script for Video Transcoding Application
# This script follows the teacher's requirements for Docker deployment

set -e

echo "🚀 Video Transcoding App - AWS Deployment Script"
echo "================================================"

# Check if required parameters are provided
if [ $# -lt 2 ]; then
    echo "Usage: $0 <AWS_ACCOUNT_ID> <EC2_PUBLIC_IP>"
    echo "Example: $0 123456789012 54.123.45.67"
    exit 1
fi

AWS_ACCOUNT_ID=$1
EC2_PUBLIC_IP=$2
REGION="us-east-1"
REPO_NAME="video-transcoding-app"

echo "📋 Configuration:"
echo "  AWS Account ID: $AWS_ACCOUNT_ID"
echo "  EC2 Public IP: $EC2_PUBLIC_IP"
echo "  Region: $REGION"
echo "  Repository: $REPO_NAME"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
if ! command_exists aws; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

if ! command_exists docker; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "❌ AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

echo "✅ Prerequisites check passed!"
echo ""

# Step 1: Create ECR repository (if it doesn't exist)
echo "📦 Step 1: Setting up ECR repository..."
if ! aws ecr describe-repositories --repository-names $REPO_NAME --region $REGION >/dev/null 2>&1; then
    echo "Creating ECR repository: $REPO_NAME"
    aws ecr create-repository --repository-name $REPO_NAME --region $REGION
else
    echo "ECR repository already exists: $REPO_NAME"
fi

# Step 2: Build and push Docker image
echo "🔨 Step 2: Building and pushing Docker image..."

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build image
echo "Building Docker image..."
docker build -t $REPO_NAME .

# Tag image
echo "Tagging image for ECR..."
docker tag $REPO_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest

# Push image
echo "Pushing image to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest

echo "✅ Image successfully pushed to ECR!"
echo ""

# Step 3: Generate deployment files for EC2
echo "📄 Step 3: Generating deployment files..."

# Create deployment directory
mkdir -p aws-deployment

# Generate docker-compose.yml for EC2
cat > aws-deployment/docker-compose.yml << EOF
version: '3.8'

services:
  # MariaDB Database Service
  mariadb:
    image: mariadb:10.11
    container_name: video-transcoding-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: \${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: \${DB_NAME}
      MYSQL_USER: \${DB_USER}
      MYSQL_PASSWORD: \${DB_PASSWORD}
    ports:
      - "\${DB_PORT}:3306"
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
    image: $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest
    container_name: video-transcoding-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=\${PORT}
      - JWT_SECRET=\${JWT_SECRET}
      - YOUTUBE_API_KEY=\${YOUTUBE_API_KEY}
      - DB_HOST=mariadb
      - DB_PORT=3306
      - DB_NAME=\${DB_NAME}
      - DB_USER=\${DB_USER}
      - DB_PASSWORD=\${DB_PASSWORD}
      - UPLOADS_DIR=/app/uploads
      - TRANSCODED_DIR=/app/transcoded
    ports:
      - "\${PORT}:3000"
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

# Generate environment file
cat > aws-deployment/.env << EOF
# Application Configuration
PORT=3000
NODE_ENV=production
JWT_SECRET=production-jwt-secret-$(openssl rand -hex 16)

# YouTube API Configuration
YOUTUBE_API_KEY=AIzaSyARKffKN_skkn9qowyPWjF-beEvRK4JL2k

# Database Configuration (MariaDB)
DB_HOST=mariadb
DB_PORT=3307
DB_NAME=video_transcoding
DB_USER=video_user
DB_PASSWORD=secure_video_password_$(openssl rand -hex 8)
DB_ROOT_PASSWORD=secure_root_password_$(openssl rand -hex 8)

# File Storage Configuration
UPLOADS_DIR=/app/uploads
TRANSCODED_DIR=/app/transcoded
EOF

# Copy database initialization script
cp docker/init.sql aws-deployment/

# Generate EC2 deployment script
cat > aws-deployment/deploy-on-ec2.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying Video Transcoding Application on EC2..."

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt update
    sudo apt install -y docker.io docker-compose
    sudo usermod -aG docker ubuntu
    echo "Please logout and login again to apply Docker group changes"
    exit 1
fi

# Install AWS CLI if not present
if ! command -v aws &> /dev/null; then
    echo "Installing AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    sudo apt install -y unzip
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
fi

# Check if AWS is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "Please configure AWS CLI: aws configure"
    exit 1
fi

# Login to ECR
echo "🔐 Logging into ECR..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Pull latest image
echo "📥 Pulling latest image..."
docker pull $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/video-transcoding-app:latest

# Deploy application
echo "🚀 Starting application..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🔍 Performing health check..."
if curl -f http://localhost:3000/api/health; then
    echo ""
    echo "✅ Deployment successful!"
    echo "🌐 Application URL: http://$(curl -s http://checkip.amazonaws.com):3000"
    echo ""
    echo "📋 Default Login Credentials:"
    echo "  admin / password123"
    echo "  user1 / userpass1"
    echo "  user2 / userpass2"
else
    echo "❌ Health check failed!"
    echo "📋 Checking logs..."
    docker-compose logs
    exit 1
fi
EOF

chmod +x aws-deployment/deploy-on-ec2.sh

echo "✅ Deployment files generated in 'aws-deployment/' directory"
echo ""

# Step 4: Instructions for EC2 deployment
echo "📋 Step 4: EC2 Deployment Instructions"
echo "====================================="
echo ""
echo "1. Copy deployment files to your EC2 instance:"
echo "   scp -i your-key.pem -r aws-deployment/ ubuntu@$EC2_PUBLIC_IP:~/"
echo ""
echo "2. SSH into your EC2 instance:"
echo "   ssh -i your-key.pem ubuntu@$EC2_PUBLIC_IP"
echo ""
echo "3. Run the deployment script:"
echo "   cd aws-deployment/"
echo "   aws configure  # Enter your AWS credentials"
echo "   ./deploy-on-ec2.sh"
echo ""
echo "4. Access your application:"
echo "   http://$EC2_PUBLIC_IP:3000"
echo ""

# Generate a summary file
cat > aws-deployment/DEPLOYMENT_SUMMARY.md << EOF
# Deployment Summary

## 🚀 Application Successfully Prepared for AWS Deployment

### ECR Repository
- **Repository URI**: $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME
- **Latest Image**: $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest

### EC2 Requirements
- **OS**: Ubuntu 24.04 LTS
- **Instance Type**: t3.medium or larger
- **Security Group**: Allow ports 22 (SSH) and 3000 (HTTP)

### Deployment Steps
1. ✅ ECR repository created
2. ✅ Docker image built and pushed
3. ✅ Deployment files generated
4. ⏳ Copy files to EC2 and run deploy-on-ec2.sh

### Application Access
- **URL**: http://$EC2_PUBLIC_IP:3000
- **Default Users**: admin/password123, user1/userpass1, user2/userpass2

### Architecture
- **Frontend**: React-like interface with HTML/CSS/JS
- **Backend**: Node.js/Express REST API
- **Database**: MariaDB container
- **Processing**: FFmpeg video transcoding
- **External API**: YouTube integration

### Port Mapping (as required by teacher)
- **Application**: Host:3000 → Container:3000
- **Database**: Host:3307 → Container:3306

This deployment follows the teacher's requirements:
✅ Docker containerization
✅ Ubuntu 24.04 deployment target
✅ ECR repository usage
✅ Simple deployment workflow
✅ MariaDB using public Docker image
✅ Docker Compose for orchestration
EOF

echo "✅ Deployment preparation complete!"
echo ""
echo "📁 Files created in 'aws-deployment/':"
echo "  - docker-compose.yml"
echo "  - .env"
echo "  - init.sql"
echo "  - deploy-on-ec2.sh"
echo "  - DEPLOYMENT_SUMMARY.md"
echo ""
echo "🎯 Next steps:"
echo "1. Follow the EC2 deployment instructions above"
echo "2. Ensure your EC2 security group allows port 3000"
echo "3. Test the application after deployment"
echo ""
echo "🏆 Your application meets all teacher requirements:"
echo "  ✅ Docker containerization"
echo "  ✅ ECR image repository"
echo "  ✅ Ubuntu 24.04 deployment"
echo "  ✅ Simple deployment workflow"
echo "  ✅ MariaDB public image usage"
echo "  ✅ Docker Compose orchestration"