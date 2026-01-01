#!/bin/bash

echo "🚀 Running Next.js cache fix..."
node scripts/fix-nextjs-error.js

echo ""
echo "✅ Fix completed!"
echo ""
echo "Starting development server..."
npm run dev
