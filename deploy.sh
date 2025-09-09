#!/bin/bash

# PulseLoop Deployment Script
# Run this script to deploy updates to your VPS

echo "🚀 Deploying PulseLoop to VPS..."
echo "================================="

# Configuration
APP_DIR="/var/www/pulseloop"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
VENV_DIR="$APP_DIR/venv"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Navigate to application directory
cd $APP_DIR

# Pull latest changes from Git
echo "📥 Pulling latest changes..."
git pull origin main

# Activate virtual environment
echo "🐍 Activating virtual environment..."
source $VENV_DIR/bin/activate

# Install/update Python dependencies
echo "📦 Updating Python dependencies..."
cd $BACKEND_DIR
pip install -r requirements.txt

# Run database migrations
echo "🗄️ Running database migrations..."
flask db upgrade

# Build frontend
echo "🏗️ Building frontend..."
cd $FRONTEND_DIR
npm install
npm run build

# Set proper permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

# Restart services
echo "🔄 Restarting services..."
systemctl restart pulseloop-backend
systemctl restart nginx

# Check service status
echo "📊 Checking service status..."
systemctl status pulseloop-backend --no-pager -l
systemctl status nginx --no-pager -l

echo "✅ Deployment completed!"
echo "================================="
echo "Your application should now be running at:"
echo "Frontend: https://your-domain.com"
echo "Backend API: https://your-domain.com/api/"
echo "================================="
