-- Grant ownership of all tables to the current user
-- This script must be run by a PostgreSQL superuser or the current table owner

DO $$
DECLARE
    table_name text;
    current_user_name text;
BEGIN
    -- Get the current user
    SELECT current_user INTO current_user_name;
    
    -- Loop through all tables and reassign ownership
    FOR table_name IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I OWNER TO %I', table_name, current_user_name);
            RAISE NOTICE 'Changed owner of table % to %', table_name, current_user_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not change owner of table %: %', table_name, SQLERRM;
        END;
    END LOOP;
END $$;
