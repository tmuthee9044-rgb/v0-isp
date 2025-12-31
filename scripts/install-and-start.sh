#!/bin/bash

echo "╔════════════════════════════════════════════════════╗"
echo "║   ISP Management System - Installation & Setup    ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20 or higher is required. Current: $(node -v)"
    exit 1
fi

echo "✓ Node.js $(node -v) detected"
echo "✓ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Installation complete!"
    echo ""
    echo "🚀 Starting development server..."
    echo ""
    
    # Start the development server
    npm run dev
else
    echo ""
    echo "❌ Installation failed. Please check the errors above."
    exit 1
fi
