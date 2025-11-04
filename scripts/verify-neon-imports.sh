#!/bin/bash

# Script to verify all files are using the neon-wrapper instead of direct Neon imports

set -e

echo "========================================="
echo "Verifying Neon Database Imports"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "[INFO] Checking for direct @neondatabase/serverless imports..."
echo ""

# Find files with direct imports (excluding node_modules and .next)
PROBLEM_FILES=$(grep -rl "from \"@neondatabase/serverless\"" "$PROJECT_ROOT" \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude-dir="node_modules" \
    --exclude-dir=".next" \
    2>/dev/null || true)

if [ -z "$PROBLEM_FILES" ]; then
    echo -e "${GREEN}[SUCCESS] All files are using the neon-wrapper correctly!${NC}"
    echo ""
    echo "✓ No direct @neondatabase/serverless imports found"
    echo "✓ All database connections will work with both local PostgreSQL and Neon cloud"
    exit 0
else
    echo -e "${RED}[ERROR] Found files with direct @neondatabase/serverless imports:${NC}"
    echo ""
    echo "$PROBLEM_FILES" | while read -r file; do
        RELATIVE_PATH="${file#$PROJECT_ROOT/}"
        echo -e "${RED}  ✗${NC} $RELATIVE_PATH"
    done
    echo ""
    echo -e "${YELLOW}[FIX] Run the following command to fix all imports:${NC}"
    echo "  bash scripts/fix-neon-imports.sh"
    echo ""
    exit 1
fi
