import { supabase } from '../lib/supabase.js';

console.log('🔍 Diagnostic de la base de données...\n');

// 1. Vérifier la structure de rate_limits
console.log('📊 Vérification de la table rate_limits...');
const { data: rateLimitsTest, error: rateLimitsError } = await supabase
  .from('rate_limits')
  .select('*')
  .limit(1);

if (rateLimitsError) {
  console.error('❌ Erreur rate_limits:', rateLimitsError.message);
  console.log('\n⚠️  La table rate_limits doit être recréée avec la nouvelle structure.');
  console.log('\nSQL à exécuter dans Supabase SQL Editor:');
  console.log('-------------------------------------------');
  console.log(`
DROP TABLE IF EXISTS rate_limits CASCADE;

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

CREATE INDEX idx_rate_limits_lookup
ON rate_limits(identifier_type, identifier_hash, action_type);

CREATE INDEX idx_rate_limits_window
ON rate_limits(window_start);
  `);
  console.log('-------------------------------------------\n');
} else {
  console.log('✅ Table rate_limits existe\n');
}

// 2. Vérifier les buckets de storage
console.log('🪣 Vérification des buckets de storage...');
const { data: buckets, error: bucketsError } = await supabase
  .storage
  .listBuckets();

if (bucketsError) {
  console.error('❌ Erreur buckets:', bucketsError.message);
} else {
  console.log('Buckets existants:', buckets.map(b => b.name).join(', ') || 'aucun');

  const hasSubmissions = buckets.some(b => b.name === 'submissions');

  if (!hasSubmissions) {
    console.log('\n❌ Le bucket "submissions" n\'existe pas!');
    console.log('\n📝 Instructions pour créer le bucket:');
    console.log('-------------------------------------------');
    console.log('1. Allez sur votre dashboard Supabase');
    console.log('2. Cliquez sur "Storage" dans le menu de gauche');
    console.log('3. Cliquez sur "Create a new bucket"');
    console.log('4. Nom: submissions');
    console.log('5. Cochez "Public bucket"');
    console.log('6. Cliquez sur "Create bucket"');
    console.log('-------------------------------------------\n');

    console.log('Ou exécutez ce SQL dans Supabase SQL Editor:');
    console.log('-------------------------------------------');
    console.log(`
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;
    `);
    console.log('-------------------------------------------\n');
  } else {
    console.log('✅ Bucket "submissions" existe\n');
  }
}

// 3. Vérifier les autres tables
console.log('📋 Vérification des autres tables...');
const tables = ['communes', 'candidats', 'questions', 'sessions', 'submissions'];
for (const table of tables) {
  const { error } = await supabase
    .from(table)
    .select('id')
    .limit(1);

  if (error) {
    console.log(`❌ Table "${table}": ${error.message}`);
  } else {
    console.log(`✅ Table "${table}": OK`);
  }
}

console.log('\n✅ Diagnostic terminé\n');
