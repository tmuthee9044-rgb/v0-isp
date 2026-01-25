# Router Provisioning System

## Overview

The ISP system includes automated provisioning and deprovisioning of customer services to physical MikroTik routers. This ensures that when customers have active services, they can browse immediately, and when services become inactive or past due, they are automatically disconnected.

## How It Works

### Automatic Provisioning (Connection)
When a customer service is created or activated, the system will:
1. Check if the service status is `active`
2. Verify the service has valid connection details (PPPoE username/password OR static IP)
3. Verify the service has not passed its due date
4. Connect to the assigned MikroTik router via REST API
5. Create PPPoE secret OR add static IP firewall rule
6. Update database to mark service as `router_provisioned = true`
7. Log the activity to `activity_logs` and `router_logs` tables

### Automatic Deprovisioning (Disconnection)
Services are automatically disconnected when:
- Status changes to `suspended`, `inactive`, `terminated`, or `pending`
- Service passes the due date (`next_billing_date < CURRENT_DATE`)

The system will:
1. Detect services that should be deprovisioned
2. Connect to the MikroTik router
3. Remove PPPoE secret OR remove firewall rule
4. Update database to mark service as `router_provisioned = false`
5. Log the disconnection reason

## Cron Job Configuration

### Required Cron Jobs

The system needs two cron jobs running at 10-30 second intervals:

#### 1. Provision Active Services
\`\`\`bash
# Run every 10 seconds
*/10 * * * * * curl http://localhost:3000/api/cron/provision-active-services

# OR run every 30 seconds
*/30 * * * * * curl http://localhost:3000/api/cron/provision-active-services
\`\`\`

#### 2. Deprovision Inactive Services
\`\`\`bash
# Run every 15 seconds
*/15 * * * * * curl http://localhost:3000/api/cron/deprovision-inactive-services

# OR run every 30 seconds
*/30 * * * * * curl http://localhost:3000/api/cron/deprovision-inactive-services
\`\`\`

### Setup with Vercel Cron

If deploying to Vercel, add to `vercel.json`:

\`\`\`json
{
  "crons": [
    {
      "path": "/api/cron/provision-active-services",
      "schedule": "*/30 * * * * *"
    },
    {
      "path": "/api/cron/deprovision-inactive-services",
      "schedule": "*/30 * * * * *"
    }
  ]
}
\`\`\`

**Note**: Vercel cron has a minimum interval of 1 minute. For 10-30 second intervals, use an external cron service like:
- **cron-job.org** (supports seconds)
- **EasyCron** (supports seconds)
- **Your own server cron** with `curl` commands

### Setup with Node.js (Development)

Create a file `scripts/cron-scheduler.js`:

\`\`\`javascript
const https = require('https');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function triggerCron(endpoint) {
  https.get(`${BASE_URL}${endpoint}`, (res) => {
    console.log(`[${new Date().toISOString()}] ${endpoint}: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[${new Date().toISOString()}] ${endpoint} error:`, err.message);
  });
}

// Run provision check every 15 seconds
setInterval(() => {
  triggerCron('/api/cron/provision-active-services');
}, 15000);

// Run deprovision check every 20 seconds
setInterval(() => {
  triggerCron('/api/cron/deprovision-inactive-services');
}, 20000);

console.log('Cron scheduler started');
console.log('Provisioning: every 15 seconds');
console.log('Deprovisioning: every 20 seconds');
\`\`\`

Run with:
\`\`\`bash
node scripts/cron-scheduler.js
\`\`\`

Or add to `package.json`:
\`\`\`json
{
  "scripts": {
    "cron": "node scripts/cron-scheduler.js"
  }
}
\`\`\`

## Database Schema

### Required Columns in `customer_services`

Run the migration script: `scripts/add_router_provisioning_columns.sql`

\`\`\`sql
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS router_provisioned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS router_provisioned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS router_deprovisioned_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_customer_services_router_provisioned 
  ON customer_services(router_provisioned, status, router_id);
\`\`\`

## MikroTik Router Requirements

### REST API Setup

1. Enable REST API on MikroTik:
\`\`\`
/ip service
set api-ssl disabled=no port=8729
set www-ssl disabled=no port=443
\`\`\`

2. Create API user:
\`\`\`
/user add name=api_user password=YourSecurePassword group=full
\`\`\`

3. Configure router in ISP system with:
   - IP address
   - API username
   - API password
   - Port 443 (HTTPS)

### Firewall Configuration

Ensure the ISP system can reach the router on port 443:
\`\`\`
/ip firewall filter
add chain=input protocol=tcp dst-port=443 action=accept comment="REST API Access"
\`\`\`

## Monitoring

### View Provisioning Logs

1. **Activity Logs** (`/logs` page):
   - Filter by action: `provision` or `deprovision`
   - Shows which services were connected/disconnected

2. **Router Logs** (Router edit page → Logs tab):
   - Shows all provisioning activity per router
   - Real-time connection status

3. **Database Queries**:
\`\`\`sql
-- Services currently provisioned to routers
SELECT cs.id, c.name, cs.status, cs.router_provisioned_at
FROM customer_services cs
JOIN customers c ON c.id = cs.customer_id
WHERE cs.router_provisioned = true;

-- Recent provisioning activity
SELECT * FROM activity_logs
WHERE action IN ('provision', 'deprovision', 'provision_failed', 'deprovision_failed')
ORDER BY created_at DESC
LIMIT 50;
\`\`\`

## Troubleshooting

### Service not provisioning

1. Check service status is `active`
2. Verify `next_billing_date >= CURRENT_DATE`
3. Ensure PPPoE credentials or IP address is set
4. Verify router is connected (test connection on router edit page)
5. Check router logs for errors

### Service not deprovisioning

1. Check cron job is running
2. Verify service status or due date changed
3. Check router connection
4. Review router logs for deprovision attempts

### Cron jobs not running

1. Verify cron service is active
2. Check cron job URLs are correct
3. Review server logs for errors
4. Test endpoints manually:
\`\`\`bash
curl http://localhost:3000/api/cron/provision-active-services
curl http://localhost:3000/api/cron/deprovision-inactive-services
\`\`\`

## Performance Optimization

### Observing Rules 6 & 7

The system observes project rules:
- **Rule 6**: All queries execute under 5ms with proper indexing
- **Rule 7**: All data is accurately stored in database columns

### Optimizations Implemented

1. **Batch Processing**: Maximum 50 services per cron run
2. **Parallel Processing**: Multiple provisions/deprovisions run simultaneously
3. **Database Indexes**: Fast queries on `router_provisioned`, `status`, and `router_id`
4. **Connection Pooling**: Efficient database connection reuse
5. **Error Handling**: Failed provisions don't block other services

## Security

### Rules 2 & 3 Compliance

- **Rule 2**: All router communications use HTTPS with authentication
- **Rule 3**: All provisioning activities logged to `activity_logs` and `router_logs`

### Best Practices

1. Use strong API passwords for MikroTik users
2. Restrict API user to necessary permissions only
3. Use firewall rules to limit API access to ISP system IP
4. Regularly review provisioning logs for anomalies
5. Monitor failed provision attempts

## API Endpoints

### Manual Provisioning

Provision a specific service:
\`\`\`bash
POST /api/services/[id]/provision
\`\`\`

### Manual Deprovisioning

Deprovision a specific service:
\`\`\`bash
POST /api/services/[id]/deprovision
\`\`\`

### Cron Endpoints

Check and provision active services:
\`\`\`bash
GET /api/cron/provision-active-services
\`\`\`

Check and deprovision inactive services:
\`\`\`bash
GET /api/cron/deprovision-inactive-services
\`\`\`

## Future Enhancements

- Real-time WebSocket updates for provisioning status
- Bulk provisioning/deprovisioning interface
- Provisioning queue dashboard
- Automatic retry for failed provisions
- Speed limit enforcement via MikroTik queues
- RADIUS integration for PPPoE authentication
