#!/usr/bin/env python3
import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Connect to database
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    exit(1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

print("=" * 60)
print("RADIUS USER PROVISIONING")
print("=" * 60)

# Get all active customer services that need RADIUS users
cur.execute("""
    SELECT 
        cs.id as service_id,
        cs.customer_id,
        c.first_name,
        c.last_name,
        c.email,
        cs.pppoe_username,
        cs.pppoe_password,
        sp.download_speed,
        sp.upload_speed,
        sp.name as plan_name
    FROM customer_services cs
    JOIN customers c ON c.id = cs.customer_id
    JOIN service_plans sp ON sp.id = cs.service_plan_id
    WHERE cs.status = 'active'
    AND cs.pppoe_username IS NOT NULL
    AND cs.pppoe_password IS NOT NULL
""")

services = cur.fetchall()
print(f"\nFound {len(services)} active services with PPPoE credentials")

if len(services) == 0:
    print("\nNo services found. Creating test user...")
    # Create a test user for immediate testing
    test_username = "testuser"
    test_password = "testpass123"
    
    # Check if test user exists in radcheck
    cur.execute("SELECT username FROM radcheck WHERE username = %s", (test_username,))
    if cur.fetchone():
        print(f"Test user '{test_username}' already exists in radcheck")
    else:
        # Insert test user
        cur.execute("""
            INSERT INTO radcheck (username, attribute, op, value)
            VALUES 
                (%s, 'Cleartext-Password', ':=', %s)
        """, (test_username, test_password))
        print(f"✓ Created test user: {test_username} / {test_password}")
        
        # Add speed limits for test user
        cur.execute("""
            INSERT INTO radreply (username, attribute, op, value)
            VALUES 
                (%s, 'Mikrotik-Rate-Limit', ':=', '10M/10M')
        """, (test_username,))
        print(f"✓ Added speed limit: 10Mbps download/upload")
    
    conn.commit()
    print("\n" + "=" * 60)
    print("TEST USER READY")
    print("=" * 60)
    print(f"Username: {test_username}")
    print(f"Password: {test_password}")
    print("\nTry connecting via PPPoE from your MikroTik router")
    print("=" * 60)
    
else:
    provisioned = 0
    updated = 0
    
    for service in services:
        username = service['pppoe_username']
        password = service['pppoe_password']
        download = service['download_speed'] or 10
        upload = service['upload_speed'] or 10
        
        # Check if user exists in radcheck
        cur.execute("SELECT username FROM radcheck WHERE username = %s", (username,))
        existing = cur.fetchone()
        
        if existing:
            # Update password
            cur.execute("""
                UPDATE radcheck 
                SET value = %s 
                WHERE username = %s AND attribute = 'Cleartext-Password'
            """, (password, username))
            updated += 1
            action = "Updated"
        else:
            # Insert new user
            cur.execute("""
                INSERT INTO radcheck (username, attribute, op, value)
                VALUES (%s, 'Cleartext-Password', ':=', %s)
            """, (username, password))
            provisioned += 1
            action = "Created"
        
        # Delete old speed limits
        cur.execute("DELETE FROM radreply WHERE username = %s", (username,))
        
        # Insert speed limits in MikroTik format
        rate_limit = f"{download}M/{upload}M"
        cur.execute("""
            INSERT INTO radreply (username, attribute, op, value)
            VALUES (%s, 'Mikrotik-Rate-Limit', ':=', %s)
        """, (username, rate_limit))
        
        print(f"{action}: {username} ({service['first_name']} {service['last_name']}) - {rate_limit}")
    
    conn.commit()
    
    print("\n" + "=" * 60)
    print("PROVISIONING COMPLETE")
    print("=" * 60)
    print(f"New users created: {provisioned}")
    print(f"Existing users updated: {updated}")
    print(f"Total RADIUS users: {provisioned + updated}")
    print("\nYour MikroTik router can now authenticate these users via RADIUS")
    print("=" * 60)

# Verify radcheck table
cur.execute("SELECT COUNT(*) as total FROM radcheck")
total = cur.fetchone()['total']
print(f"\nTotal users in radcheck table: {total}")

cur.close()
conn.close()
