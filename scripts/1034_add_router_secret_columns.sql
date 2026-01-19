-- Add encrypted secret storage columns to routers table
ALTER TABLE routers ADD COLUMN IF NOT EXISTS password_encrypted TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS password_iv VARCHAR(32);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS password_tag VARCHAR(32);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS password_last_rotated TIMESTAMP;

-- Add RADIUS secret encryption columns
ALTER TABLE routers ADD COLUMN IF NOT EXISTS radius_secret_encrypted TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS radius_secret_iv VARCHAR(32);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS radius_secret_tag VARCHAR(32);

-- Add API scoping columns
ALTER TABLE routers ADD COLUMN IF NOT EXISTS api_allowed_operations TEXT[] DEFAULT ARRAY['read']::TEXT[];
ALTER TABLE routers ADD COLUMN IF NOT EXISTS api_rate_limit INTEGER DEFAULT 100;

-- Add security hardening tracking
ALTER TABLE routers ADD COLUMN IF NOT EXISTS security_hardened BOOLEAN DEFAULT false;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS last_security_audit TIMESTAMP;

-- Create index for rotation checks
CREATE INDEX IF NOT EXISTS idx_routers_password_rotation ON routers(password_last_rotated) 
WHERE password_last_rotated IS NOT NULL;

COMMENT ON COLUMN routers.password_encrypted IS 'AES-256-GCM encrypted router admin password';
COMMENT ON COLUMN routers.api_allowed_operations IS 'Scoped API operations: read, write, provision, reboot';
COMMENT ON COLUMN routers.security_hardened IS 'Has passed security hardening compliance check';
