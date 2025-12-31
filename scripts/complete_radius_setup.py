import os
import psycopg2
import random
import string

def generate_password(length=12):
    """Generate a secure random password"""
    chars = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(random.choice(chars) for _ in range(length))

def generate_username(customer_name, customer_id):
    """Generate PPPoE username from customer name"""
    # Remove special characters and spaces, convert to lowercase
    clean_name = ''.join(c for c in customer_name if c.isalnum()).lower()
    return f"{clean_name}{customer_id}"

# Connect to PostgreSQL
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL environment variable not set")
    exit(1)

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    print("=" * 60)
    print("COMPLETE RADIUS SETUP SCRIPT")
    print("=" * 60)
    
    # Step 1: Add PPPoE columns to customer_services if they don't exist
    print("\n[1/4] Adding PPPoE credential columns...")
    cur.execute("""
        ALTER TABLE customer_services 
        ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(255),
        ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(255);
    """)
    conn.commit()
    print("✓ PPPoE columns added to customer_services table")
    
    # Step 2: Get all active customer services without PPPoE credentials
    print("\n[2/4] Finding active services without PPPoE credentials...")
    cur.execute("""
        SELECT 
            cs.id as service_id,
            cs.customer_id,
            c.name as customer_name,
            cs.status,
            sp.name as plan_name,
            sp.download_speed,
            sp.upload_speed
        FROM customer_services cs
        JOIN customers c ON cs.customer_id = c.id
        LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE cs.status = 'active'
        AND (cs.pppoe_username IS NULL OR cs.pppoe_password IS NULL)
        LIMIT 100;
    """)
    services = cur.fetchall()
    print(f"✓ Found {len(services)} active services needing PPPoE credentials")
    
    # Step 3: Generate and save PPPoE credentials
    print("\n[3/4] Generating PPPoE credentials...")
    provisioned_count = 0
    
    for service in services:
        service_id, customer_id, customer_name, status, plan_name, download_speed, upload_speed = service
        
        # Generate credentials
        username = generate_username(customer_name, customer_id)
        password = generate_password()
        
        # Save to customer_services
        cur.execute("""
            UPDATE customer_services
            SET pppoe_username = %s, pppoe_password = %s
            WHERE id = %s
        """, (username, password, service_id))
        
        print(f"  Generated: {username} for customer {customer_name}")
        provisioned_count += 1
    
    conn.commit()
    print(f"✓ Generated credentials for {provisioned_count} services")
    
    # Step 4: Provision to FreeRADIUS radcheck and radreply tables
    print("\n[4/4] Provisioning to FreeRADIUS tables...")
    
    # Get all services with PPPoE credentials
    cur.execute("""
        SELECT 
            cs.pppoe_username,
            cs.pppoe_password,
            sp.download_speed,
            sp.upload_speed,
            c.name as customer_name
        FROM customer_services cs
        JOIN customers c ON cs.customer_id = c.id
        LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE cs.status = 'active'
        AND cs.pppoe_username IS NOT NULL
        AND cs.pppoe_password IS NOT NULL;
    """)
    radius_users = cur.fetchall()
    
    radius_count = 0
    for username, password, download_speed, upload_speed, customer_name in radius_users:
        # Insert into radcheck (authentication)
        cur.execute("""
            INSERT INTO radcheck (username, attribute, op, value)
            VALUES (%s, 'Cleartext-Password', ':=', %s)
            ON CONFLICT (username, attribute) 
            DO UPDATE SET value = EXCLUDED.value;
        """, (username, password))
        
        # Insert into radreply (speed limits in MikroTik format)
        download_limit = f"{int(download_speed or 10)}M/{int(download_speed or 10)}M"
        upload_limit = f"{int(upload_speed or 10)}M/{int(upload_speed or 10)}M"
        
        # MikroTik-Rate-Limit format: "upload/download"
        rate_limit = f"{upload_limit} {download_limit}"
        
        cur.execute("""
            INSERT INTO radreply (username, attribute, op, value)
            VALUES (%s, 'Mikrotik-Rate-Limit', ':=', %s)
            ON CONFLICT (username, attribute)
            DO UPDATE SET value = EXCLUDED.value;
        """, (username, rate_limit))
        
        print(f"  Provisioned: {username} ({download_speed}↓/{upload_speed}↑ Mbps)")
        radius_count += 1
    
    conn.commit()
    print(f"✓ Provisioned {radius_count} users to FreeRADIUS")
    
    # Summary
    print("\n" + "=" * 60)
    print("SETUP COMPLETE!")
    print("=" * 60)
    print(f"✓ Database schema updated")
    print(f"✓ {provisioned_count} new PPPoE credentials generated")
    print(f"✓ {radius_count} users provisioned to FreeRADIUS")
    print(f"\nYour MikroTik router can now authenticate these users!")
    print("=" * 60)
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    if conn:
        conn.rollback()
    exit(1)
