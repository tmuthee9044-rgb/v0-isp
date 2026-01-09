# Troubleshooting Guide

## NPM Dependency Conflicts

If you encounter React version conflicts during installation:

\`\`\`bash
npm error peer react@"^19.2.0" from react-dom@19.2.0
\`\`\`

**Solution:**

Run the fix script:
\`\`\`bash
chmod +x fix-npm.sh
./fix-npm.sh
\`\`\`

Or manually:
\`\`\`bash
rm -rf node_modules package-lock.json .next
npm cache clean --force
npm install --legacy-peer-deps
\`\`\`

## Database Connection Issues

If the system can't connect to PostgreSQL:

1. **Verify PostgreSQL is running:**
   \`\`\`bash
   sudo systemctl status postgresql  # Linux
   brew services list                 # macOS
   \`\`\`

2. **Check environment variables:**
   \`\`\`bash
   cat .env.local
   \`\`\`
   Should show: `DATABASE_URL=postgresql://isp_admin:...@localhost:5432/isp_system`

3. **Test database connection:**
   \`\`\`bash
   psql -U isp_admin -d isp_system -h localhost
   \`\`\`

4. **Check credentials:**
   \`\`\`bash
   cat database-credentials.txt
   \`\`\`

## Slow Performance

If the system loads slowly:

1. **Run performance indexes:**
   \`\`\`bash
   psql -U isp_admin -d isp_system -h localhost -f scripts/performance_indexes.sql
   \`\`\`

2. **Clear Next.js cache:**
   \`\`\`bash
   rm -rf .next
   npm run build
   \`\`\`

3. **Restart the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

## Installation Script Errors

If `./install.sh` fails with syntax errors:

1. **Fix line endings:**
   \`\`\`bash
   sed -i 's/\r$//' install.sh
   chmod +x install.sh
   \`\`\`

2. **Run the installation:**
   \`\`\`bash
   ./install.sh
   \`\`\`

## Quick Commands

- **Start development server:** `npm run dev`
- **Build for production:** `npm run build`
- **Start production server:** `npm start`
- **Fix npm issues:** `./fix-npm.sh`
- **Full reinstall:** `./install.sh`
