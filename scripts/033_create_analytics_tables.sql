-- Create tables for storing predictive analytics data

-- Router performance history
CREATE TABLE IF NOT EXISTS router_performance_history (
    id SERIAL PRIMARY KEY,
    router_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bandwidth_usage INTEGER NOT NULL,
    peak_usage INTEGER NOT NULL,
    connections INTEGER NOT NULL,
    latency DECIMAL(5,2),
    packet_loss DECIMAL(5,4),
    uptime_percentage DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Capacity planning predictions
CREATE TABLE IF NOT EXISTS capacity_predictions (
    id SERIAL PRIMARY KEY,
    router_id VARCHAR(50) NOT NULL,
    prediction_date DATE NOT NULL,
    current_utilization DECIMAL(5,2) NOT NULL,
    predicted_utilization DECIMAL(5,2) NOT NULL,
    growth_rate DECIMAL(5,2) NOT NULL,
    capacity_reached_date DATE,
    recommended_action VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    estimated_cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Network forecasts
CREATE TABLE IF NOT EXISTS network_forecasts (
    id SERIAL PRIMARY KEY,
    forecast_date DATE NOT NULL,
    total_capacity INTEGER NOT NULL,
    current_usage INTEGER NOT NULL,
    predicted_usage INTEGER NOT NULL,
    capacity_gap INTEGER NOT NULL,
    recommended_investment DECIMAL(12,2),
    forecast_accuracy DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Infrastructure investments
CREATE TABLE IF NOT EXISTS infrastructure_investments (
    id SERIAL PRIMARY KEY,
    router_id VARCHAR(50),
    investment_type VARCHAR(100) NOT NULL,
    description TEXT,
    estimated_cost DECIMAL(12,2) NOT NULL,
    actual_cost DECIMAL(12,2),
    planned_date DATE NOT NULL,
    completed_date DATE,
    status VARCHAR(50) DEFAULT 'planned',
    roi_percentage DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bandwidth usage patterns
CREATE TABLE IF NOT EXISTS bandwidth_patterns (
    id SERIAL PRIMARY KEY,
    router_id VARCHAR(50) NOT NULL,
    hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    month_of_year INTEGER NOT NULL CHECK (month_of_year >= 1 AND month_of_year <= 12),
    avg_usage INTEGER NOT NULL,
    peak_usage INTEGER NOT NULL,
    pattern_type VARCHAR(50) DEFAULT 'normal',
    seasonal_factor DECIMAL(4,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alert thresholds and notifications
CREATE TABLE IF NOT EXISTS capacity_alerts (
    id SERIAL PRIMARY KEY,
    router_id VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    threshold_value DECIMAL(5,2) NOT NULL,
    current_value DECIMAL(5,2) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_router_performance_router_timestamp 
ON router_performance_history(router_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_capacity_predictions_router_date 
ON capacity_predictions(router_id, prediction_date);

CREATE INDEX IF NOT EXISTS idx_network_forecasts_date 
ON network_forecasts(forecast_date);

CREATE INDEX IF NOT EXISTS idx_bandwidth_patterns_router 
ON bandwidth_patterns(router_id, hour_of_day, day_of_week);

CREATE INDEX IF NOT EXISTS idx_capacity_alerts_router_severity 
ON capacity_alerts(router_id, severity, acknowledged);

-- Insert sample data for testing
INSERT INTO router_performance_history (router_id, bandwidth_usage, peak_usage, connections, latency, packet_loss, uptime_percentage)
VALUES 
    ('R001', 750, 890, 450, 12.5, 0.1, 99.9),
    ('R002', 380, 420, 320, 15.2, 0.2, 99.5),
    ('R003', 720, 780, 180, 18.7, 0.3, 98.2),
    ('R005', 180, 220, 95, 14.1, 0.1, 99.1);

INSERT INTO capacity_predictions (router_id, prediction_date, current_utilization, predicted_utilization, growth_rate, recommended_action, priority, estimated_cost)
VALUES 
    ('R001', CURRENT_DATE, 75.0, 85.2, 12.5, 'plan', 'medium', 800.00),
    ('R002', CURRENT_DATE, 76.0, 82.3, 8.3, 'monitor', 'low', 400.00),
    ('R003', CURRENT_DATE, 90.0, 103.7, 15.2, 'critical', 'high', 960.00),
      'low', 400.00),
    ('R003', CURRENT_DATE, 90.0, 103.7, 15.2, 'critical', 'high', 960.00),
    ('R005', CURRENT_DATE, 60.0, 63.4, 5.7, 'monitor', 'low', 150.00);

INSERT INTO network_forecasts (forecast_date, total_capacity, current_usage, predicted_usage, capacity_gap, recommended_investment)
VALUES 
    (CURRENT_DATE, 3600, 2030, 2450, 0, 2310.00),
    (CURRENT_DATE + INTERVAL '1 month', 3600, 2030, 2580, 0, 2310.00),
    (CURRENT_DATE + INTERVAL '3 months', 3600, 2030, 2890, 0, 2310.00),
    (CURRENT_DATE + INTERVAL '6 months', 3600, 2030, 3250, 0, 2310.00);

INSERT INTO bandwidth_patterns (router_id, hour_of_day, day_of_week, month_of_year, avg_usage, peak_usage, pattern_type, seasonal_factor)
VALUES 
    ('R001', 9, 1, 1, 650, 750, 'business_hours', 1.1),
    ('R001', 14, 1, 1, 720, 850, 'peak_hours', 1.1),
    ('R001', 22, 1, 1, 580, 680, 'evening', 1.1),
    ('R002', 8, 1, 1, 320, 380, 'morning_peak', 1.0),
    ('R002', 19, 1, 1, 350, 420, 'evening_peak', 1.0),
    ('R003', 10, 1, 1, 580, 720, 'business_peak', 0.9),
    ('R005', 12, 1, 1, 160, 180, 'school_hours', 0.8);

INSERT INTO capacity_alerts (router_id, alert_type, threshold_value, current_value, severity, message)
VALUES 
    ('R003', 'utilization_high', 85.0, 90.0, 'high', 'Router R003 utilization exceeds 85% threshold'),
    ('R001', 'growth_rate_high', 10.0, 12.5, 'medium', 'Router R001 showing high growth rate of 12.5%'),
    ('R003', 'capacity_warning', 95.0, 90.0, 'high', 'Router R003 approaching capacity limits - upgrade recommended');
