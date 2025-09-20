#!/bin/bash

# Quick deployment script to fix API URL issues
echo "🚀 Deploying API URL fixes..."

# Configuration
VPS_USER="root"
VPS_HOST="194.164.72.53"
PROJECT_PATH="/var/www/pulseloop"
FRONTEND_PATH="${PROJECT_PATH}/frontend"

# Function to display messages
log_message() {
    echo -e "\n\e[1;34m>>> $1\e[0m"
}

# Function to display success messages
log_success() {
    echo -e "\n\e[1;32m✅ $1\e[0m"
}

# Function to display error messages and exit
log_error() {
    echo -e "\n\e[1;31m❌ ERROR: $1\e[0m"
    exit 1
}

# Function to execute commands on VPS
execute_remote() {
    local cmd="$1"
    log_message "Executing on VPS: $cmd"
    ssh -t "${VPS_USER}@${VPS_HOST}" "$cmd" || log_error "Failed to execute command: $cmd"
}

log_message "Starting API URL fix deployment..."

# Stop the service
execute_remote "sudo systemctl stop pulseloop"
log_success "Service stopped"

# Update code
execute_remote "cd ${PROJECT_PATH} && git reset --hard origin/main && git pull origin main"
log_success "Code updated"

# Rebuild frontend
execute_remote "cd ${FRONTEND_PATH} && npm install && npm run build"
log_success "Frontend rebuilt"

# Restart services
execute_remote "sudo systemctl start pulseloop && sudo systemctl restart nginx"
log_success "Services restarted"

log_success "API URL fix deployment completed!"
echo -e "\n\e[1;33mPlease check your website and perform a hard refresh (Ctrl+Shift+R) to see the fixes.\e[0m"
