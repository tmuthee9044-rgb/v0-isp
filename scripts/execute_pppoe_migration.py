#!/usr/bin/env python3
"""
Execute PPPoE credentials migration immediately
Adds pppoe_username and pppoe_password columns to customer_services table
"""

import os
import psycopg2
from psycopg2 import sql

def execute_migration():
    """Execute the PPPoE credentials migration"""
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        return False
    
    try:
        # Connect to database
        print("Connecting to database...")
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        print("Adding pppoe_username and pppoe_password columns...")
        
        # Add columns
        cur.execute("""
            ALTER TABLE customer_services 
            ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(255),
            ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(255)
        """)
        
        # Add index
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
            ON customer_services(pppoe_username)
        """)
        
        # Commit changes
        conn.commit()
        
        print("✓ Successfully added PPPoE credential columns")
        print("✓ Created index on pppoe_username")
        
        # Verify columns exist
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'customer_services' 
            AND column_name IN ('pppoe_username', 'pppoe_password')
        """)
        
        columns = cur.fetchall()
        print(f"✓ Verified columns: {[col[0] for col in columns]}")
        
        cur.close()
        conn.close()
        
        print("\n✓ Migration completed successfully!")
        print("✓ PPPoE credentials can now be saved to customer_services table")
        print("✓ Payment activation will now provision RADIUS users correctly")
        
        return True
        
    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = execute_migration()
    exit(0 if success else 1)
