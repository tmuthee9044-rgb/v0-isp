-- Create customer services table
CREATE TABLE IF NOT EXISTS customer_services (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    service_plan_name VARCHAR(255) NOT NULL,
    monthly_fee DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renew BOOLEAN DEFAULT true,
    days_remaining INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    reference_number VARCHAR(255),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample customer services
INSERT INTO customer_services (customer_id, service_plan_name, monthly_fee, status, start_date, days_remaining) VALUES
(1, 'Premium Plan', 79.99, 'active', '2024-01-01', 25),
(2, 'Standard Plan', 49.99, 'active', '2023-12-15', 15),
(3, 'Basic Plan', 29.99, 'suspended', '2024-01-10', 5);

-- Insert sample payments
INSERT INTO payments (customer_id, amount, payment_method, status, reference_number) VALUES
(1, 79.99, 'M-Pesa', 'completed', 'MP240101001'),
(2, 49.99, 'Bank Transfer', 'completed', 'BT240102001'),
(3, 29.99, 'Cash', 'pending', 'CASH240103001');
