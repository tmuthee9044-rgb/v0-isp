-- Create customer_documents table for storing contracts and other documents
CREATE TABLE IF NOT EXISTS customer_documents (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL DEFAULT 'contract', -- contract, agreement, technical, support, compliance, communication, other
    file_path TEXT NOT NULL, -- Path to the stored file
    file_name VARCHAR(255) NOT NULL, -- Original filename
    file_size BIGINT NOT NULL, -- File size in bytes
    mime_type VARCHAR(100) NOT NULL, -- MIME type of the file
    description TEXT, -- Optional description of the document
    tags TEXT[], -- Array of tags for categorization
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, archived, deleted
    is_confidential BOOLEAN DEFAULT FALSE, -- Mark sensitive documents
    uploaded_by INTEGER REFERENCES users(id), -- Who uploaded the document
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITHOUT TIME ZONE, -- Optional expiry date for contracts
    version INTEGER DEFAULT 1, -- Document version number
    parent_document_id INTEGER REFERENCES customer_documents(id), -- For document versioning
    
    -- Indexes for fast access
    CONSTRAINT customer_documents_customer_id_idx UNIQUE (customer_id, document_name, version)
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_type ON customer_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_customer_documents_status ON customer_documents(status);
CREATE INDEX IF NOT EXISTS idx_customer_documents_created_at ON customer_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_documents_tags ON customer_documents USING GIN(tags);

-- Create document access logs table for audit trail
CREATE TABLE IF NOT EXISTS customer_document_access_logs (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES customer_documents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- view, download, edit, delete, upload
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for access logs
CREATE INDEX IF NOT EXISTS idx_document_access_logs_document_id ON customer_document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_created_at ON customer_document_access_logs(created_at DESC);

-- Create document sharing table for controlled access
CREATE TABLE IF NOT EXISTS customer_document_shares (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES customer_documents(id) ON DELETE CASCADE,
    shared_with_email VARCHAR(255),
    shared_by INTEGER REFERENCES users(id),
    access_level VARCHAR(20) DEFAULT 'view', -- view, download, edit
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    share_token VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for document shares
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON customer_document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_token ON customer_document_shares(share_token);

-- Insert some sample document types for reference
INSERT INTO customer_documents (customer_id, document_name, document_type, file_path, file_name, file_size, mime_type, description, uploaded_by)
SELECT 
    1015 as customer_id,
    'Service Agreement 2025' as document_name,
    'contract' as document_type,
    '/uploads/documents/customer_1015/service_agreement_2025.pdf' as file_path,
    'service_agreement_2025.pdf' as file_name,
    245760 as file_size,
    'application/pdf' as mime_type,
    'Main service agreement for internet services' as description,
    1 as uploaded_by
WHERE EXISTS (SELECT 1 FROM customers WHERE id = 1015)
ON CONFLICT DO NOTHING;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customer_documents_updated_at
    BEFORE UPDATE ON customer_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_documents_updated_at();
