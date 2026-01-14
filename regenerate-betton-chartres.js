// Régénération de Betton et Chartres-de-Bretagne
const COMMUNES = [
  { code: '35024', nom: 'Betton' },
  { code: '35066', nom: 'Chartres-de-Bretagne' }
];

async function regenerateCommune(commune) {
  console.log(`\n📍 ${commune.nom} (${commune.code})`);
  console.log('-'.repeat(70));
  console.log('⏳ Régénération en cours (cela peut prendre 2-3 minutes)...\n');

  try {
    const response = await fetch('http://localhost:3000/api/admin/regenerate-commune', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'TonMotDePasseAdmin2026!',
        commune_code: commune.code
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Régénération réussie`);
      console.log(`   📊 ${data.stats.candidats} candidats`);
      console.log(`   📝 ${data.stats.questions} questions`);
      if (data.stats.maire_sortant) {
        console.log(`   👔 Maire: ${data.stats.maire_sortant}`);
      }
      return { success: true, ...data.stats };
    } else {
      console.log(`❌ Erreur: ${data.error}`);
      return { success: false, error: data.error };
    }

  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔄 RÉGÉNÉRATION BETTON ET CHARTRES-DE-BRETAGNE\n');
  console.log('='.repeat(70));
  console.log('⏳ Durée estimée: 5-6 minutes pour les 2 communes\n');

  const results = [];

  for (const commune of COMMUNES) {
    const result = await regenerateCommune(commune);
    results.push({ commune: commune.nom, ...result });

    // Pause entre les deux
    if (commune !== COMMUNES[COMMUNES.length - 1]) {
      console.log('\n⏳ Pause 3s...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(70));

  let totalCandidats = 0;
  let totalQuestions = 0;
  let erreurs = 0;

  results.forEach(r => {
    if (r.success) {
      console.log(`✅ ${r.commune}: ${r.candidats} candidats, ${r.questions} questions`);
      totalCandidats += r.candidats;
      totalQuestions += r.questions;
    } else {
      console.log(`❌ ${r.commune}: ${r.error}`);
      erreurs++;
    }
  });

  console.log(`\n📊 Total: ${totalCandidats} candidats, ${totalQuestions} questions`);
  if (erreurs > 0) {
    console.log(`⚠️  ${erreurs} erreur(s)`);
  }

  console.log('\n💡 Rechargez l\'application et vérifiez les maires sortants');
  console.log('');
}

main();
