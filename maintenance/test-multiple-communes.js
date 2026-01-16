// Script pour tester plusieurs communes

async function testPhoto(nom, code) {
  console.log(`\n📸 ${nom} (${code})`);

  try {
    const url = `http://localhost:3000/api/commune-photo?nom=${encodeURIComponent(nom)}&code=${code}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      const descLower = (data.image.description || '').replace(/<[^>]*>/g, '').toLowerCase();

      const peopleKeywords = [
        'portrait', 'concert', 'chanteur', 'chanteuse', 'musicien',
        'people', 'person', 'personne', 'homme', 'femme', 'maire', 'politician',
        'ceremony', 'festival', 'inauguration'
      ];

      const foundKeywords = peopleKeywords.filter(keyword => descLower.includes(keyword));

      if (foundKeywords.length > 0) {
        console.log(`   ⚠️  PERSONNE DÉTECTÉE: ${foundKeywords.join(', ')}`);
        console.log(`   Description: ${data.image.description}`);
      } else {
        const shortDesc = data.image.description.replace(/<[^>]*>/g, '').substring(0, 80);
        console.log(`   ✅ OK - ${shortDesc}...`);
      }
    } else {
      console.log(`   ℹ️  Pas de photo`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
  }
}

async function testCommunes() {
  console.log('🧪 Test de plusieurs communes\n');
  console.log('='.repeat(70));

  const communes = [
    { nom: 'Rennes', code: '35238' },
    { nom: 'Cesson-Sévigné', code: '35051' },
    { nom: 'Bruz', code: '35047' },
    { nom: 'Châteaugiron', code: '35069' },
    { nom: 'Saint-Jacques-de-la-Lande', code: '35281' },
    { nom: 'Pacé', code: '35210' },
    { nom: 'Thorigné-Fouillard', code: '35334' },
    { nom: 'Vern-sur-Seiche', code: '35352' },
    { nom: 'Vitré', code: '35360' },
    { nom: 'Acigné', code: '35001' }
  ];

  for (const commune of communes) {
    await testPhoto(commune.nom, commune.code);
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Tests terminés!');
}

// Test également de charger la liste des communes
async function testCommunesAPI() {
  console.log('\n\n🗺️  Test de l\'API communes\n');
  console.log('='.repeat(70));

  try {
    const response = await fetch('http://localhost:3000/api/communes');
    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.count} communes chargées`);

      // Vérifier quelques communes spécifiques
      const romille = data.data.find(c => c.code === '35245');
      const betton = data.data.find(c => c.code === '35024');
      const chateaugiron = data.data.find(c => c.code === '35069');

      console.log(`\n📋 Vérification des noms:`);
      console.log(`   Code 35245: ${romille ? romille.nom : 'NON TROUVÉ'} (devrait être Romillé)`);
      console.log(`   Code 35024: ${betton ? betton.nom : 'NON TROUVÉ'} (devrait être Betton)`);
      console.log(`   Code 35069: ${chateaugiron ? chateaugiron.nom : 'NON TROUVÉ'} (devrait être Châteaugiron)`);

      if (romille && romille.nom === 'Romillé' &&
          betton && betton.nom === 'Betton' &&
          chateaugiron && chateaugiron.nom === 'Châteaugiron') {
        console.log('\n✅ Tous les noms sont corrects!');
      } else {
        console.log('\n⚠️  Certains noms ne sont pas corrects');
      }
    } else {
      console.log('❌ Erreur:', data.error);
    }
  } catch (error) {
    console.log('❌ Erreur API:', error.message);
  }
}

async function runAll() {
  await testCommunesAPI();
  await testCommunes();
}

runAll();
