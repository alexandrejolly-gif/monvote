// Script pour nettoyer TOUT le cache (questions + candidats)
// Nécessaire après la correction des codes INSEE
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Charger .env manuellement
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith('#')) return;

  const [key, ...valueParts] = trimmedLine.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  envVars.SUPABASE_URL,
  envVars.SUPABASE_ANON_KEY
);

async function clearAllCache() {
  console.log('🗑️  Nettoyage complet du cache...\n');

  // 1. Supprimer TOUTES les questions
  console.log('🔍 Suppression des questions en cache...');
  const { error: deleteQuestionsError } = await supabase
    .from('questions')
    .delete()
    .neq('commune_code', '00000'); // Supprimer tout sauf le code impossible

  if (deleteQuestionsError) {
    console.error('❌ Erreur suppression questions:', deleteQuestionsError);
  } else {
    console.log('✅ Toutes les questions en cache ont été supprimées');
  }

  // 2. Supprimer TOUS les candidats
  console.log('\n🔍 Suppression des candidats...');
  const { error: deleteCandidatsError } = await supabase
    .from('candidats')
    .delete()
    .neq('commune_code', '00000'); // Supprimer tout sauf le code impossible

  if (deleteCandidatsError) {
    console.error('❌ Erreur suppression candidats:', deleteCandidatsError);
  } else {
    console.log('✅ Tous les candidats ont été supprimés');
  }

  console.log('\n✅ Nettoyage terminé !');
  console.log('📝 Au prochain test:');
  console.log('   - Les candidats seront recherchés automatiquement');
  console.log('   - Les questions seront générées avec les bons codes INSEE');
  console.log('   - Les candidats seront positionnés correctement');
}

// Exécuter le nettoyage
clearAllCache()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
