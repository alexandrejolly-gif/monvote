import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '..', '.env') });

// Créer le client Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function cleanupFakeCandidats() {
  console.log('🧹 Nettoyage des candidats factices...\n');

  try {
    // 1. Compter les candidats factices
    const { data: fakes, error: countError } = await supabase
      .from('candidats')
      .select('id, nom, prenom, commune_nom')
      .or('nom.ilike.opposition,nom.ilike.maire,nom.ilike.sortant,nom.ilike.liste,prenom.ilike.opposition,prenom.ilike.maire,prenom.ilike.sortant,prenom.ilike.liste');

    if (countError) throw countError;

    if (fakes.length === 0) {
      console.log('✅ Aucun candidat factice trouvé.');
      return;
    }

    console.log(`📋 ${fakes.length} candidat(s) factice(s) trouvé(s):\n`);
    fakes.forEach(c => {
      console.log(`   - ${c.prenom} ${c.nom} (${c.commune_nom})`);
    });

    console.log('\n🗑️  Suppression...');

    // 2. Supprimer les candidats factices
    const { error: deleteError } = await supabase
      .from('candidats')
      .delete()
      .or('nom.ilike.opposition,nom.ilike.maire,nom.ilike.sortant,nom.ilike.liste,prenom.ilike.opposition,prenom.ilike.maire,prenom.ilike.sortant,prenom.ilike.liste');

    if (deleteError) throw deleteError;

    console.log(`✅ ${fakes.length} candidat(s) factice(s) supprimé(s)\n`);

    // 3. Compter les candidats restants
    const { count: remaining, error: finalError } = await supabase
      .from('candidats')
      .select('*', { count: 'exact', head: true });

    if (finalError) throw finalError;

    console.log(`📊 Candidats restants: ${remaining}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

cleanupFakeCandidats();
