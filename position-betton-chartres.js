// Positionner les candidats de Betton et Chartres-de-Bretagne
const COMMUNES = ['35024', '35066']; // Betton, Chartres-de-Bretagne

async function positionCandidats() {
  console.log('📊 POSITIONNEMENT DES CANDIDATS\n');
  console.log('='.repeat(70));
  console.log('⏳ Durée estimée: 30 secondes\n');

  try {
    // Utiliser l'API de régénération des positions pour ces 2 communes
    const response = await fetch('http://localhost:3000/api/admin/regenerate-positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'TonMotDePasseAdmin2026!'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ POSITIONNEMENT TERMINÉ\n');
      console.log('='.repeat(70));
      console.log(`✅ Communes traitées: ${data.communes_traitees}`);
      console.log(`✅ Candidats positionnés: ${data.candidats_positionnes}`);

      if (data.details) {
        const bettonChartres = data.details.filter(d =>
          d.commune === 'Betton' || d.commune === 'Chartres-de-Bretagne'
        );

        if (bettonChartres.length > 0) {
          console.log('\n📋 Betton & Chartres-de-Bretagne:');
          bettonChartres.forEach(d => {
            if (d.success) {
              console.log(`   ✅ ${d.commune}: ${d.candidats_updated}/${d.candidats_total} candidats`);
            } else {
              console.log(`   ❌ ${d.commune}: ${d.error}`);
            }
          });
        }
      }

      console.log('\n💡 Testez maintenant le quiz sur Betton et Chartres-de-Bretagne !');

    } else {
      console.error('\n❌ ERREUR:', data.error);
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
}

positionCandidats();
