#!/bin/bash

echo "========================================"
echo "Next.js Cache Corruption Fix Script"
echo "========================================"
echo ""

# Step 1: Kill all Next.js processes
echo "Step 1: Stopping all Next.js processes..."
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
killall -9 node 2>/dev/null || true
sleep 2
echo "✓ All processes stopped"
echo ""

# Step 2: Remove all cache and build artifacts
echo "Step 2: Removing all cache directories..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .swc
rm -rf node_modules/.vite
rm -rf .turbo
rm -rf node_modules/.bin
echo "✓ Cache directories removed"
echo ""

# Step 3: Clear npm cache
echo "Step 3: Clearing npm cache..."
npm cache clean --force
echo "✓ npm cache cleared"
echo ""

# Step 4: Reinstall dependencies
echo "Step 4: Reinstalling node_modules..."
echo "This may take a few minutes..."
rm -rf node_modules package-lock.json
npm install
echo "✓ Dependencies reinstalled"
echo ""

# Step 5: Start development server
echo "Step 5: Starting fresh development server..."
echo "========================================"
echo "Server starting on http://localhost:3000"
echo "========================================"
npm run dev
