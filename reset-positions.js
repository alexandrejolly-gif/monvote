// Script pour réinitialiser les positions d'un candidat
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Charger .env manuellement
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  // Ignorer les commentaires et lignes vides
  if (!trimmedLine || trimmedLine.startsWith('#')) return;

  const [key, ...valueParts] = trimmedLine.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

console.log('🔑 Variables chargées:', Object.keys(envVars));

const supabase = createClient(
  envVars.SUPABASE_URL,
  envVars.SUPABASE_ANON_KEY
);

async function resetCandidatPositions(communeCode, candidatNom) {
  console.log(`🔍 Recherche du candidat "${candidatNom}" pour la commune ${communeCode}...`);

  // Trouver le candidat
  const { data: candidats, error: searchError } = await supabase
    .from('candidats')
    .select('*')
    .eq('commune_code', communeCode)
    .ilike('nom', `%${candidatNom}%`);

  if (searchError) {
    console.error('❌ Erreur de recherche:', searchError);
    return;
  }

  if (!candidats || candidats.length === 0) {
    console.log('❌ Aucun candidat trouvé');
    return;
  }

  console.log(`✅ Trouvé ${candidats.length} candidat(s):`);
  candidats.forEach(c => {
    const posCount = c.positions ? Object.keys(c.positions).length : 0;
    console.log(`  - ${c.prenom} ${c.nom} (${c.parti}) - ${posCount} positions actuelles`);
  });

  // Réinitialiser les positions de chaque candidat trouvé
  for (const candidat of candidats) {
    console.log(`\n🔄 Réinitialisation des positions de ${candidat.prenom} ${candidat.nom}...`);

    const { error: updateError } = await supabase
      .from('candidats')
      .update({
        positions: {},
        updated_at: new Date().toISOString()
      })
      .eq('id', candidat.id);

    if (updateError) {
      console.error(`❌ Erreur de mise à jour:`, updateError);
    } else {
      console.log(`✅ Positions réinitialisées pour ${candidat.prenom} ${candidat.nom}`);
    }
  }

  console.log('\n✅ Terminé ! Le candidat sera repositionné lors du prochain chargement du quiz.');
}

// Réinitialiser Philippe BONNIN à Chartres-de-Bretagne
resetCandidatPositions('35066', 'BONNIN')
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
