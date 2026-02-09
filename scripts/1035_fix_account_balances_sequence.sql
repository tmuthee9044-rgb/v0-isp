-- Fix account_balances id sequence so SERIAL auto-increment works
-- The sequence was likely broken by a previous CASCADE drop

-- Ensure the status column exists (some code references it)
ALTER TABLE account_balances ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Recreate and reattach the sequence
DO $$
DECLARE
    max_id BIGINT;
BEGIN
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM account_balances;
    
    -- Drop and recreate sequence
    DROP SEQUENCE IF EXISTS account_balances_id_seq CASCADE;
    CREATE SEQUENCE account_balances_id_seq START WITH 1;
    
    -- Set to correct value
    PERFORM setval('account_balances_id_seq', GREATEST(max_id, 1), max_id > 0);
    
    -- Reattach to column
    ALTER TABLE account_balances ALTER COLUMN id SET DEFAULT nextval('account_balances_id_seq');
    ALTER TABLE account_balances ALTER COLUMN id SET NOT NULL;
    
    -- Set sequence ownership
    ALTER SEQUENCE account_balances_id_seq OWNED BY account_balances.id;
    
    RAISE NOTICE 'account_balances_id_seq fixed. Max id was: %', max_id;
END $$;
