-- Create comprehensive vehicle management tables

-- Main vehicles table with expanded fields
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('van', 'truck', 'car', 'motorbike', 'generator', 'bus')),
    registration VARCHAR(100) UNIQUE NOT NULL,
    model VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    fuel_type VARCHAR(50) NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid')),
    assigned_to VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    mileage INTEGER DEFAULT 0,
    fuel_consumption DECIMAL(5,2) DEFAULT 0,
    engine_capacity INTEGER,
    purchase_date DATE NOT NULL,
    purchase_cost DECIMAL(12,2) DEFAULT 0,
    depreciation_rate DECIMAL(5,2) DEFAULT 15,
    insurance_expiry DATE,
    license_expiry DATE,
    inspection_expiry DATE,
    warranty_expiry DATE,
    last_service DATE,
    next_service DATE,
    last_fuel_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'repair', 'inactive')),
    specifications TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fuel logs table
CREATE TABLE IF NOT EXISTS fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    fuel_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(8,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    price_per_liter DECIMAL(8,2),
    odometer_reading INTEGER,
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance logs table
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    odometer_reading INTEGER,
    next_service_date DATE,
    service_provider VARCHAR(255),
    parts_replaced TEXT,
    warranty_period INTEGER, -- in months
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bus fare records table
CREATE TABLE IF NOT EXISTS bus_fare_records (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100) NOT NULL,
    travel_date DATE NOT NULL,
    from_location VARCHAR(255) NOT NULL,
    to_location VARCHAR(255) NOT NULL,
    purpose VARCHAR(100) NOT NULL,
    amount DECIMAL(8,2) NOT NULL,
    receipt_number VARCHAR(100),
    approved_by VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle documents table
CREATE TABLE IF NOT EXISTS vehicle_documents (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    expiry_date DATE,
    issued_date DATE,
    issuing_authority VARCHAR(255),
    document_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle assignments table (for tracking who uses which vehicle when)
CREATE TABLE IF NOT EXISTS vehicle_assignments (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100),
    assigned_date DATE NOT NULL,
    return_date DATE,
    purpose VARCHAR(255),
    start_mileage INTEGER,
    end_mileage INTEGER,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_to ON vehicles(assigned_to);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_date ON fuel_logs(vehicle_id, log_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_vehicle_date ON maintenance_logs(vehicle_id, service_date);
CREATE INDEX IF NOT EXISTS idx_bus_fare_employee_date ON bus_fare_records(employee_id, travel_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle_date ON vehicle_assignments(vehicle_id, assigned_date);

-- Insert sample data
INSERT INTO vehicles (
    name, type, registration, model, year, fuel_type, assigned_to, location,
    mileage, fuel_consumption, purchase_date, purchase_cost, insurance_expiry,
    license_expiry, next_service
) VALUES 
('Service Van 01', 'van', 'KCA 123A', 'Toyota Hiace', 2020, 'diesel', 'John Smith', 'Main Office', 45230, 12.5, '2020-01-15', 1500000, '2025-01-15', '2025-01-15', '2024-04-15'),
('Installation Truck', 'truck', 'KCB 456B', 'Isuzu NPR', 2019, 'diesel', 'Mike Wilson', 'Warehouse', 67890, 8.2, '2019-03-20', 2200000, '2024-12-20', '2024-12-20', '2024-03-20'),
('Service Van 02', 'van', 'KCC 789C', 'Nissan NV200', 2021, 'petrol', 'Sarah Johnson', 'Field Office', 52100, 14.1, '2021-06-10', 1200000, '2024-06-10', '2024-06-10', '2024-02-10'),
('Generator 01', 'generator', 'GEN001', 'Caterpillar C15', 2018, 'diesel', 'Technical Team', 'Site A', 2450, 0, '2018-09-05', 800000, '2024-09-05', NULL, '2024-05-01'),
('Motorbike 01', 'motorbike', 'KMB 111M', 'Honda CB150', 2022, 'petrol', 'Field Technician', 'Mobile', 15600, 35.0, '2022-02-14', 180000, '2025-02-14', '2025-02-14', '2024-08-14'),
('Company Bus', 'bus', 'KBU 999B', 'Toyota Coaster', 2017, 'diesel', 'Transport Team', 'Main Office', 125000, 6.5, '2017-11-30', 3500000, '2024-11-30', '2024-11-30', '2024-06-30');

-- Insert sample fuel logs
INSERT INTO fuel_logs (vehicle_id, log_date, fuel_type, quantity, cost, price_per_liter, odometer_reading, location) VALUES
(1, '2024-01-15', 'diesel', 45.5, 6825.00, 150.00, 45230, 'Shell Westlands'),
(2, '2024-01-14', 'diesel', 60.0, 9000.00, 150.00, 67890, 'Total Kiambu Road'),
(3, '2024-01-13', 'petrol', 35.2, 5632.00, 160.00, 52100, 'Kenol Thika Road');

-- Insert sample maintenance logs
INSERT INTO maintenance_logs (vehicle_id, service_date, service_type, description, cost, odometer_reading, next_service_date, service_provider) VALUES
(1, '2024-01-10', 'routine', 'Oil change, filter replacement, general inspection', 8500.00, 45000, '2024-04-10', 'ABC Motors'),
(2, '2023-12-15', 'brake_service', 'Brake pad replacement, brake fluid change', 15000.00, 67500, '2024-03-15', 'Isuzu Service Center'),
(3, '2024-01-05', 'oil_change', 'Engine oil and filter change', 6000.00, 52000, '2024-04-05', 'Quick Lube');

-- Insert sample bus fare records
INSERT INTO bus_fare_records (employee_name, employee_id, travel_date, from_location, to_location, purpose, amount, approved_by, status) VALUES
('Alice Wanjiku', 'EMP001', '2024-01-15', 'Main Office', 'Client Site Westlands', 'client_visit', 200.00, 'john_manager', 'approved'),
('Peter Kamau', 'EMP002', '2024-01-14', 'Home', 'Emergency Site Kiambu', 'emergency', 350.00, 'sarah_supervisor', 'approved'),
('Mary Njeri', 'EMP003', '2024-01-13', 'Field Office', 'Training Center CBD', 'training', 150.00, 'mike_director', 'pending');

-- Update trigger for vehicles table
CREATE OR REPLACE FUNCTION update_vehicle_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicles_timestamp
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_timestamp();

-- Update trigger for bus_fare_records table
CREATE TRIGGER update_bus_fare_timestamp
    BEFORE UPDATE ON bus_fare_records
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_timestamp();
