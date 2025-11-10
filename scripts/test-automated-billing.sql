-- Test script for automated billing with date_trunc fixes
-- This script creates test data and verifies the automated billing works correctly

-- Clean up existing test data
DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE invoice_number LIKE 'TEST-%');
DELETE FROM invoices WHERE invoice_number LIKE 'TEST-%';
DELETE FROM customer_services WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE 'test-billing%');
DELETE FROM customers WHERE email LIKE 'test-billing%';

-- Create test customers
INSERT INTO customers (
  first_name, last_name, email, phone, address, city, state, 
  installation_address, gps_coordinates, status, created_at
) VALUES 
  ('Test', 'Customer1', 'test-billing1@example.com', '+1234567890', '123 Test St', 'Test City', 'TS', '123 Test St', '0,0', 'active', NOW() - INTERVAL '2 months'),
  ('Test', 'Customer2', 'test-billing2@example.com', '+1234567891', '124 Test St', 'Test City', 'TS', '124 Test St', '0,0', 'active', NOW() - INTERVAL '3 months'),
  ('Test', 'Customer3', 'test-billing3@example.com', '+1234567892', '125 Test St', 'Test City', 'TS', '125 Test St', '0,0', 'active', NOW() - INTERVAL '1 month');

-- Get the test customer IDs
DO $$
DECLARE
  customer1_id INTEGER;
  customer2_id INTEGER;
  customer3_id INTEGER;
  plan_id INTEGER;
BEGIN
  -- Get customer IDs
  SELECT id INTO customer1_id FROM customers WHERE email = 'test-billing1@example.com';
  SELECT id INTO customer2_id FROM customers WHERE email = 'test-billing2@example.com';
  SELECT id INTO customer3_id FROM customers WHERE email = 'test-billing3@example.com';
  
  -- Get a service plan ID (use existing or create one)
  SELECT id INTO plan_id FROM service_plans LIMIT 1;
  
  IF plan_id IS NULL THEN
    INSERT INTO service_plans (name, description, price, billing_cycle, data_limit, speed_limit, status)
    VALUES ('Test Plan', 'Test billing plan', 50.00, 'monthly', 100, 100, 'active')
    RETURNING id INTO plan_id;
  END IF;
  
  -- Create customer services with different start dates to test billing cycles
  INSERT INTO customer_services (
    customer_id, service_plan_id, status, start_date, ip_address, device_serial
  ) VALUES 
    (customer1_id, plan_id, 'active', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months'), '192.168.1.100', 'TEST001'),
    (customer2_id, plan_id, 'active', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months'), '192.168.1.101', 'TEST002'),
    (customer3_id, plan_id, 'active', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'), '192.168.1.102', 'TEST003');
    
  RAISE NOTICE 'Test data created successfully';
  RAISE NOTICE 'Customer 1 ID: %, Customer 2 ID: %, Customer 3 ID: %', customer1_id, customer2_id, customer3_id;
  RAISE NOTICE 'Service Plan ID: %', plan_id;
END $$;

-- Test the date_trunc functionality directly
SELECT 
  'Testing date_trunc with explicit casting' as test_name,
  DATE_TRUNC('month', CURRENT_DATE::timestamptz) as current_month,
  DATE_TRUNC('month', (CURRENT_DATE - INTERVAL '1 month')::timestamptz) as last_month,
  DATE_TRUNC('month', CURRENT_DATE::timestamptz) > DATE_TRUNC('month', (CURRENT_DATE - INTERVAL '1 month')::timestamptz) as should_bill;

-- Verify customer services are ready for billing
SELECT 
  cs.id,
  CONCAT(c.first_name, ' ', c.last_name) as customer_name,
  cs.start_date,
  sp.billing_cycle,
  CASE 
    WHEN sp.billing_cycle = 'monthly' THEN 
      DATE_TRUNC('month', CURRENT_DATE::timestamptz) > DATE_TRUNC('month', cs.start_date::timestamptz)
    ELSE 
      DATE_TRUNC('month', CURRENT_DATE::timestamptz) > DATE_TRUNC('month', cs.start_date::timestamptz)
  END as should_bill
FROM customer_services cs
JOIN customers c ON cs.customer_id = c.id
JOIN service_plans sp ON cs.service_plan_id = sp.id
WHERE c.email LIKE 'test-billing%'
AND cs.status = 'active';

-- Check for existing invoices to avoid duplicates
SELECT 
  i.id,
  i.customer_id,
  i.invoice_number,
  i.service_period_start,
  i.service_period_end,
  DATE_TRUNC('month', CURRENT_DATE::timestamptz) as current_period_start
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE c.email LIKE 'test-billing%'
ORDER BY i.created_at DESC;

COMMIT;
