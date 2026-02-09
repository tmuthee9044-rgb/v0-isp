-- Fix finance_audit_trail action_type NOT NULL constraint issue
-- The trigger function may be inserting NULL for action_type

-- Step 1: Make action_type have a default value so it never fails
ALTER TABLE finance_audit_trail ALTER COLUMN action_type SET DEFAULT 'SYSTEM';

-- Step 2: Also drop the NOT NULL constraint temporarily and re-add with default
ALTER TABLE finance_audit_trail ALTER COLUMN action_type DROP NOT NULL;

-- Step 3: Update any existing NULL values
UPDATE finance_audit_trail SET action_type = 'SYSTEM' WHERE action_type IS NULL;

-- Step 4: Re-add NOT NULL with default
ALTER TABLE finance_audit_trail ALTER COLUMN action_type SET NOT NULL;
ALTER TABLE finance_audit_trail ALTER COLUMN action_type SET DEFAULT 'SYSTEM';

-- Step 5: Also make table_name nullable or default since it may also fail
ALTER TABLE finance_audit_trail ALTER COLUMN table_name SET DEFAULT 'unknown';

-- Step 6: Recreate the trigger function to ensure it always provides action_type
CREATE OR REPLACE FUNCTION log_finance_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO finance_audit_trail (
            action_type, table_name, record_id, old_values, new_values, user_id, created_at, description
        ) VALUES (
            'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD)::jsonb, NULL,
            COALESCE(current_setting('app.current_user_id', TRUE)::INTEGER, 1),
            NOW(), 'Record deleted from ' || TG_TABLE_NAME
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO finance_audit_trail (
            action_type, table_name, record_id, old_values, new_values, user_id, created_at, description
        ) VALUES (
            'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb,
            COALESCE(current_setting('app.current_user_id', TRUE)::INTEGER, 1),
            NOW(), 'Record updated in ' || TG_TABLE_NAME
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO finance_audit_trail (
            action_type, table_name, record_id, old_values, new_values, user_id, created_at, description
        ) VALUES (
            'INSERT', TG_TABLE_NAME, NEW.id, NULL, row_to_json(NEW)::jsonb,
            COALESCE(current_setting('app.current_user_id', TRUE)::INTEGER, 1),
            NOW(), 'Record created in ' || TG_TABLE_NAME
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
