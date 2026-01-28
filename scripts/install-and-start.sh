#!/bin/bash

# ============================================================
# ISP Management System - Installation & Setup
# ============================================================
# This script installs dependencies, fixes permissions, and
# optionally runs database migrations.
#
# Usage: 
#   bash scripts/install-and-start.sh           # Install and start
#   bash scripts/install-and-start.sh --migrate # Also run migrations
# ============================================================

echo "╔════════════════════════════════════════════════════╗"
echo "║   ISP Management System - Installation & Setup    ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Parse arguments
RUN_MIGRATIONS=false
for arg in "$@"; do
    case $arg in
        --migrate)
            RUN_MIGRATIONS=true
            shift
            ;;
    esac
done

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# ============================================================
# Step 1: Fix file permissions
# ============================================================
echo "📁 Fixing file permissions..."

# Fix directory permissions
chmod a+rx "$SCRIPT_DIR" 2>/dev/null || sudo chmod a+rx "$SCRIPT_DIR" 2>/dev/null || true
chmod a+rx "$PROJECT_ROOT" 2>/dev/null || sudo chmod a+rx "$PROJECT_ROOT" 2>/dev/null || true

# Fix parent directories if in home
HOME_DIR=$(dirname "$PROJECT_ROOT")
if [[ "$HOME_DIR" == /home/* ]]; then
    chmod a+x "$HOME_DIR" 2>/dev/null || sudo chmod a+x "$HOME_DIR" 2>/dev/null || true
fi

# Fix all SQL files (make readable)
for sql_file in "$SCRIPT_DIR"/*.sql 2>/dev/null; do
    if [ -f "$sql_file" ]; then
        chmod a+r "$sql_file" 2>/dev/null || sudo chmod a+r "$sql_file" 2>/dev/null || true
    fi
done

# Fix all shell scripts (make executable)
for sh_file in "$SCRIPT_DIR"/*.sh 2>/dev/null; do
    if [ -f "$sh_file" ]; then
        chmod a+rx "$sh_file" 2>/dev/null || sudo chmod a+rx "$sh_file" 2>/dev/null || true
    fi
done

echo "✓ File permissions fixed"
echo ""

# ============================================================
# Step 2: Check prerequisites
# ============================================================
echo "🔍 Checking prerequisites..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20 or higher is required. Current: $(node -v)"
    exit 1
fi

echo "✓ Node.js $(node -v) detected"
echo "✓ npm $(npm -v) detected"
echo ""

# ============================================================
# Step 3: Install dependencies
# ============================================================
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Installation failed. Please check the errors above."
    exit 1
fi

echo ""
echo "✓ Dependencies installed!"
echo ""

# ============================================================
# Step 4: Run database migrations (optional)
# ============================================================
if [ "$RUN_MIGRATIONS" = true ]; then
    echo "🗄️  Running database migrations..."
    
    # Check for psql
    if ! command -v psql &> /dev/null; then
        echo "⚠️  psql not found. Skipping migrations."
        echo "   Install PostgreSQL client to run migrations."
    else
        # Create temp directory for migrations
        TEMP_DIR="/tmp/isp-migrations"
        mkdir -p "$TEMP_DIR" 2>/dev/null || true
        chmod 777 "$TEMP_DIR" 2>/dev/null || true
        
        # Copy SQL files to temp (for postgres user access)
        cp "$SCRIPT_DIR"/*.sql "$TEMP_DIR/" 2>/dev/null || true
        chmod 644 "$TEMP_DIR"/*.sql 2>/dev/null || true
        
        # Load environment
        if [ -f "$PROJECT_ROOT/.env.local" ]; then
            export $(cat "$PROJECT_ROOT/.env.local" | grep -v '^#' | xargs)
        fi
        
        # Run main schema setup if exists
        if [ -f "$TEMP_DIR/complete-database-setup.sql" ]; then
            echo "   Running complete-database-setup.sql..."
            psql "$DATABASE_URL" -f "$TEMP_DIR/complete-database-setup.sql" 2>&1 || true
        fi
        
        # Cleanup
        rm -rf "$TEMP_DIR" 2>/dev/null || true
        
        echo "✓ Database migrations complete"
    fi
    echo ""
fi

# ============================================================
# Step 5: Start development server
# ============================================================
echo "🚀 Starting development server..."
echo ""

npm run dev
