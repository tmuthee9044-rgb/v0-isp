-- Add file_content column to customer_documents table for storing file data as BYTEA
ALTER TABLE IF EXISTS customer_documents 
ADD COLUMN IF NOT EXISTS file_content BYTEA;

-- Remove file_path column as it's no longer needed
ALTER TABLE IF EXISTS customer_documents
DROP COLUMN IF EXISTS file_path;

-- Create index on document_id for faster access logs queries
CREATE INDEX IF NOT EXISTS idx_customer_document_access_logs_document_id 
ON customer_document_access_logs(document_id);
