#!/bin/bash

echo "=== Fixing Next.js Cache Corruption ==="
echo ""

# Stop any running dev servers
echo "Step 1: Stopping any running processes..."
pkill -f "next dev" || true
sleep 2

# Remove all Next.js cache directories
echo "Step 2: Removing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .swc

# Clear npm cache
echo "Step 3: Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies
echo "Step 4: Reinstalling dependencies..."
rm -rf node_modules
npm install

echo ""
echo "=== Cache cleanup complete! ==="
echo "Now run: npm run dev"
echo ""
