-- Migration: Add maire_sortant and propositions columns to candidats table
-- Date: 2026-01-10
-- Description: Support for incumbent mayor identification and candidate proposals

-- Add maire_sortant column
ALTER TABLE candidats
ADD COLUMN IF NOT EXISTS maire_sortant BOOLEAN DEFAULT FALSE;

-- Add propositions column (for Phase 3)
ALTER TABLE candidats
ADD COLUMN IF NOT EXISTS propositions JSONB DEFAULT '[]'::jsonb;

-- Add index on maire_sortant for faster queries
CREATE INDEX IF NOT EXISTS idx_candidats_maire_sortant ON candidats(maire_sortant);

-- Add comment
COMMENT ON COLUMN candidats.maire_sortant IS 'Indicates if this candidate is the current incumbent mayor';
COMMENT ON COLUMN candidats.propositions IS 'Array of candidate campaign proposals (3-5 items)';
