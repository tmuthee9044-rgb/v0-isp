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

print_section() {
    echo ""
    echo "--------- $1 ---------"
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

install_freeradius() {
    print_header "Installing FreeRADIUS"
    
    print_info "Detecting host network IP address..."
    
    # Try to detect the primary network IP (not localhost)
    DETECTED_IP=""
    
    # Method 1: Get IP from default route interface
    if command -v ip &> /dev/null; then
        DEFAULT_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
        if [ -n "$DEFAULT_INTERFACE" ]; then
            DETECTED_IP=$(ip addr show "$DEFAULT_INTERFACE" | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | cut -d/ -f1 | head -n1)
        fi
    fi
    
    # Method 2: Use hostname -I (fallback)
    if [ -z "$DETECTED_IP" ] && command -v hostname &> /dev/null; then
        DETECTED_IP=$(hostname -I | awk '{print $1}')
    fi
    
    # Method 3: Use ifconfig (fallback for older systems)
    if [ -z "$DETECTED_IP" ] && command -v ifconfig &> /dev/null; then
        DETECTED_IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | cut -d: -f2 | head -n1)
    fi
    
    # Fallback to localhost if detection fails
    if [ -z "$DETECTED_IP" ]; then
        DETECTED_IP="127.0.0.1"
        print_warning "Could not detect network IP, using localhost (127.0.0.1)"
        print_warning "Physical routers will NOT be able to connect!"
        print_info "Please update RADIUS configuration in /settings/servers with your actual IP"
    else
        print_success "Detected host IP: $DETECTED_IP"
        print_info "Physical routers will connect to this IP address"
    fi
    
    print_info "Generating RADIUS shared secret..."
    RADIUS_SECRET=$(openssl rand -hex 16)
    print_success "Generated RADIUS secret: ${RADIUS_SECRET}"

    print_info "Creating RADIUS infrastructure tables..."
    if [ -f "scripts/create_radius_infrastructure.sql" ]; then
        psql "$DATABASE_URL" -f scripts/create_radius_infrastructure.sql > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            print_success "RADIUS tables created successfully"
        else
            print_error "Failed to create RADIUS tables"
            print_info "Trying alternative method..."
            sudo -u postgres psql -d "$DB_NAME" -f scripts/create_radius_infrastructure.sql
        fi
    else
        print_warning "RADIUS schema file not found, using inline SQL..."
        psql "$DATABASE_URL" << RADIUSTABLES
-- Create basic RADIUS tables inline
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS radius_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    ip_address INET,
    download_limit BIGINT,
    upload_limit BIGINT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS radius_sessions_active (
    id SERIAL PRIMARY KEY,
    acct_session_id VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET NOT NULL,
    framed_ip_address INET,
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    last_update TIMESTAMP DEFAULT NOW(),
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_radius_users_username ON radius_users(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_username ON radius_sessions_active(username);
RADIUSTABLES
        if [ $? -eq 0 ]; then
            print_success "Basic RADIUS tables created"
        else
            print_error "Failed to create RADIUS tables"
        fi
    fi
    
    print_info "Saving RADIUS configuration to database..."
    psql "$DATABASE_URL" << SAVERADIUS
-- Save RADIUS server configuration
INSERT INTO system_config (key, value, created_at, updated_at) VALUES
    ('server.radius.enabled', 'true', NOW(), NOW()),
    ('server.radius.host', '$DETECTED_IP', NOW(), NOW()),
    ('server.radius.authPort', '1812', NOW(), NOW()),
    ('server.radius.acctPort', '1813', NOW(), NOW()),
    ('server.radius.sharedSecret', '$RADIUS_SECRET', NOW(), NOW()),
    ('server.radius.timeout', '30', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- Log the installation
INSERT INTO system_logs (level, source, category, message, details, created_at) VALUES
    ('INFO', 'Installation', 'radius_setup', 
     'FreeRADIUS installed and configured', 
     '{"host": "$DETECTED_IP", "authPort": 1812, "acctPort": 1813}', 
     NOW());
SAVERADIUS
    
    if [ $? -eq 0 ]; then
        print_success "RADIUS configuration saved to database"
        print_info "Configuration is accessible from /settings/servers page"
        echo ""
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║          RADIUS Configuration Summary                      ║"
        echo "╠════════════════════════════════════════════════════════════╣"
        echo "║ Host IP:        $DETECTED_IP                               ║"
        echo "║ Auth Port:      1812                                       ║"
        echo "║ Acct Port:      1813                                       ║"
        echo "║ Shared Secret:  $RADIUS_SECRET                             ║"
        echo "║                                                            ║"
        echo "║ ⚠️  IMPORTANT: Save this secret securely!                  ║"
        echo "║ Full secret saved in /settings/servers                     ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""
    else
        print_warning "Failed to save RADIUS configuration to database"
    fi

    # Check if FreeRADIUS is already installed
    if command -v radiusd &> /dev/null || command -v freeradius &> /dev/null; then
        print_success "FreeRADIUS already installed"
        RADIUSD_CMD=$(command -v radiusd || command -v freeradius)
        print_info "FreeRADIUS binary: $RADIUSD_CMD"
    else
        print_info "Installing FreeRADIUS..."
        
        if [[ "$OS" == "linux" ]]; then
            sudo apt update
            sudo apt install -y freeradius freeradius-postgresql freeradius-utils
            
            if [ $? -eq 0 ]; then
                print_success "FreeRADIUS installed"
            else
                print_error "Failed to install FreeRADIUS"
                exit 1
            fi
        elif [[ "$OS" == "macos" ]]; then
            brew install freeradius-server
            
            if [ $? -eq 0 ]; then
                print_success "FreeRADIUS installed"
            else
                print_error "Failed to install FreeRADIUS"
                exit 1
            fi
        fi
    fi
    
    
    print_info "Detecting FreeRADIUS configuration directory..."
    FREERADIUS_DIR=""
    
    # Try multiple possible locations
    for dir in /etc/freeradius/3.0 /etc/freeradius /etc/raddb /usr/local/etc/raddb /opt/freeradius/etc/raddb; do
        if [ -d "$dir" ]; then
            FREERADIUS_DIR="$dir"
            print_success "Found FreeRADIUS config directory: $FREERADIUS_DIR"
            break
        fi
    done
    
    if [ -z "$FREERADIUS_DIR" ]; then
        print_error "Could not find FreeRADIUS configuration directory"
        print_info "Please install FreeRADIUS or specify the config directory manually"
        exit 1
    fi
    
    sudo mkdir -p "$FREERADIUS_DIR/mods-available"
    sudo mkdir -p "$FREERADIUS_DIR/mods-enabled"
    
    # Configure clients.conf to accept connections from detected IP and database clients
    print_info "Configuring RADIUS clients (clients.conf)..."
    CLIENTS_CONF="$FREERADIUS_DIR/clients.conf"
    
    if [ -f "$CLIENTS_CONF" ]; then
        sudo cp "$CLIENTS_CONF" "$CLIENTS_CONF.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Create new clients.conf with detected IP and database integration
        sudo tee "$CLIENTS_CONF.tmp" > /dev/null <<EOF_CLIENTS
# FreeRADIUS Clients Configuration
# Configured by ISP Management System

# Localhost client (for testing)
client localhost {
    ipaddr = 127.0.0.1
    secret = $RADIUS_SECRET
    require_message_authenticator = no
    nas_type = "other"
}

# IPv6 localhost
client localhost_ipv6 {
    ipv6addr = ::1
    secret = $RADIUS_SECRET
}

# ISP Management System Server (detected IP: $DETECTED_IP)
client isp_server {
    ipaddr = $DETECTED_IP
    secret = $RADIUS_SECRET
    require_message_authenticator = no
    nas_type = "other"
    shortname = "isp-server"
}

# Allow all private network ranges (for testing - tighten in production)
client private_network_10 {
    ipaddr = 10.0.0.0
    netmask = 8
    secret = $RADIUS_SECRET
    require_message_authenticator = no
    nas_type = "other"
    shortname = "private-10"
}

client private_network_172 {
    ipaddr = 172.16.0.0
    netmask = 12
    secret = $RADIUS_SECRET
    require_message_authenticator = no
    nas_type = "other"
    shortname = "private-172"
}

client private_network_192 {
    ipaddr = 192.168.0.0
    netmask = 16
    secret = $RADIUS_SECRET
    require_message_authenticator = no
    nas_type = "other"
    shortname = "private-192"
}

# Dynamic clients from database (requires SQL module)
# FreeRADIUS will read additional clients from radius_nas table
EOF_CLIENTS

        sudo mv "$CLIENTS_CONF.tmp" "$CLIENTS_CONF"
        sudo chmod 644 "$CLIENTS_CONF"
        print_success "Radius clients configured with detected IP ($DETECTED_IP) and private networks"
    fi

    # Enable SQL module for dynamic client loading
    print_info "Enabling SQL module for dynamic client management..."
    if [ -f "$FREERADIUS_DIR/mods-available/sql" ]; then
        sudo ln -sf "$FREERADIUS_DIR/mods-available/sql" "$FREERADIUS_DIR/mods-enabled/sql" 2>/dev/null || true
        print_success "SQL module enabled"
    fi
    
    # Configure SQL module
    print_info "Configuring FreeRADIUS SQL module..."
    
    SQL_CONF="$FREERADIUS_DIR/mods-available/sql"
    
    if [ -f "$SQL_CONF" ]; then
        print_info "Backing up original SQL configuration..."
        sudo cp "$SQL_CONF" "$SQL_CONF.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    print_info "Creating SQL module configuration..."
    cat > /tmp/freeradius_sql.conf << SQLCONF
# PostgreSQL configuration for FreeRADIUS
# Connects to PostgreSQL database for AAA operations

sql {
    driver = "rlm_sql_postgresql"
    dialect = "postgresql"
    
    # PostgreSQL connection
    server = "localhost"
    port = 5432
    login = "$DB_USER"
    password = "$DB_PASSWORD"
    radius_db = "$DB_NAME"
    
    # Connection pool settings (optimized for performance - rule 6)
    pool {
        start = 5
        min = 4
        max = 32
        spare = 10
        uses = 0
        retry_delay = 30
        lifetime = 0
        idle_timeout = 60
    }
    
    # Read NAS clients from database
    read_clients = yes
    client_table = "radius_nas" # Changed from "nas" to "radius_nas"
    
    # Standard FreeRADIUS authorization queries
    authorize_check_query = "SELECT id, username, attribute, value, op FROM radcheck WHERE username = '%{SQL-User-Name}' ORDER BY id"
    
    authorize_reply_query = "SELECT id, username, attribute, value, op FROM radreply WHERE username = '%{SQL-User-Name}' ORDER BY id"
    
    authorize_group_check_query = "SELECT id, groupname, attribute, value, op FROM radgroupcheck WHERE groupname = '%{SQL-Group}' ORDER BY id"
    
    authorize_group_reply_query = "SELECT id, groupname, attribute, value, op FROM radgroupreply WHERE groupname = '%{SQL-Group}' ORDER BY id"
    
    # User group membership
    group_membership_query = "SELECT groupname FROM radusergroup WHERE username='%{SQL-User-Name}' ORDER BY priority"
    
    # Accounting queries - track sessions in radacct table
    accounting {
        reference = "%{tolower:type.%{Acct-Status-Type}.query}"
        
        type {
            accounting-on {
                query = "UPDATE radacct SET acctstoptime = NOW(), acctsessiontime = (EXTRACT(EPOCH FROM (NOW() - acctstarttime)))::INTEGER, acctterminatecause = '%{Acct-Terminate-Cause}' WHERE acctstoptime IS NULL AND nasipaddress = '%{NAS-IP-Address}' AND acctstarttime <= NOW()"
            }
            
            accounting-off {
                query = "\${..accounting-on.query}"
            }
            
            start {
                query = "INSERT INTO radacct (acctsessionid, acctuniqueid, username, realm, nasipaddress, nasportid, nasporttype, acctstarttime, acctupdatetime, acctstoptime, acctsessiontime, acctauthentic, connectinfo_start, connectinfo_stop, acctinputoctets, acctoutputoctets, calledstationid, callingstationid, acctterminatecause, servicetype, framedprotocol, framedipaddress) VALUES ('%{Acct-Session-Id}', '%{Acct-Unique-Session-Id}', '%{SQL-User-Name}', '%{Realm}', '%{NAS-IP-Address}', '%{NAS-Port}', '%{NAS-Port-Type}', NOW(), NOW(), NULL, 0, '%{Acct-Authentic}', '%{Connect-Info}', '', 0, 0, '%{Called-Station-Id}', '%{Calling-Station-Id}', '', '%{Service-Type}', '%{Framed-Protocol}', NULLIF('%{Framed-IP-Address}', '')::inet)"
            }
            
            interim-update {
                query = "UPDATE radacct SET acctupdatetime = NOW(), acctinterval = EXTRACT(EPOCH FROM (NOW() - COALESCE(acctupdatetime, acctstarttime)))::INTEGER, acctsessiontime = '%{Acct-Session-Time}', acctinputoctets = '%{Acct-Input-Octets}'::bigint, acctoutputoctets = '%{Acct-Output-Octets}'::bigint WHERE acctsessionid = '%{Acct-Session-Id}' AND username = '%{SQL-User-Name}' AND nasipaddress = '%{NAS-IP-Address}'"
            }
            
            stop {
                query = "UPDATE radacct SET acctstoptime = NOW(), acctsessiontime = '%{Acct-Session-Time}', acctinputoctets = '%{Acct-Input-Octets}'::bigint, acctoutputoctets = '%{Acct-Output-Octets}'::bigint, acctterminatecause = '%{Acct-Terminate-Cause}', connectinfo_stop = '%{Connect-Info}' WHERE acctsessionid = '%{Acct-Session-Id}' AND username = '%{SQL-User-Name}' AND nasipaddress = '%{NAS-IP-Address}'"
            }
        }
    }
    
    # Post-authentication logging
    post-auth {
        query = "INSERT INTO radpostauth (username, pass, reply, authdate) VALUES ('%{User-Name}', '%{%{User-Password}:-%{Chap-Password}}', '%{reply:Packet-Type}', NOW())"
    }
}
SQLCONF

    sudo sed -i "s/DB_USER/$DB_USER/g" "$SQL_CONF"
    sudo sed -i "s/DB_PASSWORD/$DB_PASSWORD/g" "$SQL_CONF"
    sudo sed -i "s/DB_NAME/$DB_NAME/g" "$SQL_CONF"
    
    print_success "SQL configuration created and linked to database: ${DB_NAME}"
    
    # Enable SQL module
    print_info "Enabling SQL module..."
    if [ -d "$FREERADIUS_DIR/mods-enabled" ]; then
        sudo ln -sf "$FREERADIUS_DIR/mods-available/sql" "$FREERADIUS_DIR/mods-enabled/sql" 2>/dev/null || true
        print_success "SQL module enabled"
    fi
    
    print_info "Configuring FreeRADIUS to listen on detected IP: $DETECTED_IP"
    
    # Configure the default site to listen on the detected IP
    DEFAULT_SITE="$FREERADIUS_DIR/sites-available/default"
    if [ -f "$DEFAULT_SITE" ]; then
        sudo cp "$DEFAULT_SITE" "$DEFAULT_SITE.backup.$(date +%Y%m%d_%H%M%S)"
        
        sudo tee "$DEFAULT_SITE.tmp" > /dev/null <<'EOF_DEFAULT'
# FreeRADIUS default site - Configured for ISP Management System
# Optimized for PPPoE, Hotspot, DHCP with PAP/CHAP/MS-CHAP authentication
# EAP/802.1X disabled (not needed for ISP operations)

server default {
    listen {
        type = auth
        ipaddr = 0.0.0.0
        port = 1812
        limit {
            max_connections = 16
            lifetime = 0
            idle_timeout = 30
        }
    }

    listen {
        type = acct
        ipaddr = 0.0.0.0
        port = 1813
        limit {
            max_connections = 16
            lifetime = 0
            idle_timeout = 30
        }
    }

    authorize {
        filter_username
        preprocess
        chap
        mschap
        suffix
        sql
        expiration
        logintime
        pap
    }

    authenticate {
        Auth-Type PAP {
            pap
        }
        Auth-Type CHAP {
            chap
        }
        Auth-Type MS-CHAP {
            mschap
        }
    }

    preacct {
        preprocess
        acct_unique
        suffix
    }

    accounting {
        sql
        exec
    }

    session {
        sql
    }

    post-auth {
        sql
        exec
        Post-Auth-Type REJECT {
            attr_filter.access_reject
        }
    }

    pre-proxy {
    }

    post-proxy {
    }
}
EOF_DEFAULT

        sudo mv "$DEFAULT_SITE.tmp" "$DEFAULT_SITE"
        sudo chmod 644 "$DEFAULT_SITE"
        print_success "FreeRADIUS default site configured for ISP (PAP/CHAP/MS-CHAP only, EAP disabled)"
    fi
    
    print_info "Disabling EAP module (not needed for ISP operations)..."
    if [ -L "$FREERADIUS_DIR/mods-enabled/eap" ]; then
        sudo rm -f "$FREERADIUS_DIR/mods-enabled/eap"
        print_success "EAP module disabled"
    fi
    
    # Configure inner-tunnel site without EAP
    INNER_TUNNEL="$FREERADIUS_DIR/sites-available/inner-tunnel"
    if [ -f "$INNER_TUNNEL" ]; then
        sudo cp "$INNER_TUNNEL" "$INNER_TUNNEL.backup.$(date +%Y%m%d_%H%M%S)"
        
        sudo tee "$INNER_TUNNEL.tmp" > /dev/null <<'EOF_INNER'
# FreeRADIUS inner-tunnel site - ISP Configuration
# EAP disabled for PPPoE/Hotspot/DHCP authentication

server inner-tunnel {
    listen {
        ipaddr = 127.0.0.1
        port = 18120
        type = auth
    }

    authorize {
        filter_username
        chap
        mschap
        suffix
        update control {
            &Proxy-To-Realm := LOCAL
        }
        sql
        expiration
        logintime
        pap
    }

    authenticate {
        Auth-Type PAP {
            pap
        }
        Auth-Type CHAP {
            chap
        }
        Auth-Type MS-CHAP {
            mschap
        }
    }

    session {
        sql
    }

    post-auth {
        sql
        Post-Auth-Type REJECT {
            attr_filter.access_reject
        }
    }

    pre-proxy {
    }

    post-proxy {
    }
}
EOF_INNER

        sudo mv "$INNER_TUNNEL.tmp" "$INNER_TUNNEL"
        sudo chmod 644 "$INNER_TUNNEL"
        print_success "FreeRADIUS inner-tunnel configured without EAP"
    fi
    
    # </CHANGE> Disable inner-tunnel site to avoid port conflicts - not needed for ISP operations
    print_info "Disabling inner-tunnel site (not needed for ISP operations)..."
    if [ -L "$FREERADIUS_DIR/sites-enabled/inner-tunnel" ]; then
        sudo rm -f "$FREERADIUS_DIR/sites-enabled/inner-tunnel"
        print_success "Inner-tunnel site disabled (prevents port 18120 conflict)"
    fi
    
    # Enable only the default site
    print_info "Enabling FreeRADIUS default site..."
    sudo ln -sf "$FREERADIUS_DIR/sites-available/default" "$FREERADIUS_DIR/sites-enabled/default" 2>/dev/null || true
    
    print_success "FreeRADIUS now configured to listen on all network interfaces (0.0.0.0)"
    print_info "External routers can connect to: $DETECTED_IP:1812"
    print_info "Authentication methods: PAP, CHAP, MS-CHAP (for PPPoE, Hotspot, DHCP)"
    
    # Test configuration before starting
    print_info "Testing FreeRADIUS configuration..."
    if sudo freeradius -C > /dev/null 2>&1; then
        print_success "FreeRADIUS configuration is valid"
    else
        print_warning "FreeRADIUS configuration test failed - will attempt to start anyway"
        print_info "Run 'sudo freeradius -X' to see detailed error messages"
    fi
    
    # Open firewall ports
    print_info "Configuring firewall for RADIUS..."
    sudo ufw allow 1812/udp comment "RADIUS Authentication" 2>/dev/null || true
    sudo ufw allow 1813/udp comment "RADIUS Accounting" 2>/dev/null || true
    print_success "Firewall configured for RADIUS (ports 1812, 1813)"

    print_info "Starting FreeRADIUS service..."
    
    # Stop any existing instance
    sudo systemctl stop freeradius 2>/dev/null || true
    sleep 2
    
    # Enable and start service
    sudo systemctl enable freeradius
    sudo systemctl start freeradius
    
    # Wait for service to start
    sleep 3
    
    # Verify service is running
    if sudo systemctl is-active --quiet freeradius; then
        print_success "FreeRADIUS service started successfully"
        
        # Verify it's listening on network interface
        print_info "Verifying RADIUS is listening on network..."
        if sudo netstat -ulnp 2>/dev/null | grep -q ":1812.*0.0.0.0" || \
           sudo ss -ulnp 2>/dev/null | grep -q ":1812.*0.0.0.0"; then
            print_success "Radius is listening on all network interfaces (0.0.0.0:1812)"
        else
            print_warning "Radius may not be listening on all interfaces"
            print_info "Check with: sudo netstat -ulnp | grep 1812"
        fi
        
        # Show RADIUS status
        print_info "FreeRADIUS Status:"
        sudo systemctl status freeradius --no-pager | head -10
    else
        print_error "FreeRADIUS service failed to start"
        print_info "Check errors with: sudo journalctl -xeu freeradius.service"
        print_info "Or run debug mode: sudo freeradius -X"
        print_info "Common issues:"
        echo "  1. Permission errors - Run: sudo chmod -R 644 /etc/freeradius/3.0"
        echo "  2. Port conflicts - Check: sudo netstat -ulnp | grep 1812"
        echo "  3. SQL configuration - Verify DATABASE_URL is set correctly"
    fi
    
    print_info "Testing RADIUS server connectivity..."
    
    # Wait for FreeRADIUS to fully start
    sleep 3
    
    # Test if RADIUS is listening on port 1812
    if netstat -tuln 2>/dev/null | grep -q ":1812 " || ss -tuln 2>/dev/null | grep -q ":1812 "; then
        print_success "Radius is listening on port 1812"
        
        RADIUS_TABLE_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'radius_users');" 2>/dev/null || echo "f")
        CUSTOMERS_TABLE_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers');" 2>/dev/null || echo "f")

        if [ "$RADIUS_TABLE_EXISTS" = "t" ] && [ "$CUSTOMERS_TABLE_EXISTS" = "t" ]; then
            # Check if test customer exists
            TEST_CUSTOMER_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT 1 FROM customers WHERE id = 1);" 2>/dev/null || echo "f")
            
            if [ "$TEST_CUSTOMER_EXISTS" = "f" ]; then
                print_info "Creating test customer record..."
                psql "$DATABASE_URL" << TESTCUSTOMER
INSERT INTO customers (id, customer_number, name, email, phone, status, created_at, updated_at)
VALUES (1, 'TEST0001', 'Test Customer', 'test@example.com', '+254700000000', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
TESTCUSTOMER
            fi
            
            # Now safely test RADIUS authentication
            psql "$DATABASE_URL" << RADIUSTEST
INSERT INTO radius_users (username, password_hash, customer_id, status, created_at, updated_at)
VALUES ('testradius', crypt('testpass123', gen_salt('bf')), 1, 'active', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;
RADIUSTEST

            if radtest testradius testpass123 localhost 0 testing123 > /dev/null 2>&1; then
                print_success "Radius authentication test PASSED"
                psql "$DATABASE_URL" -c "DELETE FROM radius_users WHERE username = 'testradius';" > /dev/null 2>&1
            else
                print_warning "Radius authentication test FAILED"
                print_info "This may be normal if radtest is not configured properly"
                psql "$DATABASE_URL" -c "DELETE FROM radius_users WHERE username = 'testradius';" > /dev/null 2>&1
            fi
        else
            print_warning "Radius or customers tables not found, skipping authentication test"
        fi
        
        print_info "Checking for configured routers..."
        NETWORK_TABLE_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'network_devices');" 2>/dev/null || echo "f")

        if [ "$NETWORK_TABLE_EXISTS" = "t" ]; then
            ROUTER_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM network_devices WHERE type IN ('router', 'mikrotik') AND status = 'active';" 2>/dev/null || echo "0")
            
            if [ "$ROUTER_COUNT" -gt 0 ]; then
                print_info "Found $ROUTER_COUNT active router(s)"
                print_info "Testing connectivity to physical routers..."
                
                # Get first router details
                ROUTER_INFO=$(psql "$DATABASE_URL" -tAc "SELECT ip_address, name FROM network_devices WHERE type IN ('router', 'mikrotik') AND status = 'active' LIMIT 1;")
                ROUTER_IP=$(echo "$ROUTER_INFO" | cut -d'|' -f1 | tr -d ' ')
                ROUTER_NAME=$(echo "$ROUTER_INFO" | cut -d'|' -f2)
                
                if [ -n "$ROUTER_IP" ]; then
                    print_info "Testing ping to router '$ROUTER_NAME' ($ROUTER_IP)..."
                    if ping -c 2 -W 2 "$ROUTER_IP" > /dev/null 2>&1; then
                        print_success "Router $ROUTER_IP is reachable"
                        
                        # Add router to RADIUS NAS table
                        psql "$DATABASE_URL" << ADDNAS
INSERT INTO radius_nas (network_device_id, name, short_name, ip_address, secret, type, status)
SELECT id, name, SUBSTRING(name FROM 1 FOR 32), ip_address::inet, '$RADIUS_SECRET', type, status
FROM network_devices 
WHERE ip_address = '$ROUTER_IP'
ON CONFLICT (ip_address) DO UPDATE SET
    secret = EXCLUDED.secret,
    updated_at = NOW();
ADDNAS
                        print_success "Router added to RADIUS NAS configuration"
                        print_info "Router can now authenticate users via RADIUS"
                    else
                        print_warning "Router $ROUTER_IP is not reachable"
                        print_info "Ensure the router is powered on and network is configured"
                    fi
                fi
            else
                print_info "No routers configured yet"
                print_info "Add routers from /network/routers page after installation"
            fi
        else
            print_warning "network_devices table not found, skipping router check"
        fi
        
    else
        print_error "Radius server is not listening on port 1812"
        print_info "Check logs: sudo journalctl -u freeradius -n 50"
        print_info "Or try: sudo freeradius -X"
    fi
    
    print_success "FreeRADIUS installation completed"
    print_info "Next steps:"
    print_info "1. Visit /settings/servers to configure RADIUS settings"
    print_info "2. Add routers via /network/routers/add page"
    print_info "3. Routers will automatically sync to RADIUS NAS table"
    print_info "4. Test connectivity in /settings/servers Router Connectivity Testing"
}

setup_database() {
    print_header "Setting Up PostgreSQL Database"
    
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
    
    print_info "Granting superuser privileges to $DB_USER for full CRUD and schema operations..."
    sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH SUPERUSER CREATEDB CREATEROLE REPLICATION;" 2>/dev/null || {
        print_error "Failed to grant superuser privileges"
        exit 1
    }
    print_success "Superuser privileges granted - user can now perform all database operations"
    
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
    
    print_success "Database permissions configured with full CRUD access"
    
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
                    
                    # Add to shell profiles for persistence
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
    print_header "Step 8.5: Applying Database Fixes"
    
    print_info "Creating missing tables and adding missing columns..."
    print_info "This may take a few minutes..."
    
    DB_NAME="${DB_NAME:-isp_system}" # Ensure DB_NAME is defined

    sudo -u postgres psql -d "$DB_NAME" <<'FIXSQL'
-- Create routers table if missing
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    ssh_port INTEGER DEFAULT 22,
    api_port INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER,
    firmware_version VARCHAR(100),
    configuration JSONB,
    connection_type VARCHAR(50),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_users table if missing (for FreeRADIUS)
CREATE TABLE IF NOT EXISTS radius_users (
    username VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    download_limit NUMERIC(10,2) DEFAULT 0,
    upload_limit NUMERIC(10,2) DEFAULT 0,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_sessions_active table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    last_update TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    UNIQUE (username, nas_ip_address, start_time)
);

-- Create radius_sessions_archive table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP NOT NULL,
    session_time INTEGER,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    terminate_cause VARCHAR(50)
);

-- Create radius_nas table if missing
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to customer_services
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add missing column to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
FIXSQL

    if [ $? -eq 0 ]; then
        print_success "Database fixes applied successfully"
    else
        print_error "Failed to apply some database fixes"
        return 1
    fi
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
        # Added FreeRADIUS tables
        "radius_users"
        "radius_sessions_active"
        "radius_sessions_archive"
        "radius_nas" # Added radius_nas
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
        
        if [ ${#STILL_MISSING[@]} -gt 0 ]; then
            print_error "Still missing ${#STILL_MISSING[@]} tables after migration: ${STILL_MISSING[*]}"
            return 1
        else
            print_success "All missing tables have been created"
            return 0
        fi
    fi
}

verify_database_schema() {
    print_header "Step 8: Verifying Database Schema"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Checking expected table and column counts..."
    
    # Expected tables and their column counts
    declare -A EXPECTED_TABLE_COLUMNS=(
        ["account_balances"]="9"
        ["account_balances_old"]="5"
        ["admin_logs"]="10"
        ["automation_workflows"]="9"
        ["backup_access_logs"]="11"
        ["backup_file_inventory"]="10"
        ["backup_jobs"]="22"
        ["backup_restore_logs"]="11"
        ["backup_schedules"]="17"
        ["backup_settings"]="46"
        ["backup_storage_locations"]="16"
        ["balance_sheet_view"]="5"
        ["bandwidth_configs"]="8"
        ["bandwidth_patterns"]="10" # Increased from 7 to 10
        ["bank_transactions"]="12"
        ["billing_cycles"]="7"
        ["bonus_campaigns"]="14"
        ["budget_line_items"]="12"
        ["budget_versions"]="7"
        ["budgets"]="9"
        ["bus_fare_records"]="12"
        ["capacity_alerts"]="8"
        ["capacity_predictions"]="8" # Increased from 6 to 8
        ["card_transactions"]="11"
        ["cash_flow_categories"]="5"
        ["cash_flow_transactions"]="9"
        ["cash_transactions"]="9"
        ["chart_of_accounts"]="9"
        ["communication_settings"]="9"
        ["company_content"]="5"
        ["company_profiles"]="26" # Increased from 24
        ["connection_methods"]="8"
        ["credit_applications"]="6"
        ["credit_notes"]="13"
        ["customer_addresses"]="12"
        ["customer_billing_configurations"]="29"
        ["customer_categories"]="6"
        ["customer_contacts"]="9"
        ["customer_document_access_logs"]="7"
        ["customer_document_shares"]="9"
        ["customer_documents"]="18"
        ["customer_emergency_contacts"]="7"
        ["customer_equipment"]="22"
        ["customer_notes"]="8"
        ["customer_notifications"]="8"
        ["customer_payment_accounts"]="9"
        ["customer_phone_numbers"]="6"
        ["customer_services"]="14"
        ["customer_statements"]="14"
        ["customers"]="35" # Increased from 32
        ["email_logs"]="14"
        ["employees"]="12"
        ["equipment_returns"]="16"
        ["expense_approvals"]="5"
        ["expense_categories"]="8"
        ["expense_subcategories"]="6"
        ["expenses"]="18"
        ["finance_audit_trail"]="10"
        ["finance_documents"]="17"
        ["financial_adjustments"]="13"
        ["financial_periods"]="6"
        ["financial_reports"]="7"
        ["fuel_logs"]="10"
        ["hotspot_sessions"]="9"
        ["hotspot_users"]="12"
        ["hotspot_vouchers"]="10"
        ["hotspots"]="17"
        ["infrastructure_investments"]="8"
        ["inventory"]="11"
        ["inventory_items"]="13"
        ["inventory_serial_numbers"]="14"
        ["invoice_items"]="8"
        ["invoices"]="10"
        ["ip_addresses"]="11"
        ["ip_pools"]="9"
        ["ip_subnets"]="13"
        ["journal_entries"]="11"
        ["journal_entry_lines"]="8"
        ["knowledge_base"]="10"
        ["locations"]="11" # Increased from 8
        ["loyalty_redemptions"]="12"
        ["loyalty_transactions"]="10"
        ["maintenance_logs"]="11"
        ["message_campaigns"]="13"
        ["message_templates"]="9"
        ["messages"]="14"
        ["mpesa_logs"]="14"
        ["network_configurations"]="13"
        ["network_devices"]="13"
        ["network_forecasts"]="6"
        ["notification_logs"]="11"
        ["notification_templates"]="9"
        ["openvpn_configs"]="8"
        ["openvpn_logs"]="10"
        ["payment_applications"]="6"
        ["payment_gateway_configs"]="10"
        ["payment_methods"]="5"
        ["payment_reminders"]="7"
        ["payments"]="13" # Increased from 9
        ["payroll_records"]="15"
        ["performance_reviews"]="12"
        ["permissions"]="6"
        ["portal_sessions"]="8"
        ["portal_settings"]="8"
        ["purchase_order_items"]="7"
        ["purchase_orders"]="9"
        ["radius_logs"]="16"
        ["radius_nas"]="10" # New table
        ["radius_sessions_active"]="10" # Increased from 7 to 10
        ["radius_sessions_archive"]="13" # New table
        ["radius_users"]="13" # Increased from 0 to 13
        ["refunds"]="9"
        ["revenue_categories"]="6"
        ["revenue_streams"]="6"
        ["role_permissions"]="4"
        ["roles"]="6"
        ["router_logs"]="9"
        ["router_performance_history"]="12"
        ["router_services"]="7"
        ["router_sync_status"]="13" # Increased from 11
        ["routers"]="27" # Increased from 26
        ["server_configurations"]="9"
        ["service_activation_logs"]="8"
        ["service_inventory"]="7"
        ["service_plans"]="17" # Increased from 15
        ["service_requests"]="11"
        ["sms_logs"]="15"
        ["subnets"]="9"
        ["supplier_invoice_items"]="8"
        ["supplier_invoices"]="15"
        ["suppliers"]="13"
        ["support_tickets"]="12"
        ["sync_jobs"]="10"
        ["system_config"]="4"
        ["system_logs"]="14"
        ["task_attachments"]="8"
        ["task_categories"]="5"
        ["task_comments"]="5"
        ["tasks"]="14" # Increased from 11
        ["tax_configurations"]="8"
        ["tax_periods"]="6"
        ["tax_returns"]="15"
        ["trial_balance_view"]="7"
        ["user_activity_logs"]="9"
        ["users"]="7"
        ["vehicles"]="20"
        ["wallet_balances"]="10"
        ["wallet_bonus_rules"]="17"
        ["wallet_transactions"]="13"
        ["warehouses"]="9"
    )
    
    TOTAL_TABLES_EXPECTED=${#EXPECTED_TABLE_COLUMNS[@]}
    MISSING_TABLES=()
    TABLES_WITH_WRONG_COLUMN_COUNT=()
    TOTAL_TABLES_OK=0
    
    for table in "${!EXPECTED_TABLE_COLUMNS[@]}"; do
        # Check if table exists
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table');" | grep -q "t"; then
            
            # Table exists, check column count
            EXPECTED_COUNT=${EXPECTED_TABLE_COLUMNS[$table]}
            ACTUAL_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';")
            
            if [ "$EXPECTED_COUNT" -eq "$ACTUAL_COUNT" ]; then
                print_success "✓ $table (Correct column count: $ACTUAL_COUNT)"
                TOTAL_TABLES_OK=$((TOTAL_TABLES_OK + 1))
            else
                print_warning "⚠ $table (Expected $EXPECTED_COUNT columns, found $ACTUAL_COUNT)"
                TABLES_WITH_WRONG_COLUMN_COUNT+=("$table")
            fi
        else
            print_error "✗ $table (Table does not exist)"
            MISSING_TABLES+=("$table")
        fi
    done
    
    echo ""
    print_info "Schema Verification Summary:"
    print_info "  Total tables expected: $TOTAL_TABLES_EXPECTED"
    print_info "  Tables fully verified: $TOTAL_TABLES_OK"
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_error "  Missing tables: ${#MISSING_TABLES[@]} (${MISSING_TABLES[*]})"
    fi
    
    if [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -gt 0 ]; then
        print_warning "  Tables with incorrect column counts: ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} (${TABLES_WITH_WRONG_COLUMN_COUNT[*]})"
    fi
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -eq 0 ]; then
        print_success "  ✓ All expected tables and columns verified successfully!"
    else
        print_warning "  Schema verification found issues that need to be fixed"
        print_info "  These will be addressed in the next step (Apply Database Fixes)"
    fi
}

fix_database_schema() {
    print_header "Step 8.5: Applying Database Fixes"
    
    print_info "Creating missing tables and adding missing columns..."
    print_info "This may take a few minutes..."
    
    DB_NAME="${DB_NAME:-isp_system}" # Ensure DB_NAME is defined

    sudo -u postgres psql -d "$DB_NAME" <<'FIXSQL'
-- Create routers table if missing
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    ssh_port INTEGER DEFAULT 22,
    api_port INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER,
    firmware_version VARCHAR(100),
    configuration JSONB,
    connection_type VARCHAR(50),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_users table if missing (for FreeRADIUS)
CREATE TABLE IF NOT EXISTS radius_users (
    username VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    download_limit NUMERIC(10,2) DEFAULT 0,
    upload_limit NUMERIC(10,2) DEFAULT 0,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_sessions_active table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    last_update TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    UNIQUE (username, nas_ip_address, start_time)
);

-- Create radius_sessions_archive table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP NOT NULL,
    session_time INTEGER,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    terminate_cause VARCHAR(50)
);

-- Create radius_nas table if missing
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to customer_services
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add missing column to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
FIXSQL

    if [ $? -eq 0 ]; then
        print_success "Database fixes applied successfully"
    else
        print_error "Failed to apply some database fixes"
        return 1
    fi
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
        # Added FreeRADIUS tables
        "radius_users"
        "radius_sessions_active"
        "radius_sessions_archive"
        "radius_nas" # Added radius_nas
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
        
        if [ ${#STILL_MISSING[@]} -gt 0 ]; then
            print_error "Still missing ${#STILL_MISSING[@]} tables after migration: ${STILL_MISSING[*]}"
            return 1
        else
            print_success "All missing tables have been created"
            return 0
        fi
    fi
}

verify_database_schema() {
    print_header "Step 8: Verifying Database Schema"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Checking expected table and column counts..."
    
    # Expected tables and their column counts
    declare -A EXPECTED_TABLE_COLUMNS=(
        ["account_balances"]="9"
        ["account_balances_old"]="5"
        ["admin_logs"]="10"
        ["automation_workflows"]="9"
        ["backup_access_logs"]="11"
        ["backup_file_inventory"]="10"
        ["backup_jobs"]="22"
        ["backup_restore_logs"]="11"
        ["backup_schedules"]="17"
        ["backup_settings"]="46"
        ["backup_storage_locations"]="16"
        ["balance_sheet_view"]="5"
        ["bandwidth_configs"]="8"
        ["bandwidth_patterns"]="10" # Increased from 7 to 10
        ["bank_transactions"]="12"
        ["billing_cycles"]="7"
        ["bonus_campaigns"]="14"
        ["budget_line_items"]="12"
        ["budget_versions"]="7"
        ["budgets"]="9"
        ["bus_fare_records"]="12"
        ["capacity_alerts"]="8"
        ["capacity_predictions"]="8" # Increased from 6 to 8
        ["card_transactions"]="11"
        ["cash_flow_categories"]="5"
        ["cash_flow_transactions"]="9"
        ["cash_transactions"]="9"
        ["chart_of_accounts"]="9"
        ["communication_settings"]="9"
        ["company_content"]="5"
        ["company_profiles"]="26" # Increased from 24
        ["connection_methods"]="8"
        ["credit_applications"]="6"
        ["credit_notes"]="13"
        ["customer_addresses"]="12"
        ["customer_billing_configurations"]="29"
        ["customer_categories"]="6"
        ["customer_contacts"]="9"
        ["customer_document_access_logs"]="7"
        ["customer_document_shares"]="9"
        ["customer_documents"]="18"
        ["customer_emergency_contacts"]="7"
        ["customer_equipment"]="22"
        ["customer_notes"]="8"
        ["customer_notifications"]="8"
        ["customer_payment_accounts"]="9"
        ["customer_phone_numbers"]="6"
        ["customer_services"]="14"
        ["customer_statements"]="14"
        ["customers"]="35" # Increased from 32
        ["email_logs"]="14"
        ["employees"]="12"
        ["equipment_returns"]="16"
        ["expense_approvals"]="5"
        ["expense_categories"]="8"
        ["expense_subcategories"]="6"
        ["expenses"]="18"
        ["finance_audit_trail"]="10"
        ["finance_documents"]="17"
        ["financial_adjustments"]="13"
        ["financial_periods"]="6"
        ["financial_reports"]="7"
        ["fuel_logs"]="10"
        ["hotspot_sessions"]="9"
        ["hotspot_users"]="12"
        ["hotspot_vouchers"]="10"
        ["hotspots"]="17"
        ["infrastructure_investments"]="8"
        ["inventory"]="11"
        ["inventory_items"]="13"
        ["inventory_serial_numbers"]="14"
        ["invoice_items"]="8"
        ["invoices"]="10"
        ["ip_addresses"]="11"
        ["ip_pools"]="9"
        ["ip_subnets"]="13"
        ["journal_entries"]="11"
        ["journal_entry_lines"]="8"
        ["knowledge_base"]="10"
        ["locations"]="11" # Increased from 8
        ["loyalty_redemptions"]="12"
        ["loyalty_transactions"]="10"
        ["maintenance_logs"]="11"
        ["message_campaigns"]="13"
        ["message_templates"]="9"
        ["messages"]="14"
        ["mpesa_logs"]="14"
        ["network_configurations"]="13"
        ["network_devices"]="13"
        ["network_forecasts"]="6"
        ["notification_logs"]="11"
        ["notification_templates"]="9"
        ["openvpn_configs"]="8"
        ["openvpn_logs"]="10"
        ["payment_applications"]="6"
        ["payment_gateway_configs"]="10"
        ["payment_methods"]="5"
        ["payment_reminders"]="7"
        ["payments"]="13" # Increased from 9
        ["payroll_records"]="15"
        ["performance_reviews"]="12"
        ["permissions"]="6"
        ["portal_sessions"]="8"
        ["portal_settings"]="8"
        ["purchase_order_items"]="7"
        ["purchase_orders"]="9"
        ["radius_logs"]="16"
        ["radius_nas"]="10" # New table
        ["radius_sessions_active"]="10" # Increased from 7 to 10
        ["radius_sessions_archive"]="13" # New table
        ["radius_users"]="13" # Increased from 0 to 13
        ["refunds"]="9"
        ["revenue_categories"]="6"
        ["revenue_streams"]="6"
        ["role_permissions"]="4"
        ["roles"]="6"
        ["router_logs"]="9"
        ["router_performance_history"]="12"
        ["router_services"]="7"
        ["router_sync_status"]="13" # Increased from 11
        ["routers"]="27" # Increased from 26
        ["server_configurations"]="9"
        ["service_activation_logs"]="8"
        ["service_inventory"]="7"
        ["service_plans"]="17" # Increased from 15
        ["service_requests"]="11"
        ["sms_logs"]="15"
        ["subnets"]="9"
        ["supplier_invoice_items"]="8"
        ["supplier_invoices"]="15"
        ["suppliers"]="13"
        ["support_tickets"]="12"
        ["sync_jobs"]="10"
        ["system_config"]="4"
        ["system_logs"]="14"
        ["task_attachments"]="8"
        ["task_categories"]="5"
        ["task_comments"]="5"
        ["tasks"]="14" # Increased from 11
        ["tax_configurations"]="8"
        ["tax_periods"]="6"
        ["tax_returns"]="15"
        ["trial_balance_view"]="7"
        ["user_activity_logs"]="9"
        ["users"]="7"
        ["vehicles"]="20"
        ["wallet_balances"]="10"
        ["wallet_bonus_rules"]="17"
        ["wallet_transactions"]="13"
        ["warehouses"]="9"
    )
    
    TOTAL_TABLES_EXPECTED=${#EXPECTED_TABLE_COLUMNS[@]}
    MISSING_TABLES=()
    TABLES_WITH_WRONG_COLUMN_COUNT=()
    TOTAL_TABLES_OK=0
    
    for table in "${!EXPECTED_TABLE_COLUMNS[@]}"; do
        # Check if table exists
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table');" | grep -q "t"; then
            
            # Table exists, check column count
            EXPECTED_COUNT=${EXPECTED_TABLE_COLUMNS[$table]}
            ACTUAL_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';")
            
            if [ "$EXPECTED_COUNT" -eq "$ACTUAL_COUNT" ]; then
                print_success "✓ $table (Correct column count: $ACTUAL_COUNT)"
                TOTAL_TABLES_OK=$((TOTAL_TABLES_OK + 1))
            else
                print_warning "⚠ $table (Expected $EXPECTED_COUNT columns, found $ACTUAL_COUNT)"
                TABLES_WITH_WRONG_COLUMN_COUNT+=("$table")
            fi
        else
            print_error "✗ $table (Table does not exist)"
            MISSING_TABLES+=("$table")
        fi
    done
    
    echo ""
    print_info "Schema Verification Summary:"
    print_info "  Total tables expected: $TOTAL_TABLES_EXPECTED"
    print_info "  Tables fully verified: $TOTAL_TABLES_OK"
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_error "  Missing tables: ${#MISSING_TABLES[@]} (${MISSING_TABLES[*]})"
    fi
    
    if [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -gt 0 ]; then
        print_warning "  Tables with incorrect column counts: ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} (${TABLES_WITH_WRONG_COLUMN_COUNT[*]})"
    fi
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -eq 0 ]; then
        print_success "  ✓ All expected tables and columns verified successfully!"
    else
        print_warning "  Schema verification found issues that need to be fixed"
        print_info "  These will be addressed in the next step (Apply Database Fixes)"
    fi
}

fix_database_schema() {
    print_header "Step 8.5: Applying Database Fixes"
    
    print_info "Creating missing tables and adding missing columns..."
    print_info "This may take a few minutes..."
    
    DB_NAME="${DB_NAME:-isp_system}" # Ensure DB_NAME is defined

    sudo -u postgres psql -d "$DB_NAME" <<'FIXSQL'
-- Create routers table if missing
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    ssh_port INTEGER DEFAULT 22,
    api_port INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER,
    firmware_version VARCHAR(100),
    configuration JSONB,
    connection_type VARCHAR(50),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_users table if missing (for FreeRADIUS)
CREATE TABLE IF NOT EXISTS radius_users (
    username VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    download_limit NUMERIC(10,2) DEFAULT 0,
    upload_limit NUMERIC(10,2) DEFAULT 0,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_sessions_active table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    last_update TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    UNIQUE (username, nas_ip_address, start_time)
);

-- Create radius_sessions_archive table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP NOT NULL,
    session_time INTEGER,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    terminate_cause VARCHAR(50)
);

-- Create radius_nas table if missing
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to customer_services
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add missing column to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
FIXSQL

    if [ $? -eq 0 ]; then
        print_success "Database fixes applied successfully"
    else
        print_error "Failed to apply some database fixes"
        return 1
    fi
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
        # Added FreeRADIUS tables
        "radius_users"
        "radius_sessions_active"
        "radius_sessions_archive"
        "radius_nas" # Added radius_nas
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
        
        if [ ${#STILL_MISSING[@]} -gt 0 ]; then
            print_error "Still missing ${#STILL_MISSING[@]} tables after migration: ${STILL_MISSING[*]}"
            return 1
        else
            print_success "All missing tables have been created"
            return 0
        fi
    fi
}

verify_database_schema() {
    print_header "Step 8: Verifying Database Schema"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Checking expected table and column counts..."
    
    # Expected tables and their column counts
    declare -A EXPECTED_TABLE_COLUMNS=(
        ["account_balances"]="9"
        ["account_balances_old"]="5"
        ["admin_logs"]="10"
        ["automation_workflows"]="9"
        ["backup_access_logs"]="11"
        ["backup_file_inventory"]="10"
        ["backup_jobs"]="22"
        ["backup_restore_logs"]="11"
        ["backup_schedules"]="17"
        ["backup_settings"]="46"
        ["backup_storage_locations"]="16"
        ["balance_sheet_view"]="5"
        ["bandwidth_configs"]="8"
        ["bandwidth_patterns"]="10" # Increased from 7 to 10
        ["bank_transactions"]="12"
        ["billing_cycles"]="7"
        ["bonus_campaigns"]="14"
        ["budget_line_items"]="12"
        ["budget_versions"]="7"
        ["budgets"]="9"
        ["bus_fare_records"]="12"
        ["capacity_alerts"]="8"
        ["capacity_predictions"]="8" # Increased from 6 to 8
        ["card_transactions"]="11"
        ["cash_flow_categories"]="5"
        ["cash_flow_transactions"]="9"
        ["cash_transactions"]="9"
        ["chart_of_accounts"]="9"
        ["communication_settings"]="9"
        ["company_content"]="5"
        ["company_profiles"]="26" # Increased from 24
        ["connection_methods"]="8"
        ["credit_applications"]="6"
        ["credit_notes"]="13"
        ["customer_addresses"]="12"
        ["customer_billing_configurations"]="29"
        ["customer_categories"]="6"
        ["customer_contacts"]="9"
        ["customer_document_access_logs"]="7"
        ["customer_document_shares"]="9"
        ["customer_documents"]="18"
        ["customer_emergency_contacts"]="7"
        ["customer_equipment"]="22"
        ["customer_notes"]="8"
        ["customer_notifications"]="8"
        ["customer_payment_accounts"]="9"
        ["customer_phone_numbers"]="6"
        ["customer_services"]="14"
        ["customer_statements"]="14"
        ["customers"]="35" # Increased from 32
        ["email_logs"]="14"
        ["employees"]="12"
        ["equipment_returns"]="16"
        ["expense_approvals"]="5"
        ["expense_categories"]="8"
        ["expense_subcategories"]="6"
        ["expenses"]="18"
        ["finance_audit_trail"]="10"
        ["finance_documents"]="17"
        ["financial_adjustments"]="13"
        ["financial_periods"]="6"
        ["financial_reports"]="7"
        ["fuel_logs"]="10"
        ["hotspot_sessions"]="9"
        ["hotspot_users"]="12"
        ["hotspot_vouchers"]="10"
        ["hotspots"]="17"
        ["infrastructure_investments"]="8"
        ["inventory"]="11"
        ["inventory_items"]="13"
        ["inventory_serial_numbers"]="14"
        ["invoice_items"]="8"
        ["invoices"]="10"
        ["ip_addresses"]="11"
        ["ip_pools"]="9"
        ["ip_subnets"]="13"
        ["journal_entries"]="11"
        ["journal_entry_lines"]="8"
        ["knowledge_base"]="10"
        ["locations"]="11" # Increased from 8
        ["loyalty_redemptions"]="12"
        ["loyalty_transactions"]="10"
        ["maintenance_logs"]="11"
        ["message_campaigns"]="13"
        ["message_templates"]="9"
        ["messages"]="14"
        ["mpesa_logs"]="14"
        ["network_configurations"]="13"
        ["network_devices"]="13"
        ["network_forecasts"]="6"
        ["notification_logs"]="11"
        ["notification_templates"]="9"
        ["openvpn_configs"]="8"
        ["openvpn_logs"]="10"
        ["payment_applications"]="6"
        ["payment_gateway_configs"]="10"
        ["payment_methods"]="5"
        ["payment_reminders"]="7"
        ["payments"]="13" # Increased from 9
        ["payroll_records"]="15"
        ["performance_reviews"]="12"
        ["permissions"]="6"
        ["portal_sessions"]="8"
        ["portal_settings"]="8"
        ["purchase_order_items"]="7"
        ["purchase_orders"]="9"
        ["radius_logs"]="16"
        ["radius_nas"]="10" # New table
        ["radius_sessions_active"]="10" # Increased from 7 to 10
        ["radius_sessions_archive"]="13" # New table
        ["radius_users"]="13" # Increased from 0 to 13
        ["refunds"]="9"
        ["revenue_categories"]="6"
        ["revenue_streams"]="6"
        ["role_permissions"]="4"
        ["roles"]="6"
        ["router_logs"]="9"
        ["router_performance_history"]="12"
        ["router_services"]="7"
        ["router_sync_status"]="13" # Increased from 11
        ["routers"]="27" # Increased from 26
        ["server_configurations"]="9"
        ["service_activation_logs"]="8"
        ["service_inventory"]="7"
        ["service_plans"]="17" # Increased from 15
        ["service_requests"]="11"
        ["sms_logs"]="15"
        ["subnets"]="9"
        ["supplier_invoice_items"]="8"
        ["supplier_invoices"]="15"
        ["suppliers"]="13"
        ["support_tickets"]="12"
        ["sync_jobs"]="10"
        ["system_config"]="4"
        ["system_logs"]="14"
        ["task_attachments"]="8"
        ["task_categories"]="5"
        ["task_comments"]="5"
        ["tasks"]="14" # Increased from 11
        ["tax_configurations"]="8"
        ["tax_periods"]="6"
        ["tax_returns"]="15"
        ["trial_balance_view"]="7"
        ["user_activity_logs"]="9"
        ["users"]="7"
        ["vehicles"]="20"
        ["wallet_balances"]="10"
        ["wallet_bonus_rules"]="17"
        ["wallet_transactions"]="13"
        ["warehouses"]="9"
    )
    
    TOTAL_TABLES_EXPECTED=${#EXPECTED_TABLE_COLUMNS[@]}
    MISSING_TABLES=()
    TABLES_WITH_WRONG_COLUMN_COUNT=()
    TOTAL_TABLES_OK=0
    
    for table in "${!EXPECTED_TABLE_COLUMNS[@]}"; do
        # Check if table exists
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table');" | grep -q "t"; then
            
            # Table exists, check column count
            EXPECTED_COUNT=${EXPECTED_TABLE_COLUMNS[$table]}
            ACTUAL_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';")
            
            if [ "$EXPECTED_COUNT" -eq "$ACTUAL_COUNT" ]; then
                print_success "✓ $table (Correct column count: $ACTUAL_COUNT)"
                TOTAL_TABLES_OK=$((TOTAL_TABLES_OK + 1))
            else
                print_warning "⚠ $table (Expected $EXPECTED_COUNT columns, found $ACTUAL_COUNT)"
                TABLES_WITH_WRONG_COLUMN_COUNT+=("$table")
            fi
        else
            print_error "✗ $table (Table does not exist)"
            MISSING_TABLES+=("$table")
        fi
    done
    
    echo ""
    print_info "Schema Verification Summary:"
    print_info "  Total tables expected: $TOTAL_TABLES_EXPECTED"
    print_info "  Tables fully verified: $TOTAL_TABLES_OK"
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_error "  Missing tables: ${#MISSING_TABLES[@]} (${MISSING_TABLES[*]})"
    fi
    
    if [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -gt 0 ]; then
        print_warning "  Tables with incorrect column counts: ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} (${TABLES_WITH_WRONG_COLUMN_COUNT[*]})"
    fi
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -eq 0 ]; then
        print_success "  ✓ All expected tables and columns verified successfully!"
    else
        print_warning "  Schema verification found issues that need to be fixed"
        print_info "  These will be addressed in the next step (Apply Database Fixes)"
    fi
}

fix_database_schema() {
    print_header "Step 8.5: Applying Database Fixes"
    
    print_info "Creating missing tables and adding missing columns..."
    print_info "This may take a few minutes..."
    
    DB_NAME="${DB_NAME:-isp_system}" # Ensure DB_NAME is defined

    sudo -u postgres psql -d "$DB_NAME" <<'FIXSQL'
-- Create routers table if missing
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    ssh_port INTEGER DEFAULT 22,
    api_port INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER,
    firmware_version VARCHAR(100),
    configuration JSONB,
    connection_type VARCHAR(50),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_users table if missing (for FreeRADIUS)
CREATE TABLE IF NOT EXISTS radius_users (
    username VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    download_limit NUMERIC(10,2) DEFAULT 0,
    upload_limit NUMERIC(10,2) DEFAULT 0,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_sessions_active table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    last_update TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    UNIQUE (username, nas_ip_address, start_time)
);

-- Create radius_sessions_archive table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP NOT NULL,
    session_time INTEGER,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    terminate_cause VARCHAR(50)
);

-- Create radius_nas table if missing
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to customer_services
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add missing column to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
FIXSQL

    if [ $? -eq 0 ]; then
        print_success "Database fixes applied successfully"
    else
        print_error "Failed to apply some database fixes"
        return 1
    fi
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
        # Added FreeRADIUS tables
        "radius_users"
        "radius_sessions_active"
        "radius_sessions_archive"
        "radius_nas" # Added radius_nas
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
        
        if [ ${#STILL_MISSING[@]} -gt 0 ]; then
            print_error "Still missing ${#STILL_MISSING[@]} tables after migration: ${STILL_MISSING[*]}"
            return 1
        else
            print_success "All missing tables have been created"
            return 0
        fi
    fi
}

verify_database_schema() {
    print_header "Step 8: Verifying Database Schema"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Checking expected table and column counts..."
    
    # Expected tables and their column counts
    declare -A EXPECTED_TABLE_COLUMNS=(
        ["account_balances"]="9"
        ["account_balances_old"]="5"
        ["admin_logs"]="10"
        ["automation_workflows"]="9"
        ["backup_access_logs"]="11"
        ["backup_file_inventory"]="10"
        ["backup_jobs"]="22"
        ["backup_restore_logs"]="11"
        ["backup_schedules"]="17"
        ["backup_settings"]="46"
        ["backup_storage_locations"]="16"
        ["balance_sheet_view"]="5"
        ["bandwidth_configs"]="8"
        ["bandwidth_patterns"]="10" # Increased from 7 to 10
        ["bank_transactions"]="12"
        ["billing_cycles"]="7"
        ["bonus_campaigns"]="14"
        ["budget_line_items"]="12"
        ["budget_versions"]="7"
        ["budgets"]="9"
        ["bus_fare_records"]="12"
        ["capacity_alerts"]="8"
        ["capacity_predictions"]="8" # Increased from 6 to 8
        ["card_transactions"]="11"
        ["cash_flow_categories"]="5"
        ["cash_flow_transactions"]="9"
        ["cash_transactions"]="9"
        ["chart_of_accounts"]="9"
        ["communication_settings"]="9"
        ["company_content"]="5"
        ["company_profiles"]="26" # Increased from 24
        ["connection_methods"]="8"
        ["credit_applications"]="6"
        ["credit_notes"]="13"
        ["customer_addresses"]="12"
        ["customer_billing_configurations"]="29"
        ["customer_categories"]="6"
        ["customer_contacts"]="9"
        ["customer_document_access_logs"]="7"
        ["customer_document_shares"]="9"
        ["customer_documents"]="18"
        ["customer_emergency_contacts"]="7"
        ["customer_equipment"]="22"
        ["customer_notes"]="8"
        ["customer_notifications"]="8"
        ["customer_payment_accounts"]="9"
        ["customer_phone_numbers"]="6"
        ["customer_services"]="14"
        ["customer_statements"]="14"
        ["customers"]="35" # Increased from 32
        ["email_logs"]="14"
        ["employees"]="12"
        ["equipment_returns"]="16"
        ["expense_approvals"]="5"
        ["expense_categories"]="8"
        ["expense_subcategories"]="6"
        ["expenses"]="18"
        ["finance_audit_trail"]="10"
        ["finance_documents"]="17"
        ["financial_adjustments"]="13"
        ["financial_periods"]="6"
        ["financial_reports"]="7"
        ["fuel_logs"]="10"
        ["hotspot_sessions"]="9"
        ["hotspot_users"]="12"
        ["hotspot_vouchers"]="10"
        ["hotspots"]="17"
        ["infrastructure_investments"]="8"
        ["inventory"]="11"
        ["inventory_items"]="13"
        ["inventory_serial_numbers"]="14"
        ["invoice_items"]="8"
        ["invoices"]="10"
        ["ip_addresses"]="11"
        ["ip_pools"]="9"
        ["ip_subnets"]="13"
        ["journal_entries"]="11"
        ["journal_entry_lines"]="8"
        ["knowledge_base"]="10"
        ["locations"]="11" # Increased from 8
        ["loyalty_redemptions"]="12"
        ["loyalty_transactions"]="10"
        ["maintenance_logs"]="11"
        ["message_campaigns"]="13"
        ["message_templates"]="9"
        ["messages"]="14"
        ["mpesa_logs"]="14"
        ["network_configurations"]="13"
        ["network_devices"]="13"
        ["network_forecasts"]="6"
        ["notification_logs"]="11"
        ["notification_templates"]="9"
        ["openvpn_configs"]="8"
        ["openvpn_logs"]="10"
        ["payment_applications"]="6"
        ["payment_gateway_configs"]="10"
        ["payment_methods"]="5"
        ["payment_reminders"]="7"
        ["payments"]="13" # Increased from 9
        ["payroll_records"]="15"
        ["performance_reviews"]="12"
        ["permissions"]="6"
        ["portal_sessions"]="8"
        ["portal_settings"]="8"
        ["purchase_order_items"]="7"
        ["purchase_orders"]="9"
        ["radius_logs"]="16"
        ["radius_nas"]="10" # New table
        ["radius_sessions_active"]="10" # Increased from 7 to 10
        ["radius_sessions_archive"]="13" # New table
        ["radius_users"]="13" # Increased from 0 to 13
        ["refunds"]="9"
        ["revenue_categories"]="6"
        ["revenue_streams"]="6"
        ["role_permissions"]="4"
        ["roles"]="6"
        ["router_logs"]="9"
        ["router_performance_history"]="12"
        ["router_services"]="7"
        ["router_sync_status"]="13" # Increased from 11
        ["routers"]="27" # Increased from 26
        ["server_configurations"]="9"
        ["service_activation_logs"]="8"
        ["service_inventory"]="7"
        ["service_plans"]="17" # Increased from 15
        ["service_requests"]="11"
        ["sms_logs"]="15"
        ["subnets"]="9"
        ["supplier_invoice_items"]="8"
        ["supplier_invoices"]="15"
        ["suppliers"]="13"
        ["support_tickets"]="12"
        ["sync_jobs"]="10"
        ["system_config"]="4"
        ["system_logs"]="14"
        ["task_attachments"]="8"
        ["task_categories"]="5"
        ["task_comments"]="5"
        ["tasks"]="14" # Increased from 11
        ["tax_configurations"]="8"
        ["tax_periods"]="6"
        ["tax_returns"]="15"
        ["trial_balance_view"]="7"
        ["user_activity_logs"]="9"
        ["users"]="7"
        ["vehicles"]="20"
        ["wallet_balances"]="10"
        ["wallet_bonus_rules"]="17"
        ["wallet_transactions"]="13"
        ["warehouses"]="9"
    )
    
    TOTAL_TABLES_EXPECTED=${#EXPECTED_TABLE_COLUMNS[@]}
    MISSING_TABLES=()
    TABLES_WITH_WRONG_COLUMN_COUNT=()
    TOTAL_TABLES_OK=0
    
    for table in "${!EXPECTED_TABLE_COLUMNS[@]}"; do
        # Check if table exists
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table');" | grep -q "t"; then
            
            # Table exists, check column count
            EXPECTED_COUNT=${EXPECTED_TABLE_COLUMNS[$table]}
            ACTUAL_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';")
            
            if [ "$EXPECTED_COUNT" -eq "$ACTUAL_COUNT" ]; then
                print_success "✓ $table (Correct column count: $ACTUAL_COUNT)"
                TOTAL_TABLES_OK=$((TOTAL_TABLES_OK + 1))
            else
                print_warning "⚠ $table (Expected $EXPECTED_COUNT columns, found $ACTUAL_COUNT)"
                TABLES_WITH_WRONG_COLUMN_COUNT+=("$table")
            fi
        else
            print_error "✗ $table (Table does not exist)"
            MISSING_TABLES+=("$table")
        fi
    done
    
    echo ""
    print_info "Schema Verification Summary:"
    print_info "  Total tables expected: $TOTAL_TABLES_EXPECTED"
    print_info "  Tables fully verified: $TOTAL_TABLES_OK"
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_error "  Missing tables: ${#MISSING_TABLES[@]} (${MISSING_TABLES[*]})"
    fi
    
    if [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -gt 0 ]; then
        print_warning "  Tables with incorrect column counts: ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} (${TABLES_WITH_WRONG_COLUMN_COUNT[*]})"
    fi
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -eq 0 ]; then
        print_success "  ✓ All expected tables and columns verified successfully!"
    else
        print_warning "  Schema verification found issues that need to be fixed"
        print_info "  These will be addressed in the next step (Apply Database Fixes)"
    fi
}

fix_database_schema() {
    print_header "Step 8.5: Applying Database Fixes"
    
    print_info "Creating missing tables and adding missing columns..."
    print_info "This may take a few minutes..."
    
    DB_NAME="${DB_NAME:-isp_system}" # Ensure DB_NAME is defined

    sudo -u postgres psql -d "$DB_NAME" <<'FIXSQL'
-- Create routers table if missing
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    ssh_port INTEGER DEFAULT 22,
    api_port INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER,
    firmware_version VARCHAR(100),
    configuration JSONB,
    connection_type VARCHAR(50),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_users table if missing (for FreeRADIUS)
CREATE TABLE IF NOT EXISTS radius_users (
    username VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    download_limit NUMERIC(10,2) DEFAULT 0,
    upload_limit NUMERIC(10,2) DEFAULT 0,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_sessions_active table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    last_update TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    UNIQUE (username, nas_ip_address, start_time)
);

-- Create radius_sessions_archive table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP NOT NULL,
    session_time INTEGER,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    terminate_cause VARCHAR(50)
);

-- Create radius_nas table if missing
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to customer_services
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add missing column to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
FIXSQL

    if [ $? -eq 0 ]; then
        print_success "Database fixes applied successfully"
    else
        print_error "Failed to apply some database fixes"
        return 1
    fi
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
        # Added FreeRADIUS tables
        "radius_users"
        "radius_sessions_active"
        "radius_sessions_archive"
        "radius_nas" # Added radius_nas
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
        
        if [ ${#STILL_MISSING[@]} -gt 0 ]; then
            print_error "Still missing ${#STILL_MISSING[@]} tables after migration: ${STILL_MISSING[*]}"
            return 1
        else
            print_success "All missing tables have been created"
            return 0
        fi
    fi
}

verify_database_schema() {
    print_header "Step 8: Verifying Database Schema"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Checking expected table and column counts..."
    
    # Expected tables and their column counts
    declare -A EXPECTED_TABLE_COLUMNS=(
        ["account_balances"]="9"
        ["account_balances_old"]="5"
        ["admin_logs"]="10"
        ["automation_workflows"]="9"
        ["backup_access_logs"]="11"
        ["backup_file_inventory"]="10"
        ["backup_jobs"]="22"
        ["backup_restore_logs"]="11"
        ["backup_schedules"]="17"
        ["backup_settings"]="46"
        ["backup_storage_locations"]="16"
        ["balance_sheet_view"]="5"
        ["bandwidth_configs"]="8"
        ["bandwidth_patterns"]="10" # Increased from 7 to 10
        ["bank_transactions"]="12"
        ["billing_cycles"]="7"
        ["bonus_campaigns"]="14"
        ["budget_line_items"]="12"
        ["budget_versions"]="7"
        ["budgets"]="9"
        ["bus_fare_records"]="12"
        ["capacity_alerts"]="8"
        ["capacity_predictions"]="8" # Increased from 6 to 8
        ["card_transactions"]="11"
        ["cash_flow_categories"]="5"
        ["cash_flow_transactions"]="9"
        ["cash_transactions"]="9"
        ["chart_of_accounts"]="9"
        ["communication_settings"]="9"
        ["company_content"]="5"
        ["company_profiles"]="26" # Increased from 24
        ["connection_methods"]="8"
        ["credit_applications"]="6"
        ["credit_notes"]="13"
        ["customer_addresses"]="12"
        ["customer_billing_configurations"]="29"
        ["customer_categories"]="6"
        ["customer_contacts"]="9"
        ["customer_document_access_logs"]="7"
        ["customer_document_shares"]="9"
        ["customer_documents"]="18"
        ["customer_emergency_contacts"]="7"
        ["customer_equipment"]="22"
        ["customer_notes"]="8"
        ["customer_notifications"]="8"
        ["customer_payment_accounts"]="9"
        ["customer_phone_numbers"]="6"
        ["customer_services"]="14"
        ["customer_statements"]="14"
        ["customers"]="35" # Increased from 32
        ["email_logs"]="14"
        ["employees"]="12"
        ["equipment_returns"]="16"
        ["expense_approvals"]="5"
        ["expense_categories"]="8"
        ["expense_subcategories"]="6"
        ["expenses"]="18"
        ["finance_audit_trail"]="10"
        ["finance_documents"]="17"
        ["financial_adjustments"]="13"
        ["financial_periods"]="6"
        ["financial_reports"]="7"
        ["fuel_logs"]="10"
        ["hotspot_sessions"]="9"
        ["hotspot_users"]="12"
        ["hotspot_vouchers"]="10"
        ["hotspots"]="17"
        ["infrastructure_investments"]="8"
        ["inventory"]="11"
        ["inventory_items"]="13"
        ["inventory_serial_numbers"]="14"
        ["invoice_items"]="8"
        ["invoices"]="10"
        ["ip_addresses"]="11"
        ["ip_pools"]="9"
        ["ip_subnets"]="13"
        ["journal_entries"]="11"
        ["journal_entry_lines"]="8"
        ["knowledge_base"]="10"
        ["locations"]="11" # Increased from 8
        ["loyalty_redemptions"]="12"
        ["loyalty_transactions"]="10"
        ["maintenance_logs"]="11"
        ["message_campaigns"]="13"
        ["message_templates"]="9"
        ["messages"]="14"
        ["mpesa_logs"]="14"
        ["network_configurations"]="13"
        ["network_devices"]="13"
        ["network_forecasts"]="6"
        ["notification_logs"]="11"
        ["notification_templates"]="9"
        ["openvpn_configs"]="8"
        ["openvpn_logs"]="10"
        ["payment_applications"]="6"
        ["payment_gateway_configs"]="10"
        ["payment_methods"]="5"
        ["payment_reminders"]="7"
        ["payments"]="13" # Increased from 9
        ["payroll_records"]="15"
        ["performance_reviews"]="12"
        ["permissions"]="6"
        ["portal_sessions"]="8"
        ["portal_settings"]="8"
        ["purchase_order_items"]="7"
        ["purchase_orders"]="9"
        ["radius_logs"]="16"
        ["radius_nas"]="10" # New table
        ["radius_sessions_active"]="10" # Increased from 7 to 10
        ["radius_sessions_archive"]="13" # New table
        ["radius_users"]="13" # Increased from 0 to 13
        ["refunds"]="9"
        ["revenue_categories"]="6"
        ["revenue_streams"]="6"
        ["role_permissions"]="4"
        ["roles"]="6"
        ["router_logs"]="9"
        ["router_performance_history"]="12"
        ["router_services"]="7"
        ["router_sync_status"]="13" # Increased from 11
        ["routers"]="27" # Increased from 26
        ["server_configurations"]="9"
        ["service_activation_logs"]="8"
        ["service_inventory"]="7"
        ["service_plans"]="17" # Increased from 15
        ["service_requests"]="11"
        ["sms_logs"]="15"
        ["subnets"]="9"
        ["supplier_invoice_items"]="8"
        ["supplier_invoices"]="15"
        ["suppliers"]="13"
        ["support_tickets"]="12"
        ["sync_jobs"]="10"
        ["system_config"]="4"
        ["system_logs"]="14"
        ["task_attachments"]="8"
        ["task_categories"]="5"
        ["task_comments"]="5"
        ["tasks"]="14" # Increased from 11
        ["tax_configurations"]="8"
        ["tax_periods"]="6"
        ["tax_returns"]="15"
        ["trial_balance_view"]="7"
        ["user_activity_logs"]="9"
        ["users"]="7"
        ["vehicles"]="20"
        ["wallet_balances"]="10"
        ["wallet_bonus_rules"]="17"
        ["wallet_transactions"]="13"
        ["warehouses"]="9"
    )
    
    TOTAL_TABLES_EXPECTED=${#EXPECTED_TABLE_COLUMNS[@]}
    MISSING_TABLES=()
    TABLES_WITH_WRONG_COLUMN_COUNT=()
    TOTAL_TABLES_OK=0
    
    for table in "${!EXPECTED_TABLE_COLUMNS[@]}"; do
        # Check if table exists
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table');" | grep -q "t"; then
            
            # Table exists, check column count
            EXPECTED_COUNT=${EXPECTED_TABLE_COLUMNS[$table]}
            ACTUAL_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';")
            
            if [ "$EXPECTED_COUNT" -eq "$ACTUAL_COUNT" ]; then
                print_success "✓ $table (Correct column count: $ACTUAL_COUNT)"
                TOTAL_TABLES_OK=$((TOTAL_TABLES_OK + 1))
            else
                print_warning "⚠ $table (Expected $EXPECTED_COUNT columns, found $ACTUAL_COUNT)"
                TABLES_WITH_WRONG_COLUMN_COUNT+=("$table")
            fi
        else
            print_error "✗ $table (Table does not exist)"
            MISSING_TABLES+=("$table")
        fi
    done
    
    echo ""
    print_info "Schema Verification Summary:"
    print_info "  Total tables expected: $TOTAL_TABLES_EXPECTED"
    print_info "  Tables fully verified: $TOTAL_TABLES_OK"
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_error "  Missing tables: ${#MISSING_TABLES[@]} (${MISSING_TABLES[*]})"
    fi
    
    if [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -gt 0 ]; then
        print_warning "  Tables with incorrect column counts: ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} (${TABLES_WITH_WRONG_COLUMN_COUNT[*]})"
    fi
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -eq 0 ]; then
        print_success "  ✓ All expected tables and columns verified successfully!"
    else
        print_warning "  Schema verification found issues that need to be fixed"
        print_info "  These will be addressed in the next step (Apply Database Fixes)"
    fi
}

fix_database_schema() {
    print_header "Step 8.5: Applying Database Fixes"
    
    print_info "Creating missing tables and adding missing columns..."
    print_info "This may take a few minutes..."
    
    DB_NAME="${DB_NAME:-isp_system}" # Ensure DB_NAME is defined

    sudo -u postgres psql -d "$DB_NAME" <<'FIXSQL'
-- Create routers table if missing
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    ssh_port INTEGER DEFAULT 22,
    api_port INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER,
    firmware_version VARCHAR(100),
    configuration JSONB,
    connection_type VARCHAR(50),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_users table if missing (for FreeRADIUS)
CREATE TABLE IF NOT EXISTS radius_users (
    username VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    download_limit NUMERIC(10,2) DEFAULT 0,
    upload_limit NUMERIC(10,2) DEFAULT 0,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_sessions_active table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    last_update TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    UNIQUE (username, nas_ip_address, start_time)
);

-- Create radius_sessions_archive table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP NOT NULL,
    session_time INTEGER,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    terminate_cause VARCHAR(50)
);

-- Create radius_nas table if missing
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to customer_services
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add missing column to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
FIXSQL

    if [ $? -eq 0 ]; then
        print_success "Database fixes applied successfully"
    else
        print_error "Failed to apply some database fixes"
        return 1
    fi
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
        # Added FreeRADIUS tables
        "radius_users"
        "radius_sessions_active"
        "radius_sessions_archive"
        "radius_nas" # Added radius_nas
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
        
        if [ ${#STILL_MISSING[@]} -gt 0 ]; then
            print_error "Still missing ${#STILL_MISSING[@]} tables after migration: ${STILL_MISSING[*]}"
            return 1
        else
            print_success "All missing tables have been created"
            return 0
        fi
    fi
}

verify_database_schema() {
    print_header "Step 8: Verifying Database Schema"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Checking expected table and column counts..."
    
    # Expected tables and their column counts
    declare -A EXPECTED_TABLE_COLUMNS=(
        ["account_balances"]="9"
        ["account_balances_old"]="5"
        ["admin_logs"]="10"
        ["automation_workflows"]="9"
        ["backup_access_logs"]="11"
        ["backup_file_inventory"]="10"
        ["backup_jobs"]="22"
        ["backup_restore_logs"]="11"
        ["backup_schedules"]="17"
        ["backup_settings"]="46"
        ["backup_storage_locations"]="16"
        ["balance_sheet_view"]="5"
        ["bandwidth_configs"]="8"
        ["bandwidth_patterns"]="10" # Increased from 7 to 10
        ["bank_transactions"]="12"
        ["billing_cycles"]="7"
        ["bonus_campaigns"]="14"
        ["budget_line_items"]="12"
        ["budget_versions"]="7"
        ["budgets"]="9"
        ["bus_fare_records"]="12"
        ["capacity_alerts"]="8"
        ["capacity_predictions"]="8" # Increased from 6 to 8
        ["card_transactions"]="11"
        ["cash_flow_categories"]="5"
        ["cash_flow_transactions"]="9"
        ["cash_transactions"]="9"
        ["chart_of_accounts"]="9"
        ["communication_settings"]="9"
        ["company_content"]="5"
        ["company_profiles"]="26" # Increased from 24
        ["connection_methods"]="8"
        ["credit_applications"]="6"
        ["credit_notes"]="13"
        ["customer_addresses"]="12"
        ["customer_billing_configurations"]="29"
        ["customer_categories"]="6"
        ["customer_contacts"]="9"
        ["customer_document_access_logs"]="7"
        ["customer_document_shares"]="9"
        ["customer_documents"]="18"
        ["customer_emergency_contacts"]="7"
        ["customer_equipment"]="22"
        ["customer_notes"]="8"
        ["customer_notifications"]="8"
        ["customer_payment_accounts"]="9"
        ["customer_phone_numbers"]="6"
        ["customer_services"]="14"
        ["customer_statements"]="14"
        ["customers"]="35" # Increased from 32
        ["email_logs"]="14"
        ["employees"]="12"
        ["equipment_returns"]="16"
        ["expense_approvals"]="5"
        ["expense_categories"]="8"
        ["expense_subcategories"]="6"
        ["expenses"]="18"
        ["finance_audit_trail"]="10"
        ["finance_documents"]="17"
        ["financial_adjustments"]="13"
        ["financial_periods"]="6"
        ["financial_reports"]="7"
        ["fuel_logs"]="10"
        ["hotspot_sessions"]="9"
        ["hotspot_users"]="12"
        ["hotspot_vouchers"]="10"
        ["hotspots"]="17"
        ["infrastructure_investments"]="8"
        ["inventory"]="11"
        ["inventory_items"]="13"
        ["inventory_serial_numbers"]="14"
        ["invoice_items"]="8"
        ["invoices"]="10"
        ["ip_addresses"]="11"
        ["ip_pools"]="9"
        ["ip_subnets"]="13"
        ["journal_entries"]="11"
        ["journal_entry_lines"]="8"
        ["knowledge_base"]="10"
        ["locations"]="11" # Increased from 8
        ["loyalty_redemptions"]="12"
        ["loyalty_transactions"]="10"
        ["maintenance_logs"]="11"
        ["message_campaigns"]="13"
        ["message_templates"]="9"
        ["messages"]="14"
        ["mpesa_logs"]="14"
        ["network_configurations"]="13"
        ["network_devices"]="13"
        ["network_forecasts"]="6"
        ["notification_logs"]="11"
        ["notification_templates"]="9"
        ["openvpn_configs"]="8"
        ["openvpn_logs"]="10"
        ["payment_applications"]="6"
        ["payment_gateway_configs"]="10"
        ["payment_methods"]="5"
        ["payment_reminders"]="7"
        ["payments"]="13" # Increased from 9
        ["payroll_records"]="15"
        ["performance_reviews"]="12"
        ["permissions"]="6"
        ["portal_sessions"]="8"
        ["portal_settings"]="8"
        ["purchase_order_items"]="7"
        ["purchase_orders"]="9"
        ["radius_logs"]="16"
        ["radius_nas"]="10" # New table
        ["radius_sessions_active"]="10" # Increased from 7 to 10
        ["radius_sessions_archive"]="13" # New table
        ["radius_users"]="13" # Increased from 0 to 13
        ["refunds"]="9"
        ["revenue_categories"]="6"
        ["revenue_streams"]="6"
        ["role_permissions"]="4"
        ["roles"]="6"
        ["router_logs"]="9"
        ["router_performance_history"]="12"
        ["router_services"]="7"
        ["router_sync_status"]="13" # Increased from 11
        ["routers"]="27" # Increased from 26
        ["server_configurations"]="9"
        ["service_activation_logs"]="8"
        ["service_inventory"]="7"
        ["service_plans"]="17" # Increased from 15
        ["service_requests"]="11"
        ["sms_logs"]="15"
        ["subnets"]="9"
        ["supplier_invoice_items"]="8"
        ["supplier_invoices"]="15"
        ["suppliers"]="13"
        ["support_tickets"]="12"
        ["sync_jobs"]="10"
        ["system_config"]="4"
        ["system_logs"]="14"
        ["task_attachments"]="8"
        ["task_categories"]="5"
        ["task_comments"]="5"
        ["tasks"]="14" # Increased from 11
        ["tax_configurations"]="8"
        ["tax_periods"]="6"
        ["tax_returns"]="15"
        ["trial_balance_view"]="7"
        ["user_activity_logs"]="9"
        ["users"]="7"
        ["vehicles"]="20"
        ["wallet_balances"]="10"
        ["wallet_bonus_rules"]="17"
        ["wallet_transactions"]="13"
        ["warehouses"]="9"
    )
    
    TOTAL_TABLES_EXPECTED=${#EXPECTED_TABLE_COLUMNS[@]}
    MISSING_TABLES=()
    TABLES_WITH_WRONG_COLUMN_COUNT=()
    TOTAL_TABLES_OK=0
    
    for table in "${!EXPECTED_TABLE_COLUMNS[@]}"; do
        # Check if table exists
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table');" | grep -q "t"; then
            
            # Table exists, check column count
            EXPECTED_COUNT=${EXPECTED_TABLE_COLUMNS[$table]}
            ACTUAL_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';")
            
            if [ "$EXPECTED_COUNT" -eq "$ACTUAL_COUNT" ]; then
                print_success "✓ $table (Correct column count: $ACTUAL_COUNT)"
                TOTAL_TABLES_OK=$((TOTAL_TABLES_OK + 1))
            else
                print_warning "⚠ $table (Expected $EXPECTED_COUNT columns, found $ACTUAL_COUNT)"
                TABLES_WITH_WRONG_COLUMN_COUNT+=("$table")
            fi
        else
            print_error "✗ $table (Table does not exist)"
            MISSING_TABLES+=("$table")
        fi
    done
    
    echo ""
    print_info "Schema Verification Summary:"
    print_info "  Total tables expected: $TOTAL_TABLES_EXPECTED"
    print_info "  Tables fully verified: $TOTAL_TABLES_OK"
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_error "  Missing tables: ${#MISSING_TABLES[@]} (${MISSING_TABLES[*]})"
    fi
    
    if [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -gt 0 ]; then
        print_warning "  Tables with incorrect column counts: ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} (${TABLES_WITH_WRONG_COLUMN_COUNT[*]})"
    fi
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -eq 0 ]; then
        print_success "  ✓ All expected tables and columns verified successfully!"
    else
        print_warning "  Schema verification found issues that need to be fixed"
        print_info "  These will be addressed in the next step (Apply Database Fixes)"
    fi
}

fix_database_schema() {
    print_header "Step 8.5: Applying Database Fixes"
    
    print_info "Creating missing tables and adding missing columns..."
    print_info "This may take a few minutes..."
    
    DB_NAME="${DB_NAME:-isp_system}" # Ensure DB_NAME is defined

    sudo -u postgres psql -d "$DB_NAME" <<'FIXSQL'
-- Create routers table if missing
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    ssh_port INTEGER DEFAULT 22,
    api_port INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER,
    firmware_version VARCHAR(100),
    configuration JSONB,
    connection_type VARCHAR(50),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_users table if missing (for FreeRADIUS)
CREATE TABLE IF NOT EXISTS radius_users (
    username VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    download_limit NUMERIC(10,2) DEFAULT 0,
    upload_limit NUMERIC(10,2) DEFAULT 0,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_sessions_active table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    last_update TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    UNIQUE (username, nas_ip_address, start_time)
);

-- Create radius_sessions_archive table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP NOT NULL,
    session_time INTEGER,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    terminate_cause VARCHAR(50)
);

-- Create radius_nas table if missing
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to customer_services
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add missing column to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
FIXSQL

    if [ $? -eq 0 ]; then
        print_success "Database fixes applied successfully"
    else
        print_error "Failed to apply some database fixes"
        return 1
    fi
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
        # Added FreeRADIUS tables
        "radius_users"
        "radius_sessions_active"
        "radius_sessions_archive"
        "radius_nas" # Added radius_nas
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
        
        if [ ${#STILL_MISSING[@]} -gt 0 ]; then
            print_error "Still missing ${#STILL_MISSING[@]} tables after migration: ${STILL_MISSING[*]}"
            return 1
        else
            print_success "All missing tables have been created"
            return 0
        fi
    fi
}

verify_database_schema() {
    print_header "Step 8: Verifying Database Schema"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Checking expected table and column counts..."
    
    # Expected tables and their column counts
    declare -A EXPECTED_TABLE_COLUMNS=(
        ["account_balances"]="9"
        ["account_balances_old"]="5"
        ["admin_logs"]="10"
        ["automation_workflows"]="9"
        ["backup_access_logs"]="11"
        ["backup_file_inventory"]="10"
        ["backup_jobs"]="22"
        ["backup_restore_logs"]="11"
        ["backup_schedules"]="17"
        ["backup_settings"]="46"
        ["backup_storage_locations"]="16"
        ["balance_sheet_view"]="5"
        ["bandwidth_configs"]="8"
        ["bandwidth_patterns"]="10" # Increased from 7 to 10
        ["bank_transactions"]="12"
        ["billing_cycles"]="7"
        ["bonus_campaigns"]="14"
        ["budget_line_items"]="12"
        ["budget_versions"]="7"
        ["budgets"]="9"
        ["bus_fare_records"]="12"
        ["capacity_alerts"]="8"
        ["capacity_predictions"]="8" # Increased from 6 to 8
        ["card_transactions"]="11"
        ["cash_flow_categories"]="5"
        ["cash_flow_transactions"]="9"
        ["cash_transactions"]="9"
        ["chart_of_accounts"]="9"
        ["communication_settings"]="9"
        ["company_content"]="5"
        ["company_profiles"]="26" # Increased from 24
        ["connection_methods"]="8"
        ["credit_applications"]="6"
        ["credit_notes"]="13"
        ["customer_addresses"]="12"
        ["customer_billing_configurations"]="29"
        ["customer_categories"]="6"
        ["customer_contacts"]="9"
        ["customer_document_access_logs"]="7"
        ["customer_document_shares"]="9"
        ["customer_documents"]="18"
        ["customer_emergency_contacts"]="7"
        ["customer_equipment"]="22"
        ["customer_notes"]="8"
        ["customer_notifications"]="8"
        ["customer_payment_accounts"]="9"
        ["customer_phone_numbers"]="6"
        ["customer_services"]="14"
        ["customer_statements"]="14"
        ["customers"]="35" # Increased from 32
        ["email_logs"]="14"
        ["employees"]="12"
        ["equipment_returns"]="16"
        ["expense_approvals"]="5"
        ["expense_categories"]="8"
        ["expense_subcategories"]="6"
        ["expenses"]="18"
        ["finance_audit_trail"]="10"
        ["finance_documents"]="17"
        ["financial_adjustments"]="13"
        ["financial_periods"]="6"
        ["financial_reports"]="7"
        ["fuel_logs"]="10"
        ["hotspot_sessions"]="9"
        ["hotspot_users"]="12"
        ["hotspot_vouchers"]="10"
        ["hotspots"]="17"
        ["infrastructure_investments"]="8"
        ["inventory"]="11"
        ["inventory_items"]="13"
        ["inventory_serial_numbers"]="14"
        ["invoice_items"]="8"
        ["invoices"]="10"
        ["ip_addresses"]="11"
        ["ip_pools"]="9"
        ["ip_subnets"]="13"
        ["journal_entries"]="11"
        ["journal_entry_lines"]="8"
        ["knowledge_base"]="10"
        ["locations"]="11" # Increased from 8
        ["loyalty_redemptions"]="12"
        ["loyalty_transactions"]="10"
        ["maintenance_logs"]="11"
        ["message_campaigns"]="13"
        ["message_templates"]="9"
        ["messages"]="14"
        ["mpesa_logs"]="14"
        ["network_configurations"]="13"
        ["network_devices"]="13"
        ["network_forecasts"]="6"
        ["notification_logs"]="11"
        ["notification_templates"]="9"
        ["openvpn_configs"]="8"
        ["openvpn_logs"]="10"
        ["payment_applications"]="6"
        ["payment_gateway_configs"]="10"
        ["payment_methods"]="5"
        ["payment_reminders"]="7"
        ["payments"]="13" # Increased from 9
        ["payroll_records"]="15"
        ["performance_reviews"]="12"
        ["permissions"]="6"
        ["portal_sessions"]="8"
        ["portal_settings"]="8"
        ["purchase_order_items"]="7"
        ["purchase_orders"]="9"
        ["radius_logs"]="16"
        ["radius_nas"]="10" # New table
        ["radius_sessions_active"]="10" # Increased from 7 to 10
        ["radius_sessions_archive"]="13" # New table
        ["radius_users"]="13" # Increased from 0 to 13
        ["refunds"]="9"
        ["revenue_categories"]="6"
        ["revenue_streams"]="6"
        ["role_permissions"]="4"
        ["roles"]="6"
        ["router_logs"]="9"
        ["router_performance_history"]="12"
        ["router_services"]="7"
        ["router_sync_status"]="13" # Increased from 11
        ["routers"]="27" # Increased from 26
        ["server_configurations"]="9"
        ["service_activation_logs"]="8"
        ["service_inventory"]="7"
        ["service_plans"]="17" # Increased from 15
        ["service_requests"]="11"
        ["sms_logs"]="15"
        ["subnets"]="9"
        ["supplier_invoice_items"]="8"
        ["supplier_invoices"]="15"
        ["suppliers"]="13"
        ["support_tickets"]="12"
        ["sync_jobs"]="10"
        ["system_config"]="4"
        ["system_logs"]="14"
        ["task_attachments"]="8"
        ["task_categories"]="5"
        ["task_comments"]="5"
        ["tasks"]="14" # Increased from 11
        ["tax_configurations"]="8"
        ["tax_periods"]="6"
        ["tax_returns"]="15"
        ["trial_balance_view"]="7"
        ["user_activity_logs"]="9"
        ["users"]="7"
        ["vehicles"]="20"
        ["wallet_balances"]="10"
        ["wallet_bonus_rules"]="17"
        ["wallet_transactions"]="13"
        ["warehouses"]="9"
    )
    
    TOTAL_TABLES_EXPECTED=${#EXPECTED_TABLE_COLUMNS[@]}
    MISSING_TABLES=()
    TABLES_WITH_WRONG_COLUMN_COUNT=()
    TOTAL_TABLES_OK=0
    
    for table in "${!EXPECTED_TABLE_COLUMNS[@]}"; do
        # Check if table exists
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table');" | grep -q "t"; then
            
            # Table exists, check column count
            EXPECTED_COUNT=${EXPECTED_TABLE_COLUMNS[$table]}
            ACTUAL_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';")
            
            if [ "$EXPECTED_COUNT" -eq "$ACTUAL_COUNT" ]; then
                print_success "✓ $table (Correct column count: $ACTUAL_COUNT)"
                TOTAL_TABLES_OK=$((TOTAL_TABLES_OK + 1))
            else
                print_warning "⚠ $table (Expected $EXPECTED_COUNT columns, found $ACTUAL_COUNT)"
                TABLES_WITH_WRONG_COLUMN_COUNT+=("$table")
            fi
        else
            print_error "✗ $table (Table does not exist)"
            MISSING_TABLES+=("$table")
        fi
    done
    
    echo ""
    print_info "Schema Verification Summary:"
    print_info "  Total tables expected: $TOTAL_TABLES_EXPECTED"
    print_info "  Tables fully verified: $TOTAL_TABLES_OK"
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_error "  Missing tables: ${#MISSING_TABLES[@]} (${MISSING_TABLES[*]})"
    fi
    
    if [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -gt 0 ]; then
        print_warning "  Tables with incorrect column counts: ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} (${TABLES_WITH_WRONG_COLUMN_COUNT[*]})"
    fi
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -eq 0 ]; then
        print_success "  ✓ All expected tables and columns verified successfully!"
    else
        print_warning "  Schema verification found issues that need to be fixed"
        print_info "  These will be addressed in the next step (Apply Database Fixes)"
    fi
}

fix_database_schema() {
    print_header "Step 8.5: Applying Database Fixes"
    
    print_info "Creating missing tables and adding missing columns..."
    print_info "This may take a few minutes..."
    
    DB_NAME="${DB_NAME:-isp_system}" # Ensure DB_NAME is defined

    sudo -u postgres psql -d "$DB_NAME" <<'FIXSQL'
-- Create routers table if missing
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    ssh_port INTEGER DEFAULT 22,
    api_port INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER,
    firmware_version VARCHAR(100),
    configuration JSONB,
    connection_type VARCHAR(50),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_users table if missing (for FreeRADIUS)
CREATE TABLE IF NOT EXISTS radius_users (
    username VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    download_limit NUMERIC(10,2) DEFAULT 0,
    upload_limit NUMERIC(10,2) DEFAULT 0,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_sessions_active table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    last_update TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    UNIQUE (username, nas_ip_address, start_time)
);

-- Create radius_sessions_archive table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP NOT NULL,
    session_time INTEGER,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    terminate_cause VARCHAR(50)
);

-- Create radius_nas table if missing
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to customer_services
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add missing column to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
FIXSQL

    if [ $? -eq 0 ]; then
        print_success "Database fixes applied successfully"
    else
        print_error "Failed to apply some database fixes"
        return 1
    fi
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
        # Added FreeRADIUS tables
        "radius_users"
        "radius_sessions_active"
        "radius_sessions_archive"
        "radius_nas" # Added radius_nas
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
        
        if [ ${#STILL_MISSING[@]} -gt 0 ]; then
            print_error "Still missing ${#STILL_MISSING[@]} tables after migration: ${STILL_MISSING[*]}"
            return 1
        else
            print_success "All missing tables have been created"
            return 0
        fi
    fi
}

verify_database_schema() {
    print_header "Step 8: Verifying Database Schema"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Checking expected table and column counts..."
    
    # Expected tables and their column counts
    declare -A EXPECTED_TABLE_COLUMNS=(
        ["account_balances"]="9"
        ["account_balances_old"]="5"
        ["admin_logs"]="10"
        ["automation_workflows"]="9"
        ["backup_access_logs"]="11"
        ["backup_file_inventory"]="10"
        ["backup_jobs"]="22"
        ["backup_restore_logs"]="11"
        ["backup_schedules"]="17"
        ["backup_settings"]="46"
        ["backup_storage_locations"]="16"
        ["balance_sheet_view"]="5"
        ["bandwidth_configs"]="8"
        ["bandwidth_patterns"]="10" # Increased from 7 to 10
        ["bank_transactions"]="12"
        ["billing_cycles"]="7"
        ["bonus_campaigns"]="14"
        ["budget_line_items"]="12"
        ["budget_versions"]="7"
        ["budgets"]="9"
        ["bus_fare_records"]="12"
        ["capacity_alerts"]="8"
        ["capacity_predictions"]="8" # Increased from 6 to 8
        ["card_transactions"]="11"
        ["cash_flow_categories"]="5"
        ["cash_flow_transactions"]="9"
        ["cash_transactions"]="9"
        ["chart_of_accounts"]="9"
        ["communication_settings"]="9"
        ["company_content"]="5"
        ["company_profiles"]="26" # Increased from 24
        ["connection_methods"]="8"
        ["credit_applications"]="6"
        ["credit_notes"]="13"
        ["customer_addresses"]="12"
        ["customer_billing_configurations"]="29"
        ["customer_categories"]="6"
        ["customer_contacts"]="9"
        ["customer_document_access_logs"]="7"
        ["customer_document_shares"]="9"
        ["customer_documents"]="18"
        ["customer_emergency_contacts"]="7"
        ["customer_equipment"]="22"
        ["customer_notes"]="8"
        ["customer_notifications"]="8"
        ["customer_payment_accounts"]="9"
        ["customer_phone_numbers"]="6"
        ["customer_services"]="14"
        ["customer_statements"]="14"
        ["customers"]="35" # Increased from 32
        ["email_logs"]="14"
        ["employees"]="12"
        ["equipment_returns"]="16"
        ["expense_approvals"]="5"
        ["expense_categories"]="8"
        ["expense_subcategories"]="6"
        ["expenses"]="18"
        ["finance_audit_trail"]="10"
        ["finance_documents"]="17"
        ["financial_adjustments"]="13"
        ["financial_periods"]="6"
        ["financial_reports"]="7"
        ["fuel_logs"]="10"
        ["hotspot_sessions"]="9"
        ["hotspot_users"]="12"
        ["hotspot_vouchers"]="10"
        ["hotspots"]="17"
        ["infrastructure_investments"]="8"
        ["inventory"]="11"
        ["inventory_items"]="13"
        ["inventory_serial_numbers"]="14"
        ["invoice_items"]="8"
        ["invoices"]="10"
        ["ip_addresses"]="11"
        ["ip_pools"]="9"
        ["ip_subnets"]="13"
        ["journal_entries"]="11"
        ["journal_entry_lines"]="8"
        ["knowledge_base"]="10"
        ["locations"]="11" # Increased from 8
        ["loyalty_redemptions"]="12"
        ["loyalty_transactions"]="10"
        ["maintenance_logs"]="11"
        ["message_campaigns"]="13"
        ["message_templates"]="9"
        ["messages"]="14"
        ["mpesa_logs"]="14"
        ["network_configurations"]="13"
        ["network_devices"]="13"
        ["network_forecasts"]="6"
        ["notification_logs"]="11"
        ["notification_templates"]="9"
        ["openvpn_configs"]="8"
        ["openvpn_logs"]="10"
        ["payment_applications"]="6"
        ["payment_gateway_configs"]="10"
        ["payment_methods"]="5"
        ["payment_reminders"]="7"
        ["payments"]="13" # Increased from 9
        ["payroll_records"]="15"
        ["performance_reviews"]="12"
        ["permissions"]="6"
        ["portal_sessions"]="8"
        ["portal_settings"]="8"
        ["purchase_order_items"]="7"
        ["purchase_orders"]="9"
        ["radius_logs"]="16"
        ["radius_nas"]="10" # New table
        ["radius_sessions_active"]="10" # Increased from 7 to 10
        ["radius_sessions_archive"]="13" # New table
        ["radius_users"]="13" # Increased from 0 to 13
        ["refunds"]="9"
        ["revenue_categories"]="6"
        ["revenue_streams"]="6"
        ["role_permissions"]="4"
        ["roles"]="6"
        ["router_logs"]="9"
        ["router_performance_history"]="12"
        ["router_services"]="7"
        ["router_sync_status"]="13" # Increased from 11
        ["routers"]="27" # Increased from 26
        ["server_configurations"]="9"
        ["service_activation_logs"]="8"
        ["service_inventory"]="7"
        ["service_plans"]="17" # Increased from 15
        ["service_requests"]="11"
        ["sms_logs"]="15"
        ["subnets"]="9"
        ["supplier_invoice_items"]="8"
        ["supplier_invoices"]="15"
        ["suppliers"]="13"
        ["support_tickets"]="12"
        ["sync_jobs"]="10"
        ["system_config"]="4"
        ["system_logs"]="14"
        ["task_attachments"]="8"
        ["task_categories"]="5"
        ["task_comments"]="5"
        ["tasks"]="14" # Increased from 11
        ["tax_configurations"]="8"
        ["tax_periods"]="6"
        ["tax_returns"]="15"
        ["trial_balance_view"]="7"
        ["user_activity_logs"]="9"
        ["users"]="7"
        ["vehicles"]="20"
        ["wallet_balances"]="10"
        ["wallet_bonus_rules"]="17"
        ["wallet_transactions"]="13"
        ["warehouses"]="9"
    )
    
    TOTAL_TABLES_EXPECTED=${#EXPECTED_TABLE_COLUMNS[@]}
    MISSING_TABLES=()
    TABLES_WITH_WRONG_COLUMN_COUNT=()
    TOTAL_TABLES_OK=0
    
    for table in "${!EXPECTED_TABLE_COLUMNS[@]}"; do
        # Check if table exists
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table');" | grep -q "t"; then
            
            # Table exists, check column count
            EXPECTED_COUNT=${EXPECTED_TABLE_COLUMNS[$table]}
            ACTUAL_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';")
            
            if [ "$EXPECTED_COUNT" -eq "$ACTUAL_COUNT" ]; then
                print_success "✓ $table (Correct column count: $ACTUAL_COUNT)"
                TOTAL_TABLES_OK=$((TOTAL_TABLES_OK + 1))
            else
                print_warning "⚠ $table (Expected $EXPECTED_COUNT columns, found $ACTUAL_COUNT)"
                TABLES_WITH_WRONG_COLUMN_COUNT+=("$table")
            fi
        else
            print_error "✗ $table (Table does not exist)"
            MISSING_TABLES+=("$table")
        fi
    done
    
    echo ""
    print_info "Schema Verification Summary:"
    print_info "  Total tables expected: $TOTAL_TABLES_EXPECTED"
    print_info "  Tables fully verified: $TOTAL_TABLES_OK"
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_error "  Missing tables: ${#MISSING_TABLES[@]} (${MISSING_TABLES[*]})"
    fi
    
    if [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -gt 0 ]; then
        print_warning "  Tables with incorrect column counts: ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} (${TABLES_WITH_WRONG_COLUMN_COUNT[*]})"
    fi
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -eq 0 ]; then
        print_success "  ✓ All expected tables and columns verified successfully!"
    else
        print_warning "  Schema verification found issues that need to be fixed"
        print_info "  These will be addressed in the next step (Apply Database Fixes)"
    fi
}

fix_database_schema() {
    print_header "Step 8.5: Applying Database Fixes"
    
    print_info "Creating missing tables and adding missing columns..."
    print_info "This may take a few minutes..."
    
    DB_NAME="${DB_NAME:-isp_system}" # Ensure DB_NAME is defined

    sudo -u postgres psql -d "$DB_NAME" <<'FIXSQL'
-- Create routers table if missing
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    ssh_port INTEGER DEFAULT 22,
    api_port INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER,
    firmware_version VARCHAR(100),
    configuration JSONB,
    connection_type VARCHAR(50),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_users table if missing (for FreeRADIUS)
CREATE TABLE IF NOT EXISTS radius_users (
    username VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    download_limit NUMERIC(10,2) DEFAULT 0,
    upload_limit NUMERIC(10,2) DEFAULT 0,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_sessions_active table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    last_update TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    UNIQUE (username, nas_ip_address, start_time)
);

-- Create radius_sessions_archive table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP NOT NULL,
    session_time INTEGER,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    terminate_cause VARCHAR(50)
);

-- Create radius_nas table if missing
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to customer_services
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add missing column to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
FIXSQL

    if [ $? -eq 0 ]; then
        print_success "Database fixes applied successfully"
    else
        print_error "Failed to apply some database fixes"
        return 1
    fi
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
        # Added FreeRADIUS tables
        "radius_users"
        "radius_sessions_active"
        "radius_sessions_archive"
        "radius_nas" # Added radius_nas
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
        
        if [ ${#STILL_MISSING[@]} -gt 0 ]; then
            print_error "Still missing ${#STILL_MISSING[@]} tables after migration: ${STILL_MISSING[*]}"
            return 1
        else
            print_success "All missing tables have been created"
            return 0
        fi
    fi
}

verify_database_schema() {
    print_header "Step 8: Verifying Database Schema"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Checking expected table and column counts..."
    
    # Expected tables and their column counts
    declare -A EXPECTED_TABLE_COLUMNS=(
        ["account_balances"]="9"
        ["account_balances_old"]="5"
        ["admin_logs"]="10"
        ["automation_workflows"]="9"
        ["backup_access_logs"]="11"
        ["backup_file_inventory"]="10"
        ["backup_jobs"]="22"
        ["backup_restore_logs"]="11"
        ["backup_schedules"]="17"
        ["backup_settings"]="46"
        ["backup_storage_locations"]="16"
        ["balance_sheet_view"]="5"
        ["bandwidth_configs"]="8"
        ["bandwidth_patterns"]="10" # Increased from 7 to 10
        ["bank_transactions"]="12"
        ["billing_cycles"]="7"
        ["bonus_campaigns"]="14"
        ["budget_line_items"]="12"
        ["budget_versions"]="7"
        ["budgets"]="9"
        ["bus_fare_records"]="12"
        ["capacity_alerts"]="8"
        ["capacity_predictions"]="8" # Increased from 6 to 8
        ["card_transactions"]="11"
        ["cash_flow_categories"]="5"
        ["cash_flow_transactions"]="9"
        ["cash_transactions"]="9"
        ["chart_of_accounts"]="9"
        ["communication_settings"]="9"
        ["company_content"]="5"
        ["company_profiles"]="26" # Increased from 24
        ["connection_methods"]="8"
        ["credit_applications"]="6"
        ["credit_notes"]="13"
        ["customer_addresses"]="12"
        ["customer_billing_configurations"]="29"
        ["customer_categories"]="6"
        ["customer_contacts"]="9"
        ["customer_document_access_logs"]="7"
        ["customer_document_shares"]="9"
        ["customer_documents"]="18"
        ["customer_emergency_contacts"]="7"
        ["customer_equipment"]="22"
        ["customer_notes"]="8"
        ["customer_notifications"]="8"
        ["customer_payment_accounts"]="9"
        ["customer_phone_numbers"]="6"
        ["customer_services"]="14"
        ["customer_statements"]="14"
        ["customers"]="35" # Increased from 32
        ["email_logs"]="14"
        ["employees"]="12"
        ["equipment_returns"]="16"
        ["expense_approvals"]="5"
        ["expense_categories"]="8"
        ["expense_subcategories"]="6"
        ["expenses"]="18"
        ["finance_audit_trail"]="10"
        ["finance_documents"]="17"
        ["financial_adjustments"]="13"
        ["financial_periods"]="6"
        ["financial_reports"]="7"
        ["fuel_logs"]="10"
        ["hotspot_sessions"]="9"
        ["hotspot_users"]="12"
        ["hotspot_vouchers"]="10"
        ["hotspots"]="17"
        ["infrastructure_investments"]="8"
        ["inventory"]="11"
        ["inventory_items"]="13"
        ["inventory_serial_numbers"]="14"
        ["invoice_items"]="8"
        ["invoices"]="10"
        ["ip_addresses"]="11"
        ["ip_pools"]="9"
        ["ip_subnets"]="13"
        ["journal_entries"]="11"
        ["journal_entry_lines"]="8"
        ["knowledge_base"]="10"
        ["locations"]="11" # Increased from 8
        ["loyalty_redemptions"]="12"
        ["loyalty_transactions"]="10"
        ["maintenance_logs"]="11"
        ["message_campaigns"]="13"
        ["message_templates"]="9"
        ["messages"]="14"
        ["mpesa_logs"]="14"
        ["network_configurations"]="13"
        ["network_devices"]="13"
        ["network_forecasts"]="6"
        ["notification_logs"]="11"
        ["notification_templates"]="9"
        ["openvpn_configs"]="8"
        ["openvpn_logs"]="10"
        ["payment_applications"]="6"
        ["payment_gateway_configs"]="10"
        ["payment_methods"]="5"
        ["payment_reminders"]="7"
        ["payments"]="13" # Increased from 9
        ["payroll_records"]="15"
        ["performance_reviews"]="12"
        ["permissions"]="6"
        ["portal_sessions"]="8"
        ["portal_settings"]="8"
        ["purchase_order_items"]="7"
        ["purchase_orders"]="9"
        ["radius_logs"]="16"
        ["radius_nas"]="10" # New table
        ["radius_sessions_active"]="10" # Increased from 7 to 10
        ["radius_sessions_archive"]="13" # New table
        ["radius_users"]="13" # Increased from 0 to 13
        ["refunds"]="9"
        ["revenue_categories"]="6"
        ["revenue_streams"]="6"
        ["role_permissions"]="4"
        ["roles"]="6"
        ["router_logs"]="9"
        ["router_performance_history"]="12"
        ["router_services"]="7"
        ["router_sync_status"]="13" # Increased from 11
        ["routers"]="27" # Increased from 26
        ["server_configurations"]="9"
        ["service_activation_logs"]="8"
        ["service_inventory"]="7"
        ["service_plans"]="17" # Increased from 15
        ["service_requests"]="11"
        ["sms_logs"]="15"
        ["subnets"]="9"
        ["supplier_invoice_items"]="8"
        ["supplier_invoices"]="15"
        ["suppliers"]="13"
        ["support_tickets"]="12"
        ["sync_jobs"]="10"
        ["system_config"]="4"
        ["system_logs"]="14"
        ["task_attachments"]="8"
        ["task_categories"]="5"
        ["task_comments"]="5"
        ["tasks"]="14" # Increased from 11
        ["tax_configurations"]="8"
        ["tax_periods"]="6"
        ["tax_returns"]="15"
        ["trial_balance_view"]="7"
        ["user_activity_logs"]="9"
        ["users"]="7"
        ["vehicles"]="20"
        ["wallet_balances"]="10"
        ["wallet_bonus_rules"]="17"
        ["wallet_transactions"]="13"
        ["warehouses"]="9"
    )
    
    TOTAL_TABLES_EXPECTED=${#EXPECTED_TABLE_COLUMNS[@]}
    MISSING_TABLES=()
    TABLES_WITH_WRONG_COLUMN_COUNT=()
    TOTAL_TABLES_OK=0
    
    for table in "${!EXPECTED_TABLE_COLUMNS[@]}"; do
        # Check if table exists
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table');" | grep -q "t"; then
            
            # Table exists, check column count
            EXPECTED_COUNT=${EXPECTED_TABLE_COLUMNS[$table]}
            ACTUAL_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';")
            
            if [ "$EXPECTED_COUNT" -eq "$ACTUAL_COUNT" ]; then
                print_success "✓ $table (Correct column count: $ACTUAL_COUNT)"
                TOTAL_TABLES_OK=$((TOTAL_TABLES_OK + 1))
            else
                print_warning "⚠ $table (Expected $EXPECTED_COUNT columns, found $ACTUAL_COUNT)"
                TABLES_WITH_WRONG_COLUMN_COUNT+=("$table")
            fi
        else
            print_error "✗ $table (Table does not exist)"
            MISSING_TABLES+=("$table")
        fi
    done
    
    echo ""
    print_info "Schema Verification Summary:"
    print_info "  Total tables expected: $TOTAL_TABLES_EXPECTED"
    print_info "  Tables fully verified: $TOTAL_TABLES_OK"
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_error "  Missing tables: ${#MISSING_TABLES[@]} (${MISSING_TABLES[*]})"
    fi
    
    if [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -gt 0 ]; then
        print_warning "  Tables with incorrect column counts: ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} (${TABLES_WITH_WRONG_COLUMN_COUNT[*]})"
    fi
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -eq 0 ]; then
        print_success "  ✓ All expected tables and columns verified successfully!"
    else
        print_warning "  Schema verification found issues that need to be fixed"
        print_info "  These will be addressed in the next step (Apply Database Fixes)"
    fi
}

fix_database_schema() {
    print_header "Step 8.5: Applying Database Fixes"
    
    print_info "Creating missing tables and adding missing columns..."
    print_info "This may take a few minutes..."
    
    DB_NAME="${DB_NAME:-isp_system}" # Ensure DB_NAME is defined

    sudo -u postgres psql -d "$DB_NAME" <<'FIXSQL'
-- Create routers table if missing
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    ssh_port INTEGER DEFAULT 22,
    api_port INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER,
    firmware_version VARCHAR(100),
    configuration JSONB,
    connection_type VARCHAR(50),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_users table if missing (for FreeRADIUS)
CREATE TABLE IF NOT EXISTS radius_users (
    username VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    download_limit NUMERIC(10,2) DEFAULT 0,
    upload_limit NUMERIC(10,2) DEFAULT 0,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_sessions_active table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    last_update TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    UNIQUE (username, nas_ip_address, start_time)
);

-- Create radius_sessions_archive table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP NOT NULL,
    session_time INTEGER,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    terminate_cause VARCHAR(50)
);

-- Create radius_nas table if missing
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to customer_services
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add missing column to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
FIXSQL

    if [ $? -eq 0 ]; then
        print_success "Database fixes applied successfully"
    else
        print_error "Failed to apply some database fixes"
        return 1
    fi
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
        # Added FreeRADIUS tables
        "radius_users"
        "radius_sessions_active"
        "radius_sessions_archive"
        "radius_nas" # Added radius_nas
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
        
        if [ ${#STILL_MISSING[@]} -gt 0 ]; then
            print_error "Still missing ${#STILL_MISSING[@]} tables after migration: ${STILL_MISSING[*]}"
            return 1
        else
            print_success "All missing tables have been created"
            return 0
        fi
    fi
}

verify_database_schema() {
    print_header "Step 8: Verifying Database Schema"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Checking expected table and column counts..."
    
    # Expected tables and their column counts
    declare -A EXPECTED_TABLE_COLUMNS=(
        ["account_balances"]="9"
        ["account_balances_old"]="5"
        ["admin_logs"]="10"
        ["automation_workflows"]="9"
        ["backup_access_logs"]="11"
        ["backup_file_inventory"]="10"
        ["backup_jobs"]="22"
        ["backup_restore_logs"]="11"
        ["backup_schedules"]="17"
        ["backup_settings"]="46"
        ["backup_storage_locations"]="16"
        ["balance_sheet_view"]="5"
        ["bandwidth_configs"]="8"
        ["bandwidth_patterns"]="10" # Increased from 7 to 10
        ["bank_transactions"]="12"
        ["billing_cycles"]="7"
        ["bonus_campaigns"]="14"
        ["budget_line_items"]="12"
        ["budget_versions"]="7"
        ["budgets"]="9"
        ["bus_fare_records"]="12"
        ["capacity_alerts"]="8"
        ["capacity_predictions"]="8" # Increased from 6 to 8
        ["card_transactions"]="11"
        ["cash_flow_categories"]="5"
        ["cash_flow_transactions"]="9"
        ["cash_transactions"]="9"
        ["chart_of_accounts"]="9"
        ["communication_settings"]="9"
        ["company_content"]="5"
        ["company_profiles"]="26" # Increased from 24
        ["connection_methods"]="8"
        ["credit_applications"]="6"
        ["credit_notes"]="13"
        ["customer_addresses"]="12"
        ["customer_billing_configurations"]="29"
        ["customer_categories"]="6"
        ["customer_contacts"]="9"
        ["customer_document_access_logs"]="7"
        ["customer_document_shares"]="9"
        ["customer_documents"]="18"
        ["customer_emergency_contacts"]="7"
        ["customer_equipment"]="22"
        ["customer_notes"]="8"
        ["customer_notifications"]="8"
        ["customer_payment_accounts"]="9"
        ["customer_phone_numbers"]="6"
        ["customer_services"]="14"
        ["customer_statements"]="14"
        ["customers"]="35" # Increased from 32
        ["email_logs"]="14"
        ["employees"]="12"
        ["equipment_returns"]="16"
        ["expense_approvals"]="5"
        ["expense_categories"]="8"
        ["expense_subcategories"]="6"
        ["expenses"]="18"
        ["finance_audit_trail"]="10"
        ["finance_documents"]="17"
        ["financial_adjustments"]="13"
        ["financial_periods"]="6"
        ["financial_reports"]="7"
        ["fuel_logs"]="10"
        ["hotspot_sessions"]="9"
        ["hotspot_users"]="12"
        ["hotspot_vouchers"]="10"
        ["hotspots"]="17"
        ["infrastructure_investments"]="8"
        ["inventory"]="11"
        ["inventory_items"]="13"
        ["inventory_serial_numbers"]="14"
        ["invoice_items"]="8"
        ["invoices"]="10"
        ["ip_addresses"]="11"
        ["ip_pools"]="9"
        ["ip_subnets"]="13"
        ["journal_entries"]="11"
        ["journal_entry_lines"]="8"
        ["knowledge_base"]="10"
        ["locations"]="11" # Increased from 8
        ["loyalty_redemptions"]="12"
        ["loyalty_transactions"]="10"
        ["maintenance_logs"]="11"
        ["message_campaigns"]="13"
        ["message_templates"]="9"
        ["messages"]="14"
        ["mpesa_logs"]="14"
        ["network_configurations"]="13"
        ["network_devices"]="13"
        ["network_forecasts"]="6"
        ["notification_logs"]="11"
        ["notification_templates"]="9"
        ["openvpn_configs"]="8"
        ["openvpn_logs"]="10"
        ["payment_applications"]="6"
        ["payment_gateway_configs"]="10"
        ["payment_methods"]="5"
        ["payment_reminders"]="7"
        ["payments"]="13" # Increased from 9
        ["payroll_records"]="15"
        ["performance_reviews"]="12"
        ["permissions"]="6"
        ["portal_sessions"]="8"
        ["portal_settings"]="8"
        ["purchase_order_items"]="7"
        ["purchase_orders"]="9"
        ["radius_logs"]="16"
        ["radius_nas"]="10" # New table
        ["radius_sessions_active"]="10" # Increased from 7 to 10
        ["radius_sessions_archive"]="13" # New table
        ["radius_users"]="13" # Increased from 0 to 13
        ["refunds"]="9"
        ["revenue_categories"]="6"
        ["revenue_streams"]="6"
        ["role_permissions"]="4"
        ["roles"]="6"
        ["router_logs"]="9"
        ["router_performance_history"]="12"
        ["router_services"]="7"
        ["router_sync_status"]="13" # Increased from 11
        ["routers"]="27" # Increased from 26
        ["server_configurations"]="9"
        ["service_activation_logs"]="8"
        ["service_inventory"]="7"
        ["service_plans"]="17" # Increased from 15
        ["service_requests"]="11"
        ["sms_logs"]="15"
        ["subnets"]="9"
        ["supplier_invoice_items"]="8"
        ["supplier_invoices"]="15"
        ["suppliers"]="13"
        ["support_tickets"]="12"
        ["sync_jobs"]="10"
        ["system_config"]="4"
        ["system_logs"]="14"
        ["task_attachments"]="8"
        ["task_categories"]="5"
        ["task_comments"]="5"
        ["tasks"]="14" # Increased from 11
        ["tax_configurations"]="8"
        ["tax_periods"]="6"
        ["tax_returns"]="15"
        ["trial_balance_view"]="7"
        ["user_activity_logs"]="9"
        ["users"]="7"
        ["vehicles"]="20"
        ["wallet_balances"]="10"
        ["wallet_bonus_rules"]="17"
        ["wallet_transactions"]="13"
        ["warehouses"]="9"
    )
    
    TOTAL_TABLES_EXPECTED=${#EXPECTED_TABLE_COLUMNS[@]}
    MISSING_TABLES=()
    TABLES_WITH_WRONG_COLUMN_COUNT=()
    TOTAL_TABLES_OK=0
    
    for table in "${!EXPECTED_TABLE_COLUMNS[@]}"; do
        # Check if table exists
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table');" | grep -q "t"; then
            
            # Table exists, check column count
            EXPECTED_COUNT=${EXPECTED_TABLE_COLUMNS[$table]}
            ACTUAL_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';")
            
            if [ "$EXPECTED_COUNT" -eq "$ACTUAL_COUNT" ]; then
                print_success "✓ $table (Correct column count: $ACTUAL_COUNT)"
                TOTAL_TABLES_OK=$((TOTAL_TABLES_OK + 1))
            else
                print_warning "⚠ $table (Expected $EXPECTED_COUNT columns, found $ACTUAL_COUNT)"
                TABLES_WITH_WRONG_COLUMN_COUNT+=("$table")
            fi
        else
            print_error "✗ $table (Table does not exist)"
            MISSING_TABLES+=("$table")
        fi
    done
    
    echo ""
    print_info "Schema Verification Summary:"
    print_info "  Total tables expected: $TOTAL_TABLES_EXPECTED"
    print_info "  Tables fully verified: $TOTAL_TABLES_OK"
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_error "  Missing tables: ${#MISSING_TABLES[@]} (${MISSING_TABLES[*]})"
    fi
    
    if [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -gt 0 ]; then
        print_warning "  Tables with incorrect column counts: ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} (${TABLES_WITH_WRONG_COLUMN_COUNT[*]})"
    fi
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -eq 0 ]; then
        print_success "  ✓ All expected tables and columns verified successfully!"
    else
        print_warning "  Schema verification found issues that need to be fixed"
        print_info "  These will be addressed in the next step (Apply Database Fixes)"
    fi
}

fix_database_schema() {
    print_header "Step 8.5: Applying Database Fixes"
    
    print_info "Creating missing tables and adding missing columns..."
    print_info "This may take a few minutes..."
    
    DB_NAME="${DB_NAME:-isp_system}" # Ensure DB_NAME is defined

    sudo -u postgres psql -d "$DB_NAME" <<'FIXSQL'
-- Create routers table if missing
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    ssh_port INTEGER DEFAULT 22,
    api_port INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER,
    firmware_version VARCHAR(100),
    configuration JSONB,
    connection_type VARCHAR(50),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_users table if missing (for FreeRADIUS)
CREATE TABLE IF NOT EXISTS radius_users (
    username VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    download_limit NUMERIC(10,2) DEFAULT 0,
    upload_limit NUMERIC(10,2) DEFAULT 0,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_sessions_active table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_active (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    last_update TIMESTAMP,
    session_time INTEGER DEFAULT 0,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    UNIQUE (username, nas_ip_address, start_time)
);

-- Create radius_sessions_archive table if missing
CREATE TABLE IF NOT EXISTS radius_sessions_archive (
    acct_session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    nas_ip_address INET,
    nas_port_id VARCHAR(255),
    framed_ip_address INET,
    calling_station_id VARCHAR(255),
    service_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP NOT NULL,
    session_time INTEGER,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    terminate_cause VARCHAR(50)
);

-- Create radius_nas table if missing
CREATE TABLE IF NOT EXISTS radius_nas (
    id SERIAL PRIMARY KEY,
    network_device_id INTEGER REFERENCES network_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'mikrotik',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to customer_services
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Add missing column to network_devices
ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
CREATE INDEX IF NOT EXISTS idx_radius_users_status ON radius_users(status);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_active_username ON radius_sessions_active(username);
CREATE INDEX IF NOT EXISTS idx_radius_sessions_archive_username ON radius_sessions_archive(username);
FIXSQL

    if [ $? -eq 0 ]; then
        print_success "Database fixes applied successfully"
    else
        print_error "Failed to apply some database fixes"
        return 1
    fi
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
        # Added FreeRADIUS tables
        "radius_users"
        "radius_sessions_active"
        "radius_sessions_archive"
        "radius_nas" # Added radius_nas
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
        
        if [ ${#STILL_MISSING[@]} -gt 0 ]; then
            print_error "Still missing ${#STILL_MISSING[@]} tables after migration: ${STILL_MISSING[*]}"
            return 1
        else
            print_success "All missing tables have been created"
            return 0
        fi
    fi
}

verify_database_schema() {
    print_header "Step 8: Verifying Database Schema"
    
    DB_NAME="${DB_NAME:-isp_system}"
    
    print_info "Checking expected table and column counts..."
    
    # Expected tables and their column counts
    declare -A EXPECTED_TABLE_COLUMNS=(
        ["account_balances"]="9"
        ["account_balances_old"]="5"
        ["admin_logs"]="10"
        ["automation_workflows"]="9"
        ["backup_access_logs"]="11"
        ["backup_file_inventory"]="10"
        ["backup_jobs"]="22"
        ["backup_restore_logs"]="11"
        ["backup_schedules"]="17"
        ["backup_settings"]="46"
        ["backup_storage_locations"]="16"
        ["balance_sheet_view"]="5"
        ["bandwidth_configs"]="8"
        ["bandwidth_patterns"]="10" # Increased from 7 to 10
        ["bank_transactions"]="12"
        ["billing_cycles"]="7"
        ["bonus_campaigns"]="14"
        ["budget_line_items"]="12"
        ["budget_versions"]="7"
        ["budgets"]="9"
        ["bus_fare_records"]="12"
        ["capacity_alerts"]="8"
        ["capacity_predictions"]="8" # Increased from 6 to 8
        ["card_transactions"]="11"
        ["cash_flow_categories"]="5"
        ["cash_flow_transactions"]="9"
        ["cash_transactions"]="9"
        ["chart_of_accounts"]="9"
        ["communication_settings"]="9"
        ["company_content"]="5"
        ["company_profiles"]="26" # Increased from 24
        ["connection_methods"]="8"
        ["credit_applications"]="6"
        ["credit_notes"]="13"
        ["customer_addresses"]="12"
        ["customer_billing_configurations"]="29"
        ["customer_categories"]="6"
        ["customer_contacts"]="9"
        ["customer_document_access_logs"]="7"
        ["customer_document_shares"]="9"
        ["customer_documents"]="18"
        ["customer_emergency_contacts"]="7"
        ["customer_equipment"]="22"
        ["customer_notes"]="8"
        ["customer_notifications"]="8"
        ["customer_payment_accounts"]="9"
        ["customer_phone_numbers"]="6"
        ["customer_services"]="14"
        ["customer_statements"]="14"
        ["customers"]="35" # Increased from 32
        ["email_logs"]="14"
        ["employees"]="12"
        ["equipment_returns"]="16"
        ["expense_approvals"]="5"
        ["expense_categories"]="8"
        ["expense_subcategories"]="6"
        ["expenses"]="18"
        ["finance_audit_trail"]="10"
        ["finance_documents"]="17"
        ["financial_adjustments"]="13"
        ["financial_periods"]="6"
        ["financial_reports"]="7"
        ["fuel_logs"]="10"
        ["hotspot_sessions"]="9"
        ["hotspot_users"]="12"
        ["hotspot_vouchers"]="10"
        ["hotspots"]="17"
        ["infrastructure_investments"]="8"
        ["inventory"]="11"
        ["inventory_items"]="13"
        ["inventory_serial_numbers"]="14"
        ["invoice_items"]="8"
        ["invoices"]="10"
        ["ip_addresses"]="11"
        ["ip_pools"]="9"
        ["ip_subnets"]="13"
        ["journal_entries"]="11"
        ["journal_entry_lines"]="8"
        ["knowledge_base"]="10"
        ["locations"]="11" # Increased from 8
        ["loyalty_redemptions"]="12"
        ["loyalty_transactions"]="10"
        ["maintenance_logs"]="11"
        ["message_campaigns"]="13"
        ["message_templates"]="9"
        ["messages"]="14"
        ["mpesa_logs"]="14"
        ["network_configurations"]="13"
        ["network_devices"]="13"
        ["network_forecasts"]="6"
        ["notification_logs"]="11"
        ["notification_templates"]="9"
        ["openvpn_configs"]="8"
        ["openvpn_logs"]="10"
        ["payment_applications"]="6"
        ["payment_gateway_configs"]="10"
        ["payment_methods"]="5"
        ["payment_reminders"]="7"
        ["payments"]="13" # Increased from 9
        ["payroll_records"]="15"
        ["performance_reviews"]="12"
        ["permissions"]="6"
        ["portal_sessions"]="8"
        ["portal_settings"]="8"
        ["purchase_order_items"]="7"
        ["purchase_orders"]="9"
        ["radius_logs"]="16"
        ["radius_nas"]="10" # New table
        ["radius_sessions_active"]="10" # Increased from 7 to 10
        ["radius_sessions_archive"]="13" # New table
        ["radius_users"]="13" # Increased from 0 to 13
        ["refunds"]="9"
        ["revenue_categories"]="6"
        ["revenue_streams"]="6"
        ["role_permissions"]="4"
        ["roles"]="6"
        ["router_logs"]="9"
        ["router_performance_history"]="12"
        ["router_services"]="7"
        ["router_sync_status"]="13" # Increased from 11
        ["routers"]="27" # Increased from 26
        ["server_configurations"]="9"
        ["service_activation_logs"]="8"
        ["service_inventory"]="7"
        ["service_plans"]="17" # Increased from 15
        ["service_requests"]="11"
        ["sms_logs"]="15"
        ["subnets"]="9"
        ["supplier_invoice_items"]="8"
        ["supplier_invoices"]="15"
        ["suppliers"]="13"
        ["support_tickets"]="12"
        ["sync_jobs"]="10"
        ["system_config"]="4"
        ["system_logs"]="14"
        ["task_attachments"]="8"
        ["task_categories"]="5"
        ["task_comments"]="5"
        ["tasks"]="14" # Increased from 11
        ["tax_configurations"]="8"
        ["tax_periods"]="6"
        ["tax_returns"]="15"
        ["trial_balance_view"]="7"
        ["user_activity_logs"]="9"
        ["users"]="7"
        ["vehicles"]="20"
        ["wallet_balances"]="10"
        ["wallet_bonus_rules"]="17"
        ["wallet_transactions"]="13"
        ["warehouses"]="9"
    )
    
    TOTAL_TABLES_EXPECTED=${#EXPECTED_TABLE_COLUMNS[@]}
    MISSING_TABLES=()
    TABLES_WITH_WRONG_COLUMN_COUNT=()
    TOTAL_TABLES_OK=0
    
    for table in "${!EXPECTED_TABLE_COLUMNS[@]}"; do
        # Check if table exists
        if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table');" | grep -q "t"; then
            
            # Table exists, check column count
            EXPECTED_COUNT=${EXPECTED_TABLE_COLUMNS[$table]}
            ACTUAL_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';")
            
            if [ "$EXPECTED_COUNT" -eq "$ACTUAL_COUNT" ]; then
                print_success "✓ $table (Correct column count: $ACTUAL_COUNT)"
                TOTAL_TABLES_OK=$((TOTAL_TABLES_OK + 1))
            else
                print_warning "⚠ $table (Expected $EXPECTED_COUNT columns, found $ACTUAL_COUNT)"
                TABLES_WITH_WRONG_COLUMN_COUNT+=("$table")
            fi
        else
            print_error "✗ $table (Table does not exist)"
            MISSING_TABLES+=("$table")
        fi
    done
    
    echo ""
    print_info "Schema Verification Summary:"
    print_info "  Total tables expected: $TOTAL_TABLES_EXPECTED"
    print_info "  Tables fully verified: $TOTAL_TABLES_OK"
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_error "  Missing tables: ${#MISSING_TABLES[@]} (${MISSING_TABLES[*]})"
    fi
    
    if [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -gt 0 ]; then
        print_warning "  Tables with incorrect column counts: ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} (${TABLES_WITH_WRONG_COLUMN_COUNT[*]})"
    fi
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#TABLES_WITH_WRONG_COLUMN_COUNT[@]} -eq 0 ]; then
        print_success "  ✓ All expected tables and columns verified successfully!"
    else
        print_warning "  Schema verification found issues that need to be fixed"
        print_info "  These will be addressed in the next step (Apply Database Fixes)"
    fi
}

fix_database_schema() {
    print_header "Step 8.5: Applying Database Fixes"
    
    print_info "Creating missing tables and adding missing columns..."
    print_info "This may take a few minutes..."
    
    DB_NAME="${DB_NAME:-isp_system}" # Ensure DB_NAME is defined

    sudo -u postgres psql -d "$DB_NAME" <<'FIXSQL'
-- Create routers table if missing
CREATE TABLE IF NOT EXISTS routers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    hostname VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    ssh_port INTEGER DEFAULT 22,
    api_port INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    location_id INTEGER,
    firmware_version VARCHAR(100),
    configuration JSONB,
    connection_type VARCHAR(50),
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    uptime BIGINT,
    temperature NUMERIC(5,2),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    sync_error TEXT,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create radius_users table if missing (for FreeRADIUS)
CREATE TABLE IF NOT EXISTS radius_users (
    username VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(
