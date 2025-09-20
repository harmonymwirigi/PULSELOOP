#!/bin/bash

# Deploy script to fix API URL issues
echo "🚀 Deploying API URL fixes..."

# Stop the service
echo "⏹️ Stopping PulseLoop service..."
sudo systemctl stop pulseloop

# Navigate to project directory
cd /var/www/pulseloop

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Activate virtual environment
echo "🐍 Activating virtual environment..."
source venv/bin/activate

# Build frontend
echo "🔨 Building frontend..."
cd frontend
npm run build

# Start service
echo "▶️ Starting PulseLoop service..."
cd ..
sudo systemctl start pulseloop

# Check status
echo "✅ Checking service status..."
sudo systemctl status pulseloop --no-pager

echo "🎉 Deployment complete! Check the browser console for API configuration logs."
