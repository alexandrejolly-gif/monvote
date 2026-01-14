// Script pour supprimer le cache de questions d'une commune
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

async function clearQuestionCache(communeCode) {
  console.log(`🔍 Recherche du cache de questions pour la commune ${communeCode}...`);

  const { data, error } = await supabase
    .from('questions')
    .delete()
    .eq('commune_code', communeCode);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`✅ Cache de questions supprimé pour la commune ${communeCode}`);
  console.log('   Les questions seront régénérées lors du prochain chargement du quiz.');
}

// Supprimer le cache de Chartres-de-Bretagne
clearQuestionCache('35066')
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
