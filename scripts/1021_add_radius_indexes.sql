-- Optimize RADIUS table indexes for high-performance lookups
-- Critical for sub-5ms authentication queries

-- radcheck optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_radcheck_username_attr 
ON radcheck(username, attribute);

-- radreply optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_radreply_username_attr 
ON radreply(username, attribute);

-- radacct optimization for session queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_radacct_username_active 
ON radacct(username) WHERE acctstoptime IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_radacct_nasip_active 
ON radacct(nasipaddress) WHERE acctstoptime IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_radacct_starttime 
ON radacct(acctstarttime DESC);

-- Partition radacct by month for performance (100k+ sessions)
-- Create monthly partitions for the current year
DO $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  -- Check if radacct is already partitioned
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'radacct' AND relkind = 'p'
  ) THEN
    -- Rename existing table
    ALTER TABLE radacct RENAME TO radacct_old;
    
    -- Create partitioned table
    CREATE TABLE radacct (
      radacctid BIGSERIAL,
      acctsessionid VARCHAR(64) NOT NULL,
      acctuniqueid VARCHAR(32) NOT NULL,
      username VARCHAR(64) NOT NULL DEFAULT '',
      groupname VARCHAR(64) NOT NULL DEFAULT '',
      realm VARCHAR(64) DEFAULT '',
      nasipaddress INET NOT NULL,
      nasportid VARCHAR(15),
      nasporttype VARCHAR(32),
      acctstarttime TIMESTAMP with time zone,
      acctstoptime TIMESTAMP with time zone,
      acctsessiontime BIGINT,
      acctauthentic VARCHAR(32),
      connectinfo_start VARCHAR(50),
      connectinfo_stop VARCHAR(50),
      acctinputoctets BIGINT,
      acctoutputoctets BIGINT,
      calledstationid VARCHAR(50),
      callingstationid VARCHAR(50),
      acctterminatecause VARCHAR(32),
      servicetype VARCHAR(32),
      framedprotocol VARCHAR(32),
      framedipaddress INET,
      acctstartdelay INTEGER,
      acctstopdelay INTEGER,
      xascendsessionsvrkey VARCHAR(10),
      PRIMARY KEY (radacctid, acctstarttime)
    ) PARTITION BY RANGE (acctstarttime);

    -- Create partitions for current year + next year
    FOR i IN 0..23 LOOP
      partition_date := DATE_TRUNC('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
      partition_name := 'radacct_' || TO_CHAR(partition_date, 'YYYY_MM');
      start_date := DATE_TRUNC('month', partition_date);
      end_date := start_date + INTERVAL '1 month';
      
      EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF radacct FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date);
      
      RAISE NOTICE 'Created partition: %', partition_name;
    END LOOP;

    -- Copy data from old table
    INSERT INTO radacct SELECT * FROM radacct_old;
    
    -- Drop old table
    DROP TABLE radacct_old;
    
    RAISE NOTICE 'radacct table partitioned successfully';
  ELSE
    RAISE NOTICE 'radacct is already partitioned';
  END IF;
END $$;

-- Add constraints for speed
ALTER TABLE radcheck ADD CONSTRAINT IF NOT EXISTS radcheck_unique 
UNIQUE (username, attribute);

ALTER TABLE radreply ADD CONSTRAINT IF NOT EXISTS radreply_unique 
UNIQUE (username, attribute);
