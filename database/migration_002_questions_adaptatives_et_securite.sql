-- ============================================
-- Migration 002: Questions Adaptatives + Sécurité
-- Date: 2026-01-10
-- ============================================

-- ============================================
-- PARTIE 1: CRÉATION ET ENRICHISSEMENT TABLE COMMUNES
-- ============================================

-- Créer la table communes si elle n'existe pas
CREATE TABLE IF NOT EXISTS communes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_insee VARCHAR(5) NOT NULL UNIQUE,
  nom VARCHAR(100) NOT NULL,
  slug VARCHAR(100),
  population INTEGER,
  superficie_km2 DECIMAL(10,2),
  densite_hab_km2 DECIMAL(10,2),
  profil_commune VARCHAR(30),
  enjeux_prioritaires TEXT[],
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_communes_code ON communes(code_insee);
CREATE INDEX IF NOT EXISTS idx_communes_profil ON communes(profil_commune);
CREATE INDEX IF NOT EXISTS idx_communes_slug ON communes(slug);

-- Commentaires
COMMENT ON TABLE communes IS 'Liste des 43 communes de Rennes Métropole avec profils';
COMMENT ON COLUMN communes.profil_commune IS 'urbain_dense, periurbain_croissance, periurbain_stable, rural_proche';
COMMENT ON COLUMN communes.enjeux_prioritaires IS 'Array des enjeux prioritaires (transport, logement, etc.)';

-- ============================================
-- PARTIE 2: TABLES DE SÉCURITÉ
-- ============================================

-- Supprimer l'ancienne fonction rate_limit (structure différente)
DROP FUNCTION IF EXISTS increment_rate_limit(TEXT, TEXT, DATE);

-- Supprimer l'ancienne table rate_limits (structure différente)
DROP TABLE IF EXISTS rate_limits CASCADE;

-- Recréer la table rate_limits avec la nouvelle structure
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

-- Table audit_log pour traçabilité
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(30),
  entity_id UUID,
  details JSONB,
  actor_type VARCHAR(20) DEFAULT 'system',
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

COMMENT ON TABLE audit_log IS 'Journal d''audit pour traçabilité des actions';
COMMENT ON COLUMN audit_log.action IS 'Type d''action (tract_uploaded, candidat_created, etc.)';
COMMENT ON COLUMN audit_log.actor_type IS 'system, user, admin';

-- ============================================
-- PARTIE 3: ENRICHISSEMENT TABLE TRACT_SUBMISSIONS
-- ============================================

-- Ajouter colonne image_hash pour détection doublons
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS image_hash VARCHAR(16);

CREATE INDEX IF NOT EXISTS idx_tract_image_hash ON submissions(image_hash);

COMMENT ON COLUMN submissions.image_hash IS 'Hash perceptuel (pHash) pour détection de doublons';

-- ============================================
-- PARTIE 4: TABLE SHARED_RESULTS
-- ============================================

-- Table pour partages sécurisés de résultats
CREATE TABLE IF NOT EXISTS shared_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  top_candidat_nom VARCHAR(100),
  top_score INTEGER,
  view_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_token ON shared_results(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_expires ON shared_results(expires_at);

COMMENT ON TABLE shared_results IS 'Résultats partagés avec URL sécurisée';
COMMENT ON COLUMN shared_results.share_token IS 'Token signé base64url';

-- ============================================
-- PARTIE 5: NETTOYAGE AUTOMATIQUE
-- ============================================

-- Fonction pour nettoyer les anciennes entrées
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
  -- Nettoyer rate_limits > 30 jours
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '30 days';

  -- Nettoyer audit_log > 90 jours
  DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';

  -- Nettoyer shared_results expirés
  DELETE FROM shared_results WHERE expires_at < NOW();

  RAISE NOTICE 'Cleanup completed';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_data IS 'Nettoie les données anciennes (rate_limits, audit_log, shared_results)';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================

-- Vérification
DO $$
BEGIN
  RAISE NOTICE 'Migration 002 completed successfully';
  RAISE NOTICE 'New columns: slug, population, profil_commune, enjeux_prioritaires';
  RAISE NOTICE 'New tables: rate_limits, audit_log, shared_results';
END $$;
