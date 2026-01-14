// Vérifier les maires sortants de Rennes
import { supabase } from './lib/supabase.js';

async function checkRennesMaires() {
  console.log('🔍 VÉRIFICATION DES MAIRES RENNES\n');

  const { data: candidats, error } = await supabase
    .from('candidats')
    .select('*')
    .eq('commune_code', '35238')
    .order('nom', { ascending: true });

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  console.log(`📊 ${candidats.length} candidats trouvés pour Rennes:\n`);

  candidats.forEach(c => {
    const maireBadge = c.maire_sortant ? '👔 MAIRE' : '';
    console.log(`${maireBadge} ${c.prenom || ''} ${c.nom}`.padEnd(40),
                `- maire_sortant: ${c.maire_sortant}`,
                `- ID: ${c.id}`);
  });

  const maires = candidats.filter(c => c.maire_sortant === true);
  console.log(`\n⚠️  ${maires.length} candidat(s) marqué(s) comme maire sortant:`);
  maires.forEach(m => {
    console.log(`   - ${m.prenom} ${m.nom} (ID: ${m.id})`);
  });

  if (maires.length > 1) {
    console.log('\n❌ PROBLÈME: Plusieurs candidats marqués comme maire sortant!');
    console.log('\n💡 Pour corriger:');
    console.log('   1. Identifier le bon maire (Nathalie Appéré)');
    console.log('   2. Mettre maire_sortant=false pour les autres');
  }
}

checkRennesMaires();
