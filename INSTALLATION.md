# ISP Management System - Installation Guide

## Quick Start (Recommended)

### Linux/macOS
\`\`\`bash
chmod +x install.sh
./install.sh
\`\`\`

### Windows
1. Right-click `install.bat` and select "Run as administrator"
2. Follow the prompts

## Manual Installation

### Prerequisites
- **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux)
- **Docker Compose** v2.0+
- **Node.js** v18+ (for development)
- **Git** (to clone the repository)

### System Requirements
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 10GB free space
- **OS**: Linux (Ubuntu 20.04+), macOS (10.15+), Windows 10/11

### Step-by-Step Installation

#### 1. Clone the Repository
\`\`\`bash
git clone <repository-url>
cd isp-management-system
\`\`\`

#### 2. Install Dependencies

**Linux (Ubuntu/Debian):**
\`\`\`bash
# Update package list
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
\`\`\`

**macOS:**
\`\`\`bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Docker Desktop
brew install --cask docker

# Install Node.js
brew install node@18
\`\`\`

**Windows:**
1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Download and install [Node.js](https://nodejs.org/)
3. Restart your computer

#### 3. Configure Environment
\`\`\`bash
# Copy environment template
cp .env.example .env

# Edit configuration (optional)
nano .env
\`\`\`

#### 4. Start the System
\`\`\`bash
# Build and start all services
docker-compose up -d --build

# Wait for services to initialize (about 2-3 minutes)
docker-compose logs -f
\`\`\`

#### 5. Initialize Database
\`\`\`bash
# Run database migrations
docker-compose exec mysql mysql -u isp_user -pisp_password_2024 isp_system < scripts/028_create_customer_services_and_payments.sql
# ... repeat for all script files
\`\`\`

## Access Points

After successful installation:

- **Web Interface**: http://localhost:3000
- **Database**: localhost:3306
- **RADIUS Server**: localhost:1812 (Auth), localhost:1813 (Accounting)
- **OpenVPN Server**: localhost:1194
- **Redis Cache**: localhost:6379

## Default Credentials

**Database:**
- Username: `isp_user`
- Password: `isp_password_2024`
- Database: `isp_system`

**Application:**
- Initial setup will create admin user

## Troubleshooting

### Common Issues

**Docker not starting:**
\`\`\`bash
# Check Docker status
sudo systemctl status docker

# Start Docker service
sudo systemctl start docker
\`\`\`

**Port conflicts:**
\`\`\`bash
# Check what's using port 3000
sudo lsof -i :3000

# Stop conflicting services or change ports in docker-compose.yml
\`\`\`

**Database connection issues:**
\`\`\`bash
# Check database logs
docker-compose logs mysql

# Restart database
docker-compose restart mysql
\`\`\`

**Permission issues (Linux):**
\`\`\`bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
\`\`\`

### Logs and Monitoring

\`\`\`bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f isp_app
docker-compose logs -f mysql

# Check service status
docker-compose ps
\`\`\`

## Production Deployment

### Security Checklist
- [ ] Change all default passwords
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Enable database backups
- [ ] Configure monitoring
- [ ] Update environment variables

### SSL Configuration
1. Obtain SSL certificates
2. Place certificates in `./ssl/` directory
3. Update `nginx.conf` for HTTPS
4. Restart nginx: `docker-compose restart nginx`

### Backup Configuration
\`\`\`bash
# Database backup
docker-compose exec mysql mysqldump -u isp_user -pisp_password_2024 isp_system > backup.sql

# Full system backup
docker-compose down
tar -czf isp-backup-$(date +%Y%m%d).tar.gz .
\`\`\`

## Support

For issues and support:
1. Check the logs: `docker-compose logs -f`
2. Review this documentation
3. Check Docker and system requirements
4. Contact system administrator

## Uninstallation

\`\`\`bash
# Stop and remove containers
docker-compose down -v

# Remove images (optional)
docker-compose down --rmi all

# Remove volumes (WARNING: This deletes all data)
docker volume prune
