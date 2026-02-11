-- Fix all broken id sequences for tables that lack auto-increment defaults
-- This runs idempotently - safe to re-run

DO $$
DECLARE
  tbl TEXT;
  seq_name TEXT;
  max_id BIGINT;
BEGIN
  -- List of tables that need id sequences fixed
  FOREACH tbl IN ARRAY ARRAY[
    'users', 'purchase_orders', 'purchase_order_items', 'activity_logs',
    'employees', 'customers', 'suppliers', 'inventory_items',
    'account_balances', 'customer_documents', 'customer_equipment',
    'system_config', 'supplier_invoices', 'roles', 'user_roles'
  ]
  LOOP
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      seq_name := tbl || '_id_seq';
      
      -- Create sequence if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = seq_name) THEN
        EXECUTE format('CREATE SEQUENCE %I', seq_name);
        RAISE NOTICE 'Created sequence: %', seq_name;
      END IF;
      
      -- Get max id
      EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', tbl) INTO max_id;
      
      -- Set sequence to max_id + 1
      EXECUTE format('SELECT setval(%L, %s, false)', seq_name, max_id + 1);
      
      -- Set column default
      EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT nextval(%L)', tbl, seq_name);
      
      -- Own the sequence
      EXECUTE format('ALTER SEQUENCE %I OWNED BY %I.id', seq_name, tbl);
      
      RAISE NOTICE 'Fixed sequence for table: % (max_id: %)', tbl, max_id;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
    END IF;
  END LOOP;
END $$;
