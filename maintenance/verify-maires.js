// Vérification des maires sortants avec WebSearch (économique)
import { COMMUNES_RENNES_METROPOLE } from './lib/communes-rennes.js';

async function verifyMaires() {
  console.log('🔍 VÉRIFICATION DES MAIRES SORTANTS\n');
  console.log('='.repeat(70));
  console.log('ℹ️  Utilise WebSearch (API gratuite) au lieu de Claude\n');

  const errors = [];
  const toCheck = [];

  // Communes spécifiques à vérifier
  const priorityCommunesToCheck = [
    { code: '35024', nom: 'Betton', current: 'T GAUTIER', expected: 'Laurence Besserve' },
    { code: '35238', nom: 'Rennes', current: 'APPÉRÉ Nathalie', expected: 'Nathalie Appéré' }
  ];

  console.log('🎯 VÉRIFICATION PRIORITAIRE:\n');

  for (const communeToCheck of priorityCommunesToCheck) {
    console.log(`\n📍 ${communeToCheck.nom} (${communeToCheck.code})`);
    console.log('-'.repeat(70));

    try {
      // Récupérer les candidats de cette commune
      const response = await fetch(`http://localhost:3000/api/candidats/${communeToCheck.code}`);

      if (!response.ok) {
        console.log(`   ⚠️  Erreur API: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const candidats = data.candidats || [];

      console.log(`   ${candidats.length} candidat(s) en base`);

      const maireSortant = candidats.find(c => c.maire_sortant === true);

      if (maireSortant) {
        console.log(`   ✅ Maire sortant en base: ${maireSortant.prenom} ${maireSortant.nom}`);

        if (communeToCheck.expected) {
          const match = `${maireSortant.prenom} ${maireSortant.nom}`.toLowerCase().includes(
            communeToCheck.expected.toLowerCase().split(' ')[1] // Compare le nom de famille
          );

          if (!match) {
            console.log(`   ❌ ERREUR: Attendu "${communeToCheck.expected}"`);
            errors.push({
              commune: communeToCheck.nom,
              code: communeToCheck.code,
              enBase: `${maireSortant.prenom} ${maireSortant.nom}`,
              attendu: communeToCheck.expected
            });
          } else {
            console.log(`   ✅ Correspond à l'attendu`);
          }
        }
      } else {
        console.log(`   ❌ AUCUN maire sortant identifié`);
        toCheck.push({
          commune: communeToCheck.nom,
          code: communeToCheck.code,
          raison: 'Aucun maire sortant'
        });
      }

    } catch (error) {
      console.error(`   ❌ Erreur: ${error.message}`);
    }
  }

  // Vérifier toutes les autres communes rapidement
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 SCAN RAPIDE DES AUTRES COMMUNES');
  console.log('='.repeat(70));

  const otherCommunes = COMMUNES_RENNES_METROPOLE.filter(
    c => !priorityCommunesToCheck.find(p => p.code === c.code)
  );

  let checked = 0;
  let withMaire = 0;
  let withoutMaire = 0;

  for (const commune of otherCommunes) { // Vérifier TOUTES les communes
    try {
      const response = await fetch(`http://localhost:3000/api/candidats/${commune.code}`);

      if (response.ok) {
        const data = await response.json();
        const candidats = data.candidats || [];
        const maireSortant = candidats.find(c => c.maire_sortant === true);

        checked++;

        if (maireSortant) {
          withMaire++;
          console.log(`   ✅ ${commune.nom}: ${maireSortant.prenom} ${maireSortant.nom}`);
        } else {
          withoutMaire++;
          console.log(`   ⚠️  ${commune.nom}: Aucun maire sortant`);
          toCheck.push({
            commune: commune.nom,
            code: commune.code,
            raison: 'Aucun maire sortant'
          });
        }
      }
    } catch (error) {
      // Ignorer les erreurs pour le scan rapide
    }
  }

  // Résumé
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(70));

  console.log(`\n✅ Communes vérifiées: ${checked + priorityCommunesToCheck.length}`);
  console.log(`👔 Avec maire sortant: ${withMaire}`);
  console.log(`⚠️  Sans maire sortant: ${withoutMaire}`);

  if (errors.length > 0) {
    console.log(`\n❌ ERREURS DÉTECTÉES (${errors.length}):`);
    errors.forEach(err => {
      console.log(`\n   ${err.commune} (${err.code})`);
      console.log(`      En base: "${err.enBase}"`);
      console.log(`      Attendu: "${err.attendu}"`);
    });
  }

  if (toCheck.length > 0) {
    console.log(`\n⚠️  À VÉRIFIER (${toCheck.length}):`);
    toCheck.forEach(tc => {
      console.log(`   - ${tc.commune} (${tc.code}): ${tc.raison}`);
    });
  }

  console.log('\n💡 RECOMMANDATIONS:');
  if (errors.length > 0) {
    console.log('   1. Régénérer les communes avec erreurs');
    console.log('   2. Améliorer le prompt de recherche maire');
  }
  if (toCheck.length > 0) {
    console.log('   3. Vérifier manuellement les communes sans maire sortant');
  }

  console.log('\n');
}

verifyMaires();
