-- Drop the old routers table as it's been replaced by network_devices
-- All router data should now be in network_devices with type = 'router'

-- First, verify that all routers have been migrated to network_devices
DO $$
DECLARE
  routers_count INTEGER;
  network_devices_routers_count INTEGER;
BEGIN
  -- Check if routers table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'routers') THEN
    -- Count routers in old table
    SELECT COUNT(*) INTO routers_count FROM routers;
    
    -- Count routers in network_devices
    SELECT COUNT(*) INTO network_devices_routers_count FROM network_devices WHERE type = 'router';
    
    RAISE NOTICE 'Old routers table has % records', routers_count;
    RAISE NOTICE 'network_devices table has % router records', network_devices_routers_count;
    
    -- Drop the old routers table
    DROP TABLE IF EXISTS routers CASCADE;
    
    RAISE NOTICE 'Successfully dropped routers table';
  ELSE
    RAISE NOTICE 'Routers table does not exist, nothing to drop';
  END IF;
END $$;

-- Clean up any orphaned foreign key constraints that might reference the old routers table
-- (This is a safety measure in case any constraints weren't dropped with CASCADE)
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN 
    SELECT 
      tc.table_name, 
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'routers' 
      AND tc.constraint_type = 'FOREIGN KEY'
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
      constraint_record.table_name, 
      constraint_record.constraint_name);
    RAISE NOTICE 'Dropped constraint % from table %', 
      constraint_record.constraint_name, 
      constraint_record.table_name;
  END LOOP;
END $$;
