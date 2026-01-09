-- Fix locations table schema to match Neon database
-- Add missing columns if they don't exist

DO $$ 
BEGIN
    -- Add city column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='locations' AND column_name='city') THEN
        ALTER TABLE locations ADD COLUMN city VARCHAR(100);
    END IF;

    -- Add region column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='locations' AND column_name='region') THEN
        ALTER TABLE locations ADD COLUMN region VARCHAR(100);
    END IF;

    -- Add address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='locations' AND column_name='address') THEN
        ALTER TABLE locations ADD COLUMN address TEXT;
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='locations' AND column_name='description') THEN
        ALTER TABLE locations ADD COLUMN description TEXT;
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='locations' AND column_name='status') THEN
        ALTER TABLE locations ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='locations' AND column_name='updated_at') THEN
        ALTER TABLE locations ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;
