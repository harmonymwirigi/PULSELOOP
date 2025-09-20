# Quick deployment script for conversation system
Write-Host "🚀 Deploying conversation system..." -ForegroundColor Cyan

# Configuration
$VpsUser = "root"
$VpsHost = "194.164.72.53"
$ProjectPath = "/var/www/pulseloop"
$FrontendPath = "$ProjectPath/frontend"
$BackendPath = "$ProjectPath/backend"

# Function to display messages
function Log-Message {
    param ([string]$Message)
    Write-Host "`n>>> $Message" -ForegroundColor Cyan
}

# Function to display success messages
function Log-Success {
    param ([string]$Message)
    Write-Host "`n✅ SUCCESS: $Message" -ForegroundColor Green
}

# Function to display error messages and exit
function Log-Error {
    param ([string]$Message)
    Write-Host "`n❌ ERROR: $Message" -ForegroundColor Red
    exit 1
}

# Function to execute commands on VPS
function Invoke-RemoteCommand {
    param ([string]$Command)
    Log-Message "Executing on VPS: $Command"
    try {
        $sshCommand = "ssh.exe $VpsUser@$VpsHost `"$Command`""
        $result = Invoke-Expression $sshCommand 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Log-Error "Failed to execute command: $Command`nOutput: $result"
        }
        Write-Host $result
    } catch {
        Log-Error "SSH connection or command execution failed: $($_.Exception.Message)"
    }
}

Log-Message "Starting conversation system deployment..."

# Stop the service
Invoke-RemoteCommand "sudo systemctl stop pulseloop"
Log-Success "Service stopped"

# Update code
Invoke-RemoteCommand "cd $ProjectPath && git reset --hard origin/main && git pull origin main"
Log-Success "Code updated"

# Install new dependencies
Invoke-RemoteCommand "cd $BackendPath && source ../venv/bin/activate && pip install -r requirements.txt"
Log-Success "Dependencies installed"

# Create and run database migration
Invoke-RemoteCommand "cd $BackendPath && source ../venv/bin/activate && flask db migrate -m 'Add conversation system' && flask db upgrade"
Log-Success "Database migration completed"

# Rebuild frontend
Invoke-RemoteCommand "cd $FrontendPath && npm install && npm run build"
Log-Success "Frontend rebuilt"

# Restart services
Invoke-RemoteCommand "sudo systemctl start pulseloop && sudo systemctl restart nginx"
Log-Success "Services restarted"

Log-Success "Conversation system deployment completed!"
Write-Host "`n🎉 New Features Available:" -ForegroundColor Yellow
Write-Host "• Daily conversation discussions" -ForegroundColor White
Write-Host "• Admin can start and manage conversations" -ForegroundColor White
Write-Host "• Users can participate with reactions and messages" -ForegroundColor White
Write-Host "• Mobile-optimized conversation interface" -ForegroundColor White
Write-Host "`nPlease check your website and perform a hard refresh (Ctrl+Shift+R) to see the new features." -ForegroundColor Yellow
