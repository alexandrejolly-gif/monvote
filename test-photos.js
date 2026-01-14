// Script pour tester les photos des communes

async function testPhoto(nom, code) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📸 Test photo: ${nom} (${code})`);
  console.log('='.repeat(60));

  try {
    const url = `http://localhost:3000/api/commune-photo?nom=${encodeURIComponent(nom)}&code=${code}`;
    console.log(`🔗 URL: ${url}\n`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      console.log('✅ Photo trouvée!');
      console.log(`📷 URL: ${data.image.url}`);
      console.log(`📝 Description: ${data.image.description}`);
      console.log(`👤 Crédit: ${data.image.credit || 'N/A'}`);
      console.log(`📍 Source: ${data.image.source}`);

      // Vérifier si l'URL contient des mots-clés de personnes
      const urlLower = data.image.url.toLowerCase();
      const descLower = (data.image.description || '').toLowerCase();

      const peopleKeywords = [
        'portrait', 'concert', 'chanteur', 'chanteuse', 'musicien',
        'people', 'person', 'homme', 'femme', 'maire', 'politician',
        'ceremony', 'festival', 'inauguration'
      ];

      const foundKeywords = peopleKeywords.filter(
        keyword => urlLower.includes(keyword) || descLower.includes(keyword)
      );

      if (foundKeywords.length > 0) {
        console.log(`\n⚠️  ATTENTION: Mots-clés de personnes détectés: ${foundKeywords.join(', ')}`);
      } else {
        console.log('\n✅ Pas de mot-clé de personne détecté');
      }
    } else {
      console.log('❌ Pas de photo trouvée');
      console.log(`Erreur: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ Erreur lors du test: ${error.message}`);
  }
}

async function runTests() {
  console.log('🧪 Tests des photos de communes\n');

  await testPhoto('Romillé', '35245');
  await new Promise(resolve => setTimeout(resolve, 1000));

  await testPhoto('Betton', '35024');

  console.log('\n\n✅ Tests terminés!');
}

runTests();
