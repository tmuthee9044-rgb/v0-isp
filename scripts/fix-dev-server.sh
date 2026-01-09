#!/bin/bash

# Fix Development Server Issues
# Clears Next.js cache and restarts the dev server

echo "🔧 Fixing Next.js development server issues..."

# Stop any running Next.js processes
echo "Stopping Next.js processes..."
pkill -f "next dev" || true

# Clear Next.js cache
echo "Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

# Clear any stale server action references
echo "Clearing build artifacts..."
find . -name "*.tsbuildinfo" -delete

echo "✅ Cache cleared!"
echo ""
echo "To restart the development server, run:"
echo "  npm run dev"
echo ""
echo "If issues persist, try:"
echo "  rm -rf node_modules"
echo "  npm install"
echo "  npm run dev"
