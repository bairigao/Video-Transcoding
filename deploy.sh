#!/bin/bash

# Video Transcoding Application Deployment Script

set -e

echo "🚀 Starting Video Transcoding Application Deployment..."

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment configuration file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing."
    echo "   Make sure to set your YouTube API key and database passwords."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads transcoded
touch uploads/.gitkeep transcoded/.gitkeep

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for MariaDB to be ready
echo "⏳ Waiting for database to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running successfully!"
    echo ""
    echo "🌐 Application is available at: http://localhost:3000"
    echo "📊 Database is available at: localhost:3306"
    echo ""
    echo "📖 Default user accounts:"
    echo "   • admin / password123"
    echo "   • user1 / userpass1" 
    echo "   • user2 / userpass2"
    echo ""
    echo "🔧 To stop services: docker-compose down"
    echo "📋 To view logs: docker-compose logs -f"
else
    echo "❌ Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi