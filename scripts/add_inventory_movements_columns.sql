-- Migration: Add missing inventory_movements columns
-- This adds columns needed for proper inventory tracking

-- Add missing columns to inventory_movements table
ALTER TABLE inventory_movements 
  ADD COLUMN IF NOT EXISTS from_location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS to_location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS performed_by INTEGER REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,2);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_from_location ON inventory_movements(from_location);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_to_location ON inventory_movements(to_location);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_status ON inventory_movements(status);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_performed_by ON inventory_movements(performed_by);
