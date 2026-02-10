-- Fix customers_id_seq to be in sync with max id
-- This resolves: "duplicate key value violates unique constraint customers_pkey"

DO $$
DECLARE
    max_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM customers;
    
    -- Reset the sequence to max_id + 1
    PERFORM setval('customers_id_seq', GREATEST(max_id, 1), true);
    
    RAISE NOTICE 'Reset customers_id_seq to % (max existing id: %)', max_id + 1, max_id;
END $$;

-- Also fix suppliers sequence while we're at it
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM suppliers;
        PERFORM setval('suppliers_id_seq', GREATEST(max_id, 1), true);
        RAISE NOTICE 'Reset suppliers_id_seq to % (max existing id: %)', max_id + 1, max_id;
    END IF;
END $$;

INSERT INTO schema_migrations (migration_name) VALUES ('1060_fix_customers_sequence.sql')
ON CONFLICT (migration_name) DO NOTHING;
