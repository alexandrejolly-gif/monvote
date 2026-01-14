-- ============================================
-- Fix Storage Permissions for Submissions Bucket
-- ============================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Allow public read submissions" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous upload submissions" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- Politique 1: Permettre la lecture publique
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'submissions');

-- Politique 2: Permettre les uploads anonymes
CREATE POLICY "Public upload access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'submissions');

-- Politique 3: Permettre la mise à jour (au cas où)
CREATE POLICY "Public update access"
ON storage.objects FOR UPDATE
USING (bucket_id = 'submissions')
WITH CHECK (bucket_id = 'submissions');

-- Vérifier que le bucket est bien public
UPDATE storage.buckets
SET public = true
WHERE id = 'submissions';

-- Afficher les politiques créées
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%submiss%'
ORDER BY policyname;
