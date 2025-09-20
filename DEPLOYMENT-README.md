# PulseLoopCare Automated Deployment Scripts

This directory contains automated deployment scripts that follow the `deploymentguide.md` and can be run locally from your computer to deploy changes to your VPS.

## 🚀 Quick Start

1. **Make your changes** and test them locally
2. **Commit and push** to GitHub:
   ```bash
   git add .
   git commit -m "Your changes description"
   git push origin main
   ```
3. **Run the deployment script**:
   ```powershell
   .\deploy-to-vps.ps1
   ```

## 📁 Available Scripts

### Windows Scripts
- **`deploy-to-vps.ps1`** - PowerShell script (Recommended for Windows)
- **`deploy-to-vps.bat`** - Batch script (Alternative for Windows)
- **`setup-deployment-tools.bat`** - Setup script to install required tools

### Linux/Mac Scripts
- **`deploy-to-vps.sh`** - Bash script for Linux/Mac/WSL

## 🛠️ Setup (One-time)

### For Windows Users:

1. **Run the setup script**:
   ```cmd
   .\setup-deployment-tools.bat
   ```

2. **Or manually install**:
   - **Git for Windows** (includes SSH): https://git-scm.com/download/win
   - **Node.js** (for development): https://nodejs.org/
   - **Python** (for development): https://python.org/
   - **sshpass** (optional, for password automation): https://github.com/keimpx/sshpass-windows

### For Linux/Mac Users:

1. **Install required tools**:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install ssh sshpass git nodejs python3

   # macOS
   brew install ssh sshpass git node python
   ```

2. **Make scripts executable**:
   ```bash
   chmod +x deploy-to-vps.sh
   ```

## 🎯 Usage

### PowerShell (Recommended)
```powershell
# Basic deployment
.\deploy-to-vps.ps1

# With verbose output
.\deploy-to-vps.ps1 -Verbose

# Show help
.\deploy-to-vps.ps1 -Help
```

### Batch Script
```cmd
deploy-to-vps.bat
```

### Bash Script
```bash
# Basic deployment
./deploy-to-vps.sh

# With verbose output
./deploy-to-vps.sh --verbose

# Show help
./deploy-to-vps.sh --help
```

## 📋 What the Scripts Do

The deployment scripts automatically execute these steps (following `deploymentguide.md`):

1. **🔍 Check Requirements** - Verify SSH and other tools are available
2. **⏹️ Stop Service** - Stop the running PulseLoop service
3. **📥 Update Code** - Pull latest changes from GitHub
4. **🐍 Update Backend** - Install Python dependencies and run database migrations
5. **⚛️ Rebuild Frontend** - Install npm packages and build production files
6. **▶️ Restart Services** - Start PulseLoop service and restart Nginx
7. **✅ Verify Deployment** - Check that all services are running correctly

## 🔧 Configuration

The scripts use these default settings (can be modified in the script files):

```bash
VPS_HOST="194.164.72.53"
VPS_USER="root"
PROJECT_PATH="/var/www/pulseloop"
SERVICE_NAME="pulseloop"
```

## 🔐 Security Notes

- **Password Handling**: The scripts will prompt for your VPS password
- **SSH Keys**: Consider setting up SSH key authentication for better security
- **StrictHostKeyChecking**: Disabled for automation (safe for known servers)

## 🐛 Troubleshooting

### Common Issues:

1. **"SSH not found"**
   - Install Git for Windows or OpenSSH client
   - Ensure SSH is in your system PATH

2. **"Permission denied"**
   - Check your VPS password
   - Verify SSH access works manually: `ssh root@194.164.72.53`

3. **"Command failed"**
   - Check the verbose output for specific error details
   - Ensure all changes are pushed to GitHub first

4. **"Service not starting"**
   - Check VPS logs: `sudo journalctl -u pulseloop -f`
   - Verify database migrations completed successfully

### Debug Mode:

Run with verbose output to see detailed execution:
```powershell
.\deploy-to-vps.ps1 -Verbose
```

## 📞 Support

If you encounter issues:

1. **Check the logs** - The scripts provide detailed output
2. **Verify prerequisites** - Ensure all tools are installed
3. **Test SSH manually** - `ssh root@194.164.72.53`
4. **Check VPS status** - `sudo systemctl status pulseloop`

## 🎉 Success!

After successful deployment:
- Your app will be live at: https://pulseloopcare.com
- Perform a hard refresh (Ctrl+Shift+R) to see changes
- Check the browser console for API configuration logs

---

**Note**: These scripts follow the exact steps from `deploymentguide.md` but automate the process for convenience and consistency.
