import os
import psycopg2
from psycopg2.extras import RealDictCursor
import secrets
import string

def generate_password(length=12):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def provision_customer_to_radius():
    """Provision customer 2004's active services to FreeRADIUS"""
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not found")
        return
    
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        print("🔍 Checking customer 2004's active services...")
        
        # Get all active services for customer 2004
        cur.execute("""
            SELECT 
                cs.id as service_id,
                cs.customer_id,
                cs.ip_address,
                cs.status,
                c.first_name,
                c.last_name,
                c.email,
                sp.name as plan_name,
                sp.speed_download,
                sp.speed_upload,
                sp.data_limit
            FROM customer_services cs
            JOIN customers c ON cs.customer_id = c.id
            LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
            WHERE cs.customer_id = 2004 
            AND cs.status = 'active'
        """)
        
        services = cur.fetchall()
        
        if not services:
            print("❌ No active services found for customer 2004")
            conn.close()
            return
        
        print(f"✅ Found {len(services)} active service(s) for customer 2004")
        
        for service in services:
            print(f"\n📋 Processing service {service['service_id']}...")
            print(f"   Customer: {service['first_name']} {service['last_name']}")
            print(f"   Plan: {service['plan_name']}")
            print(f"   IP: {service['ip_address']}")
            print(f"   Download: {service['speed_download']} Mbps")
            print(f"   Upload: {service['speed_upload']} Mbps")
            
            # Generate PPPoE username from email or customer ID
            if service['email']:
                username = service['email'].split('@')[0] + str(service['customer_id'])
            else:
                username = f"customer{service['customer_id']}"
            
            password = generate_password()
            
            print(f"   Generated credentials:")
            print(f"   Username: {username}")
            print(f"   Password: {password}")
            
            # Check if already exists in radcheck
            cur.execute("SELECT username FROM radcheck WHERE username = %s", (username,))
            existing = cur.fetchone()
            
            if existing:
                print(f"   ⚠️  User already exists in RADIUS, updating password...")
                # Update password
                cur.execute("""
                    UPDATE radcheck 
                    SET value = %s 
                    WHERE username = %s AND attribute = 'Cleartext-Password'
                """, (password, username))
            else:
                print(f"   ➕ Creating new RADIUS user...")
                # Insert into radcheck (authentication)
                cur.execute("""
                    INSERT INTO radcheck (username, attribute, op, value)
                    VALUES (%s, 'Cleartext-Password', ':=', %s)
                """, (username, password))
            
            # Delete existing radreply entries for this user
            cur.execute("DELETE FROM radreply WHERE username = %s", (username,))
            
            # Convert speeds from Mbps to bits per second for MikroTik
            download_bps = int(service['speed_download'] * 1000000) if service['speed_download'] else 10000000
            upload_bps = int(service['speed_upload'] * 1000000) if service['speed_upload'] else 10000000
            
            # Insert into radreply (authorization attributes) - MikroTik format
            attributes = [
                (username, 'Mikrotik-Rate-Limit', ':=', f"{upload_bps}/{download_bps}"),
                (username, 'Framed-IP-Address', ':=', service['ip_address'] or '0.0.0.0'),
            ]
            
            for attr in attributes:
                cur.execute("""
                    INSERT INTO radreply (username, attribute, op, value)
                    VALUES (%s, %s, %s, %s)
                """, attr)
            
            print(f"   ✅ Successfully provisioned to FreeRADIUS!")
            print(f"   📡 Physical router can now authenticate this user")
            print(f"   🔒 Rate limit: {service['speed_upload']}Mbps up / {service['speed_download']}Mbps down")
        
        conn.commit()
        cur.close()
        conn.close()
        
        print("\n" + "="*60)
        print("✅ Customer 2004 is now fully provisioned to FreeRADIUS")
        print("📡 The physical router can now authenticate their PPPoE connection")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    provision_customer_to_radius()
