-- Sync all existing routers with RADIUS secrets to the FreeRADIUS nas table
INSERT INTO nas (
  nasname,
  shortname,
  type,
  ports,
  secret,
  server,
  community,
  description
)
SELECT 
  COALESCE(nd.nas_ip_address, nd.ip_address) as nasname,
  LOWER(REPLACE(nd.name, ' ', '_')) as shortname,
  'other' as type,
  1812 as ports,
  nd.radius_secret as secret,
  nd.ip_address as server,
  'public' as community,
  CONCAT('Router: ', nd.name, ' (', nd.type, ')') as description
FROM network_devices nd
WHERE nd.radius_secret IS NOT NULL 
  AND nd.radius_secret != ''
  AND (nd.type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR nd.type ILIKE '%router%')
ON CONFLICT (nasname) 
DO UPDATE SET
  secret = EXCLUDED.secret,
  shortname = EXCLUDED.shortname,
  type = EXCLUDED.type,
  description = EXCLUDED.description;

-- Log the sync
SELECT 
  COUNT(*) as synced_routers,
  STRING_AGG(nasname, ', ') as router_ips
FROM nas
WHERE nasname IN (
  SELECT COALESCE(nas_ip_address, ip_address) 
  FROM network_devices 
  WHERE radius_secret IS NOT NULL
);
