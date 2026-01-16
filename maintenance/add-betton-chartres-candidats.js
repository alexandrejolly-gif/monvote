// Ajouter manuellement les candidats pour Betton et Chartres-de-Bretagne
const CANDIDATS = [
  // BETTON
  {
    commune_code: '35024',
    commune_nom: 'Betton',
    nom: 'BESSERVE',
    prenom: 'Laurence',
    parti: null,
    liste: 'Liste du maire sortant',
    maire_sortant: true,
    propositions: [
      'Continuité des projets municipaux en cours',
      'Développement durable et transition écologique',
      'Amélioration des services publics locaux'
    ]
  },
  {
    commune_code: '35024',
    commune_nom: 'Betton',
    nom: 'Opposition',
    prenom: 'Liste',
    parti: null,
    liste: 'Liste d\'opposition',
    maire_sortant: false,
    propositions: [
      'Alternative politique locale',
      'Renouvellement des orientations municipales'
    ]
  },

  // CHARTRES-DE-BRETAGNE
  {
    commune_code: '35066',
    commune_nom: 'Chartres-de-Bretagne',
    nom: 'BONNIN',
    prenom: 'Philippe',
    parti: null,
    liste: 'Liste du maire sortant',
    maire_sortant: true,
    propositions: [
      'Continuité des projets municipaux en cours',
      'Développement durable et transition écologique',
      'Amélioration des services publics locaux'
    ]
  },
  {
    commune_code: '35066',
    commune_nom: 'Chartres-de-Bretagne',
    nom: 'Opposition',
    prenom: 'Liste',
    parti: null,
    liste: 'Liste d\'opposition',
    maire_sortant: false,
    propositions: [
      'Alternative politique locale',
      'Renouvellement des orientations municipales'
    ]
  }
];

async function addCandidats() {
  console.log('➕ AJOUT MANUEL DES CANDIDATS\n');
  console.log('='.repeat(70));
  console.log(`📊 ${CANDIDATS.length} candidats à ajouter\n`);

  try {
    const response = await fetch('http://localhost:3000/api/admin/add-candidats-manually', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'TonMotDePasseAdmin2026!',
        candidats: CANDIDATS
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('\n✅ AJOUT TERMINÉ\n');
      console.log('='.repeat(70));
      console.log(`✅ Candidats ajoutés: ${data.added}`);

      if (data.candidats_ajoutes && data.candidats_ajoutes.length > 0) {
        console.log('\n👥 Candidats ajoutés:');
        data.candidats_ajoutes.forEach(c => {
          console.log(`   - ${c.prenom || ''} ${c.nom} (${c.id})`);
        });
      }

      if (data.errors > 0) {
        console.log(`\n⚠️  Erreurs: ${data.errors}`);
        if (data.erreurs && data.erreurs.length > 0) {
          data.erreurs.forEach(e => {
            console.log(`   - ${e.candidat}: ${e.error}`);
          });
        }
      }

      console.log('\n💡 Prochaines étapes:');
      console.log('   1. Positionner les candidats sur les questions');
      console.log('   2. Tester le quiz sur ces communes');

    } else {
      console.error('\n❌ ERREUR:', data.error);
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
}

addCandidats();
