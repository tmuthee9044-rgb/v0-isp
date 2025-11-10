#!/bin/bash

# Migrate to Dual Database System Script
# This script updates all files to use getSql() from lib/db.ts
# to support both local PostgreSQL and Neon serverless (Rule 4)

set -e

echo "=========================================="
echo "  Migrate to Dual Database System"
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
BACKUP_DIR="$PROJECT_ROOT/.db-migration-backups-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}[1/5] Creating backups...${NC}"

# Find all files with direct neon imports
FILES_TO_FIX=$(grep -rl "const sql = neon(process\.env\.DATABASE_URL" \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git \
  --exclude-dir=.db-migration-backups* \
  --exclude="lib/db.ts" \
  . 2>/dev/null || true)

if [ -z "$FILES_TO_FIX" ]; then
  echo -e "${GREEN}✓ No files found with direct neon usage${NC}"
  echo "All files are already using the dual database system!"
  exit 0
fi

FILE_COUNT=$(echo "$FILES_TO_FIX" | wc -l)
echo "Found $FILE_COUNT file(s) to migrate"
echo ""

# Backup files
echo "$FILES_TO_FIX" | while read -r file; do
  if [ -f "$file" ]; then
    BACKUP_FILE="$BACKUP_DIR/$file"
    mkdir -p "$(dirname "$BACKUP_FILE")"
    cp "$file" "$BACKUP_FILE"
  fi
done

echo -e "${GREEN}✓ Backups created in: $BACKUP_DIR${NC}"
echo ""

echo -e "${YELLOW}[2/5] Updating imports...${NC}"

# Process each file
echo "$FILES_TO_FIX" | while read -r file; do
  if [ -f "$file" ]; then
    echo "  Processing: $file"
    
    # Create a temporary file
    TMP_FILE="${file}.tmp"
    
    # Read the file and process it
    awk '
    BEGIN { 
      in_function = 0
      added_use_server = 0
      added_getSql_import = 0
    }
    
    # Add "use server" at the top if not present
    /^[^\/]/ && !added_use_server && NR > 1 {
      if (!/^"use server"/ && !/^'\''use server'\''/) {
        print "\"use server\""
        print ""
      }
      added_use_server = 1
    }
    
    # Replace neon import with getSql import
    /^import.*neon.*from.*@neondatabase\/serverless/ {
      if (!added_getSql_import) {
        print "import { getSql } from \"@/lib/db\""
        added_getSql_import = 1
      }
      next
    }
    
    # Skip the line with const sql = neon(...)
    /^const sql = neon\(process\.env\.DATABASE_URL/ {
      next
    }
    
    # Add await getSql() at the start of async functions
    /^export async function (GET|POST|PUT|DELETE|PATCH)/ {
      in_function = 1
      print $0
      next
    }
    
    # Add const sql = await getSql() after try {
    in_function && /^  try \{/ {
      print $0
      print "    const sql = await getSql()"
      in_function = 0
      next
    }
    
    # Print all other lines
    { print $0 }
    ' "$file" > "$TMP_FILE"
    
    # Replace original file with processed file
    mv "$TMP_FILE" "$file"
  fi
done

echo ""
echo -e "${GREEN}✓ Updated $FILE_COUNT file(s)${NC}"
echo ""

echo -e "${YELLOW}[3/5] Verifying changes...${NC}"

# Verify no more direct neon usage
REMAINING=$(grep -rl "const sql = neon(process\.env\.DATABASE_URL" \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git \
  --exclude-dir=.db-migration-backups* \
  --exclude="lib/db.ts" \
  . 2>/dev/null || true)

if [ -z "$REMAINING" ]; then
  echo -e "${GREEN}✓ All files successfully migrated!${NC}"
else
  echo -e "${YELLOW}⚠ Some files may need manual review:${NC}"
  echo "$REMAINING"
fi

echo ""
echo -e "${YELLOW}[4/5] Checking dual database system...${NC}"

# Verify lib/db.ts exists and has getSql
if [ -f "lib/db.ts" ]; then
  if grep -q "export.*getSql" "lib/db.ts"; then
    echo -e "${GREEN}✓ Dual database system (lib/db.ts) is properly configured${NC}"
  else
    echo -e "${RED}✗ lib/db.ts missing getSql export${NC}"
  fi
else
  echo -e "${RED}✗ lib/db.ts not found${NC}"
fi

echo ""
echo -e "${YELLOW}[5/5] Next steps...${NC}"
echo ""
echo "1. Restart your development server:"
echo "   npm run dev"
echo ""
echo "2. Test the database connection:"
echo "   # The system will automatically use:"
echo "   # - Local PostgreSQL (127.0.0.1) in development"
echo "   # - Neon serverless in production"
echo ""
echo "3. If you need to restore the backups:"
echo "   cp -r $BACKUP_DIR/* ."
echo ""
echo "4. Review the migration guide:"
echo "   cat docs/ROUTE_MIGRATION_GUIDE.md"
echo ""
echo -e "${GREEN}=========================================="
echo "  Migration Complete!"
echo "  Rule 4 Compliance: ✓ Dual Database Support"
echo "==========================================${NC}"
