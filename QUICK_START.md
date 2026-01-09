# Quick Start Guide

## Automatic Installation & Startup

Run this single command to install and start the system automatically:

```bash
bash scripts/install-and-start.sh
```

This script will:
1. Check Node.js and npm versions (requires Node.js 20+)
2. Install all dependencies
3. Automatically start the development server at http://localhost:3000

## Manual Installation

If you prefer to install and start separately:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## First Time Setup

After the system starts:

1. Access the system at http://localhost:3000
2. Complete database setup (migrations will run automatically)
3. Configure FreeRADIUS settings at /settings/servers
4. Add your first router and customers

## Environment Variables

Create a `.env.local` file with:

```
DATABASE_URL=postgresql://user:password@localhost:5432/isp_system
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Troubleshooting

If auto-start doesn't work after `npm install`, manually start with:

```bash
npm run dev
```

To skip pre-flight checks:

```bash
npm run dev:skip-checks
