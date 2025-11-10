#!/bin/bash

# Script to replace all @neondatabase/serverless imports with @/lib/neon-wrapper
# This ensures all API routes use the wrapper that detects local vs cloud databases

set -e

echo "========================================="
echo "Fixing Neon Database Imports"
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

echo "[INFO] Project root: $PROJECT_ROOT"
echo ""

# Count files that need fixing
TOTAL_FILES=$(grep -rl "from \"@neondatabase/serverless\"" "$PROJECT_ROOT" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)

if [ "$TOTAL_FILES" -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS] No files need fixing. All imports are already using the neon-wrapper.${NC}"
    exit 0
fi

echo -e "${YELLOW}[INFO] Found $TOTAL_FILES files that need fixing${NC}"
echo ""

# Create backup directory
BACKUP_DIR="$PROJECT_ROOT/.backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "[INFO] Created backup directory: $BACKUP_DIR"
echo ""

# Counter for fixed files
FIXED_COUNT=0
FAILED_COUNT=0

# Find and fix all files
echo "[INFO] Fixing imports..."
echo ""

while IFS= read -r file; do
    # Skip if file is in node_modules or .next
    if [[ "$file" == *"node_modules"* ]] || [[ "$file" == *".next"* ]]; then
        continue
    fi
    
    # Create backup
    RELATIVE_PATH="${file#$PROJECT_ROOT/}"
    BACKUP_FILE="$BACKUP_DIR/$RELATIVE_PATH"
    mkdir -p "$(dirname "$BACKUP_FILE")"
    cp "$file" "$BACKUP_FILE"
    
    # Replace the import
    if sed -i 's/from "@neondatabase\/serverless"/from "@\/lib\/neon-wrapper"/g' "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Fixed: $RELATIVE_PATH"
        ((FIXED_COUNT++))
    else
        echo -e "${RED}✗${NC} Failed: $RELATIVE_PATH"
        ((FAILED_COUNT++))
        # Restore from backup if sed failed
        cp "$BACKUP_FILE" "$file"
    fi
done < <(grep -rl "from \"@neondatabase/serverless\"" "$PROJECT_ROOT" --include="*.ts" --include="*.tsx" 2>/dev/null)

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo -e "${GREEN}Fixed: $FIXED_COUNT files${NC}"
if [ "$FAILED_COUNT" -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_COUNT files${NC}"
fi
echo ""
echo "[INFO] Backups saved to: $BACKUP_DIR"
echo ""

if [ "$FAILED_COUNT" -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS] All imports have been fixed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review the changes: git diff"
    echo "2. Test the application: npm run dev"
    echo "3. If everything works, you can delete the backup: rm -rf $BACKUP_DIR"
    exit 0
else
    echo -e "${YELLOW}[WARNING] Some files failed to update. Check the errors above.${NC}"
    exit 1
fi
