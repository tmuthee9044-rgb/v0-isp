#!/bin/bash

echo "=========================================="
echo "COMPLETE NEXT.JS RESET AND RESTART"
echo "=========================================="

# Step 1: Kill all Next.js and Node processes
echo ""
echo "Step 1: Killing all Next.js processes..."
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
sleep 2

# Step 2: Remove all build and cache directories
echo ""
echo "Step 2: Removing all cache directories..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .swc
rm -rf node_modules/.vite
rm -rf .turbo
echo "✓ All cache directories removed"

# Step 3: Clear npm cache
echo ""
echo "Step 3: Clearing npm cache..."
npm cache clean --force
echo "✓ npm cache cleared"

# Step 4: Reinstall node_modules (optional but recommended)
echo ""
echo "Step 4: Do you want to reinstall node_modules? This will take a few minutes."
echo "This is recommended if the error persists after cache clearing."
read -p "Reinstall node_modules? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing node_modules..."
    rm -rf node_modules
    echo "Reinstalling dependencies..."
    npm install
    echo "✓ Dependencies reinstalled"
else
    echo "Skipping node_modules reinstall"
fi

# Step 5: Start the development server
echo ""
echo "Step 5: Starting Next.js development server..."
echo "=========================================="
npm run dev
