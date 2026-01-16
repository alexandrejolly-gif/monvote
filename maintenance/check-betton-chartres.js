// Script pour vérifier Betton et Chartres-de-Bretagne
const COMMUNES = [
  { code: '35024', nom: 'Betton', maire_attendu: 'Laurence Besserve' },
  { code: '35066', nom: 'Chartres-de-Bretagne', maire_attendu: 'Philippe Bonnin' }
];

async function checkCommune(commune) {
  console.log(`\n📍 ${commune.nom} (${commune.code})`);
  console.log('-'.repeat(70));

  try {
    const response = await fetch('http://localhost:3000/api/admin/check-commune-candidats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'TonMotDePasseAdmin2026!',
        commune_code: commune.code
      })
    });

    const data = await response.json();

    if (!data.success) {
      console.error('❌ Erreur:', data.error);
      return data;
    }

    console.log(`\n📊 État:`);
    console.log(`   Candidats: ${data.nb_candidats}`);
    console.log(`   Maires sortants: ${data.nb_maires}`);
    console.log(`   Questions: ${data.nb_questions}`);

    if (data.candidats.length > 0) {
      console.log(`\n👥 Candidats:`);
      data.candidats.forEach(c => {
        const badge = c.maire_sortant ? '👔 MAIRE' : '';
        const details = `${c.nb_propositions} props, ${c.nb_positions} pos`;
        console.log(`   ${badge} ${c.prenom || ''} ${c.nom}`.padEnd(45), `(${details})`);
      });
    } else {
      console.log('\n⚠️  AUCUN CANDIDAT TROUVÉ');
    }

    if (commune.maire_attendu) {
      console.log(`\n🎯 Maire attendu: ${commune.maire_attendu}`);
      const maireActuel = data.candidats.find(c => c.maire_sortant);
      if (maireActuel) {
        const nom = `${maireActuel.prenom || ''} ${maireActuel.nom}`.trim();
        if (nom.toLowerCase().includes(commune.maire_attendu.toLowerCase().split(' ')[1])) {
          console.log(`   ✅ Correct: ${nom}`);
        } else {
          console.log(`   ❌ Incorrect: ${nom} (devrait être ${commune.maire_attendu})`);
        }
      } else {
        console.log(`   ❌ Aucun maire sortant en base`);
      }
    }

    return data;

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 VÉRIFICATION BETTON ET CHARTRES-DE-BRETAGNE\n');
  console.log('='.repeat(70));

  const results = [];

  for (const commune of COMMUNES) {
    const result = await checkCommune(commune);
    results.push({ commune: commune.nom, ...result });
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(70));

  results.forEach(r => {
    if (r.success) {
      const status = r.nb_candidats > 0 ? '✅' : '⚠️';
      console.log(`${status} ${r.commune}: ${r.nb_candidats} candidats, ${r.nb_questions} questions`);
    } else {
      console.log(`❌ ${r.commune}: Erreur - ${r.error}`);
    }
  });

  const problems = results.filter(r => !r.success || r.nb_candidats === 0);
  if (problems.length > 0) {
    console.log('\n⚠️  PROBLÈMES DÉTECTÉS:');
    problems.forEach(p => {
      if (!p.success) {
        console.log(`   - ${p.commune}: Erreur API`);
      } else if (p.nb_candidats === 0) {
        console.log(`   - ${p.commune}: Aucun candidat en base`);
      }
    });
    console.log('\n💡 Solutions possibles:');
    console.log('   1. Régénérer la commune avec searchCandidats amélioré');
    console.log('   2. Ajouter les candidats manuellement via l\'admin');
  }

  console.log('\n');
}

main();
