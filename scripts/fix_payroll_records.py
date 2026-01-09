import os
import psycopg2
from urllib.parse import urlparse

# Get database URL from environment
database_url = os.environ.get('DATABASE_URL')

if not database_url:
    print("ERROR: DATABASE_URL environment variable not found")
    exit(1)

# Parse the database URL
result = urlparse(database_url)

try:
    # Connect to PostgreSQL
    conn = psycopg2.connect(
        database=result.path[1:],
        user=result.username,
        password=result.password,
        host=result.hostname,
        port=result.port
    )
    
    cursor = conn.cursor()
    
    print("Connected to database successfully")
    
    # Add the employee_name column if it doesn't exist
    print("Adding employee_name column to payroll_records table...")
    cursor.execute("""
        ALTER TABLE payroll_records 
        ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255);
    """)
    
    conn.commit()
    print("✓ Successfully added employee_name column")
    
    # Verify the column was added
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'payroll_records'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    print("\nCurrent payroll_records table structure:")
    for col in columns:
        print(f"  - {col[0]}: {col[1]}")
    
    cursor.close()
    conn.close()
    
    print("\n✓ Payroll records table fixed successfully!")
    print("You can now generate payroll without errors.")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    exit(1)
