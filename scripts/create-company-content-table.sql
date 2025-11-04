-- Create company_content table for legal content management
CREATE TABLE IF NOT EXISTS company_content (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL UNIQUE,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_content_type ON company_content(content_type);

-- Insert default content for terms and privacy
INSERT INTO company_content (content_type, content) VALUES 
('terms', '{
    "title": "Terms of Service",
    "lastUpdated": "2024-08-20",
    "sections": {
        "introduction": "Welcome to TrustWaves Network. These terms govern your use of our internet services.",
        "serviceDescription": "We provide high-speed internet connectivity and related telecommunications services.",
        "paymentTerms": "Payment is due monthly in advance. Late payments may result in service suspension.",
        "dataUsage": "Fair usage policies apply to all unlimited plans. Excessive usage may be throttled.",
        "termination": "Either party may terminate service with 30 days written notice.",
        "liability": "Our liability is limited to the monthly service fee. We are not responsible for indirect damages.",
        "contact": "For questions about these terms, contact us at legal@trustwavesnetwork.com"
    }
}')
ON CONFLICT (content_type) DO NOTHING;

INSERT INTO company_content (content_type, content) VALUES 
('privacy', '{
    "title": "Privacy Policy",
    "lastUpdated": "2024-08-20",
    "sections": {
        "introduction": "This privacy policy explains how TrustWaves Network collects and uses your personal information.",
        "dataCollection": "We collect information necessary to provide internet services including contact details and usage data.",
        "dataUsage": "Your data is used to provide services, process payments, and improve our network performance.",
        "dataSharing": "We do not sell your personal data. We may share data with service providers and as required by law.",
        "dataRetention": "We retain your data for as long as you are a customer and as required by law.",
        "yourRights": "You have the right to access, correct, or delete your personal information.",
        "contact": "For privacy concerns, contact us at privacy@trustwavesnetwork.com"
    }
}')
ON CONFLICT (content_type) DO NOTHING;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_content_updated_at
    BEFORE UPDATE ON company_content
    FOR EACH ROW
    EXECUTE FUNCTION update_company_content_updated_at();
