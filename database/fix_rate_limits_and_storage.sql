-- ============================================
-- Quick Fix: Rate Limits Table + Storage Bucket
-- ============================================

-- Drop old rate_limits table if it exists
DROP TABLE IF EXISTS rate_limits CASCADE;

-- Create rate_limits table with correct schema
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_type VARCHAR(20) NOT NULL,
  identifier_hash VARCHAR(64) NOT NULL,
  action_type VARCHAR(30) NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier_type, identifier_hash, action_type)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
ON rate_limits(identifier_type, identifier_hash, action_type);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window
ON rate_limits(window_start);

COMMENT ON TABLE rate_limits IS 'Rate limiting pour prévenir les abus (uploads, quiz, etc.)';
COMMENT ON COLUMN rate_limits.identifier_type IS 'ip, fingerprint, commune';
COMMENT ON COLUMN rate_limits.identifier_hash IS 'SHA256 hash du identifier';
COMMENT ON COLUMN rate_limits.action_type IS 'upload_tract, quiz_complete, etc.';

-- Create storage bucket for tract submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow public read submissions" ON storage.objects FOR SELECT
USING (bucket_id = 'submissions');

CREATE POLICY "Allow anonymous upload submissions" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'submissions');

-- Success message
SELECT 'Rate limits table created successfully' as status;
SELECT 'Storage bucket created successfully' as storage_status;
