import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Get database URL from environment
DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    print("❌ DATABASE_URL environment variable not set")
    exit(1)

try:
    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    print("=== Checking Current RADIUS Users ===")
    cursor.execute("SELECT COUNT(*) as count FROM radcheck")
    radcheck_count = cursor.fetchone()['count']
    print(f"Current RADIUS users in radcheck: {radcheck_count}")
    
    print("\n=== Checking Active Customer Services ===")
    cursor.execute("""
        SELECT cs.id, cs.customer_id, cs.status, 
               c.name as customer_name, c.email,
               sp.name as service_plan, sp.download_speed, sp.upload_speed
        FROM customer_services cs
        JOIN customers c ON cs.customer_id = c.id
        LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE cs.status = 'active'
        LIMIT 10
    """)
    services = cursor.fetchall()
    print(f"Active customer services found: {len(services)}")
    
    if services:
        print("\nSample services:")
        for svc in services[:5]:
            print(f"  - Customer: {svc['customer_name']}, Plan: {svc['service_plan']}, "
                  f"Speed: {svc['download_speed']}M/{svc['upload_speed']}M")
    
    # Check if any customers have PPPoE credentials
    print("\n=== Checking PPPoE Credentials ===")
    cursor.execute("""
        SELECT COUNT(*) as count 
        FROM customer_services 
        WHERE pppoe_username IS NOT NULL AND pppoe_username != ''
    """)
    pppoe_count = cursor.fetchone()['count']
    print(f"Services with PPPoE credentials: {pppoe_count}")
    
    # Now provision RADIUS users for services without credentials
    print("\n=== Provisioning RADIUS Users ===")
    
    cursor.execute("""
        SELECT cs.id, cs.customer_id, cs.status,
               c.name as customer_name, c.email, c.phone,
               sp.id as plan_id, sp.name as service_plan, 
               sp.download_speed, sp.upload_speed,
               cs.pppoe_username, cs.pppoe_password
        FROM customer_services cs
        JOIN customers c ON cs.customer_id = c.id
        LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE cs.status = 'active'
    """)
    
    active_services = cursor.fetchall()
    provisioned = 0
    
    for service in active_services:
        username = service['pppoe_username']
        password = service['pppoe_password']
        
        # Generate credentials if missing
        if not username:
            # Use customer email or phone as base
            base = service['email'].split('@')[0] if service['email'] else f"user{service['customer_id']}"
            username = f"{base}_ppp"
        
        if not password:
            import random
            import string
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        
        # Update customer service with credentials
        cursor.execute("""
            UPDATE customer_services 
            SET pppoe_username = %s, pppoe_password = %s
            WHERE id = %s
        """, (username, password, service['id']))
        
        # Check if user already exists in radcheck
        cursor.execute("SELECT username FROM radcheck WHERE username = %s", (username,))
        existing = cursor.fetchone()
        
        if not existing:
            # Insert into radcheck (authentication)
            cursor.execute("""
                INSERT INTO radcheck (username, attribute, op, value)
                VALUES (%s, 'Cleartext-Password', ':=', %s)
            """, (username, password))
            
            # Insert speed limits into radreply
            download_speed = service['download_speed'] or 10
            upload_speed = service['upload_speed'] or 10
            
            cursor.execute("""
                INSERT INTO radreply (username, attribute, op, value)
                VALUES 
                    (%s, 'Mikrotik-Rate-Limit', ':=', %s),
                    (%s, 'Framed-IP-Address', ':=', '0.0.0.0')
            """, (username, f"{upload_speed}M/{download_speed}M", username))
            
            provisioned += 1
            print(f"✓ Provisioned: {username} (Customer: {service['customer_name']}, Speed: {download_speed}M/{upload_speed}M)")
    
    conn.commit()
    
    print(f"\n=== Summary ===")
    print(f"Total RADIUS users provisioned: {provisioned}")
    print(f"Total users in radcheck now: {radcheck_count + provisioned}")
    
    # If no active services, create test user
    if len(active_services) == 0:
        print("\n⚠️  No active customer services found. Creating test user...")
        cursor.execute("""
            INSERT INTO radcheck (username, attribute, op, value)
            VALUES ('testuser', 'Cleartext-Password', ':=', 'testpass123')
            ON CONFLICT (username, attribute) DO NOTHING
        """)
        cursor.execute("""
            INSERT INTO radreply (username, attribute, op, value)
            VALUES 
                ('testuser', 'Mikrotik-Rate-Limit', ':=', '10M/10M'),
                ('testuser', 'Framed-IP-Address', ':=', '0.0.0.0')
            ON CONFLICT (username, attribute) DO NOTHING
        """)
        conn.commit()
        print("✓ Test user created: testuser / testpass123")
    
    cursor.close()
    conn.close()
    
    print("\n✓ RADIUS provisioning complete!")
    print("Your MikroTik router should now be able to authenticate users.")
    
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
