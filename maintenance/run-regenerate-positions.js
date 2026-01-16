// Script pour lancer la régénération des positions via API
async function regeneratePositions() {
  console.log('🔄 LANCEMENT RÉGÉNÉRATION DES POSITIONS\n');
  console.log('='.repeat(70));
  console.log('⏳ Cela peut prendre 2-3 minutes...\n');

  try {
    const response = await fetch('http://localhost:3000/api/admin/regenerate-positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'TonMotDePasseAdmin2026!'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('\n✅ RÉGÉNÉRATION TERMINÉE\n');
      console.log('='.repeat(70));
      console.log(`📊 Communes traitées: ${data.communes_traitees}`);
      console.log(`✅ Candidats positionnés: ${data.candidats_positionnes}`);
      console.log(`❌ Erreurs: ${data.erreurs}`);

      if (data.details && data.details.length > 0) {
        console.log('\n📋 Détails par commune:');
        data.details.forEach(d => {
          if (d.success) {
            console.log(`  ✅ ${d.commune}: ${d.candidats_updated}/${d.candidats_total} candidats`);
          } else {
            console.log(`  ❌ ${d.commune}: ${d.error}`);
          }
        });
      }

      console.log('\n💡 Testez maintenant le quiz sur l\'application');
    } else {
      console.error('\n❌ ERREUR:', data.error);
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
}

regeneratePositions();
