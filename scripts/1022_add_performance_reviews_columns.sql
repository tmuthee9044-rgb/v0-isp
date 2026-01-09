-- Add missing columns to performance_reviews table
-- Ensures all columns from schema exist in the actual database

DO $$
BEGIN
  -- Add review_period if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_reviews' 
    AND column_name = 'review_period'
  ) THEN
    ALTER TABLE performance_reviews ADD COLUMN review_period VARCHAR(10);
    RAISE NOTICE 'Added review_period column to performance_reviews';
  END IF;

  -- Add review_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_reviews' 
    AND column_name = 'review_type'
  ) THEN
    ALTER TABLE performance_reviews ADD COLUMN review_type VARCHAR(20) NOT NULL DEFAULT 'quarterly';
    RAISE NOTICE 'Added review_type column to performance_reviews';
  END IF;

  -- Add score if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_reviews' 
    AND column_name = 'score'
  ) THEN
    ALTER TABLE performance_reviews ADD COLUMN score INTEGER;
    RAISE NOTICE 'Added score column to performance_reviews';
  END IF;

  -- Add goals if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_reviews' 
    AND column_name = 'goals'
  ) THEN
    ALTER TABLE performance_reviews ADD COLUMN goals TEXT;
    RAISE NOTICE 'Added goals column to performance_reviews';
  END IF;

  -- Add achievements if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_reviews' 
    AND column_name = 'achievements'
  ) THEN
    ALTER TABLE performance_reviews ADD COLUMN achievements TEXT;
    RAISE NOTICE 'Added achievements column to performance_reviews';
  END IF;

  -- Add areas_for_improvement if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_reviews' 
    AND column_name = 'areas_for_improvement'
  ) THEN
    ALTER TABLE performance_reviews ADD COLUMN areas_for_improvement TEXT;
    RAISE NOTICE 'Added areas_for_improvement column to performance_reviews';
  END IF;

  -- Add development_plan if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_reviews' 
    AND column_name = 'development_plan'
  ) THEN
    ALTER TABLE performance_reviews ADD COLUMN development_plan TEXT;
    RAISE NOTICE 'Added development_plan column to performance_reviews';
  END IF;

  -- Add next_review_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_reviews' 
    AND column_name = 'next_review_date'
  ) THEN
    ALTER TABLE performance_reviews ADD COLUMN next_review_date DATE;
    RAISE NOTICE 'Added next_review_date column to performance_reviews';
  END IF;

  -- Add status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_reviews' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE performance_reviews ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft';
    RAISE NOTICE 'Added status column to performance_reviews';
  END IF;

END $$;
