-- Add 1000 Sample Customers to the Database
-- This script generates diverse, realistic customer data for testing and demonstration

-- First, let's create some helper data arrays (using PostgreSQL arrays)
DO $$
DECLARE
    i INTEGER;
    customer_types TEXT[] := ARRAY['individual', 'company', 'school'];
    business_types TEXT[] := ARRAY['retail', 'restaurant', 'office', 'warehouse', 'school', 'hospital', 'hotel', 'manufacturing'];
    cities TEXT[] := ARRAY['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale', 'Garissa', 'Kakamega'];
    states TEXT[] := ARRAY['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu', 'Kiambu', 'Kilifi', 'Trans Nzoia', 'Garissa', 'Kakamega'];
    countries TEXT[] := ARRAY['Kenya', 'Kenya', 'Kenya', 'Kenya', 'Kenya', 'Uganda', 'Tanzania', 'Kenya', 'Kenya', 'Kenya'];
    first_names TEXT[] := ARRAY['John', 'Mary', 'Peter', 'Grace', 'David', 'Sarah', 'Michael', 'Jane', 'James', 'Lucy', 'Daniel', 'Faith', 'Samuel', 'Ruth', 'Joseph', 'Esther', 'Paul', 'Rebecca', 'Mark', 'Catherine'];
    last_names TEXT[] := ARRAY['Kamau', 'Wanjiku', 'Mwangi', 'Njeri', 'Kiprotich', 'Achieng', 'Ochieng', 'Wambui', 'Kiplagat', 'Nyong''o', 'Mutua', 'Wanjiru', 'Kimani', 'Adhiambo', 'Rotich', 'Muthoni', 'Otieno', 'Wairimu', 'Cheruiyot', 'Akinyi'];
    business_names TEXT[] := ARRAY['Tech Solutions Ltd', 'Green Valley School', 'Sunrise Hotel', 'Metro Supermarket', 'City Hospital', 'Prime Manufacturing', 'Elite Restaurant', 'Modern Office Complex', 'Industrial Park Ltd', 'Community Center'];
    referral_sources TEXT[] := ARRAY['website', 'social_media', 'referral', 'advertisement', 'walk_in', 'phone_inquiry', 'email_campaign', 'partner'];
    contact_methods TEXT[] := ARRAY['email', 'phone', 'sms', 'whatsapp'];
    statuses TEXT[] := ARRAY['active', 'active', 'active', 'active', 'pending', 'suspended'];
    sales_reps TEXT[] := ARRAY['Alice Mwangi', 'Bob Kiprotich', 'Carol Wanjiku', 'David Ochieng', 'Eva Njeri'];
    account_managers TEXT[] := ARRAY['Frank Mutua', 'Grace Achieng', 'Henry Kimani', 'Irene Wambui', 'Jack Rotich'];
    
    -- Variables for generating data
    customer_type TEXT;
    first_name TEXT;
    last_name TEXT;
    business_name TEXT;
    business_type TEXT;
    city TEXT;
    state TEXT;
    country TEXT;
    phone_number TEXT;
    email_address TEXT;
    account_num TEXT;
    portal_user TEXT;
    portal_pass TEXT;
    address_text TEXT;
    gps_lat NUMERIC;
    gps_lng NUMERIC;
    gps_coords TEXT;
    referral_src TEXT;
    contact_method TEXT;
    status_val TEXT;
    sales_rep TEXT;
    account_mgr TEXT;
    id_num TEXT;
    tax_num TEXT;
    postal_code_val TEXT;
    
BEGIN
    -- Generate 1000 customers
    FOR i IN 1..1000 LOOP
        -- Select random values
        customer_type := customer_types[1 + floor(random() * array_length(customer_types, 1))];
        first_name := first_names[1 + floor(random() * array_length(first_names, 1))];
        last_name := last_names[1 + floor(random() * array_length(last_names, 1))];
        business_name := CASE WHEN customer_type != 'individual' THEN business_names[1 + floor(random() * array_length(business_names, 1))] ELSE NULL END;
        business_type := CASE WHEN customer_type != 'individual' THEN business_types[1 + floor(random() * array_length(business_types, 1))] ELSE NULL END;
        city := cities[1 + floor(random() * array_length(cities, 1))];
        state := states[1 + floor(random() * array_length(states, 1))];
        country := countries[1 + floor(random() * array_length(countries, 1))];
        referral_src := referral_sources[1 + floor(random() * array_length(referral_sources, 1))];
        contact_method := contact_methods[1 + floor(random() * array_length(contact_methods, 1))];
        status_val := statuses[1 + floor(random() * array_length(statuses, 1))];
        sales_rep := sales_reps[1 + floor(random() * array_length(sales_reps, 1))];
        account_mgr := account_managers[1 + floor(random() * array_length(account_managers, 1))];
        
        -- Generate phone number (Kenyan format)
        phone_number := '+254' || (700000000 + floor(random() * 99999999))::TEXT;
        
        -- Generate email
        email_address := lower(first_name || '.' || last_name || i || '@' || 
                        (ARRAY['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'company.co.ke'])[1 + floor(random() * 5)]);
        
        -- Generate account number
        account_num := 'ACC' || lpad(i::TEXT, 6, '0');
        
        -- Generate portal credentials
        portal_user := lower(first_name || last_name || i);
        portal_pass := 'temp' || (1000 + floor(random() * 8999))::TEXT;
        
        -- Generate address
        address_text := (100 + floor(random() * 9900))::TEXT || ' ' || 
                       (ARRAY['Kenyatta Avenue', 'Uhuru Highway', 'Moi Avenue', 'Haile Selassie Avenue', 'Tom Mboya Street', 'River Road', 'Ngong Road', 'Waiyaki Way'])[1 + floor(random() * 8)] || 
                       ', ' || city;
        
        -- Generate GPS coordinates (Kenya approximate bounds)
        gps_lat := -4.5 + random() * 5; -- Latitude between -4.5 and 0.5
        gps_lng := 33.5 + random() * 8; -- Longitude between 33.5 and 41.5
        gps_coords := gps_lat::TEXT || ',' || gps_lng::TEXT;
        
        -- Generate ID number (8 digits)
        id_num := (10000000 + floor(random() * 89999999))::TEXT;
        
        -- Generate tax number for businesses
        tax_num := CASE WHEN customer_type != 'individual' THEN 'P' || (100000000 + floor(random() * 899999999))::TEXT || 'A' ELSE NULL END;
        
        -- Generate postal code
        postal_code_val := (10000 + floor(random() * 89999))::TEXT;
        
        -- Insert customer record
        INSERT INTO customers (
            customer_type, first_name, last_name, business_name, business_type,
            email, phone, address, city, state, country, postal_code,
            billing_address, installation_address, gps_coordinates,
            account_number, portal_username, portal_password,
            id_number, tax_number, referral_source, preferred_contact_method,
            status, sales_rep, account_manager, assigned_staff_id,
            service_preferences, internal_notes, special_requirements,
            created_at, updated_at
        ) VALUES (
            customer_type, first_name, last_name, business_name, business_type,
            email_address, phone_number, address_text, city, state, country, postal_code_val,
            address_text, address_text, gps_coords,
            account_num, portal_user, portal_pass,
            id_num, tax_num, referral_src, contact_method,
            status_val, sales_rep, account_mgr, 1 + floor(random() * 5),
            '{"notifications": true, "billing_method": "monthly", "auto_pay": false}'::jsonb,
            CASE WHEN random() > 0.7 THEN 'Customer requires special attention for technical support' ELSE NULL END,
            CASE WHEN random() > 0.8 THEN 'Fiber installation required' ELSE NULL END,
            NOW() - (random() * 365 || ' days')::INTERVAL,
            NOW() - (random() * 30 || ' days')::INTERVAL
        );
        
        -- Add phone numbers for some customers
        IF random() > 0.3 THEN
            INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary, created_at)
            VALUES (
                (SELECT id FROM customers WHERE account_number = account_num),
                phone_number,
                'mobile',
                true,
                NOW()
            );
        END IF;
        
        -- Add emergency contacts for some customers
        IF random() > 0.6 THEN
            INSERT INTO customer_emergency_contacts (customer_id, name, phone, email, relationship, created_at)
            VALUES (
                (SELECT id FROM customers WHERE account_number = account_num),
                first_names[1 + floor(random() * array_length(first_names, 1))] || ' ' || last_names[1 + floor(random() * array_length(last_names, 1))],
                '+254' || (700000000 + floor(random() * 99999999))::TEXT,
                'emergency' || i || '@example.com',
                (ARRAY['spouse', 'parent', 'sibling', 'friend', 'colleague'])[1 + floor(random() * 5)],
                NOW()
            );
        END IF;
        
        -- Progress indicator
        IF i % 100 = 0 THEN
            RAISE NOTICE 'Generated % customers...', i;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully generated 1000 sample customers!';
    
    -- Display summary statistics
    RAISE NOTICE 'Customer Type Distribution:';
    RAISE NOTICE 'Individual: %', (SELECT COUNT(*) FROM customers WHERE customer_type = 'individual');
    RAISE NOTICE 'Company: %', (SELECT COUNT(*) FROM customers WHERE customer_type = 'company');
    RAISE NOTICE 'School: %', (SELECT COUNT(*) FROM customers WHERE customer_type = 'school');
    
    RAISE NOTICE 'Status Distribution:';
    RAISE NOTICE 'Active: %', (SELECT COUNT(*) FROM customers WHERE status = 'active');
    RAISE NOTICE 'Pending: %', (SELECT COUNT(*) FROM customers WHERE status = 'pending');
    RAISE NOTICE 'Suspended: %', (SELECT COUNT(*) FROM customers WHERE status = 'suspended');
    
END $$;

-- Create indexes for better performance on the new data
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Update table statistics
ANALYZE customers;
ANALYZE customer_phone_numbers;
ANALYZE customer_emergency_contacts;

COMMIT;
