// Script pour corriger le maire sortant de Rennes
async function fixMaireRennes() {
  console.log('🔧 CORRECTION MAIRE RENNES\n');
  console.log('='.repeat(70));

  // Étape 1: Vérifier l'état actuel
  console.log('\n📊 ÉTAPE 1/2 : Vérification...\n');

  try {
    const checkResponse = await fetch('http://localhost:3000/api/admin/fix-maire-rennes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'TonMotDePasseAdmin2026!',
        action: 'check'
      })
    });

    const checkData = await checkResponse.json();

    if (!checkData.success) {
      console.error('❌ Erreur:', checkData.error);
      return;
    }

    console.log(`Total candidats: ${checkData.total_candidats}`);
    console.log(`Maires sortants: ${checkData.maires_sortants}\n`);

    console.log('Candidats:');
    checkData.candidats.forEach(c => {
      const badge = c.maire_sortant ? '👔 MAIRE' : '';
      console.log(`   ${badge} ${c.prenom || ''} ${c.nom}`.padEnd(45), `(ID: ${c.id})`);
    });

    if (!checkData.besoin_correction) {
      console.log('\n✅ Pas de correction nécessaire');
      return;
    }

    console.log('\n⚠️  Correction nécessaire!');

    // Étape 2: Corriger
    console.log('\n🔧 ÉTAPE 2/2 : Correction...\n');

    const fixResponse = await fetch('http://localhost:3000/api/admin/fix-maire-rennes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'TonMotDePasseAdmin2026!',
        action: 'fix'
      })
    });

    const fixData = await fixResponse.json();

    if (fixData.success) {
      console.log('✅ CORRECTION TERMINÉE\n');
      console.log(`👔 Maire sortant: ${fixData.maire.prenom} ${fixData.maire.nom}`);
      console.log(`📝 ${fixData.autres_corriges} autre(s) candidat(s) corrigé(s)`);
      console.log('\n💡 Rechargez l\'application pour voir le changement');
    } else {
      console.error('❌ Erreur correction:', fixData.error);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

fixMaireRennes();
