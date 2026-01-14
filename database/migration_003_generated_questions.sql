-- ============================================
-- Migration 003: Questions Générées par Claude (V5)
-- Date: 2026-01-11
-- ============================================

-- ============================================
-- TABLE GENERATED_QUESTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS generated_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id UUID REFERENCES communes(id) ON DELETE CASCADE,
  commune_code VARCHAR(5) NOT NULL,
  commune_nom VARCHAR(100) NOT NULL,

  -- Questions JSON
  questions JSONB NOT NULL,

  -- Métadonnées de génération
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by VARCHAR(50) DEFAULT 'claude-sonnet-4',
  generation_mode VARCHAR(20) DEFAULT 'complete',

  -- Sources utilisées
  sources TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Contexte de génération
  context_data JSONB,

  -- Statistiques
  total_questions INTEGER,
  question_types JSONB,

  -- Version et cache
  version INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte : une seule version active par commune
  UNIQUE(commune_code, version)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_generated_questions_commune
ON generated_questions(commune_code);

CREATE INDEX IF NOT EXISTS idx_generated_questions_commune_id
ON generated_questions(commune_id);

CREATE INDEX IF NOT EXISTS idx_generated_questions_generated_at
ON generated_questions(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_questions_expires
ON generated_questions(expires_at);

-- Index GIN pour recherche dans le JSON
CREATE INDEX IF NOT EXISTS idx_generated_questions_json
ON generated_questions USING GIN (questions);

-- Commentaires
COMMENT ON TABLE generated_questions IS 'Questions générées dynamiquement par Claude pour chaque commune';
COMMENT ON COLUMN generated_questions.questions IS 'Array JSON des questions avec options et positions candidats';
COMMENT ON COLUMN generated_questions.generation_mode IS 'complete (avec candidats), degraded (sans candidats), fallback (V4)';
COMMENT ON COLUMN generated_questions.sources IS 'Array des sources: profil, web_search, tract, actualite';
COMMENT ON COLUMN generated_questions.context_data IS 'Contexte utilisé : actualités, candidats, divergences';
COMMENT ON COLUMN generated_questions.expires_at IS 'Date expiration cache (NULL = jamais)';

-- ============================================
-- FONCTION DE NETTOYAGE
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_questions() RETURNS void AS $$
BEGIN
  -- Nettoyer les questions expirées (si TTL activé)
  DELETE FROM generated_questions
  WHERE expires_at IS NOT NULL
  AND expires_at < NOW();

  RAISE NOTICE 'Expired questions cleaned up';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_questions IS 'Nettoie les questions expirées (si TTL configuré)';

-- ============================================
-- FONCTION DE MISE À JOUR DU TIMESTAMP
-- ============================================

CREATE OR REPLACE FUNCTION update_generated_questions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_update_generated_questions_timestamp ON generated_questions;

CREATE TRIGGER trigger_update_generated_questions_timestamp
BEFORE UPDATE ON generated_questions
FOR EACH ROW
EXECUTE FUNCTION update_generated_questions_timestamp();

-- ============================================
-- DONNÉES DE TEST (OPTIONNEL)
-- ============================================

-- Exemple de structure de données pour référence
-- (Ne pas exécuter en production)
/*
INSERT INTO generated_questions (
  commune_code,
  commune_nom,
  questions,
  generated_by,
  generation_mode,
  sources,
  total_questions,
  question_types
) VALUES (
  '35238',
  'Rennes',
  '[
    {
      "code": "35238_Q01",
      "index": 1,
      "type": "socle",
      "categorie": "Transport",
      "texte": "Faut-il prolonger le métro vers de nouveaux quartiers ?",
      "contexte": "La ligne B est en service depuis 2022...",
      "options": ["Non", "Plutôt non", "Neutre", "Plutôt oui", "Oui"],
      "positions_candidats": {},
      "sources": ["profil"],
      "poids": 1.0
    }
  ]'::jsonb,
  'claude-sonnet-4',
  'complete',
  ARRAY['profil', 'web_search'],
  15,
  '{"socle": 8, "enjeu_local": 5, "divergence": 2}'::jsonb
);
*/

-- ============================================
-- VÉRIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 003 completed successfully';
  RAISE NOTICE 'New table: generated_questions';
  RAISE NOTICE 'Questions V5 will be stored with full context and metadata';
END $$;
