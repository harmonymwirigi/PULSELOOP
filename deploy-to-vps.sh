#!/bin/bash

# PulseLoopCare Automated Deployment Script
# This script follows the deploymentguide.md and deploys to VPS automatically
# Run this script from your local machine after pushing changes to GitHub

set -e  # Exit on any error

# Configuration
VPS_HOST="194.164.72.53"
VPS_USER="root"
PROJECT_PATH="/var/www/pulseloop"
SERVICE_NAME="pulseloop"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v ssh &> /dev/null; then
        print_error "SSH is not installed. Please install OpenSSH client."
        exit 1
    fi
    
    if ! command -v sshpass &> /dev/null; then
        print_warning "sshpass is not installed. You'll need to enter the password manually."
        SSH_PASS_AVAILABLE=false
    else
        SSH_PASS_AVAILABLE=true
    fi
    
    print_success "Requirements check completed"
}

# Function to get VPS password
get_vps_password() {
    if [ "$SSH_PASS_AVAILABLE" = true ]; then
        echo -n "Enter VPS password: "
        read -s VPS_PASSWORD
        echo
    else
        print_warning "You'll need to enter the password when prompted by SSH"
    fi
}

# Function to execute command on VPS
execute_on_vps() {
    local command="$1"
    local description="$2"
    
    print_status "$description"
    
    if [ "$SSH_PASS_AVAILABLE" = true ]; then
        sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "$command"
    else
        ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "$command"
    fi
    
    if [ $? -eq 0 ]; then
        print_success "$description completed"
    else
        print_error "$description failed"
        exit 1
    fi
}

# Function to execute multiple commands on VPS
execute_multiple_on_vps() {
    local commands="$1"
    local description="$2"
    
    print_status "$description"
    
    if [ "$SSH_PASS_AVAILABLE" = true ]; then
        sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "$commands"
    else
        ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "$commands"
    fi
    
    if [ $? -eq 0 ]; then
        print_success "$description completed"
    else
        print_error "$description failed"
        exit 1
    fi
}

# Main deployment function
deploy() {
    print_status "🚀 Starting PulseLoopCare deployment..."
    print_status "Target: $VPS_USER@$VPS_HOST:$PROJECT_PATH"
    
    # Step 1: Check requirements
    check_requirements
    
    # Step 2: Get VPS password
    get_vps_password
    
    # Step 3: Stop the application
    execute_on_vps "sudo systemctl stop $SERVICE_NAME" "Stopping PulseLoop service"
    
    # Step 4: Update codebase
    execute_multiple_on_vps "
        cd $PROJECT_PATH && 
        git reset --hard origin/main && 
        git pull origin main
    " "Updating codebase from GitHub"
    
    # Step 5: Update backend dependencies & database
    execute_multiple_on_vps "
        cd $PROJECT_PATH && 
        source venv/bin/activate && 
        cd backend && 
        pip install -r requirements.txt && 
        flask db migrate -m 'Deploy $(date +%Y-%m-%d_%H-%M-%S)' && 
        flask db upgrade
    " "Updating backend dependencies and database"
    
    # Step 6: Rebuild frontend
    execute_multiple_on_vps "
        cd $PROJECT_PATH/frontend && 
        npm install && 
        npm run build
    " "Rebuilding frontend"
    
    # Step 7: Restart services
    execute_on_vps "sudo systemctl start $SERVICE_NAME" "Starting PulseLoop service"
    execute_on_vps "sudo systemctl restart nginx" "Restarting Nginx"
    
    # Step 8: Verify deployment
    print_status "Verifying deployment..."
    execute_on_vps "sudo systemctl status $SERVICE_NAME --no-pager" "Checking PulseLoop service status"
    execute_on_vps "sudo systemctl status nginx --no-pager" "Checking Nginx status"
    
    print_success "🎉 Deployment completed successfully!"
    print_status "Your application is now live at: https://pulseloopcare.com"
    print_warning "Please perform a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to see your changes"
}

# Function to show help
show_help() {
    echo "PulseLoopCare Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --verbose  Enable verbose output"
    echo ""
    echo "Prerequisites:"
    echo "  1. All changes committed and pushed to GitHub"
    echo "  2. SSH access to VPS (194.164.72.53)"
    echo "  3. sshpass installed (optional, for password automation)"
    echo ""
    echo "Example:"
    echo "  $0              # Run deployment with manual password entry"
    echo "  $0 --verbose    # Run with verbose output"
}

# Parse command line arguments
VERBOSE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Enable verbose mode if requested
if [ "$VERBOSE" = true ]; then
    set -x
fi

# Run deployment
deploy
