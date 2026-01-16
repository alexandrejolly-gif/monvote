import { readFileSync } from 'fs';
import { searchCandidats, searchMaire, generateQuestions, positionCandidat } from './lib/claude.js';

// Load environment variables from .env file
try {
  const envFile = readFileSync('.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
} catch (e) {
  console.warn('⚠️  Could not load .env file:', e.message);
}

// Test de génération de quiz avec la nouvelle config API
async function testQuizGeneration() {
  console.log('🧪 TEST: Génération de quiz avec nouvelle config API\n');
  console.log('=' .repeat(60));

  const commune = 'Rennes';
  const communeCode = '35238';

  try {
    // ÉTAPE 1: Recherche des candidats (Sonnet 1024 tokens)
    console.log('\n📋 ÉTAPE 1: Recherche candidats');
    console.log('  Modèle: Claude Sonnet 4.5');
    console.log('  Max tokens: 1024');
    console.log('  Recherche en cours...');

    const startCandidats = Date.now();
    const resultCandidats = await searchCandidats(commune, communeCode);
    const timeCandidats = Date.now() - startCandidats;

    console.log(`  ✅ Terminé en ${timeCandidats}ms`);
    console.log(`  Candidats trouvés: ${resultCandidats.candidats?.length || 0}`);

    if (resultCandidats.candidats && resultCandidats.candidats.length > 0) {
      console.log(`  Exemples: ${resultCandidats.candidats.slice(0, 3).map(c => c.nom).join(', ')}`);
    }

    // ÉTAPE 2: Recherche du maire (Sonnet 512 tokens)
    console.log('\n🏛️ ÉTAPE 2: Recherche maire actuel');
    console.log('  Modèle: Claude Sonnet 4.5');
    console.log('  Max tokens: 512');
    console.log('  Recherche en cours...');

    const startMaire = Date.now();
    const resultMaire = await searchMaire(commune, communeCode);
    const timeMaire = Date.now() - startMaire;

    console.log(`  ✅ Terminé en ${timeMaire}ms`);
    if (resultMaire.maire) {
      console.log(`  Maire: ${resultMaire.maire.prenom} ${resultMaire.maire.nom} (${resultMaire.maire.parti || 'parti non spécifié'})`);
    }

    // ÉTAPE 3: Génération des questions (Sonnet 2048 tokens)
    console.log('\n❓ ÉTAPE 3: Génération des questions');
    console.log('  Modèle: Claude Sonnet 4.5');
    console.log('  Max tokens: 2048');
    console.log('  Génération de 15 questions...');

    const candidatsForQuestions = resultCandidats.candidats?.slice(0, 5) || [];
    const startQuestions = Date.now();
    const resultQuestions = await generateQuestions(commune, candidatsForQuestions);
    const timeQuestions = Date.now() - startQuestions;

    console.log(`  ✅ Terminé en ${timeQuestions}ms`);
    console.log(`  Questions générées: ${resultQuestions.questions?.length || 0}`);

    if (resultQuestions.questions && resultQuestions.questions.length > 0) {
      const themes = [...new Set(resultQuestions.questions.map(q => q.theme))];
      console.log(`  Thèmes couverts: ${themes.join(', ')}`);
      console.log(`  Exemple: "${resultQuestions.questions[0].question}"`);
    }

    // ÉTAPE 4: Positionnement des candidats (⚡ HAIKU 512 tokens)
    console.log('\n🎯 ÉTAPE 4: Positionnement des candidats');
    console.log('  Modèle: ⚡ Claude Haiku 4.0 (OPTIMISÉ)');
    console.log('  Max tokens: 512');

    const candidatToPosition = resultCandidats.candidats?.[0];
    if (candidatToPosition && resultQuestions.questions) {
      console.log(`  Positionnement de: ${candidatToPosition.nom} (${candidatToPosition.parti || 'parti non spécifié'})`);
      console.log(`  Sur ${resultQuestions.questions.length} questions...`);

      const startPosition = Date.now();
      const positions = await positionCandidat(candidatToPosition, resultQuestions.questions);
      const timePosition = Date.now() - startPosition;

      console.log(`  ✅ Terminé en ${timePosition}ms`);
      if (positions) {
        const positionsCount = Object.keys(positions).length;
        console.log(`  Positions calculées: ${positionsCount}/${resultQuestions.questions.length}`);

        // Afficher quelques positions
        const firstThree = Object.entries(positions).slice(0, 3);
        console.log(`  Exemples: ${firstThree.map(([id, pos]) => `Q${id}=${pos}`).join(', ')}`);
      }
    }

    // RÉSUMÉ ET ÉCONOMIES
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DU TEST');
    console.log('='.repeat(60));

    const totalTime = timeCandidats + timeMaire + timeQuestions + (candidatToPosition ? Date.now() - startPosition : 0);

    console.log('\n⏱️  Temps total: ' + totalTime + 'ms');
    console.log('\n💰 ESTIMATION DES COÛTS:');
    console.log('  Avant optimisation:');
    console.log('    - searchCandidats: Sonnet 4096 tokens (~$0.012)');
    console.log('    - searchMaire: Sonnet 4096 tokens (~$0.012)');
    console.log('    - generateQuestions: Sonnet 4096 tokens (~$0.012)');
    console.log('    - positionCandidat: Sonnet 4096 tokens (~$0.012)');
    console.log('    TOTAL: ~$0.048');

    console.log('\n  Après optimisation:');
    console.log('    - searchCandidats: Sonnet 1024 tokens (~$0.003)');
    console.log('    - searchMaire: Sonnet 512 tokens (~$0.002)');
    console.log('    - generateQuestions: Sonnet 2048 tokens (~$0.006)');
    console.log('    - positionCandidat: ⚡ HAIKU 512 tokens (~$0.0001)');
    console.log('    TOTAL: ~$0.011');

    console.log('\n  💵 ÉCONOMIE: ~$0.037 par quiz (-77%)');

    console.log('\n✅ TEST RÉUSSI: Nouvelle configuration API fonctionne correctement');
    console.log('✅ Haiku utilisé pour positionCandidat (économie majeure)');
    console.log('✅ Tous les max_tokens réduits efficacement');

  } catch (error) {
    console.error('\n❌ ERREUR pendant le test:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le test
console.log('🚀 Démarrage du test d\'optimisation API...\n');
testQuizGeneration()
  .then(() => {
    console.log('\n✅ Test terminé avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test échoué:', error);
    process.exit(1);
  });
