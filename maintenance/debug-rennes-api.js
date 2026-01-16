// Debug des candidats de Rennes via API HTTP
async function debugRennes() {
  console.log('🔍 DEBUG CANDIDATS RENNES (via API)\n');
  console.log('='.repeat(70));

  try {
    // Appeler l'API publique pour récupérer les candidats
    const response = await fetch('http://localhost:3000/api/candidats/35238');

    if (!response.ok) {
      console.error(`❌ Erreur API: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();

    if (!data.success) {
      console.error('❌ API a retourné une erreur:', data.error);
      return;
    }

    const candidats = data.candidats || [];
    console.log(`\n📊 ${candidats.length} candidat(s) trouvé(s) pour Rennes\n`);

    candidats.forEach((candidat, index) => {
      console.log(`\n${index + 1}. ${candidat.nom} ${candidat.prenom || ''}`);
      console.log('-'.repeat(70));
      console.log(`   ID: ${candidat.id}`);
      console.log(`   Parti: ${candidat.parti || 'Non renseigné'}`);
      console.log(`   Liste: ${candidat.liste || 'Non renseigné'}`);
      console.log(`   Maire sortant: ${candidat.maire_sortant ? '✅ OUI' : '❌ Non'}`);
      console.log(`   Source: ${candidat.source_type}`);
      console.log(`   Propositions: ${candidat.propositions ? candidat.propositions.length : 0}`);

      if (candidat.propositions && candidat.propositions.length > 0) {
        console.log(`   Propositions (3 premières):`);
        candidat.propositions.slice(0, 3).forEach((prop, i) => {
          const preview = typeof prop === 'string' ? prop.substring(0, 80) : JSON.stringify(prop).substring(0, 80);
          console.log(`      ${i + 1}. ${preview}${preview.length >= 80 ? '...' : ''}`);
        });
        if (candidat.propositions.length > 3) {
          console.log(`      ... et ${candidat.propositions.length - 3} autres`);
        }
      } else {
        console.log(`   ⚠️  AUCUNE PROPOSITION`);
      }

      console.log(`   Positions: ${candidat.positions ? Object.keys(candidat.positions).length + ' questions' : 'Aucune'}`);
    });

    // Statistiques
    console.log('\n\n' + '='.repeat(70));
    console.log('📊 STATISTIQUES');
    console.log('='.repeat(70));

    const avecPropositions = candidats.filter(c => c.propositions && c.propositions.length > 0).length;
    const sansPropositions = candidats.length - avecPropositions;
    const mairesortants = candidats.filter(c => c.maire_sortant).length;

    console.log(`\n✅ Candidats avec propositions: ${avecPropositions}`);
    console.log(`❌ Candidats sans propositions: ${sansPropositions}`);
    console.log(`👔 Maires sortants identifiés: ${mairesortants}`);

    // Chercher spécifiquement Nathalie Appéré
    console.log('\n' + '='.repeat(70));
    console.log('🔍 RECHERCHE NATHALIE APPÉRÉ');
    console.log('='.repeat(70));

    const nathalie = candidats.find(c =>
      c.nom.toLowerCase().includes('appéré') ||
      c.nom.toLowerCase().includes('appere')
    );

    if (nathalie) {
      console.log('\n✅ TROUVÉE:');
      console.log(`   Nom: ${nathalie.nom} ${nathalie.prenom || ''}`);
      console.log(`   Maire sortant: ${nathalie.maire_sortant ? '✅ OUI' : '❌ NON'}`);
      console.log(`   Propositions: ${nathalie.propositions?.length || 0}`);
      console.log(`   Parti: ${nathalie.parti || 'Non renseigné'}`);
      console.log(`   Liste: ${nathalie.liste || 'Non renseigné'}`);

      if (nathalie.propositions && nathalie.propositions.length > 0) {
        console.log(`\n   Ses propositions:`);
        nathalie.propositions.forEach((prop, i) => {
          console.log(`      ${i + 1}. ${prop}`);
        });
      } else {
        console.log('\n   ⚠️  PAS DE PROPOSITIONS ENREGISTRÉES');
      }
    } else {
      console.log('\n❌ Nathalie Appéré NON TROUVÉE dans la base');
    }

    // Chercher Carole Boulard
    console.log('\n' + '='.repeat(70));
    console.log('🔍 RECHERCHE CAROLE BOULARD');
    console.log('='.repeat(70));

    const carole = candidats.find(c =>
      c.nom.toLowerCase().includes('boulard')
    );

    if (carole) {
      console.log('\n✅ TROUVÉE:');
      console.log(`   Nom: ${carole.nom} ${carole.prenom || ''}`);
      console.log(`   Maire sortant: ${carole.maire_sortant ? '✅ OUI' : '❌ NON'}`);
      console.log(`   Propositions: ${carole.propositions?.length || 0}`);
      console.log(`   Parti: ${carole.parti || 'Non renseigné'}`);
      console.log(`   Liste: ${carole.liste || 'Non renseigné'}`);
      console.log(`   Source: ${carole.source_type}`);

      if (carole.propositions && carole.propositions.length > 0) {
        console.log(`\n   Ses propositions:`);
        carole.propositions.forEach((prop, i) => {
          console.log(`      ${i + 1}. ${prop}`);
        });
      } else {
        console.log('\n   ⚠️  PAS DE PROPOSITIONS → Affiché comme "Données insuffisantes"');
      }
    } else {
      console.log('\n❌ Carole Boulard NON TROUVÉE dans la base');
    }

    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

debugRennes();
