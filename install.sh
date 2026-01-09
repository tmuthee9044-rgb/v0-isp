#!/bin/bash

# ISP Management System - Unified Installation Script
# This script handles all installation scenarios in one place

set -e

# ============================================
# CONFIGURATION
# ============================================

VERSION="1.0.0"
SCRIPT_NAME="ISP Management System Installer"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ============================================
# UTILITY FUNCTIONS
# ============================================

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
    echo ""
}

check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "Do not run this script as root. Run as a regular user."
        print_info "The script will ask for sudo password when needed."
        exit 1
    fi
}

detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        print_error "Unsupported OS: $OSTYPE"
        exit 1
    fi
    print_info "Detected OS: $OS"
}

update_system() {
    print_header "Updating System Packages"
    
    if [[ "$OS" == "linux" ]]; then
        print_info "Updating package lists..."
        
        # Check if apt is locked by another process
        if sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; then
            print_warning "Package manager is locked by another process"
            print_info "Waiting for other package operations to complete..."
            
            # Wait up to 2 minutes for lock to be released
            for i in {1..24}; do
                if ! sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; then
                    break
                fi
                sleep 5
                echo -n "."
            done
            echo ""
            
            if sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; then
                print_error "Package manager is still locked after 2 minutes"
                print_info "Please close other package managers (apt, Software Center, etc.) and try again"
                exit 1
            fi
        fi
        
        # Update package lists
        if sudo apt update; then
            print_success "Package lists updated"
        else
            print_error "Failed to update package lists"
            print_info "This may cause installation issues"
            print_info "Please check your internet connection and try again"
            exit 1
        fi
        
        print_info "Upgrading installed packages (this may take several minutes)..."
        
        # Upgrade packages with automatic yes and non-interactive mode
        if sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"; then
            print_success "System packages upgraded successfully"
        else
            print_warning "Some packages failed to upgrade"
            print_info "This may not affect the ISP system installation"
            print_info "Continuing with installation..."
        fi
        
        # Clean up
        print_info "Cleaning up package cache..."
        sudo apt autoremove -y >/dev/null 2>&1 || true
        sudo apt autoclean -y >/dev/null 2>&1 || true
        
        print_success "System update complete"
        
    elif [[ "$OS" == "macos" ]]; then
        print_info "Updating Homebrew..."
        
        if command -v brew &> /dev/null; then
            brew update
            print_success "Homebrew updated"
            
            print_info "Upgrading Homebrew packages..."
            brew upgrade
            print_success "Homebrew packages upgraded"
        else
            print_warning "Homebrew not installed"
            print_info "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            print_success "Homebrew installed"
        fi
    fi
}

check_directory_structure() {
    print_header "Checking Directory Structure"
    
    CURRENT_DIR=$(pwd)
    print_info "Current directory: $CURRENT_DIR"
    
    # Count how many times "isp-system" appears in the path
    NEST_COUNT=$(echo "$CURRENT_DIR" | grep -o "isp-system" | wc -l)
    
    if [ "$NEST_COUNT" -gt 2 ]; then
        print_error "Detected deeply nested directory structure!"
        print_error "Path: $CURRENT_DIR"
        print_error "The project directory appears $NEST_COUNT times in the path."
        echo ""
        print_warning "This usually happens when the project is repeatedly cloned/copied into itself."
        echo ""
        print_info "To fix this issue:"
        echo ""
        echo "1. Navigate to your home directory:"
        echo "   cd ~"
        echo ""
        echo "2. Create a fresh directory:"
        echo "   mkdir -p ~/isp-management"
        echo "   cd ~/isp-management"
        echo ""
        echo "3. Clone the project fresh (if using git):"
        echo "   git clone <repository-url> ."
        echo ""
        echo "   OR copy only the necessary files:"
        echo "   cp -r /path/to/original/project/* ."
        echo ""
        echo "4. Run the install script again:"
        echo "   chmod +x install.sh"
        echo "   ./install.sh"
        echo ""
        exit 1
    fi
    
    # Check if we're in the correct project directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in current directory"
        print_error "You may be in the wrong directory"
        echo ""
        print_info "Looking for project root..."
        
        # Try to find package.json in parent directories
        SEARCH_DIR="$CURRENT_DIR"
        FOUND=false
        
        for i in {1..5}; do
            SEARCH_DIR=$(dirname "$SEARCH_DIR")
            if [ -f "$SEARCH_DIR/package.json" ]; then
                print_success "Found project root at: $SEARCH_DIR"
                print_info "Please navigate to the project root:"
                echo "   cd $SEARCH_DIR"
                echo "   ./install.sh"
                FOUND=true
                break
            fi
        done
        
        if [ "$FOUND" = false ]; then
            print_error "Could not find project root directory"
            print_info "Please ensure you're in the ISP Management System directory"
        fi
        
        exit 1
    fi
    
    # Check for required files
    MISSING_FILES=()
    
    if [ ! -f "package.json" ]; then
        MISSING_FILES+=("package.json")
    fi
    
    if [ ! -d "app" ]; then
        MISSING_FILES+=("app/ directory")
    fi
    
    if [ ${#MISSING_FILES[@]} -gt 0 ]; then
        print_error "Missing required files/directories:"
        for file in "${MISSING_FILES[@]}"; do
            echo "  - $file"
        done
        echo ""
        print_info "You may be in the wrong directory or the project is incomplete"
        exit 1
    fi
    
    print_success "Directory structure is correct"
}

# ============================================
# INSTALLATION FUNCTIONS
# ============================================

install_postgresql() {
    print_header "Installing PostgreSQL"
    
    if command -v psql &> /dev/null; then
        print_success "PostgreSQL already installed: $(psql --version | head -n1)"
    else
        print_info "Installing PostgreSQL..."
        if [[ "$OS" == "linux" ]]; then
            sudo apt update
            sudo apt install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
        elif [[ "$OS" == "macos" ]]; then
            brew install postgresql@15
            brew services start postgresql@15
        fi
        
        print_success "PostgreSQL installed"
    fi
    
    if [[ "$OS" == "linux" ]]; then
        print_info "Installing PostgreSQL development libraries and build tools..."
        sudo apt install -y \
            libpq-dev \
            build-essential \
            python3 \
            python3-pip \
            make \
            g++ \
            gcc
        print_success "Build tools installed"
    elif [[ "$OS" == "macos" ]]; then
        print_info "Installing build tools..."
        xcode-select --install 2>/dev/null || true
        print_success "Build tools installed"
    fi
}

setup_database() {
    print_header "Setting Up Database"
    
    print_info "Checking PostgreSQL service status..."
    if [[ "$OS" == "linux" ]]; then
        if ! sudo systemctl is-active --quiet postgresql; then
            print_warning "PostgreSQL service is not running"
            print_info "Starting PostgreSQL service..."
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            sleep 3
            
            if sudo systemctl is-active --quiet postgresql; then
                print_success "PostgreSQL service started and enabled"
            else
                print_error "Failed to start PostgreSQL service"
                print_info "Please check: sudo systemctl status postgresql"
                exit 1
            fi
        else
            print_success "PostgreSQL service is already running"
        fi
    elif [[ "$OS" == "macos" ]]; then
        if ! brew services list | grep postgresql | grep started > /dev/null; then
            print_info "Starting PostgreSQL service..."
            brew services start postgresql@15
            sleep 3
            print_success "PostgreSQL service started"
        else
            print_success "PostgreSQL service is already running"
        fi
    fi
    
    DB_NAME="${DB_NAME:-isp_system}"
    DB_USER="${DB_USER:-isp_admin}"
    DB_PASSWORD="${DB_PASSWORD:-SecurePass123!}"
    
    print_info "Creating database: $DB_NAME"
    print_info "Creating/updating user: $DB_USER"
    
    USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}';" 2>/dev/null || echo "0")
    
    if [ "$USER_EXISTS" = "1" ]; then
        print_info "User $DB_USER already exists, updating password..."
        sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || {
            print_error "Failed to update user password"
            exit 1
        }
        print_success "User password updated"
    else
        print_info "Creating new user $DB_USER..."
        sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || {
            print_error "Failed to create user"
            exit 1
        }
        print_success "User created"
    fi
    
    DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME" && echo "1" || echo "0")
    
    if [ "$DB_EXISTS" = "0" ]; then
        print_info "Creating database $DB_NAME..."
        sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || {
            print_error "Failed to create database"
            exit 1
        }
        print_success "Database created"
    else
        print_info "Database $DB_NAME already exists"
        sudo -u postgres psql -c "ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};" 2>/dev/null || true
    fi
    
    print_info "Configuring database permissions..."
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true
    sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" 2>/dev/null || true
    sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};" 2>/dev/null || true
    sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};" 2>/dev/null || true
    sudo -u postgres psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};" 2>/dev/null || true
    sudo -u postgres psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};" 2>/dev/null || true
    
    print_success "Database permissions configured"
    
    # Create environment file
    print_info "Creating .env.local file..."
    cat > .env.local << 'ENVEOF'
DATABASE_URL=postgresql://DB_USER_PLACEHOLDER:DB_PASSWORD_PLACEHOLDER@localhost:5432/DB_NAME_PLACEHOLDER
POSTGRES_URL=postgresql://DB_USER_PLACEHOLDER:DB_PASSWORD_PLACEHOLDER@localhost:5432/DB_NAME_PLACEHOLDER
POSTGRES_PRISMA_URL=postgresql://DB_USER_PLACEHOLDER:DB_PASSWORD_PLACEHOLDER@localhost:5432/DB_NAME_PLACEHOLDER
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
ENVEOF

    # Replace placeholders
    sed -i.bak "s/DB_USER_PLACEHOLDER/${DB_USER}/g" .env.local
    sed -i.bak "s/DB_PASSWORD_PLACEHOLDER/${DB_PASSWORD}/g" .env.local
    sed -i.bak "s/DB_NAME_PLACEHOLDER/${DB_NAME}/g" .env.local
    rm -f .env.local.bak
    
    if [ -f ".env.local" ]; then
        print_success "Environment file created: .env.local"
        
        # Export variables for current session
        export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
        export POSTGRES_URL="$DATABASE_URL"
        export POSTGRES_PRISMA_URL="$DATABASE_URL"
        
        print_info "Database connection URL exported to environment"
    else
        print_error "Failed to create .env.local file"
        exit 1
    fi
    
    # Save credentials
    cat > database-credentials.txt << 'CREDEOF'
ISP Management System - Database Credentials
=============================================
Database: DB_NAME_PLACEHOLDER
User: DB_USER_PLACEHOLDER
Password: DB_PASSWORD_PLACEHOLDER
Connection URL: postgresql://DB_USER_PLACEHOLDER:DB_PASSWORD_PLACEHOLDER@localhost:5432/DB_NAME_PLACEHOLDER

IMPORTANT: Keep this file secure and do not commit it to version control.
CREDEOF

    sed -i.bak "s/DB_NAME_PLACEHOLDER/${DB_NAME}/g" database-credentials.txt
    sed -i.bak "s/DB_USER_PLACEHOLDER/${DB_USER}/g" database-credentials.txt
    sed -i.bak "s/DB_PASSWORD_PLACEHOLDER/${DB_PASSWORD}/g" database-credentials.txt
    rm -f database-credentials.txt.bak
    
    chmod 600 database-credentials.txt
    print_success "Credentials saved to database-credentials.txt"
    
    print_info "Testing database connection with credentials..."
    if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
        print_success "Database connection verified with user credentials"
    else
        print_error "Cannot connect to database with user credentials"
        print_info "Attempting to fix authentication..."
        
        # Try to fix pg_hba.conf for local connections
        if [[ "$OS" == "linux" ]]; then
            PG_HBA="/etc/postgresql/*/main/pg_hba.conf"
            if sudo grep -q "local.*all.*all.*peer" $PG_HBA 2>/dev/null; then
                print_info "Updating pg_hba.conf to allow password authentication..."
                sudo sed -i.bak 's/local\s*all\s*all\s*peer/local   all             all                                     md5/' $PG_HBA
                sudo systemctl restart postgresql
                sleep 3
                print_info "PostgreSQL restarted with new authentication settings"
            fi
        fi
        
        # Test again
        if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
            print_success "Database connection verified after fix"
        else
            print_error "Still cannot connect with user credentials"
            print_info "Please check PostgreSQL authentication settings"
            print_info "You may need to edit /etc/postgresql/*/main/pg_hba.conf"
            exit 1
        fi
    fi
}

install_npm() {
    print_header "Installing npm (3 Methods)"
    
    # Check if npm already exists
    if command -v npm &> /dev/null; then
        print_success "npm already installed: $(npm --version)"
        return 0
    fi
    
    print_warning "npm not found, attempting installation..."
    NPM_INSTALLED=false
    
    # Method 1: Install via package manager (apt/brew)
    if [ "$NPM_INSTALLED" = false ]; then
        print_info "Method 1: Installing npm via package manager..."
        
        if [[ "$OS" == "linux" ]]; then
            if sudo apt update && sudo apt install -y npm; then
                hash -r 2>/dev/null || true
                export PATH="/usr/bin:/usr/local/bin:$PATH"
                sleep 2
                
                if command -v npm &> /dev/null; then
                    print_success "npm installed via apt: $(npm --version)"
                    NPM_INSTALLED=true
                fi
            fi
        elif [[ "$OS" == "macos" ]]; then
            if brew install npm; then
                hash -r 2>/dev/null || true
                if command -v npm &> /dev/null; then
                    print_success "npm installed via brew: $(npm --version)"
                    NPM_INSTALLED=true
                fi
            fi
        fi
    fi
    
    # Method 2: Install via npm's official install script
    if [ "$NPM_INSTALLED" = false ]; then
        print_warning "Package manager method failed, trying official npm installer..."
        print_info "Method 2: Installing npm via official script..."
        
        cd /tmp
        if curl -L https://www.npmjs.com/install.sh | sh; then
            hash -r 2>/dev/null || true
            export PATH="$HOME/.npm-global/bin:/usr/local/bin:$PATH"
            sleep 2
            
            if command -v npm &> /dev/null; then
                print_success "npm installed via official script: $(npm --version)"
                NPM_INSTALLED=true
                
                # Add to PATH permanently
                for profile in "$HOME/.bashrc" "$HOME/.profile" "$HOME/.bash_profile"; do
                    if [ -f "$profile" ] && ! grep -q ".npm-global/bin" "$profile"; then
                        echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$profile"
                    fi
                done
            fi
        fi
        cd - > /dev/null
    fi
    
    # Method 3: Manual download and setup
    if [ "$NPM_INSTALLED" = false ] && [[ "$OS" == "linux" ]]; then
        print_warning "Official script failed, trying manual installation..."
        print_info "Method 3: Manual npm installation..."
        
        NPM_VERSION="10.2.5"
        cd /tmp
        
        if wget "https://registry.npmjs.org/npm/-/npm-${NPM_VERSION}.tgz"; then
            print_info "Extracting npm..."
            tar -xzf "npm-${NPM_VERSION}.tgz"
            
            if [ -d "package" ]; then
                sudo mkdir -p /usr/local/lib/node_modules
                sudo mv package /usr/local/lib/node_modules/npm
                sudo ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm
                sudo ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
                sudo chmod +x /usr/local/bin/npm /usr/local/bin/npx
                
                hash -r 2>/dev/null || true
                export PATH="/usr/local/bin:$PATH"
                sleep 2
                
                if command -v npm &> /dev/null; then
                    print_success "npm installed manually: $(npm --version)"
                    NPM_INSTALLED=true
                fi
            fi
            
            rm -f "npm-${NPM_VERSION}.tgz"
        fi
        cd - > /dev/null
    fi
    
    # Final verification
    if [ "$NPM_INSTALLED" = false ]; then
        print_error "All npm installation methods failed"
        print_info ""
        print_info "Please try manual installation:"
        echo ""
        echo "Option 1 - Via package manager:"
        echo "  sudo apt update && sudo apt install -y npm"
        echo ""
        echo "Option 2 - Via official script:"
        echo "  curl -L https://www.npmjs.com/install.sh | sh"
        echo ""
        echo "Option 3 - Reinstall Node.js (includes npm):"
        echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        echo "  sudo apt install -y nodejs"
        echo ""
        echo "After installation, verify with:"
        echo "  npm --version"
        echo ""
        echo "Then run this script again: ./install.sh"
        exit 1
    fi
    
    print_success "npm installation complete!"
}

install_nodejs() {
    print_header "Installing Node.js"
    
    if command -v node &> /dev/null; then
        CURRENT_NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$CURRENT_NODE_VERSION" -lt 20 ]; then
            print_warning "Found old Node.js version $(node --version), removing completely..."
            
            if [[ "$OS" == "linux" ]]; then
                # Remove all Node.js related packages
                sudo apt remove -y nodejs npm node 2>/dev/null || true
                sudo apt purge -y nodejs npm node 2>/dev/null || true
                sudo apt autoremove -y
                
                # Remove old NodeSource repositories
                sudo rm -f /etc/apt/sources.list.d/nodesource.list
                sudo rm -f /etc/apt/sources.list.d/nodesource.list.save
                
                # Remove any remaining Node.js files
                sudo rm -rf /usr/local/bin/node /usr/local/bin/npm
                sudo rm -rf /usr/local/lib/node_modules
                sudo rm -rf /usr/local/include/node
                sudo rm -rf /opt/nodejs
                
                # Clear apt cache
                sudo apt clean
                sudo apt update
                
            elif [[ "$OS" == "macos" ]]; then
                brew uninstall node 2>/dev/null || true
                brew uninstall node@* 2>/dev/null || true
                brew cleanup
            fi
            
            # Clear shell hash table
            hash -r 2>/dev/null || true
            
            print_success "Old Node.js removed completely"
        else
            print_success "Node.js already installed: $(node --version)"
            
            # Check if npm exists
            if command -v npm &> /dev/null; then
                print_success "npm already installed: $(npm --version)"
                return 0
            else
                print_warning "npm not found, installing separately..."
                install_npm
                return 0
            fi
        fi
    fi
    
    print_info "Installing Node.js 20.x with npm..."
    
    INSTALLATION_SUCCESS=false
    
    # Method 1: NodeSource Repository (Traditional)
    if [ "$INSTALLATION_SUCCESS" = false ]; then
        print_info "Method 1: Trying NodeSource repository..."
        if [[ "$OS" == "linux" ]]; then
            if curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
               sudo apt update && \
               sudo apt install -y nodejs; then
                
                # Reload environment
                hash -r 2>/dev/null || true
                export PATH="/usr/bin:/usr/local/bin:$PATH"
                sleep 2
                
                if command -v node &> /dev/null; then
                    NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
                    if [ "$NODE_VER" -ge 20 ]; then
                        print_success "NodeSource installation successful: $(node --version)"
                        INSTALLATION_SUCCESS=true
                    fi
                fi
            fi
        elif [[ "$OS" == "macos" ]]; then
            if brew install node@20 && brew link --overwrite --force node@20; then
                hash -r 2>/dev/null || true
                if command -v node &> /dev/null; then
                    print_success "Homebrew installation successful: $(node --version)"
                    INSTALLATION_SUCCESS=true
                fi
            fi
        fi
    fi
    
    # Method 2: NVM (Node Version Manager)
    if [ "$INSTALLATION_SUCCESS" = false ]; then
        print_warning "NodeSource method failed, trying NVM..."
        
        # Install NVM
        if ! command -v nvm &> /dev/null; then
            print_info "Installing NVM..."
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
            
            # Load NVM
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
            [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
        fi
        
        # Install Node.js 20 via NVM
        if command -v nvm &> /dev/null || [ -s "$HOME/.nvm/nvm.sh" ]; then
            [ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh"
            
            print_info "Installing Node.js 20 via NVM..."
            nvm install 20
            nvm use 20
            nvm alias default 20
            
            # Reload environment
            hash -r 2>/dev/null || true
            sleep 2
            
            if command -v node &> /dev/null; then
                NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
                if [ "$NODE_VER" -ge 20 ]; then
                    print_success "NVM installation successful: $(node --version)"
                    INSTALLATION_SUCCESS=true
                    
                    # Add NVM to shell profiles for persistence
                    for profile in "$HOME/.bashrc" "$HOME/.profile" "$HOME/.bash_profile"; do
                        if [ -f "$profile" ] && ! grep -q "NVM_DIR" "$profile"; then
                            echo 'export NVM_DIR="$HOME/.nvm"' >> "$profile"
                            echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> "$profile"
                        fi
                    done
                fi
            fi
        fi
    fi
    
    # Method 3: Direct Binary Download (Linux only)
    if [ "$INSTALLATION_SUCCESS" = false ] && [[ "$OS" == "linux" ]]; then
        print_warning "NVM method failed, trying direct binary download..."
        
        NODE_VERSION="20.11.0"
        ARCH=$(uname -m)
        
        if [ "$ARCH" = "x86_64" ]; then
            NODE_ARCH="x64"
        elif [ "$ARCH" = "aarch64" ]; then
            NODE_ARCH="arm64"
        else
            print_warning "Unsupported architecture: $ARCH"
        fi
        
        if [ -n "$NODE_ARCH" ]; then
            print_info "Downloading Node.js v${NODE_VERSION} for ${NODE_ARCH}..."
            
            cd /tmp
            wget "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
            
            if [ -f "node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" ]; then
                print_info "Extracting Node.js..."
                sudo mkdir -p /opt/nodejs
                sudo tar -xJf "node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -C /opt/nodejs --strip-components=1
                
                # Create symlinks
                sudo ln -sf /opt/nodejs/bin/node /usr/local/bin/node
                sudo ln -sf /opt/nodejs/bin/npm /usr/local/bin/npm
                sudo ln -sf /opt/nodejs/bin/npx /usr/local/bin/npx
                
                # Update PATH
                export PATH="/opt/nodejs/bin:/usr/local/bin:$PATH"
                hash -r 2>/dev/null || true
                
                # Clean up
                rm -f "node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
                cd - > /dev/null
                
                sleep 2
                
                if command -v node &> /dev/null; then
                    NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
                    if [ "$NODE_VER" -ge 20 ]; then
                        print_success "Binary installation successful: $(node --version)"
                        INSTALLATION_SUCCESS=true
                        
                        # Add to PATH permanently
                        for profile in "$HOME/.bashrc" "$HOME/.profile" "$HOME/.bash_profile"; do
                            if [ -f "$profile" ] && ! grep -q "/opt/nodejs/bin" "$profile"; then
                                echo 'export PATH="/opt/nodejs/bin:$PATH"' >> "$profile"
                            fi
                        done
                    fi
                fi
            fi
        fi
    fi
    
    # Method 4: Snap Package (Linux only, last resort)
    if [ "$INSTALLATION_SUCCESS" = false ] && [[ "$OS" == "linux" ]]; then
        if command -v snap &> /dev/null; then
            print_warning "Binary download failed, trying snap package..."
            
            if sudo snap install node --classic --channel=20/stable; then
                hash -r 2>/dev/null || true
                export PATH="/snap/bin:$PATH"
                sleep 2
                
                if command -v node &> /dev/null; then
                    NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
                    if [ "$NODE_VER" -ge 20 ]; then
                        print_success "Snap installation successful: $(node --version)"
                        INSTALLATION_SUCCESS=true
                    fi
                fi
            fi
        fi
    fi
    
    # Check if any method succeeded
    if [ "$INSTALLATION_SUCCESS" = false ]; then
        print_error "All Node.js installation methods failed"
        print_info ""
        print_info "Please try manual installation:"
        echo ""
        echo "Option 1 - Using NVM (Recommended):"
        echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
        echo "  source ~/.bashrc"
        echo "  nvm install 20"
        echo "  nvm use 20"
        echo ""
        echo "Option 2 - Using NodeSource:"
        echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        echo "  sudo apt update && sudo apt install -y nodejs"
        echo ""
        echo "After installation, verify with:"
        echo "  node --version  # Should show v20.x.x"
        echo "  npm --version"
        echo ""
        echo "Then run this script again: ./install.sh"
        exit 1
    fi
    
    # Verify npm is available
    if ! command -v npm &> /dev/null; then
        print_error "npm not found after Node.js installation"
        print_info "Attempting to locate npm..."
        
        # Search for npm in common locations
        for npm_location in /usr/bin/npm /usr/local/bin/npm /opt/nodejs/bin/npm "$HOME/.nvm/versions/node/*/bin/npm" /snap/bin/npm; do
            if [ -f "$npm_location" ] || ls $npm_location 2>/dev/null | head -1; then
                NPM_PATH=$(ls $npm_location 2>/dev/null | head -1)
                if [ -n "$NPM_PATH" ]; then
                    print_info "Found npm at: $NPM_PATH"
                    NPM_DIR=$(dirname "$NPM_PATH")
                    export PATH="$NPM_DIR:$PATH"
                    hash -r 2>/dev/null || true
                    break
                fi
            fi
        done
        
        if ! command -v npm &> /dev/null; then
            print_error "npm still not found"
            print_info "Node.js is installed but npm is missing"
            print_info "This is unusual. Please check your Node.js installation."
            exit 1
        fi
    fi
    
    print_success "npm installed: $(npm --version)"
    
    # Verify npm can execute
    if ! npm --version &> /dev/null; then
        print_error "npm is installed but cannot execute"
        print_info "Fixing permissions..."
        sudo chmod +x $(which npm) 2>/dev/null || true
        
        if ! npm --version &> /dev/null; then
            print_error "npm still cannot execute"
            exit 1
        fi
    fi
    
    if [ "$INSTALLATION_SUCCESS" = true ]; then
        print_info "Verifying npm installation..."
        
        if ! command -v npm &> /dev/null; then
            print_warning "npm not found after Node.js installation"
            install_npm
        else
            print_success "npm verified: $(npm --version)"
        fi
    fi

    print_success "Node.js and npm installation complete!"
}

install_dependencies() {
    print_header "Installing Project Dependencies"
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the project directory?"
        exit 1
    fi
    
    print_info "Cleaning previous installations..."
    rm -rf node_modules package-lock.json .next
    
    npm cache clean --force
    
    # Remove any global React installations that might conflict
    if [ -d "$HOME/.npm" ]; then
        print_info "Cleaning npm cache directory..."
        rm -rf "$HOME/.npm/_cacache"
    fi
    
    print_info "Installing npm packages (this may take several minutes)..."
    if npm install --legacy-peer-deps; then
        print_success "Dependencies installed"
    else
        print_error "Failed to install dependencies"
        print_info "Trying with --force flag..."
        npm install --force
        print_success "Dependencies installed with --force"
    fi
    
    print_info "Verifying React versions..."
    REACT_VERSION=$(npm list react --depth=0 2>/dev/null | grep react@ | sed 's/.*react@//' | sed 's/ .*//')
    REACT_DOM_VERSION=$(npm list react-dom --depth=0 2>/dev/null | grep react-dom@ | sed 's/.*react-dom@//' | sed 's/ .*//')
    
    if [ -n "$REACT_VERSION" ] && [ -n "$REACT_DOM_VERSION" ]; then
        print_info "React version: $REACT_VERSION"
        print_info "React-DOM version: $REACT_DOM_VERSION"
        
        # Extract major.minor versions for comparison
        REACT_MAJOR_MINOR=$(echo "$REACT_VERSION" | cut -d'.' -f1,2)
        REACT_DOM_MAJOR_MINOR=$(echo "$REACT_DOM_VERSION" | cut -d'.' -f1,2)
        
        if [ "$REACT_MAJOR_MINOR" != "$REACT_DOM_MAJOR_MINOR" ]; then
            print_warning "React version mismatch detected!"
            print_info "Fixing React versions..."
            npm install react@18.3.1 react-dom@18.3.1 --save --legacy-peer-deps
            print_success "React versions synchronized"
        else
            print_success "React versions match correctly"
        fi
    fi
    
    if [ -f "scripts/pre-dev-check.sh" ]; then
        print_info "Making pre-dev-check.sh executable..."
        chmod +x scripts/pre-dev-check.sh
        print_success "Pre-dev check script is ready"
    fi
}

build_application() {
    print_header "Building Application"
    
    print_info "Building Next.js application..."
    npm run build
    
    print_success "Build complete"
}

apply_database_fixes() {
    print_header "Applying Database Schema Fixes"
    
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
    if [ ! -w "$SCRIPT_DIR" ]; then
        print_error "No write permission in project directory: $SCRIPT_DIR"
        print_info "Attempting to fix permissions..."
        
        CURRENT_USER=$(whoami)
        
        # Try to fix ownership
        if sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$SCRIPT_DIR" 2>/dev/null; then
            print_success "Fixed directory permissions"
        else
            print_error "Cannot fix permissions. Please run:"
            echo "  sudo chown -R $CURRENT_USER:$CURRENT_USER $SCRIPT_DIR"
            exit 1
        fi
    fi
    
    if [ ! -d "$SCRIPT_DIR/scripts" ]; then
        print_warning "scripts/ directory not found"
        print_info "Creating scripts directory..."
        mkdir -p "$SCRIPT_DIR/scripts"
        chmod 755 "$SCRIPT_DIR/scripts"
    fi
    
    print_info "Running database migrations..."
    
    DB_NAME="${DB_NAME:-isp_system}"
    DB_USER="${DB_USER:-isp_admin}"
    
    if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_error "Database '$DB_NAME' does not exist"
        print_info "Creating database first..."
        setup_database
    fi
    
    print_info "Checking for schema_migrations table..."
    if ! sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations');" | grep -q "t"; then
        print_info "Creating schema_migrations table..."
        sudo -u postgres psql -d "$DB_NAME" -c "CREATE TABLE schema_migrations (id SERIAL PRIMARY KEY, migration_name VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" 2>/dev/null || {
            print_error "Failed to create schema_migrations table"
            exit 1
        }
        print_success "schema_migrations table created"
    fi
    
    print_info "Preparing migration files..."
    TEMP_MIGRATION_DIR="/tmp/isp_migrations_$$"
    mkdir -p "$TEMP_MIGRATION_DIR"
    chmod 755 "$TEMP_MIGRATION_DIR"
    
    # Copy complete schema if it exists
    COMPLETE_SCHEMA="$SCRIPT_DIR/scripts/000_complete_schema.sql"
    
    if [ -f "$COMPLETE_SCHEMA" ]; then
        print_info "Copying complete database schema to temporary location..."
        cp "$COMPLETE_SCHEMA" "$TEMP_MIGRATION_DIR/000_complete_schema.sql"
        chmod 644 "$TEMP_MIGRATION_DIR/000_complete_schema.sql"
        
        print_info "Applying complete database schema..."
        
        if (cd /tmp && sudo -u postgres psql -d "$DB_NAME" -f "$TEMP_MIGRATION_DIR/000_complete_schema.sql") 2>&1 | tee /tmp/schema_output.log; then
            print_success "Complete schema applied successfully"
            
            # Show summary from output
            if grep -q "Database schema created successfully" /tmp/schema_output.log; then
                print_success "All tables and indexes created"
            fi
            
            # Record the complete schema as applied
            MIGRATION_NAME="000_complete_schema.sql"
            ALREADY_APPLIED=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$MIGRATION_NAME';" 2>/dev/null || echo "0")
            if [ "$ALREADY_APPLIED" -eq 0 ]; then
                (cd /tmp && sudo -u postgres psql -d "$DB_NAME" -c "INSERT INTO schema_migrations (migration_name) VALUES ('$MIGRATION_NAME');") > /dev/null 2>&1
            fi
            
        else
            print_error "Failed to apply complete schema"
            print_info "Check the error log: /tmp/schema_output.log"
            
            # Clean up
            rm -rf "$TEMP_MIGRATION_DIR"
            exit 1
        fi
    else
        print_error "Complete schema file not found: $COMPLETE_SCHEMA"
        print_info "The database schema file is missing"
        
        # Clean up
        rm -rf "$TEMP_MIGRATION_DIR"
        exit 1
    fi
    
    print_info "Checking for additional migrations..."
    
    MIGRATION_COUNT=0
    for migration_file in "$SCRIPT_DIR/scripts"/[0-9][0-9][0-9]_*.sql; do
        if [ -f "$migration_file" ]; then
            MIGRATION_NAME=$(basename "$migration_file")
            
            ALREADY_APPLIED=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$MIGRATION_NAME';" 2>/dev/null || echo "0")
            
            if [ "$ALREADY_APPLIED" -eq 0 ]; then
                print_info "Applying migration: $MIGRATION_NAME"
                
                cp "$migration_file" "$TEMP_MIGRATION_DIR/$MIGRATION_NAME"
                chmod 644 "$TEMP_MIGRATION_DIR/$MIGRATION_NAME"
                
                if (cd /tmp && sudo -u postgres psql -d "$DB_NAME" -f "$TEMP_MIGRATION_DIR/$MIGRATION_NAME") > /dev/null 2>&1; then
                    # Record the migration
                    (cd /tmp && sudo -u postgres psql -d "$DB_NAME" -c "INSERT INTO schema_migrations (migration_name) VALUES ('$MIGRATION_NAME');") > /dev/null 2>&1
                    
                    print_success "Migration applied: $MIGRATION_NAME"
                    MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
                else
                    print_warning "Migration failed (may be incompatible): $MIGRATION_NAME"
                fi
            else
                print_info "Migration already applied: $MIGRATION_NAME"
            fi
        fi
    done
    
    if [ $MIGRATION_COUNT -gt 0 ]; then
        print_success "Applied $MIGRATION_COUNT additional migrations"
    else
        print_info "No additional migrations needed"
    fi
    
    print_info "Cleaning up temporary files..."
    rm -rf "$TEMP_MIGRATION_DIR"
    rm -f /tmp/schema_output.log
    
    print_success "Database migrations completed successfully"
}

run_performance_optimizations() {
    print_header "Applying Performance Optimizations"
    
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
    if [ ! -d "$SCRIPT_DIR/scripts" ]; then
        print_warning "scripts/ directory not found, skipping performance optimizations..."
        return 0
    fi
    
    if [ ! -f "$SCRIPT_DIR/scripts/performance_indexes.sql" ]; then
        print_warning "Performance optimization script not found at: $SCRIPT_DIR/scripts/performance_indexes.sql"
        print_info "Skipping performance optimizations..."
        return 0
    fi
    
    print_info "Creating performance indexes..."
    
    DB_NAME="${DB_NAME:-isp_system}"
    if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_error "Database '$DB_NAME' does not exist"
        print_info "Please run full installation first: ./install.sh"
        exit 1
    fi
    
    print_info "Preparing performance optimization file..."
    TEMP_PERF_DIR="/tmp/isp_performance_$$"
    mkdir -p "$TEMP_PERF_DIR"
    chmod 755 "$TEMP_PERF_DIR"
    
    cp "$SCRIPT_DIR/scripts/performance_indexes.sql" "$TEMP_PERF_DIR/performance_indexes.sql"
    chmod 644 "$TEMP_PERF_DIR/performance_indexes.sql"
    
    if (cd /tmp && sudo -u postgres psql -d "$DB_NAME" -f "$TEMP_PERF_DIR/performance_indexes.sql") 2>&1 | tee /tmp/performance_output.log; then
        print_success "Performance optimizations applied"
        
        # Show summary
        INDEX_COUNT=$(grep -c "CREATE INDEX" /tmp/performance_output.log || echo "0")
        if [ "$INDEX_COUNT" -gt 0 ]; then
            print_info "Created/verified $INDEX_COUNT performance indexes"
        fi
    else
        print_warning "Some performance optimizations may have failed"
        print_info "This is usually not critical and the system will still work"
        print_info "Check the log: /tmp/performance_output.log"
    fi
    
    print_info "Cleaning up temporary files..."
    rm -rf "$TEMP_PERF_DIR"
    rm -f /tmp/performance_output.log
    
    print_success "Performance optimization process complete"
}

verify_database_connection() {
    print_header "Verifying Database Connection (Comprehensive Test)"
    
    DB_NAME="${DB_NAME:-isp_system}"
    DB_USER="${DB_USER:-isp_admin}"
    
    print_info "Step 1: Checking PostgreSQL service status..."
    
    # Check if PostgreSQL is running
    if [[ "$OS" == "linux" ]]; then
        if ! sudo systemctl is-active --quiet postgresql; then
            print_warning "PostgreSQL service is not running"
            print_info "Starting PostgreSQL service..."
            sudo systemctl start postgresql
            sleep 3
            
            if sudo systemctl is-active --quiet postgresql; then
                print_success "PostgreSQL service started"
            else
                print_error "Failed to start PostgreSQL service"
                print_info "Checking PostgreSQL logs..."
                sudo journalctl -u postgresql -n 20 --no-pager
                exit 1
            fi
        else
            print_success "PostgreSQL service is running"
        fi
    elif [[ "$OS" == "macos" ]]; then
        if ! brew services list | grep postgresql | grep started > /dev/null; then
            print_info "Starting PostgreSQL service..."
            brew services start postgresql@15
            sleep 3
        fi
        print_success "PostgreSQL service is running"
    fi
    
    print_info "Step 2: Testing PostgreSQL server connectivity..."
    
    if sudo -u postgres psql -c "SELECT version();" > /dev/null 2>&1; then
        PG_VERSION=$(sudo -u postgres psql -tAc "SELECT version();")
        print_success "PostgreSQL server is accessible"
        print_info "Version: $(echo $PG_VERSION | cut -d',' -f1)"
    else
        print_error "Cannot connect to PostgreSQL server"
        print_info "Please check PostgreSQL status: sudo systemctl status postgresql"
        exit 1
    fi
    
    print_info "Step 3: Checking if database exists..."
    
    if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_warning "Database '$DB_NAME' does not exist"
        print_info "Creating database..."
        setup_database
    else
        print_success "Database '$DB_NAME' exists"
    fi
    
    print_info "Step 4: Testing database connection..."
    
    if sudo -u postgres psql -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Cannot connect to database '$DB_NAME'"
        print_info "Attempting to fix connection..."
        
        # Try to recreate the database
        setup_database
        
        # Test again
        if sudo -u postgres psql -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
            print_success "Database connection successful after fix"
        else
            print_error "Still cannot connect to database"
            exit 1
        fi
    fi
    
    print_info "Step 5: Verifying database user permissions..."
    
    # Grant all necessary permissions
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true
    sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" 2>/dev/null || true
    sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};" 2>/dev/null || true
    sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};" 2>/dev/null || true
    sudo -u postgres psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};" 2>/dev/null || true
    sudo -u postgres psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};" 2>/dev/null || true
    
    print_success "Database user permissions configured"
    
    print_info "Step 6: Testing connection with credentials from .env.local..."
    
    if [ -f ".env.local" ]; then
        source .env.local
        
        if [ -n "$DATABASE_URL" ]; then
            MASKED_URL=$(echo "$DATABASE_URL" | awk -F'[@:/]' '{print $1"://"$4":***@"$6":"$7"/"$8}')
            print_info "Testing connection string: $MASKED_URL"
            
            DB_TEST_USER=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $4}')
            DB_TEST_PASS=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $5}')
            DB_TEST_HOST=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $6}')
            DB_TEST_PORT=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $7}')
            DB_TEST_NAME=$(echo "$DATABASE_URL" | awk -F'[/:@?]' '{print $8}')
            
            if PGPASSWORD="$DB_TEST_PASS" psql -h "$DB_TEST_HOST" -p "$DB_TEST_PORT" -U "$DB_TEST_USER" -d "$DB_TEST_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
                print_success "Connection with .env.local credentials successful"
            else
                print_warning "Cannot connect with .env.local credentials"
                print_info "This may cause issues when running the application"
            fi
        else
            print_warning "DATABASE_URL not found in .env.local"
        fi
    else
        print_warning ".env.local file not found"
    fi
    
    print_info "Step 7: Checking database size and statistics..."
    
    DB_SIZE=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
    TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    
    print_info "Database size: $DB_SIZE"
    print_info "Number of tables: $TABLE_COUNT"
    
    print_info "Step 8: Verifying all required tables and columns..."
    
    # Define expected schema from 000_complete_schema.sql
    declare -A TABLE_COLUMNS=(
        ["customers"]="id,name,email,phone,address,customer_type,status,plan,monthly_fee,balance,connection_quality,portal_login_id,portal_username,portal_password,installation_date,last_payment_date,contract_end_date,created_at,updated_at"
        ["service_plans"]="id,name,description,speed_download,speed_upload,data_limit,price,setup_fee,fup_limit,fup_speed,contract_period,is_active,created_at,updated_at"
        ["customer_services"]="id,customer_id,service_plan_id,status,installation_date,activation_date,suspension_date,termination_date,monthly_fee,created_at,updated_at"
        ["payments"]="id,customer_id,amount,payment_method,payment_reference,mpesa_receipt_number,status,payment_date,created_at,updated_at"
        ["invoices"]="id,customer_id,invoice_number,amount,tax_amount,total_amount,due_date,status,created_at,updated_at"
        ["network_devices"]="id,name,type,ip_address,mac_address,location,status,last_seen,created_at,updated_at"
        ["ip_addresses"]="id,ip_address,subnet_id,customer_id,device_id,status,assigned_date,created_at,updated_at"
        ["employees"]="id,employee_id,first_name,last_name,email,phone,department,position,salary,hire_date,status,created_at,updated_at"
        ["payroll"]="id,employee_id,pay_period_start,pay_period_end,basic_salary,allowances,deductions,gross_pay,tax,nhif,nssf,net_pay,status,created_at,updated_at"
        ["leave_requests"]="id,employee_id,leave_type,start_date,end_date,days_requested,reason,status,approved_by,approved_at,created_at,updated_at"
        ["activity_logs"]="id,user_id,action,entity_type,entity_id,details,ip_address,user_agent,created_at"
        ["schema_migrations"]="id,migration_name,applied_at"
    )
    
    MISSING_TABLES=()
    TABLES_WITH_MISSING_COLUMNS=()
    TOTAL_TABLES_OK=0
    TOTAL_COLUMNS_CHECKED=0
    TOTAL_COLUMNS_MISSING=0
    
    for table in "${!TABLE_COLUMNS[@]}"; do
        # Check if table exists
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | grep -q "t"; then
            
            # Table exists, now check columns
            IFS=',' read -ra EXPECTED_COLUMNS <<< "${TABLE_COLUMNS[$table]}"
            MISSING_COLUMNS=()
            
            for column in "${EXPECTED_COLUMNS[@]}"; do
                TOTAL_COLUMNS_CHECKED=$((TOTAL_COLUMNS_CHECKED + 1))
                
                if ! sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table' AND column_name = '$column');" | grep -q "t"; then
                    MISSING_COLUMNS+=("$column")
                    TOTAL_COLUMNS_MISSING=$((TOTAL_COLUMNS_MISSING + 1))
                fi
            done
            
            if [ ${#MISSING_COLUMNS[@]} -eq 0 ]; then
                COLUMN_COUNT=${#EXPECTED_COLUMNS[@]}
                print_success "✓ $table ($COLUMN_COUNT columns)"
                TOTAL_TABLES_OK=$((TOTAL_TABLES_OK + 1))
            else
                print_warning "⚠ $table (missing ${#MISSING_COLUMNS[@]} columns: ${MISSING_COLUMNS[*]})"
                TABLES_WITH_MISSING_COLUMNS+=("$table")
            fi
        else
            print_error "✗ $table (table does not exist)"
            MISSING_TABLES+=("$table")
        fi
    done
    
    echo ""
    print_info "Schema Verification Summary:"
    print_info "  Total tables expected: ${#TABLE_COLUMNS[@]}"
    print_info "  Tables fully verified: $TOTAL_TABLES_OK"
    print_info "  Total columns checked: $TOTAL_COLUMNS_CHECKED"
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_error "  Missing tables: ${#MISSING_TABLES[@]} (${MISSING_TABLES[*]})"
    fi
    
    if [ ${#TABLES_WITH_MISSING_COLUMNS[@]} -gt 0 ]; then
        print_warning "  Tables with missing columns: ${#TABLES_WITH_MISSING_COLUMNS[@]} (${TABLES_WITH_MISSING_COLUMNS[*]})"
        print_warning "  Total missing columns: $TOTAL_COLUMNS_MISSING"
    fi
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#TABLES_WITH_MISSING_COLUMNS[@]} -eq 0 ]; then
        print_success "  ✓ All tables and columns verified successfully!"
    else
        print_warning "  Schema verification found issues that need to be fixed"
        print_info "  These will be addressed in the next step (Apply Database Fixes)"
    fi
    
    print_success "Database connection verification complete!"
}

verify_database_tables() {
    print_header "Verifying Database Tables"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Checking if required tables exist..."
    
    # List of required tables
    REQUIRED_TABLES=(
        "customers"
        "service_plans"
        "customer_services"
        "payments"
        "invoices"
        "network_devices"
        "ip_addresses"
        "employees"
        "payroll"
        "leave_requests"
        "activity_logs"
        "schema_migrations"
    )
    
    MISSING_TABLES=()
    
    for table in "${REQUIRED_TABLES[@]}"; do
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | grep -q "t"; then
            print_success "Table exists: $table"
        else
            print_warning "Table missing: $table"
            MISSING_TABLES+=("$table")
        fi
    done
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
        print_success "All required tables exist"
        
        # Count total tables
        TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        print_info "Total tables in database: $TABLE_COUNT"
        
    else
        print_error "Missing ${#MISSING_TABLES[@]} required tables"
        print_info "Missing tables: ${MISSING_TABLES[*]}"
        print_info "Attempting to create missing tables..."
        
        # Run migrations to create tables
        apply_database_fixes
        
        # Verify again
        print_info "Re-checking tables after migration..."
        STILL_MISSING=()
        
        for table in "${MISSING_TABLES[@]}"; do
            if ! sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | grep -q "t"; then
                STILL_MISSING+=("$table")
            fi
        done
        
        if [ ${#STILL_MISSING[@]} -eq 0 ]; then
            print_success "All tables created successfully"
        else
            print_error "Failed to create tables: ${STILL_MISSING[*]}"
            print_info "Please check the migration files in scripts/ directory"
            print_info "You can manually run: sudo -u postgres psql -d $DB_NAME -f scripts/001_initial_schema.sql"
            exit 1
        fi
    fi
}

test_database_operations() {
    print_header "Testing Database Operations"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Testing INSERT operation..."
    if sudo -u postgres psql -d "$DB_NAME" -c "INSERT INTO activity_logs (action, entity_type, details) VALUES ('test_install', 'system', '{\"test\": true}') RETURNING id;" > /dev/null 2>&1; then
        print_success "INSERT operation successful"
    else
        print_error "INSERT operation failed"
        exit 1
    fi
    
    print_info "Testing SELECT operation..."
    if sudo -u postgres psql -d "$DB_NAME" -c "SELECT COUNT(*) FROM activity_logs WHERE action = 'test_install';" > /dev/null 2>&1; then
        print_success "SELECT operation successful"
    else
        print_error "SELECT operation failed"
        exit 1
    fi
    
    print_info "Testing UPDATE operation..."
    if sudo -u postgres psql -d "$DB_NAME" -c "UPDATE activity_logs SET details = '{\"test\": true, \"verified\": true}' WHERE action = 'test_install';" > /dev/null 2>&1; then
        print_success "UPDATE operation successful"
    else
        print_error "UPDATE operation failed"
        exit 1
    fi
    
    print_info "Testing DELETE operation..."
    if sudo -u postgres psql -d "$DB_NAME" -c "DELETE FROM activity_logs WHERE action = 'test_install';" > /dev/null 2>&1; then
        print_success "DELETE operation successful"
    else
        print_error "DELETE operation failed"
        exit 1
    fi
    
    print_success "All database operations working correctly"
}

# ============================================
# INSTALLATION MODES
# ============================================

full_installation() {
    print_header "$SCRIPT_NAME v$VERSION - Full Installation"
    
    check_root
    check_directory_structure
    detect_os
    update_system
    
    install_postgresql
    setup_database
    install_nodejs
    install_npm
    install_dependencies
    
    verify_database_connection
    apply_database_fixes
    verify_database_tables
    test_database_operations
    run_performance_optimizations
    
    build_application
    
    print_header "Installation Complete!"
    echo ""
    print_success "ISP Management System has been installed successfully!"
    echo ""
    print_success "✓ PostgreSQL database is running and connected"
    print_success "✓ All database tables created and verified"
    print_success "✓ Database operations tested successfully"
    print_success "✓ Node.js and npm installed and verified"
    echo ""
    echo "Next steps:"
    echo "  1. Start the development server:"
    echo "     npm run dev"
    echo ""
    echo "  2. Open your browser to:"
    echo "     http://localhost:3000"
    echo ""
    echo "  3. Database credentials saved in:"
    echo "     ./database-credentials.txt"
    echo ""
    echo "Note: The system is configured for offline PostgreSQL operation."
    echo "      All tables have been created and verified."
    echo ""
}

quick_fix_npm() {
    print_header "$SCRIPT_NAME - NPM Dependency Fix"
    
    check_directory_structure
    # Ensure Node.js is installed before trying to fix npm
    install_nodejs
    install_npm
    install_dependencies
    
    print_header "NPM Fix Complete!"
    echo ""
    print_success "Dependencies have been reinstalled"
    echo ""
    echo "You can now run:"
    echo "  npm run dev"
    echo ""
}

quick_fix_database() {
    print_header "$SCRIPT_NAME - Database Fix"
    
    check_directory_structure
    detect_os
    apply_database_fixes
    run_performance_optimizations
    
    print_header "Database Fix Complete!"
    echo ""
    print_success "Database schema has been updated"
    echo ""
    echo "You can now restart your application:"
    echo "  npm run dev"
    echo ""
}

reinstall_dependencies() {
    print_header "$SCRIPT_NAME - Reinstall Dependencies"
    
    check_directory_structure
    install_nodejs
    install_npm
    install_dependencies
    
    print_header "Reinstall Complete!"
    echo ""
    print_success "Node.js and dependencies have been reinstalled"
    echo ""
}

show_usage() {
    cat << EOF
$SCRIPT_NAME v$VERSION

Usage: ./install.sh [OPTION]

Options:
  (no option)    Full installation (default)
  --fix-npm      Fix npm dependency issues only
  --fix-db       Apply database schema fixes only
  --reinstall    Reinstall Node.js and dependencies
  --help         Show this help message

Examples:
  ./install.sh                 # Full installation
  ./install.sh --fix-npm       # Fix npm issues
  ./install.sh --fix-db        # Fix database schema
  ./install.sh --reinstall     # Reinstall dependencies

EOF
}

# ============================================
# MAIN EXECUTION
# ============================================

main() {
    case "${1:-}" in
        --fix-npm)
            quick_fix_npm
            ;;
        --fix-db)
            quick_fix_database
            ;;
        --reinstall)
            reinstall_dependencies
            ;;
        --help|-h)
            show_usage
            ;;
        "")
            full_installation
            ;;
        *)
            print_error "Unknown option: $1"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
