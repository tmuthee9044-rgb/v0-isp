# Billing & Service Lifecycle Architecture

## Core Principles

1. **Money Controls Time, Not Status** - Service validity is determined by paid time windows, not arbitrary status flags
2. **RADIUS Decides Access** - Authentication happens at the RADIUS layer, not on routers
3. **Database is Source of Truth** - All state transitions are deterministic and stored in PostgreSQL
4. **No Router Cron Jobs** - Routers never calculate dates or run billing logic
5. **Immutable Formula** - `paid_days = floor(payment_amount / daily_rate)`

## Data Flow

\`\`\`
Payment Received
    ↓
Calculate Paid Days (daily_rate = plan.price / plan.billing_cycle_days)
    ↓
Extend service_end = max(now, current_service_end) + paid_days
    ↓
Update is_active = true, is_suspended = false
    ↓
RADIUS checks: NOW() BETWEEN service_start AND service_end
    ↓
Access Granted/Denied
\`\`\`

## Key Tables

### customer_services
- `service_start` / `service_end` - The authoritative time window
- `is_active` - Service can be used
- `is_suspended` - Service is blocked (expired or manual)
- `is_deleted` - Soft delete (keeps audit trail)

### payments
- Links to `service_id`
- Records `amount`, `method`, `reference`
- Triggers service extension via `activateService()`

### service_events
- Audit trail of all state changes
- Tracks activated, extended, suspended, deleted events

## Automated Suspension

Every 5 minutes, call: `POST /api/billing/suspend-expired`

\`\`\`sql
UPDATE customer_services
SET is_suspended = true
WHERE service_end < NOW()
AND is_active = true
AND is_suspended = false;
\`\`\`

## RADIUS Integration

FreeRADIUS queries the database for authorization:

\`\`\`sql
SELECT 1
FROM customer_services
WHERE pppoe_username = :username
AND is_active = true
AND is_suspended = false
AND is_deleted = false
AND NOW() BETWEEN service_start AND service_end;
\`\`\`

If this returns a row → Access-Accept
If no row → Access-Reject

## Payment Processing

1. Admin receives payment (cash, M-Pesa, bank)
2. Call `/api/billing/process-payment` with amount
3. System calculates days: `floor(amount / daily_rate)`
4. Extends service_end from current expiry or now
5. Updates is_active = true, is_suspended = false
6. Logs event to service_events

## Notifications

System schedules notifications at:
- 5 days before expiry
- 2 days before expiry
- On suspension
- On reactivation

## Performance Guarantees

- Single indexed timestamp check for 100K+ users
- No router polling required
- Stateless API design
- Sub-5ms authentication queries per rule 6
