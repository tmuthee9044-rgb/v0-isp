#!/bin/bash

# Fix All Neon Imports Script
# This script replaces all @neondatabase/serverless imports with @/lib/neon-wrapper
# to ensure the system uses local PostgreSQL instead of Neon cloud

set -e

echo "=========================================="
echo "  Fix All Neon Database Imports"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Project root: $PROJECT_ROOT"
echo ""

# Create backup directory
BACKUP_DIR="$PROJECT_ROOT/.neon-import-backups-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}[1/4] Creating backups...${NC}"

# Find all TypeScript/JavaScript files with @neondatabase/serverless imports
FILES_TO_FIX=$(grep -rl "@neondatabase/serverless" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git \
  --exclude-dir=.neon-import-backups* \
  . 2>/dev/null || true)

if [ -z "$FILES_TO_FIX" ]; then
  echo -e "${GREEN}✓ No files found with @neondatabase/serverless imports${NC}"
  echo "All files are already using the neon-wrapper!"
  exit 0
fi

FILE_COUNT=$(echo "$FILES_TO_FIX" | wc -l)
echo "Found $FILE_COUNT file(s) to fix"
echo ""

# Backup files
echo "$FILES_TO_FIX" | while read -r file; do
  if [ -f "$file" ]; then
    # Create directory structure in backup
    BACKUP_FILE="$BACKUP_DIR/$file"
    mkdir -p "$(dirname "$BACKUP_FILE")"
    cp "$file" "$BACKUP_FILE"
  fi
done

echo -e "${GREEN}✓ Backups created in: $BACKUP_DIR${NC}"
echo ""

echo -e "${YELLOW}[2/4] Fixing imports...${NC}"

# Fix the imports
FIXED_COUNT=0
echo "$FILES_TO_FIX" | while read -r file; do
  if [ -f "$file" ]; then
    # Replace the import statement
    sed -i 's|from "@neondatabase/serverless"|from "@/lib/neon-wrapper"|g' "$file"
    sed -i "s|from '@neondatabase/serverless'|from '@/lib/neon-wrapper'|g" "$file"
    
    echo "  Fixed: $file"
    FIXED_COUNT=$((FIXED_COUNT + 1))
  fi
done

echo ""
echo -e "${GREEN}✓ Fixed imports in $FILE_COUNT file(s)${NC}"
echo ""

echo -e "${YELLOW}[3/4] Verifying changes...${NC}"

# Verify no more @neondatabase/serverless imports exist
REMAINING=$(grep -rl "@neondatabase/serverless" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git \
  --exclude-dir=.neon-import-backups* \
  . 2>/dev/null || true)

if [ -z "$REMAINING" ]; then
  echo -e "${GREEN}✓ All imports successfully fixed!${NC}"
else
  echo -e "${RED}⚠ Warning: Some files still have @neondatabase/serverless imports:${NC}"
  echo "$REMAINING"
fi

echo ""
echo -e "${YELLOW}[4/4] Next steps...${NC}"
echo ""
echo "1. Restart your development server:"
echo "   npm run dev"
echo ""
echo "2. Test the database connection:"
echo "   bash scripts/test-database-connection.sh"
echo ""
echo "3. If you need to restore the backups:"
echo "   cp -r $BACKUP_DIR/* ."
echo ""
echo -e "${GREEN}=========================================="
echo "  Import Fix Complete!"
echo "==========================================${NC}"
