@echo off
REM Setup script for PulseLoopCare deployment tools on Windows
REM This script helps install the required tools for automated deployment

echo.
echo ========================================
echo   PulseLoopCare Deployment Setup
echo ========================================
echo.

echo [INFO] Checking and installing required tools...
echo.

REM Check if Git is installed (includes SSH)
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Git is not installed
    echo Please install Git for Windows from: https://git-scm.com/download/win
    echo Git includes OpenSSH client which is required for deployment
    echo.
    pause
    exit /b 1
) else (
    echo [SUCCESS] Git (with SSH) is installed
)

REM Check if Node.js is installed (for local development)
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Node.js is not installed
    echo Please install Node.js from: https://nodejs.org/
    echo This is required for local development
) else (
    echo [SUCCESS] Node.js is installed
)

REM Check if Python is installed (for local development)
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Python is not installed
    echo Please install Python from: https://python.org/
    echo This is required for local development
) else (
    echo [SUCCESS] Python is installed
)

echo.
echo [INFO] Optional: Installing sshpass for password automation...
echo.

REM Try to install sshpass using chocolatey if available
where choco >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Chocolatey found, attempting to install sshpass...
    choco install sshpass -y
    if %errorlevel% equ 0 (
        echo [SUCCESS] sshpass installed successfully
    ) else (
        echo [WARNING] Failed to install sshpass via Chocolatey
        echo You can install it manually or use manual password entry
    )
) else (
    echo [INFO] Chocolatey not found
    echo [INFO] You can install sshpass manually or use manual password entry
    echo [INFO] Download from: https://github.com/keimpx/sshpass-windows
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Available deployment scripts:
echo   1. deploy-to-vps.bat     - Windows Batch script
echo   2. deploy-to-vps.ps1     - PowerShell script (recommended)
echo   3. deploy-to-vps.sh      - Bash script (if using WSL/Git Bash)
echo.
echo Usage:
echo   .\deploy-to-vps.ps1              # Run deployment
echo   .\deploy-to-vps.ps1 -Verbose     # Run with verbose output
echo.
echo Prerequisites for deployment:
echo   1. All changes committed and pushed to GitHub
echo   2. SSH access to VPS (194.164.72.53)
echo   3. VPS password ready for entry
echo.
pause
