import os
import psycopg2

# Get database URL from environment
database_url = os.environ.get('DATABASE_URL')

if not database_url:
    print("ERROR: DATABASE_URL environment variable not set")
    exit(1)

try:
    # Connect to database
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    
    print("Adding pppoe_username and pppoe_password columns to customer_services table...")
    
    # Add columns if they don't exist
    cursor.execute("""
        ALTER TABLE customer_services 
        ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100),
        ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
    """)
    
    conn.commit()
    print("✓ Successfully added PPPoE columns to customer_services table")
    
    # Verify columns were added
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'customer_services' 
        AND column_name IN ('pppoe_username', 'pppoe_password');
    """)
    
    columns = cursor.fetchall()
    print(f"\nVerified columns:")
    for col in columns:
        print(f"  - {col[0]}: {col[1]}")
    
    cursor.close()
    conn.close()
    
    print("\n✓ Database updated successfully!")
    print("Customers can now be activated with PPPoE credentials after payment.")
    
except Exception as e:
    print(f"ERROR: {e}")
    exit(1)
