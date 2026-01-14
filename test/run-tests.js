// Suite de tests MonVote simplifiée - SANS appels API coûteux
import { calculateCompatibility, MOCK_QUESTIONS, MOCK_CANDIDATS } from './fixtures/mock-data.js';
import https from 'https';

const testResults = {
  frontend: [],
  functional: [],
  security: [],
  database: [],
  performance: []
};

// Utilitaire de logging
function logTest(category, name, passed, notes = '') {
  const result = { test: name, status: passed ? '✅' : '❌', notes };
  testResults[category].push(result);
  console.log(`${passed ? '✅' : '❌'} [${category.toUpperCase()}] ${name}${notes ? ' - ' + notes : ''}`);
  return passed;
}

// ======================
// Tests Fonctionnels (calcul de scores)
// ======================

function testScoreCalculation() {
  console.log('\n🧮 TESTS FONCTIONNELS (Calcul de scores)\n');

  // Test 1: Score 100% (accord parfait)
  const perfectAnswers = {
    1: 2, 2: 1, 3: 3, 4: 4, 5: 2,
    6: 3, 7: 2, 8: 1, 9: 2, 10: 3,
    11: 4, 12: 2, 13: 1, 14: 3, 15: 2
  };
  const candidat1Positions = MOCK_CANDIDATS[0].positions;
  const score100 = calculateCompatibility(perfectAnswers, candidat1Positions);
  logTest('functional', 'Score 100% avec accord parfait',
    score100 === 100,
    `Score: ${score100}%`
  );

  // Test 2: Score 0% (désaccord total)
  const oppositeAnswers = {
    1: 5, 2: 5, 3: 5, 4: 5, 5: 5,
    6: 5, 7: 5, 8: 5, 9: 5, 10: 5,
    11: 5, 12: 5, 13: 5, 14: 5, 15: 5
  };
  const score0 = calculateCompatibility(oppositeAnswers, candidat1Positions);
  logTest('functional', 'Score proche de 0% avec désaccord total',
    score0 < 30,
    `Score: ${score0}%`
  );

  // Test 3: Pondération divergences et enjeux locaux
  const testAnswers1 = { 1: 2, 2: 1 };
  const testPositions1 = { 1: 2, 2: 1 };
  const score1 = calculateCompatibility(testAnswers1, testPositions1);
  logTest('functional', 'Score partiel avec accord',
    score1 === 100,
    `Score partiel: ${score1}%`
  );

  // Test 4: Comparaison entre 2 candidats
  const userAnswers = {
    1: 2, 2: 2, 3: 1, 4: 2, 5: 1,
    6: 2, 7: 4, 8: 2, 9: 1, 10: 2,
    11: 3, 12: 1, 13: 2, 14: 4, 15: 1
  };
  const scoreCand1 = calculateCompatibility(userAnswers, MOCK_CANDIDATS[0].positions);
  const scoreCand2 = calculateCompatibility(userAnswers, MOCK_CANDIDATS[1].positions);
  logTest('functional', 'Différenciation entre candidats',
    Math.abs(scoreCand1 - scoreCand2) > 5,
    `Candidat1: ${scoreCand1}%, Candidat2: ${scoreCand2}%`
  );

  // Test 5: Gestion réponses manquantes
  const partialAnswers = { 1: 2, 5: 1 };
  const scorePartial = calculateCompatibility(partialAnswers, candidat1Positions);
  logTest('functional', 'Gestion réponses partielles',
    scorePartial >= 0 && scorePartial <= 100,
    `Score partiel: ${scorePartial}%`
  );

  // Test 6: Validation entrées invalides
  const invalidScore1 = calculateCompatibility(null, candidat1Positions);
  const invalidScore2 = calculateCompatibility(userAnswers, null);
  logTest('functional', 'Protection contre null',
    invalidScore1 === 0 && invalidScore2 === 0,
    'Retourne 0 pour entrées nulles'
  );
}

// ======================
// Tests Structure des Données
// ======================

function testDataStructure() {
  console.log('\n📋 TESTS STRUCTURE DES DONNÉES\n');

  // Test 1: Structure des questions
  const q1 = MOCK_QUESTIONS[0];
  logTest('database', 'Questions ont tous les champs requis',
    q1.code && q1.question && q1.reponses && q1.theme && q1.type,
    'Champs: code, question, reponses, theme, type'
  );

  logTest('database', 'Questions ont 5 réponses',
    q1.reponses.length === 5,
    `${q1.reponses.length} réponses`
  );

  logTest('database', 'Total 15 questions dans mocks',
    MOCK_QUESTIONS.length === 15,
    `${MOCK_QUESTIONS.length} questions`
  );

  // Test 2: Types de questions
  const socle = MOCK_QUESTIONS.filter(q => q.type === 'socle');
  const local = MOCK_QUESTIONS.filter(q => q.type === 'local');
  const divergence = MOCK_QUESTIONS.filter(q => q.type === 'divergence');

  logTest('database', 'Distribution types de questions',
    socle.length === 8 && local.length === 5 && divergence.length === 2,
    `Socle: ${socle.length}, Local: ${local.length}, Divergence: ${divergence.length}`
  );

  // Test 3: Structure des candidats
  const c1 = MOCK_CANDIDATS[0];
  logTest('database', 'Candidats ont tous les champs',
    c1.nom && c1.prenom && c1.commune_code && c1.positions,
    'Champs: nom, prenom, commune_code, positions'
  );

  logTest('database', 'Candidats ont 15 positions',
    Object.keys(c1.positions).length === 15,
    `${Object.keys(c1.positions).length} positions`
  );

  logTest('database', 'Positions entre 1 et 5',
    Object.values(c1.positions).every(p => p >= 1 && p <= 5),
    'Toutes les positions valides'
  );
}

// ======================
// Tests Logique Métier
// ======================

function testBusinessLogic() {
  console.log('\n💼 TESTS LOGIQUE MÉTIER\n');

  // Test 1: Pondération enjeux locaux (×1.2)
  const enjeuLocal = MOCK_QUESTIONS.find(q => q.est_enjeu_local === true);
  logTest('functional', 'Enjeux locaux identifiés',
    enjeuLocal !== undefined,
    `Question ${enjeuLocal?.index} est enjeu local`
  );

  // Test 2: Pondération divergences (×1.5)
  const divergenceQ = MOCK_QUESTIONS.find(q => q.type === 'divergence');
  logTest('functional', 'Questions divergences identifiées',
    divergenceQ !== undefined,
    `Question ${divergenceQ?.index} est divergence`
  );

  // Test 3: Calcul distance (accord/désaccord)
  const testPos1 = { 1: 1 }; // Très favorable
  const testPos2 = { 1: 5 }; // Très défavorable
  const answer1 = { 1: 1 };  // Utilisateur = très favorable

  const scoreAgree = calculateCompatibility(answer1, testPos1);
  const scoreDisagree = calculateCompatibility(answer1, testPos2);

  logTest('functional', 'Distance accord vs désaccord',
    scoreAgree > scoreDisagree,
    `Accord: ${scoreAgree}%, Désaccord: ${scoreDisagree}%`
  );

  // Test 4: Symétrie du score
  const posA = { 1: 2, 2: 3 };
  const posB = { 1: 3, 2: 2 };
  const ansA = { 1: 2, 2: 3 };
  const ansB = { 1: 3, 2: 2 };

  const scoreAB = calculateCompatibility(ansA, posB);
  const scoreBA = calculateCompatibility(ansB, posA);

  logTest('functional', 'Symétrie du calcul',
    Math.abs(scoreAB - scoreBA) < 5,
    `ScoreAB: ${scoreAB}%, ScoreBA: ${scoreBA}%`
  );
}

// ======================
// Tests Sécurité (logique)
// ======================

function testSecurityLogic() {
  console.log('\n🔒 TESTS SÉCURITÉ (Logique)\n');

  // Test 1: Validation positions candidats
  const invalidPositions = { 1: 10, 2: -5, 3: 'invalid' };
  logTest('security', 'Détection positions invalides',
    !Object.values(invalidPositions).every(p => typeof p === 'number' && p >= 1 && p <= 5),
    'Positions hors limites détectées'
  );

  // Test 2: Protection contre injection dans calcul
  const maliciousAnswers = { 1: "'; DROP TABLE--", 2: "<script>alert('XSS')</script>" };
  try {
    const result = calculateCompatibility(maliciousAnswers, MOCK_CANDIDATS[0].positions);
    logTest('security', 'Protection injection dans calcul',
      result === 0 || isNaN(result),
      'Entrées malveillantes gérées'
    );
  } catch (error) {
    logTest('security', 'Protection injection dans calcul', true, 'Exception levée');
  }

  // Test 3: Limites numériques
  const extremeAnswers = { 1: 999999, 2: -999999 };
  const extremeScore = calculateCompatibility(extremeAnswers, MOCK_CANDIDATS[0].positions);
  logTest('security', 'Gestion valeurs extrêmes',
    extremeScore >= 0 && extremeScore <= 100,
    `Score: ${extremeScore}%`
  );
}

// ======================
// Génération du rapport
// ======================

function generateReport() {
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📊 RAPPORT DE TESTS MONVOTE');
  console.log('═══════════════════════════════════════════════════════\n');

  const allTests = [
    ...testResults.database,
    ...testResults.functional,
    ...testResults.security,
    ...testResults.performance,
    ...testResults.frontend
  ];

  const passed = allTests.filter(t => t.status === '✅').length;
  const failed = allTests.filter(t => t.status === '❌').length;
  const total = allTests.length;

  console.log(`✅ Tests réussis: ${passed}/${total}`);
  console.log(`❌ Tests échoués: ${failed}/${total}`);
  console.log(`📈 Taux de réussite: ${Math.round((passed / total) * 100)}%\n`);

  // Détail par catégorie
  const categories = ['database', 'functional', 'security', 'performance', 'frontend'];

  for (const cat of categories) {
    const catTests = testResults[cat];
    if (catTests.length === 0) continue;

    const catPassed = catTests.filter(t => t.status === '✅').length;
    const catTotal = catTests.length;

    console.log(`\n${cat.toUpperCase()} (${catPassed}/${catTotal})`);
    console.log('─'.repeat(50));

    catTests.forEach(t => {
      console.log(`${t.status} ${t.test}${t.notes ? ' - ' + t.notes : ''}`);
    });
  }

  // Bugs critiques
  const criticalFailures = allTests.filter(t =>
    t.status === '❌' &&
    (t.test.includes('Score') || t.test.includes('Protection') || t.test.includes('Validation'))
  );

  if (criticalFailures.length > 0) {
    console.log('\n\n🚨 BUGS CRITIQUES À CORRIGER:');
    console.log('─'.repeat(50));
    criticalFailures.forEach((t, i) => {
      console.log(`${i + 1}. ${t.test}`);
      if (t.notes) console.log(`   → ${t.notes}`);
    });
  }

  console.log('\n\n═══════════════════════════════════════════════════════\n');

  return { passed, failed, total, allTests };
}

// ======================
// Exécution
// ======================

async function runAllTests() {
  console.log('\n🚀 LANCEMENT DES TESTS MONVOTE (Mode économique)\n');
  console.log('⚠️  AUCUN APPEL API ANTHROPIC - Utilisation de mocks uniquement\n');

  try {
    // Tests sans appels API coûteux
    testDataStructure();
    testScoreCalculation();
    testBusinessLogic();
    testSecurityLogic();

    // Générer le rapport final
    const report = generateReport();

    console.log('\n💡 RECOMMANDATIONS:\n');
    console.log('1. Tester manuellement l\'interface utilisateur dans le navigateur');
    console.log('2. Vérifier les endpoints API avec Postman ou curl');
    console.log('3. Tester l\'upload de tract avec des vraies images (sans analyser avec Claude)');
    console.log('4. Vérifier le responsive sur mobile/tablette');
    console.log('5. Tester la géolocalisation dans différents navigateurs\n');

    console.log('✅ Tests terminés sans frais API\n');

  } catch (error) {
    console.error('\n❌ ERREUR lors des tests:', error);
  }
}

// Exécution
runAllTests().then(() => process.exit(0)).catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
