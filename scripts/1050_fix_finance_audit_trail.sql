-- Fix finance_audit_trail table to ensure both action and action_type columns exist
-- This ensures compatibility across different schema migrations

DO $$
BEGIN
  -- Add action column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_audit_trail' AND column_name = 'action'
  ) THEN
    ALTER TABLE finance_audit_trail ADD COLUMN action VARCHAR(50);
    RAISE NOTICE 'Added action column to finance_audit_trail';
  END IF;

  -- Add action_type column if it doesn't exist (with default for NOT NULL constraint)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_audit_trail' AND column_name = 'action_type'
  ) THEN
    ALTER TABLE finance_audit_trail ADD COLUMN action_type VARCHAR(50) DEFAULT 'unknown';
    RAISE NOTICE 'Added action_type column to finance_audit_trail';
  END IF;

  -- Sync data between columns - copy action to action_type if action_type is null/default
  UPDATE finance_audit_trail 
  SET action_type = action 
  WHERE action IS NOT NULL 
    AND (action_type IS NULL OR action_type = 'unknown');

  -- Sync data in reverse - copy action_type to action if action is null
  UPDATE finance_audit_trail 
  SET action = action_type 
  WHERE action IS NULL 
    AND action_type IS NOT NULL 
    AND action_type != 'unknown';

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_audit_trail' AND column_name = 'description'
  ) THEN
    ALTER TABLE finance_audit_trail ADD COLUMN description TEXT;
    RAISE NOTICE 'Added description column to finance_audit_trail';
  END IF;

  -- Add user_email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_audit_trail' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE finance_audit_trail ADD COLUMN user_email VARCHAR(255);
    RAISE NOTICE 'Added user_email column to finance_audit_trail';
  END IF;

  -- Make action_type nullable if it has NOT NULL constraint causing issues
  -- This is done by dropping and re-adding without the constraint
  BEGIN
    ALTER TABLE finance_audit_trail ALTER COLUMN action_type DROP NOT NULL;
    RAISE NOTICE 'Removed NOT NULL constraint from action_type';
  EXCEPTION WHEN OTHERS THEN
    -- Constraint might not exist, that's fine
    NULL;
  END;

END $$;

-- Create index on action_type if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_action_type ON finance_audit_trail(action_type);

-- Create index on action if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_finance_audit_trail_action ON finance_audit_trail(action);

-- Update the audit trigger to populate both columns
CREATE OR REPLACE FUNCTION log_finance_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO finance_audit_trail (
      table_name,
      record_id,
      action,
      action_type,
      old_values,
      user_id,
      ip_address,
      created_at
    )
    VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      'DELETE',
      to_jsonb(OLD),
      COALESCE(current_setting('app.current_user_id', true)::INTEGER, NULL),
      COALESCE(current_setting('app.client_ip', true), NULL)::INET,
      NOW()
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO finance_audit_trail (
      table_name,
      record_id,
      action,
      action_type,
      old_values,
      new_values,
      user_id,
      ip_address,
      created_at
    )
    VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      COALESCE(current_setting('app.current_user_id', true)::INTEGER, NULL),
      COALESCE(current_setting('app.client_ip', true), NULL)::INET,
      NOW()
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO finance_audit_trail (
      table_name,
      record_id,
      action,
      action_type,
      new_values,
      user_id,
      ip_address,
      created_at
    )
    VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      'INSERT',
      to_jsonb(NEW),
      COALESCE(current_setting('app.current_user_id', true)::INTEGER, NULL),
      COALESCE(current_setting('app.client_ip', true), NULL)::INET,
      NOW()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Show results
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'finance_audit_trail'
ORDER BY ordinal_position;
