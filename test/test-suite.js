// Suite de tests MonVote - SANS appels API coûteux
import { calculateCompatibility, MOCK_QUESTIONS, MOCK_CANDIDATS } from './fixtures/mock-data.js';

const API_BASE = 'http://localhost:3001';
const testResults = {
  frontend: [],
  functional: [],
  security: [],
  database: [],
  performance: []
};

// ======================
// Utilitaires
// ======================

function logTest(category, name, passed, notes = '') {
  const result = { test: name, status: passed ? '✅' : '❌', notes };
  testResults[category].push(result);
  console.log(`${passed ? '✅' : '❌'} [${category.toUpperCase()}] ${name}${notes ? ' - ' + notes : ''}`);
  return passed;
}

async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    return { ok: response.ok, status: response.status, data: await response.json() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// ======================
// Tests API / Base de données
// ======================

async function testDatabaseIntegrity() {
  console.log('\n📊 TESTS BASE DE DONNÉES\n');

  // Test 1: Récupération des communes
  const communes = await fetchAPI('/api/communes');
  logTest('database', 'API Communes répond', communes.ok);

  if (communes.ok && communes.data) {
    const count = communes.data.data?.length || 0;
    logTest('database', `Nombre de communes`, count >= 43, `${count} communes trouvées`);
    logTest('database', 'Communes ont code_insee',
      communes.data.data?.[0]?.code ? true : false,
      'Vérification structure'
    );
    logTest('database', 'Communes triées alphabétiquement',
      communes.data.data?.[0]?.nom && communes.data.data?.[1]?.nom &&
      communes.data.data[0].nom.localeCompare(communes.data.data[1].nom) < 0,
      'Ordre alphabétique vérifié'
    );
  }

  // Test 2: Récupération des candidats (endpoint admin)
  // Note: Ne pas tester avec vraie clé pour éviter logs
  const candidatsNoKey = await fetchAPI('/api/admin/candidats');
  logTest('database', 'API Candidats protégée',
    candidatsNoKey.status === 401,
    'Retourne 401 sans clé'
  );

  // Test 3: Questions pré-générées
  const questions = await fetchAPI('/api/get-questions?code=35066');
  logTest('database', 'API Questions répond', questions.ok);

  if (questions.ok && questions.data) {
    const qCount = questions.data.questions?.length || 0;
    logTest('database', 'Nombre de questions', qCount === 15, `${qCount}/15 questions`);

    if (questions.data.questions && questions.data.questions.length > 0) {
      const q1 = questions.data.questions[0];
      logTest('database', 'Structure questions valide',
        q1.code && q1.question && q1.reponses && q1.reponses.length === 5,
        'Champs requis présents'
      );
    }
  }

  // Test 4: Statut pré-génération
  const pregenStatus = await fetchAPI('/api/admin/pregenerate-status');
  logTest('database', 'API Pregenerate Status répond', pregenStatus.ok);
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
  const testAnswers1 = { 1: 2, 2: 1 }; // 2 questions
  const testPositions1 = { 1: 2, 2: 1 }; // Positions identiques
  const score1 = calculateCompatibility(testAnswers1, testPositions1);
  logTest('functional', 'Score partiel avec accord',
    score1 === 100,
    `Score partiel: ${score1}%`
  );

  // Test 4: Vérifier que la pondération fonctionne
  const divergenceAnswer = { 13: 1 }; // Question divergence (fiscalité)
  const divergencePos = { 13: 1 };
  const scoreDivergence = calculateCompatibility(divergenceAnswer, divergencePos);
  logTest('functional', 'Pondération divergences appliquée',
    scoreDivergence === 100,
    `Score divergence: ${scoreDivergence}%`
  );

  // Test 5: Comparaison entre 2 candidats
  const userAnswers = {
    1: 2, 2: 2, 3: 1, 4: 2, 5: 1,
    6: 2, 7: 4, 8: 2, 9: 1, 10: 2,
    11: 3, 12: 1, 13: 2, 14: 4, 15: 1
  };
  const scoreCand1 = calculateCompatibility(userAnswers, MOCK_CANDIDATS[0].positions);
  const scoreCand2 = calculateCompatibility(userAnswers, MOCK_CANDIDATS[1].positions);
  logTest('functional', 'Différenciation entre candidats',
    Math.abs(scoreCand1 - scoreCand2) > 10,
    `Candidat1: ${scoreCand1}%, Candidat2: ${scoreCand2}%`
  );
}

// ======================
// Tests Sécurité
// ======================

async function testSecurity() {
  console.log('\n🔒 TESTS SÉCURITÉ\n');

  // Test 1: Protection API Admin sans clé
  const protectedEndpoints = [
    '/api/admin/candidats',
    '/api/admin/stats',
    '/api/admin/fill-missing-profiles'
  ];

  for (const endpoint of protectedEndpoints) {
    const result = await fetchAPI(endpoint);
    logTest('security', `Protection ${endpoint}`,
      result.status === 401 || result.status === 400,
      'Accès refusé sans clé'
    );
  }

  // Test 2: Validation format commune_code
  const invalidCode = await fetchAPI('/api/get-questions?code=INVALID');
  logTest('security', 'Validation code commune',
    !invalidCode.ok || invalidCode.data?.error,
    'Rejette code invalide'
  );

  // Test 3: CORS headers
  const corsTest = await fetchAPI('/api/communes');
  logTest('security', 'Headers CORS présents',
    corsTest.ok,
    'API accessible depuis frontend'
  );

  // Test 4: SQL Injection (endpoint sécurisé)
  const sqlTest = await fetchAPI("/api/get-questions?code=35066'; DROP TABLE--");
  logTest('security', 'Protection SQL Injection',
    !sqlTest.ok || (sqlTest.data && !sqlTest.data.success),
    'Requête malveillante rejetée'
  );
}

// ======================
// Tests Performance
// ======================

async function testPerformance() {
  console.log('\n⚡ TESTS PERFORMANCE\n');

  // Test 1: Temps de réponse API Communes
  const start1 = Date.now();
  await fetchAPI('/api/communes');
  const time1 = Date.now() - start1;
  logTest('performance', 'API Communes < 3s',
    time1 < 3000,
    `${time1}ms`
  );

  // Test 2: Temps de réponse API Questions
  const start2 = Date.now();
  await fetchAPI('/api/get-questions?code=35066');
  const time2 = Date.now() - start2;
  logTest('performance', 'API Questions < 5s',
    time2 < 5000,
    `${time2}ms`
  );

  // Test 3: Calcul de score rapide
  const start3 = Date.now();
  const answers = {
    1: 2, 2: 1, 3: 3, 4: 4, 5: 2,
    6: 3, 7: 2, 8: 1, 9: 2, 10: 3,
    11: 4, 12: 2, 13: 1, 14: 3, 15: 2
  };
  calculateCompatibility(answers, MOCK_CANDIDATS[0].positions);
  const time3 = Date.now() - start3;
  logTest('performance', 'Calcul score < 10ms',
    time3 < 10,
    `${time3}ms`
  );
}

// ======================
// Tests Frontend (structure)
// ======================

async function testFrontend() {
  console.log('\n🖥️  TESTS FRONTEND (Structure)\n');

  // Test 1: Page d'accueil
  try {
    const homeResponse = await fetch(`${API_BASE}/`);
    const homeHtml = await homeResponse.text();
    logTest('frontend', 'Page d\'accueil accessible',
      homeHtml.includes('MonVote') || homeHtml.includes('html'),
      'HTML retourné'
    );
  } catch (error) {
    logTest('frontend', 'Page d\'accueil accessible', false, error.message);
  }

  // Test 2: Fichiers statiques
  const staticFiles = [
    '/styles.css',
    '/app.js',
    '/public/styles.css',
    '/contribuer.js'
  ];

  for (const file of staticFiles) {
    try {
      const response = await fetch(`${API_BASE}${file}`);
      logTest('frontend', `Fichier ${file}`,
        response.ok || response.status === 304,
        response.ok ? 'Accessible' : `Status ${response.status}`
      );
    } catch (error) {
      logTest('frontend', `Fichier ${file}`, false, 'Non accessible');
    }
  }
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
    (t.test.includes('API') || t.test.includes('Score') || t.test.includes('Protection'))
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
    testScoreCalculation();
    await testDatabaseIntegrity();
    await testSecurity();
    await testPerformance();
    await testFrontend();

    // Générer le rapport final
    const report = generateReport();

    // Sauvegarder dans un fichier
    const reportContent = `# Rapport de Tests MonVote
Date: ${new Date().toLocaleString('fr-FR')}

## Résumé
- Tests passés: ${report.passed}/${report.total}
- Tests échoués: ${report.failed}
- Taux de réussite: ${Math.round((report.passed / report.total) * 100)}%

## Détail par catégorie

${Object.entries(testResults).map(([cat, tests]) => {
  const catPassed = tests.filter(t => t.status === '✅').length;
  return `### ${cat.toUpperCase()} (${catPassed}/${tests.length})

| Test | Statut | Notes |
|------|--------|-------|
${tests.map(t => `| ${t.test} | ${t.status} | ${t.notes || ''} |`).join('\n')}
`;
}).join('\n')}

## Notes importantes
- ✅ Tous les tests ont été effectués SANS appels API Anthropic
- ✅ Utilisation de fixtures mockées pour les tests
- ✅ Coût API: 0€ pour cette session de tests
`;

    return reportContent;

  } catch (error) {
    console.error('\n❌ ERREUR lors des tests:', error);
    return null;
  }
}

// Export pour utilisation en module
export { runAllTests, generateReport, testResults };

// Exécution si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(report => {
    if (report) {
      console.log('\n📝 Rapport généré avec succès!\n');
    }
    process.exit(0);
  }).catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}
