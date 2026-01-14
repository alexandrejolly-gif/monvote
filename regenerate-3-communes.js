// Régénération des 3 communes avec maires incorrects
const COMMUNES_TO_FIX = [
  { code: '35238', nom: 'Rennes', erreur: 'Gaëlle ROUGIER au lieu de Nathalie Appéré' },
  { code: '35024', nom: 'Betton', erreur: 'Thierry GAUTIER au lieu de Laurence Besserve' },
  { code: '35066', nom: 'Chartres-de-Bretagne', erreur: 'Gilles BESNIER au lieu de Philippe Bonnin' }
];

async function regenerateCommunes() {
  console.log('🔄 RÉGÉNÉRATION DES 3 COMMUNES AVEC ERREURS\n');
  console.log('='.repeat(70));

  for (const commune of COMMUNES_TO_FIX) {
    console.log(`\n📍 ${commune.nom} (${commune.code})`);
    console.log(`   Erreur détectée: ${commune.erreur}`);
    console.log('-'.repeat(70));

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
        console.log(`   ✅ Régénération réussie`);
        console.log(`   📊 ${data.stats.candidats} candidats, ${data.stats.questions} questions`);
        if (data.stats.maire_sortant) {
          console.log(`   👔 Maire sortant: ${data.stats.maire_sortant}`);
        }
      } else {
        console.log(`   ❌ Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error(`   ❌ Erreur: ${error.message}`);
    }

    // Pause entre chaque commune pour éviter de surcharger l'API
    if (commune !== COMMUNES_TO_FIX[COMMUNES_TO_FIX.length - 1]) {
      console.log('   ⏳ Pause 2s...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('✅ RÉGÉNÉRATION TERMINÉE');
  console.log('='.repeat(70));
  console.log('\n💡 Vérifiez les résultats dans l\'application\n');
}

regenerateCommunes();
