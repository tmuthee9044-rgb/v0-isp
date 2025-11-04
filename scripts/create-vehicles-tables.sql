-- Creating comprehensive vehicles management database schema
-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('van', 'truck', 'car', 'motorbike', 'generator', 'bus')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive', 'repair')),
    registration VARCHAR(100) UNIQUE NOT NULL,
    model VARCHAR(255),
    year INTEGER,
    fuel_type VARCHAR(50) CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid')),
    assigned_to VARCHAR(255),
    location VARCHAR(255),
    mileage INTEGER DEFAULT 0,
    fuel_consumption DECIMAL(5,2) DEFAULT 0,
    last_service DATE,
    next_service DATE,
    insurance_expiry DATE,
    license_expiry DATE,
    purchase_date DATE,
    purchase_cost DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fuel_logs table
CREATE TABLE IF NOT EXISTS fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    fuel_type VARCHAR(50),
    quantity DECIMAL(8,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    odometer_reading INTEGER,
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create maintenance_logs table
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    service_type VARCHAR(100),
    description TEXT,
    cost DECIMAL(10,2) NOT NULL,
    odometer_reading INTEGER,
    next_service_date DATE,
    service_provider VARCHAR(255),
    parts_replaced TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bus_fare_records table
CREATE TABLE IF NOT EXISTS bus_fare_records (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100),
    travel_date DATE NOT NULL,
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    purpose TEXT,
    amount DECIMAL(10,2) NOT NULL,
    receipt_number VARCHAR(100),
    approved_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_to ON vehicles(assigned_to);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_id ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_date ON fuel_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_vehicle_id ON maintenance_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_date ON maintenance_logs(service_date);
CREATE INDEX IF NOT EXISTS idx_bus_fare_records_date ON bus_fare_records(travel_date);
CREATE INDEX IF NOT EXISTS idx_bus_fare_records_employee ON bus_fare_records(employee_id);

-- Insert sample vehicles data
INSERT INTO vehicles (name, type, registration, model, year, fuel_type, assigned_to, location, mileage, fuel_consumption, next_service) VALUES
('Service Van 1', 'van', 'KCA 001A', 'Toyota Hiace', 2020, 'diesel', 'John Kamau', 'Nairobi Central', 45000, 12.5, CURRENT_DATE + INTERVAL '2 months'),
('Installation Truck', 'truck', 'KCB 002B', 'Isuzu NPR', 2019, 'diesel', 'Peter Mwangi', 'Westlands', 67000, 8.2, CURRENT_DATE + INTERVAL '1 month'),
('Admin Car', 'car', 'KCC 003C', 'Toyota Corolla', 2021, 'petrol', 'Mary Wanjiku', 'Karen', 23000, 15.8, CURRENT_DATE + INTERVAL '3 months'),
('Field Motorbike', 'motorbike', 'KMDA 004D', 'Honda CB150', 2022, 'petrol', 'David Ochieng', 'Eastlands', 12000, 35.0, CURRENT_DATE + INTERVAL '1 month'),
('Backup Generator', 'generator', 'GEN-001', 'Caterpillar 50kVA', 2018, 'diesel', 'Maintenance Team', 'Head Office', 2500, 0, CURRENT_DATE + INTERVAL '6 months'),
('Staff Bus', 'bus', 'KCE 005E', 'Isuzu NQR', 2017, 'diesel', 'Samuel Kiprotich', 'Industrial Area', 89000, 6.5, CURRENT_DATE + INTERVAL '2 weeks');

-- Insert sample fuel logs
INSERT INTO fuel_logs (vehicle_id, log_date, fuel_type, quantity, cost, odometer_reading, location) VALUES
(1, CURRENT_DATE - INTERVAL '5 days', 'diesel', 45.0, 6750, 45000, 'Shell Westlands'),
(2, CURRENT_DATE - INTERVAL '3 days', 'diesel', 60.0, 9000, 67000, 'Total Karen'),
(3, CURRENT_DATE - INTERVAL '7 days', 'petrol', 35.0, 5250, 23000, 'Kenol CBD'),
(4, CURRENT_DATE - INTERVAL '2 days', 'petrol', 12.0, 1800, 12000, 'Shell Eastlands');

-- Insert sample maintenance logs
INSERT INTO maintenance_logs (vehicle_id, service_date, service_type, description, cost, odometer_reading, next_service_date, service_provider) VALUES
(1, CURRENT_DATE - INTERVAL '1 month', 'Regular Service', 'Oil change, filter replacement, general inspection', 8500, 43000, CURRENT_DATE + INTERVAL '2 months', 'Toyota Kenya'),
(2, CURRENT_DATE - INTERVAL '2 weeks', 'Brake Service', 'Brake pad replacement and brake fluid change', 12000, 66500, CURRENT_DATE + INTERVAL '6 months', 'Isuzu Service Center'),
(6, CURRENT_DATE - INTERVAL '3 weeks', 'Major Service', 'Engine overhaul and transmission service', 45000, 88000, CURRENT_DATE + INTERVAL '2 weeks', 'Isuzu Service Center');

-- Insert sample bus fare records
INSERT INTO bus_fare_records (employee_name, employee_id, travel_date, from_location, to_location, purpose, amount, receipt_number, approved_by, status) VALUES
('Alice Nyambura', 'EMP001', CURRENT_DATE - INTERVAL '1 week', 'Nairobi CBD', 'Thika', 'Client Visit', 200, 'RCP001', 'John Manager', 'approved'),
('Robert Kimani', 'EMP002', CURRENT_DATE - INTERVAL '3 days', 'Karen', 'Mombasa', 'Equipment Installation', 1500, 'RCP002', 'John Manager', 'approved'),
('Grace Akinyi', 'EMP003', CURRENT_DATE - INTERVAL '2 days', 'Westlands', 'Nakuru', 'Training Session', 800, 'RCP003', 'John Manager', 'pending');

COMMENT ON TABLE vehicles IS 'Vehicle fleet management including cars, trucks, vans, motorbikes, generators, and buses';
COMMENT ON TABLE fuel_logs IS 'Fuel consumption and cost tracking for all vehicles';
COMMENT ON TABLE maintenance_logs IS 'Maintenance and service records for vehicles';
COMMENT ON TABLE bus_fare_records IS 'Employee bus fare reimbursement tracking';
