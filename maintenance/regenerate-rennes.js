// Régénération complète de Rennes
const ADMIN_KEY = process.env.ADMIN_KEY || 'TonMotDePasseAdmin2026!';

async function regenerateRennes() {
  console.log('🔄 RÉGÉNÉRATION DE RENNES\n');
  console.log('='.repeat(70));

  try {
    const response = await fetch('http://localhost:3000/api/admin/regenerate-commune', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: ADMIN_KEY,
        commune_code: '35238'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erreur:', error);
      return;
    }

    const result = await response.json();

    console.log('\n✅ RÉGÉNÉRATION TERMINÉE');
    console.log('='.repeat(70));
    console.log('\n📊 Résultats:');
    console.log(`   Commune: ${result.commune.nom} (${result.commune.code})`);
    console.log(`   Candidats: ${result.stats.candidats}`);
    console.log(`   Questions: ${result.stats.questions}`);
    console.log(`   Version: ${result.stats.version}`);
    console.log(`   Tracts utilisés: ${result.stats.tracts_used}`);
    console.log('\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

regenerateRennes();
