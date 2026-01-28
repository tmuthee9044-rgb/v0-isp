#!/usr/bin/env bash

# ============================================================
# ISP Management System - Fix File Permissions
# ============================================================
# This script fixes all file and directory permissions to allow
# database migrations and scripts to run successfully.
#
# Run this script FIRST before running any migrations:
#   sudo bash scripts/fix-file-permissions.sh
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     ISP System - Fix File Permissions              ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_header

# Detect the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_info "Script directory: $SCRIPT_DIR"
print_info "Project root: $PROJECT_ROOT"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_warning "This script should be run with sudo for full permission fixing."
    print_warning "Running with limited permissions..."
    USE_SUDO=""
else
    USE_SUDO="sudo"
fi

# ============================================================
# Step 1: Fix directory permissions
# ============================================================
print_info "Step 1: Fixing directory permissions..."

# Make parent directories traversable (execute bit)
DIRS_TO_FIX=(
    "$PROJECT_ROOT"
    "$SCRIPT_DIR"
)

for dir in "${DIRS_TO_FIX[@]}"; do
    if [ -d "$dir" ]; then
        chmod a+rx "$dir" 2>/dev/null || $USE_SUDO chmod a+rx "$dir" 2>/dev/null || print_warning "Could not fix permissions for: $dir"
        print_info "  Fixed: $dir"
    fi
done

# Fix home directory traversal if needed
HOME_DIR=$(dirname "$PROJECT_ROOT")
if [[ "$HOME_DIR" == /home/* ]]; then
    chmod a+x "$HOME_DIR" 2>/dev/null || $USE_SUDO chmod a+x "$HOME_DIR" 2>/dev/null || print_warning "Could not fix home directory permissions"
    print_info "  Fixed home directory: $HOME_DIR"
fi

# ============================================================
# Step 2: Fix SQL file permissions (make readable)
# ============================================================
print_info "Step 2: Fixing SQL file permissions..."

SQL_COUNT=0
if [ -d "$SCRIPT_DIR" ]; then
    for sql_file in "$SCRIPT_DIR"/*.sql; do
        if [ -f "$sql_file" ]; then
            chmod a+r "$sql_file" 2>/dev/null || $USE_SUDO chmod a+r "$sql_file" 2>/dev/null || print_warning "Could not fix: $sql_file"
            ((SQL_COUNT++))
        fi
    done
fi

print_info "  Fixed $SQL_COUNT SQL files"

# ============================================================
# Step 3: Fix shell script permissions (make executable)
# ============================================================
print_info "Step 3: Fixing shell script permissions..."

SH_COUNT=0
if [ -d "$SCRIPT_DIR" ]; then
    for sh_file in "$SCRIPT_DIR"/*.sh; do
        if [ -f "$sh_file" ]; then
            chmod a+rx "$sh_file" 2>/dev/null || $USE_SUDO chmod a+rx "$sh_file" 2>/dev/null || print_warning "Could not fix: $sh_file"
            ((SH_COUNT++))
        fi
    done
fi

print_info "  Fixed $SH_COUNT shell scripts"

# ============================================================
# Step 4: Fix ownership if running as root
# ============================================================
if [ "$EUID" -eq 0 ]; then
    print_info "Step 4: Fixing file ownership..."
    
    # Get the actual user who invoked sudo
    REAL_USER="${SUDO_USER:-$(whoami)}"
    REAL_GROUP=$(id -gn "$REAL_USER" 2>/dev/null || echo "$REAL_USER")
    
    if [ -n "$REAL_USER" ] && [ "$REAL_USER" != "root" ]; then
        chown -R "$REAL_USER:$REAL_GROUP" "$SCRIPT_DIR" 2>/dev/null || print_warning "Could not change ownership"
        print_info "  Changed ownership to: $REAL_USER:$REAL_GROUP"
    fi
else
    print_info "Step 4: Skipping ownership fix (not running as root)"
fi

# ============================================================
# Step 5: Verify postgres user can access files
# ============================================================
print_info "Step 5: Ensuring postgres user access..."

# Check if postgres user exists
if id "postgres" &>/dev/null; then
    # Make scripts directory and its parents accessible to postgres
    $USE_SUDO chmod a+rx "$SCRIPT_DIR" 2>/dev/null || true
    
    # Ensure all SQL files are world-readable
    $USE_SUDO chmod 644 "$SCRIPT_DIR"/*.sql 2>/dev/null || true
    
    print_info "  Postgres user access configured"
else
    print_warning "  Postgres user not found on this system"
fi

# ============================================================
# Step 6: Create a temp directory for psql if needed
# ============================================================
print_info "Step 6: Setting up temporary directory..."

TEMP_DIR="/tmp/isp-migrations"
mkdir -p "$TEMP_DIR" 2>/dev/null || $USE_SUDO mkdir -p "$TEMP_DIR" 2>/dev/null
chmod 777 "$TEMP_DIR" 2>/dev/null || $USE_SUDO chmod 777 "$TEMP_DIR" 2>/dev/null

print_info "  Temporary directory ready: $TEMP_DIR"

# ============================================================
# Summary
# ============================================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Permissions Fixed Successfully!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
print_success "Fixed $SQL_COUNT SQL files"
print_success "Fixed $SH_COUNT shell scripts"
print_success "Directory permissions updated"
echo ""
print_info "You can now run migrations with:"
print_info "  ./scripts/run-migration.sh scripts/<migration_file>.sql"
echo ""
print_info "Or run all migrations with:"
print_info "  ./scripts/run-all-migrations.sh"
echo ""
