-- MonVote - Schéma de base de données Supabase
-- Élections municipales 2026 - Rennes Métropole

-- Activer l'extension UUID (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table : candidats
-- =====================================================
CREATE TABLE IF NOT EXISTS candidats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commune_code VARCHAR(5) NOT NULL,
  commune_nom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100),
  parti VARCHAR(100),
  liste VARCHAR(200),
  themes JSONB DEFAULT '[]'::jsonb,
  positions JSONB DEFAULT '{}'::jsonb,
  photo_url TEXT,
  source_url TEXT,
  source_type VARCHAR(50),
  submission_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(commune_code, nom)
);

-- Index pour les candidats
CREATE INDEX IF NOT EXISTS idx_candidats_commune ON candidats(commune_code);
CREATE INDEX IF NOT EXISTS idx_candidats_source ON candidats(source_type);
CREATE INDEX IF NOT EXISTS idx_candidats_submission ON candidats(submission_id);

-- Commentaires
COMMENT ON TABLE candidats IS 'Liste des candidats aux élections municipales';
COMMENT ON COLUMN candidats.source_type IS 'web_search, tract_auto, tract_manual, admin';

-- =====================================================
-- Table : questions
-- =====================================================
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commune_code VARCHAR(5) NOT NULL UNIQUE,
  commune_nom VARCHAR(100) NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les questions
CREATE INDEX IF NOT EXISTS idx_questions_commune ON questions(commune_code);

-- Commentaires
COMMENT ON TABLE questions IS 'Questions de quiz générées pour chaque commune';

-- =====================================================
-- Table : sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commune_code VARCHAR(5) NOT NULL,
  responses JSONB,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les sessions (analytics)
CREATE INDEX IF NOT EXISTS idx_sessions_commune ON sessions(commune_code);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(created_at);

-- Commentaires
COMMENT ON TABLE sessions IS 'Sessions utilisateur anonymes pour analytics';

-- =====================================================
-- Table : submissions
-- =====================================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Informations soumission
  commune_code VARCHAR(5) NOT NULL,
  commune_nom VARCHAR(100) NOT NULL,
  submitter_ip VARCHAR(45),
  submitter_email VARCHAR(200),

  -- Image
  image_url TEXT NOT NULL,
  image_hash VARCHAR(64),

  -- Analyse Claude
  analysis_result JSONB,
  extracted_data JSONB,
  confidence_score DECIMAL(3,2),

  -- Validation
  status VARCHAR(20) DEFAULT 'pending',
  validation_details JSONB,
  rejection_reason TEXT,

  -- Modération
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by VARCHAR(100),
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les submissions
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_commune ON submissions(commune_code);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_ip ON submissions(submitter_ip);
CREATE INDEX IF NOT EXISTS idx_submissions_hash ON submissions(image_hash);

-- Commentaires
COMMENT ON TABLE submissions IS 'Soumissions de tracts par les utilisateurs';
COMMENT ON COLUMN submissions.status IS 'pending, auto_approved, approved, rejected';
COMMENT ON COLUMN submissions.reviewed_by IS 'auto ou admin';

-- =====================================================
-- Table : rate_limits
-- =====================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier VARCHAR(100) NOT NULL,
  identifier_type VARCHAR(20) NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(identifier, identifier_type, window_date)
);

-- Index pour les rate limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(identifier, identifier_type, window_start);

-- Commentaires
COMMENT ON TABLE rate_limits IS 'Contrôle des abus et rate limiting';
COMMENT ON COLUMN rate_limits.identifier_type IS 'ip ou commune';

-- =====================================================
-- Fonction : Incrémenter rate limit
-- =====================================================
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_identifier TEXT,
  p_type TEXT,
  p_date DATE
)
RETURNS void AS $$
BEGIN
  INSERT INTO rate_limits (identifier, identifier_type, count, window_start, window_date)
  VALUES (p_identifier, p_type, 1, p_date::timestamp, p_date)
  ON CONFLICT (identifier, identifier_type, window_date)
  DO UPDATE SET count = rate_limits.count + 1;
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON FUNCTION increment_rate_limit IS 'Incrémente atomiquement le compteur de rate limit';

-- =====================================================
-- Trigger : Mise à jour automatique de updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger aux tables
CREATE TRIGGER update_candidats_updated_at BEFORE UPDATE ON candidats
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Foreign Key : submissions -> candidats
-- =====================================================
ALTER TABLE candidats
ADD CONSTRAINT fk_candidats_submission
FOREIGN KEY (submission_id)
REFERENCES submissions(id)
ON DELETE SET NULL;

-- =====================================================
-- Politique RLS (Row Level Security) - Optionnel
-- =====================================================
-- Si vous souhaitez activer RLS pour plus de sécurité :

-- ALTER TABLE candidats ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Créer des politiques pour autoriser les lectures publiques et écritures authentifiées
-- CREATE POLICY "Allow public read" ON candidats FOR SELECT USING (true);
-- CREATE POLICY "Allow authenticated insert" ON candidats FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- Storage Bucket : submissions
-- =====================================================
-- À exécuter dans la console Supabase Storage ou via l'interface :
-- 1. Créer un bucket nommé "submissions"
-- 2. Le rendre public pour les lectures
-- 3. Autoriser les uploads pour les utilisateurs anonymes (avec rate limiting côté API)

-- Via SQL (si l'API storage est disponible) :
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('submissions', 'submissions', true);

-- Politique de storage (optionnel, si vous utilisez RLS)
-- CREATE POLICY "Allow public read" ON storage.objects FOR SELECT
-- USING (bucket_id = 'submissions');

-- CREATE POLICY "Allow authenticated upload" ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'submissions');

-- =====================================================
-- Vues utiles pour l'administration
-- =====================================================

-- Vue : Statistiques par commune
CREATE OR REPLACE VIEW stats_par_commune AS
SELECT
  c.commune_code,
  c.commune_nom,
  COUNT(DISTINCT ca.id) as nombre_candidats,
  COUNT(DISTINCT s.id) as nombre_sessions,
  COUNT(DISTINCT sub.id) as nombre_submissions
FROM
  (SELECT DISTINCT commune_code, commune_nom FROM candidats
   UNION
   SELECT DISTINCT commune_code, commune_nom FROM questions) c
LEFT JOIN candidats ca ON c.commune_code = ca.commune_code
LEFT JOIN sessions s ON c.commune_code = s.commune_code
LEFT JOIN submissions sub ON c.commune_code = sub.commune_code
GROUP BY c.commune_code, c.commune_nom
ORDER BY c.commune_nom;

-- Vue : Submissions en attente
CREATE OR REPLACE VIEW submissions_pending AS
SELECT
  id,
  commune_nom,
  image_url,
  confidence_score,
  created_at,
  extracted_data->>'candidat' as candidat_info
FROM submissions
WHERE status = 'pending'
ORDER BY created_at ASC;

-- Commentaires
COMMENT ON VIEW stats_par_commune IS 'Vue d''ensemble des stats par commune';
COMMENT ON VIEW submissions_pending IS 'Submissions en attente de modération';

-- =====================================================
-- Données de test (optionnel)
-- =====================================================
-- Décommenter si vous voulez des données de test

/*
INSERT INTO candidats (commune_code, commune_nom, nom, prenom, parti, liste, source_type)
VALUES
  ('35238', 'Rennes', 'APPÉRÉ', 'Nathalie', 'PS', 'Rennes, la Ville en commun', 'admin'),
  ('35238', 'Rennes', 'GUYON', 'Carole', 'EELV', 'Rennes Écologie Solidarité', 'admin'),
  ('35238', 'Rennes', 'LE VERT', 'Matthieu', 'LR', 'Rennes au Cœur', 'admin');

INSERT INTO questions (commune_code, commune_nom, questions)
VALUES ('35238', 'Rennes', '[
  {
    "id": 1,
    "question": "Quelle est votre priorité pour les transports à Rennes ?",
    "theme": "transports",
    "reponses": [
      {"id": "a", "texte": "Développer le vélo", "position": 1},
      {"id": "b", "texte": "Améliorer les bus", "position": 3},
      {"id": "c", "texte": "Faciliter la voiture", "position": 5}
    ]
  }
]'::jsonb);
*/

-- =====================================================
-- Fin du schéma
-- =====================================================

-- Afficher un résumé
SELECT
  'Tables créées' as status,
  COUNT(*) as nombre
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('candidats', 'questions', 'sessions', 'submissions', 'rate_limits');
