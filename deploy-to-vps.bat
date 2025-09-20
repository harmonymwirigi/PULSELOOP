@echo off
REM PulseLoopCare Automated Deployment Script for Windows
REM This script follows the deploymentguide.md and deploys to VPS automatically
REM Run this script from your local Windows machine after pushing changes to GitHub

setlocal enabledelayedexpansion

REM Configuration
set VPS_HOST=194.164.72.53
set VPS_USER=root
set PROJECT_PATH=/var/www/pulseloop
set SERVICE_NAME=pulseloop

echo.
echo ========================================
echo   PulseLoopCare Deployment Script
echo ========================================
echo.

REM Check if SSH is available
where ssh >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] SSH is not installed or not in PATH
    echo Please install OpenSSH client or Git for Windows
    pause
    exit /b 1
)

REM Check if sshpass is available (optional)
where sshpass >nul 2>nul
if %errorlevel% equ 0 (
    set SSH_PASS_AVAILABLE=true
    echo [INFO] sshpass found - password will be automated
) else (
    set SSH_PASS_AVAILABLE=false
    echo [WARNING] sshpass not found - you'll need to enter password manually
)

echo.
echo [INFO] Starting deployment to %VPS_USER%@%VPS_HOST%:%PROJECT_PATH%
echo.

REM Get VPS password if sshpass is available
if "%SSH_PASS_AVAILABLE%"=="true" (
    set /p VPS_PASSWORD="Enter VPS password: "
)

echo.
echo [INFO] Step 1: Stopping PulseLoop service...
if "%SSH_PASS_AVAILABLE%"=="true" (
    echo %VPS_PASSWORD% | sshpass -p %VPS_PASSWORD% ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "sudo systemctl stop %SERVICE_NAME%"
) else (
    ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "sudo systemctl stop %SERVICE_NAME%"
)
if %errorlevel% neq 0 (
    echo [ERROR] Failed to stop service
    pause
    exit /b 1
)
echo [SUCCESS] Service stopped

echo.
echo [INFO] Step 2: Updating codebase from GitHub...
if "%SSH_PASS_AVAILABLE%"=="true" (
    echo %VPS_PASSWORD% | sshpass -p %VPS_PASSWORD% ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "cd %PROJECT_PATH% && git reset --hard origin/main && git pull origin main"
) else (
    ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "cd %PROJECT_PATH% && git reset --hard origin/main && git pull origin main"
)
if %errorlevel% neq 0 (
    echo [ERROR] Failed to update codebase
    pause
    exit /b 1
)
echo [SUCCESS] Codebase updated

echo.
echo [INFO] Step 3: Updating backend dependencies and database...
if "%SSH_PASS_AVAILABLE%"=="true" (
    echo %VPS_PASSWORD% | sshpass -p %VPS_PASSWORD% ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "cd %PROJECT_PATH% && source venv/bin/activate && cd backend && pip install -r requirements.txt && flask db migrate -m 'Deploy %date%_%time%' && flask db upgrade"
) else (
    ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "cd %PROJECT_PATH% && source venv/bin/activate && cd backend && pip install -r requirements.txt && flask db migrate -m 'Deploy %date%_%time%' && flask db upgrade"
)
if %errorlevel% neq 0 (
    echo [ERROR] Failed to update backend
    pause
    exit /b 1
)
echo [SUCCESS] Backend updated

echo.
echo [INFO] Step 4: Rebuilding frontend...
if "%SSH_PASS_AVAILABLE%"=="true" (
    echo %VPS_PASSWORD% | sshpass -p %VPS_PASSWORD% ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "cd %PROJECT_PATH%/frontend && npm install && npm run build"
) else (
    ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "cd %PROJECT_PATH%/frontend && npm install && npm run build"
)
if %errorlevel% neq 0 (
    echo [ERROR] Failed to rebuild frontend
    pause
    exit /b 1
)
echo [SUCCESS] Frontend rebuilt

echo.
echo [INFO] Step 5: Restarting services...
if "%SSH_PASS_AVAILABLE%"=="true" (
    echo %VPS_PASSWORD% | sshpass -p %VPS_PASSWORD% ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "sudo systemctl start %SERVICE_NAME% && sudo systemctl restart nginx"
) else (
    ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "sudo systemctl start %SERVICE_NAME% && sudo systemctl restart nginx"
)
if %errorlevel% neq 0 (
    echo [ERROR] Failed to restart services
    pause
    exit /b 1
)
echo [SUCCESS] Services restarted

echo.
echo [INFO] Step 6: Verifying deployment...
if "%SSH_PASS_AVAILABLE%"=="true" (
    echo %VPS_PASSWORD% | sshpass -p %VPS_PASSWORD% ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "sudo systemctl status %SERVICE_NAME% --no-pager && echo. && sudo systemctl status nginx --no-pager"
) else (
    ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "sudo systemctl status %SERVICE_NAME% --no-pager && echo. && sudo systemctl status nginx --no-pager"
)

echo.
echo ========================================
echo   🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Your application is now live at: https://pulseloopcare.com
echo.
echo [WARNING] Please perform a hard refresh (Ctrl+Shift+R) to see your changes
echo.
pause
