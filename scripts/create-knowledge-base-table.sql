-- Create knowledge_base table for support articles
CREATE TABLE IF NOT EXISTS knowledge_base (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  tags TEXT[],
  author_id INTEGER REFERENCES employees(id),
  views INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_author ON knowledge_base(author_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_published ON knowledge_base(is_published);

-- Add ticket_number column to support_tickets table
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS subject VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITHOUT TIME ZONE;

-- Create index for ticket_number
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON support_tickets(ticket_number);
