@echo off
setlocal enabledelayedexpansion

:: ISP Management System Installation Script for Windows
:: This script will install dependencies and set up the ISP system

echo.
echo 🚀 ISP Management System Installation Script (Windows)
echo =======================================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] Running without administrator privileges
    echo Some features may require elevated permissions
)

:: Function to print colored output (Windows doesn't support colors easily, so we'll use plain text)
echo [INFO] Starting installation process...

:: Updated to check for Node.js and npm instead of Docker
:: Check if Node.js is installed
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18 or later.
    echo [INFO] Download from: https://nodejs.org/
    echo [INFO] After installation, restart this script.
    pause
    exit /b 1
) else (
    echo [SUCCESS] Node.js is installed
    node --version
)

:: Check if npm is available
npm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] npm not found. Please ensure Node.js is properly installed.
    pause
    exit /b 1
) else (
    echo [SUCCESS] npm is available
)

:: Install project dependencies
echo [INFO] Installing project dependencies...
npm install
if %errorLevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
) else (
    echo [SUCCESS] Dependencies installed successfully
)

:: Build the application
echo [INFO] Building the application...
npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Failed to build the application
    pause
    exit /b 1
) else (
    echo [SUCCESS] Application built successfully
)

:: Setup database
echo [INFO] Setting up database...
echo [INFO] Please ensure your Neon database is connected in Project Settings
echo [INFO] The database will be initialized when you complete the setup at /setup

:: Show completion message
echo.
echo [SUCCESS] ISP Management System installation completed!
echo.
echo 🎉 Installation Complete!
echo ========================
echo.
echo To start the development server, run:
echo   npm run dev
echo.
echo Then visit: http://localhost:3000/setup
echo Complete the initial setup to configure your ISP system
echo.
echo ⚠️  Make sure to:
echo 1. Connect your Neon database in Project Settings
echo 2. Complete the setup wizard at /setup
echo 3. Change default passwords in production
echo.
echo Press any key to exit...
pause >nul
