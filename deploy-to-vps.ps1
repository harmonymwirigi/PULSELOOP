# PulseLoopCare Automated Deployment Script for PowerShell
# This script follows the deploymentguide.md and deploys to VPS automatically
# Run this script from your local Windows machine after pushing changes to GitHub

param(
    [switch]$Verbose,
    [switch]$Help
)

# Configuration
$VPS_HOST = "194.164.72.53"
$VPS_USER = "root"
$PROJECT_PATH = "/var/www/pulseloop"
$SERVICE_NAME = "pulseloop"

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

# Function to show help
function Show-Help {
    Write-Host "PulseLoopCare Deployment Script" -ForegroundColor $Blue
    Write-Host ""
    Write-Host "Usage: .\deploy-to-vps.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Help      Show this help message"
    Write-Host "  -Verbose   Enable verbose output"
    Write-Host ""
    Write-Host "Prerequisites:"
    Write-Host "  1. All changes committed and pushed to GitHub"
    Write-Host "  2. SSH access to VPS (194.164.72.53)"
    Write-Host "  3. OpenSSH client installed"
    Write-Host ""
    Write-Host "Example:"
    Write-Host "  .\deploy-to-vps.ps1              # Run deployment"
    Write-Host "  .\deploy-to-vps.ps1 -Verbose     # Run with verbose output"
}

# Show help if requested
if ($Help) {
    Show-Help
    exit 0
}

# Enable verbose mode if requested
if ($Verbose) {
    $VerbosePreference = "Continue"
}

# Main deployment function
function Deploy {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor $Blue
    Write-Host "   PulseLoopCare Deployment Script" -ForegroundColor $Blue
    Write-Host "========================================" -ForegroundColor $Blue
    Write-Host ""

    # Check if SSH is available
    Write-Status "Checking requirements..."
    try {
        $null = Get-Command ssh -ErrorAction Stop
        Write-Success "SSH client found"
    }
    catch {
        Write-Error "SSH is not installed or not in PATH"
        Write-Host "Please install OpenSSH client or Git for Windows"
        exit 1
    }

    Write-Status "Starting deployment to $VPS_USER@$VPS_HOST`:$PROJECT_PATH"
    Write-Host ""

    # Step 1: Stop the application
    Write-Status "Step 1: Stopping PulseLoop service..."
    $stopCommand = "sudo systemctl stop $SERVICE_NAME"
    $stopResult = ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" $stopCommand
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to stop service"
        exit 1
    }
    Write-Success "Service stopped"

    # Step 2: Update codebase
    Write-Status "Step 2: Updating codebase from GitHub..."
    $updateCommand = "cd $PROJECT_PATH && git reset --hard origin/main && git pull origin main"
    $updateResult = ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" $updateCommand
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to update codebase"
        exit 1
    }
    Write-Success "Codebase updated"

    # Step 3: Update backend dependencies & database
    Write-Status "Step 3: Updating backend dependencies and database..."
    $backendCommand = "cd $PROJECT_PATH && source venv/bin/activate && cd backend && pip install -r requirements.txt && flask db migrate -m 'Deploy $(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')' && flask db upgrade"
    $backendResult = ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" $backendCommand
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to update backend"
        exit 1
    }
    Write-Success "Backend updated"

    # Step 4: Rebuild frontend
    Write-Status "Step 4: Rebuilding frontend..."
    $frontendCommand = "cd $PROJECT_PATH/frontend && npm install && npm run build"
    $frontendResult = ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" $frontendCommand
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to rebuild frontend"
        exit 1
    }
    Write-Success "Frontend rebuilt"

    # Step 5: Restart services
    Write-Status "Step 5: Restarting services..."
    $restartCommand = "sudo systemctl start $SERVICE_NAME && sudo systemctl restart nginx"
    $restartResult = ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" $restartCommand
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to restart services"
        exit 1
    }
    Write-Success "Services restarted"

    # Step 6: Verify deployment
    Write-Status "Step 6: Verifying deployment..."
    $verifyCommand = "sudo systemctl status $SERVICE_NAME --no-pager && echo '' && sudo systemctl status nginx --no-pager"
    $verifyResult = ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" $verifyCommand

    Write-Host ""
    Write-Host "========================================" -ForegroundColor $Green
    Write-Host "   🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor $Green
    Write-Host "========================================" -ForegroundColor $Green
    Write-Host ""
    Write-Host "Your application is now live at: https://pulseloopcare.com" -ForegroundColor $Blue
    Write-Host ""
    Write-Warning "Please perform a hard refresh (Ctrl+Shift+R) to see your changes"
    Write-Host ""
}

# Run deployment
Deploy
