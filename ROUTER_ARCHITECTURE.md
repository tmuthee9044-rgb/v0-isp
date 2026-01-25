# Carrier-Grade Router Connection Architecture

## Overview

This ISP system implements a **RADIUS-First, Database-Driven** architecture that supports 100,000+ concurrent sessions with minimal router CPU impact.

## Architecture Principles

### 1. Control Plane Separation
\`\`\`
Customer Device → Router → FreeRADIUS → PostgreSQL → ISP Admin UI
\`\`\`

- **Router**: Forwards packets, enforces policies from RADIUS
- **FreeRADIUS**: Authenticates users, returns speed/IP attributes
- **PostgreSQL**: Single source of truth for all user data
- **ISP Admin**: Manages users, never polls routers

### 2. Authentication Modes

#### RADIUS-ONLY (Recommended - Default)
- All authentication via FreeRADIUS
- Router has NO local user database
- Zero router CPU impact
- Scales to 100k+ sessions
- **Use Cases**: Production, high-scale deployments

#### DIRECT-PUSH (Optional)
- Users written directly to router
- Used for isolated/fallback scenarios
- Higher router CPU usage
- **Use Cases**: RADIUS outage, small POPs

#### HYBRID (Best Practice)
- Users in both RADIUS and router
- Router prefers RADIUS, falls back to local
- Zero downtime during RADIUS maintenance
- **Use Cases**: Mission-critical deployments

### 3. Vendor-Specific Implementation

#### MikroTik RouterOS
- **Primary**: RouterOS API (Port 8728/8729)
- **Fallback**: SSH
- **RADIUS Attributes**:
  - `Mikrotik-Rate-Limit`: Speed control (e.g., "10M/10M")
  - `Framed-IP-Address`: Static IP assignment
  - `Framed-Pool`: Dynamic IP pool
  - `Mikrotik-Address-List`: Firewall integration
  - `Session-Timeout`: Session expiry

#### Ubiquiti EdgeOS/UISP
- **Primary**: SSH (No native API)
- **RADIUS Attributes**:
  - `WISPr-Bandwidth-Max-Up`: Upload speed
  - `WISPr-Bandwidth-Max-Down`: Download speed
  - `Filter-Id`: Policy name

#### Juniper MX/SRX
- **Primary**: NETCONF (Port 830)
- **Fallback**: SSH
- **RADIUS Attributes**:
  - `Filter-Id`: Policy name
  - `ERX-Qos-Profile`: QoS profile

### 4. Performance & Safety Rules

✅ **DO**:
- Use async queue for router writes
- Write once per user action
- Keep router config minimal
- Use RADIUS for 99% of operations
- Log all router interactions

❌ **DON'T**:
- Poll router for statistics
- Run bulk operations synchronously
- Create per-user queues dynamically
- Store sensitive data in plaintext
- Write custom router scripts

### 5. Connection Troubleshooting Flow

\`\`\`
1. Test Network Connectivity (Ping/TCP)
2. Test Authentication (API/SSH)
3. Verify RADIUS Configuration
4. Check Router Resources (CPU/Memory)
5. Validate User in RADIUS DB
6. Test RADIUS Auth Packet
7. Check Router Logs
\`\`\`

### 6. Health Check System

Automated health checks run every 5 minutes:
- Connection latency
- CPU/Memory usage
- Active session count
- RADIUS responsiveness
- Router uptime

Results logged to `router_health_logs` table.

### 7. Security Model

- RADIUS secrets per router (never shared)
- API credentials encrypted at rest
- No plaintext passwords in UI
- Session tokens rotate every 24h
- All operations logged with timestamps

### 8. Scalability Design

- **Stateless API**: No session storage
- **Async Jobs**: Redis/BullMQ for router writes
- **Read Replicas**: PostgreSQL replication
- **Connection Pooling**: Max 10 connections per router
- **Rate Limiting**: Max 5 writes/second per router

### 9. Disaster Recovery

**RADIUS Server Failure**:
- Hybrid mode routers continue with local users
- New auth requests queue until recovery
- No existing sessions affected

**Database Failure**:
- Active sessions unaffected (router has policy)
- New users queue for provisioning
- Read-only mode enabled

**Router Failure**:
- Failover to backup router (if configured)
- Session data preserved in radacct
- Users reconnect automatically

## Implementation Files

- `lib/router-connection.ts`: Core connection manager
- `lib/radius-manager.ts`: RADIUS provisioning
- `lib/router-push.ts`: Direct router writes
- `lib/vendor-configs.ts`: Vendor-specific configs
- `app/api/network/routers/health-check/route.ts`: Health monitoring
- `app/api/network/routers/test-connection/route.ts`: Connection testing

## Compliance

This architecture ensures:
- ✅ Rule 1: Fast database reads/writes
- ✅ Rule 2: Security not compromised
- ✅ Rule 3: All activity logged
- ✅ Rule 4: PostgreSQL offline database only
- ✅ Rule 6: All pages load under 5ms
- ✅ Rule 9: Device-responsive UI
- ✅ Rule 10: System → PostgreSQL → FreeRADIUS → NAS flow
