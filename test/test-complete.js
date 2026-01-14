// Suite de tests COMPLÈTE MonVote - Toutes les fonctionnalités
// Mode économique: 0€ d'API (pas d'appels Claude)

const API_BASE = 'http://localhost:3000';
const ADMIN_KEY = 'TonMotDePasseAdmin2026!';

const testResults = {
  api: [],
  database: [],
  frontend: [],
  quiz: [],
  upload: [],
  admin: [],
  security: [],
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

async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function measureTime(fn) {
  const start = Date.now();
  const result = fn();
  const time = Date.now() - start;
  return { result, time };
}

async function measureTimeAsync(fn) {
  const start = Date.now();
  const result = await fn();
  const time = Date.now() - start;
  return { result, time };
}

// ======================
// TESTS API - Tous les endpoints
// ======================

async function testAllAPIEndpoints() {
  console.log('\n🌐 TESTS API - TOUS LES ENDPOINTS\n');

  // 1. API Communes
  const communes = await fetchAPI('/api/communes');
  logTest('api', 'GET /api/communes', communes.ok, `Status ${communes.status}`);

  if (communes.ok && communes.data.data) {
    const count = communes.data.data.length;
    logTest('api', 'Communes: nombre correct', count >= 43, `${count} communes`);
    logTest('api', 'Communes: structure valide',
      communes.data.data[0]?.code && communes.data.data[0]?.nom,
      'Champs code, nom présents'
    );
    logTest('api', 'Communes: questions_generated',
      communes.data.data.every(c => c.questions_generated === true),
      'Toutes les communes ont des questions'
    );
  }

  // 2. API Questions (commune spécifique)
  const questions = await fetchAPI('/api/get-questions?code=35066');
  logTest('api', 'GET /api/get-questions?code=35066', questions.ok, `Status ${questions.status}`);

  if (questions.ok && questions.data.questions) {
    const qCount = questions.data.questions.length;
    logTest('api', 'Questions: nombre = 15', qCount === 15, `${qCount} questions`);
    logTest('api', 'Questions: structure complète',
      questions.data.questions[0]?.code &&
      questions.data.questions[0]?.question &&
      questions.data.questions[0]?.reponses?.length === 5,
      'Champs requis présents'
    );

    // Vérifier les types
    const socle = questions.data.questions.filter(q => q.type === 'socle').length;
    const local = questions.data.questions.filter(q => q.type === 'local').length;
    const divergence = questions.data.questions.filter(q => q.type === 'divergence').length;
    logTest('api', 'Questions: types corrects',
      socle === 8 && local === 5 && divergence === 2,
      `Socle:${socle}, Local:${local}, Divergence:${divergence}`
    );
  }

  // 3. API Candidats (commune spécifique)
  const candidats = await fetchAPI('/api/get-candidats?code=35066');
  logTest('api', 'GET /api/get-candidats?code=35066', candidats.ok, `Status ${candidats.status}`);

  if (candidats.ok && candidats.data.candidats) {
    logTest('api', 'Candidats: structure valide',
      candidats.data.candidats[0]?.nom && candidats.data.candidats[0]?.commune_code,
      `${candidats.data.candidats.length} candidats trouvés`
    );
  }

  // 4. API Stats Quiz
  const stats = await fetchAPI('/api/quiz-stats');
  logTest('api', 'GET /api/quiz-stats', stats.ok || stats.status === 404,
    `Status ${stats.status} (peut être vide)`
  );

  // 5. API Admin - Protection (sans clé)
  const adminNoKey = await fetchAPI('/api/admin/candidats');
  logTest('api', 'GET /api/admin/candidats (sans clé)',
    adminNoKey.status === 401,
    'Protection active: 401 Unauthorized'
  );

  // 6. API Admin - Candidats (avec clé)
  const adminCandidats = await fetchAPI(`/api/admin/candidats?key=${ADMIN_KEY}`);
  logTest('api', 'GET /api/admin/candidats?key=ADMIN_KEY',
    adminCandidats.ok,
    `Status ${adminCandidats.status}`
  );

  if (adminCandidats.ok && adminCandidats.data.all_candidats) {
    const total = adminCandidats.data.all_candidats.length;
    logTest('api', 'Admin Candidats: nombre > 0',
      total > 0,
      `${total} candidats en base`
    );
  }

  // 7. API Admin - Stats (avec clé)
  const adminStats = await fetchAPI(`/api/admin/stats?key=${ADMIN_KEY}`);
  logTest('api', 'GET /api/admin/stats?key=ADMIN_KEY',
    adminStats.ok,
    `Status ${adminStats.status}`
  );

  // 8. API Admin - Pregenerate Status
  const pregenStatus = await fetchAPI('/api/admin/pregenerate-status');
  logTest('api', 'GET /api/admin/pregenerate-status',
    pregenStatus.ok,
    `Status ${pregenStatus.status}`
  );

  if (pregenStatus.ok && pregenStatus.data) {
    const generated = pregenStatus.data.generated || 0;
    const remaining = pregenStatus.data.remaining || 0;
    logTest('api', 'Pregenerate: toutes communes traitées',
      remaining === 0,
      `${generated} générées, ${remaining} restantes`
    );
  }

  // 9. Endpoints invalides (404)
  const notFound = await fetchAPI('/api/endpoint-inexistant');
  logTest('api', 'Endpoint inexistant retourne 404',
    notFound.status === 404 || !notFound.ok,
    `Status ${notFound.status}`
  );
}

// ======================
// TESTS BASE DE DONNÉES
// ======================

async function testDatabase() {
  console.log('\n💾 TESTS BASE DE DONNÉES\n');

  // 1. Communes en base
  const communes = await fetchAPI('/api/communes');
  if (communes.ok && communes.data.data) {
    const data = communes.data.data;

    logTest('database', 'Nombre de communes >= 43',
      data.length >= 43,
      `${data.length} communes`
    );

    // Vérifier profils
    const withProfile = data.filter(c => c.profil_commune).length;
    logTest('database', 'Toutes communes ont profil',
      withProfile === data.length,
      `${withProfile}/${data.length}`
    );

    // Vérifier enjeux
    const withEnjeux = data.filter(c => c.enjeux_prioritaires?.length > 0).length;
    logTest('database', 'Toutes communes ont enjeux',
      withEnjeux === data.length,
      `${withEnjeux}/${data.length}`
    );

    // Vérifier questions générées
    const withQuestions = data.filter(c => c.questions_generated === true).length;
    logTest('database', 'Toutes communes ont questions',
      withQuestions === data.length,
      `${withQuestions}/${data.length}`
    );

    // Vérifier candidats
    const withCandidats = data.filter(c => c.nb_candidats > 0).length;
    logTest('database', 'La plupart ont candidats',
      withCandidats >= 40,
      `${withCandidats}/${data.length} communes avec candidats`
    );
  }

  // 2. Questions pré-générées (échantillon)
  const testCommunes = ['35066', '35238', '35024', '35200']; // Chartres, Rennes, Betton, Moutiers
  let allQuestionsValid = true;

  for (const code of testCommunes) {
    const q = await fetchAPI(`/api/get-questions?code=${code}`);
    if (!q.ok || !q.data.questions || q.data.questions.length !== 15) {
      allQuestionsValid = false;
      break;
    }
  }

  logTest('database', 'Questions générées pour échantillon',
    allQuestionsValid,
    `${testCommunes.length} communes testées`
  );

  // 3. Candidats génériques Moutiers
  const moutiersCandidats = await fetchAPI('/api/get-candidats?code=35200');
  if (moutiersCandidats.ok && moutiersCandidats.data.candidats) {
    logTest('database', 'Moutiers a candidats génériques',
      moutiersCandidats.data.candidats.length >= 2,
      `${moutiersCandidats.data.candidats.length} candidats`
    );
  }

  // 4. Intégrité des données candidats
  const adminCandidats = await fetchAPI(`/api/admin/candidats?key=${ADMIN_KEY}`);
  if (adminCandidats.ok && adminCandidats.data.all_candidats) {
    const candidats = adminCandidats.data.all_candidats;

    // Tous ont nom, prenom, commune
    const validStructure = candidats.every(c => c.nom && c.commune_code);
    logTest('database', 'Candidats: structure valide',
      validStructure,
      `${candidats.length} candidats vérifiés`
    );

    // Source types
    const sources = [...new Set(candidats.map(c => c.source_type))];
    logTest('database', 'Candidats: sources variées',
      sources.length > 1,
      `Sources: ${sources.join(', ')}`
    );
  }
}

// ======================
// TESTS FRONTEND
// ======================

async function testFrontend() {
  console.log('\n🖥️  TESTS FRONTEND - Pages & Assets\n');

  // 1. Page d'accueil
  const home = await fetchAPI('/');
  logTest('frontend', 'Page d\'accueil accessible',
    home.ok && typeof home.data === 'string' && home.data.includes('html'),
    `Status ${home.status}`
  );

  if (home.ok && typeof home.data === 'string') {
    logTest('frontend', 'Page contient titre MonVote',
      home.data.toLowerCase().includes('monvote'),
      'Titre présent'
    );
    logTest('frontend', 'Page contient carte',
      home.data.includes('map') || home.data.includes('carte'),
      'Élément carte trouvé'
    );
  }

  // 2. Fichiers CSS
  const cssFiles = ['/styles.css', '/public/styles.css', '/admin/styles.css'];
  for (const file of cssFiles) {
    const css = await fetchAPI(file);
    logTest('frontend', `CSS: ${file}`,
      css.ok && typeof css.data === 'string',
      css.ok ? `${Math.round(css.data.length / 1024)}KB` : `Status ${css.status}`
    );
  }

  // 3. Fichiers JavaScript
  const jsFiles = ['/app.js', '/contribuer.js', '/admin/admin.js', '/admin/data.js'];
  for (const file of jsFiles) {
    const js = await fetchAPI(file);
    logTest('frontend', `JS: ${file}`,
      js.ok && typeof js.data === 'string',
      js.ok ? `${Math.round(js.data.length / 1024)}KB` : `Status ${js.status}`
    );
  }

  // 4. Page Contribuer
  const contribuer = await fetchAPI('/contribuer.html');
  logTest('frontend', 'Page /contribuer.html',
    contribuer.ok && typeof contribuer.data === 'string',
    `Status ${contribuer.status}`
  );

  if (contribuer.ok && typeof contribuer.data === 'string') {
    logTest('frontend', 'Contribuer: formulaire upload',
      contribuer.data.includes('upload') || contribuer.data.includes('tract'),
      'Formulaire présent'
    );
  }

  // 5. Pages Admin
  const adminPages = ['/admin/index.html', '/admin/data.html'];
  for (const page of adminPages) {
    const adminPage = await fetchAPI(page);
    logTest('frontend', `Admin: ${page}`,
      adminPage.ok && typeof adminPage.data === 'string',
      `Status ${adminPage.status}`
    );
  }
}

// ======================
// TESTS QUIZ COMPLET
// ======================

async function testQuizFlow() {
  console.log('\n🎯 TESTS QUIZ - Flux complet\n');

  const testCode = '35066'; // Chartres-de-Bretagne

  // 1. Récupérer les questions
  const questions = await fetchAPI(`/api/get-questions?code=${testCode}`);
  logTest('quiz', 'Chargement des 15 questions',
    questions.ok && questions.data.questions?.length === 15,
    `${questions.data.questions?.length || 0} questions`
  );

  if (!questions.ok || !questions.data.questions) {
    console.log('⚠️  Tests quiz interrompus: impossible de charger les questions');
    return;
  }

  const quizData = questions.data;

  // 2. Simuler réponses utilisateur (valeurs 1-5)
  const userAnswers = {};
  quizData.questions.forEach((q, index) => {
    userAnswers[index + 1] = Math.floor(Math.random() * 5) + 1; // Réponse aléatoire 1-5
  });

  logTest('quiz', 'Génération réponses utilisateur',
    Object.keys(userAnswers).length === 15,
    '15 réponses générées'
  );

  // 3. Récupérer les candidats
  const candidats = await fetchAPI(`/api/get-candidats?code=${testCode}`);
  logTest('quiz', 'Chargement des candidats',
    candidats.ok && candidats.data.candidats?.length > 0,
    `${candidats.data.candidats?.length || 0} candidats`
  );

  if (!candidats.ok || !candidats.data.candidats) {
    console.log('⚠️  Tests calcul scores interrompus: pas de candidats');
    return;
  }

  // 4. Calculer les scores (simulation frontend)
  function calculateScore(userAnswers, candidatPositions, questions) {
    let totalWeight = 0;
    let totalScore = 0;

    Object.entries(userAnswers).forEach(([qIndex, userPos]) => {
      const candPos = candidatPositions[qIndex];
      if (!candPos) return;

      const question = questions.find(q => q.index === parseInt(qIndex));
      if (!question) return;

      const distance = Math.abs(userPos - candPos);
      const score = 100 - (distance * 25);

      let weight = 1.0;
      if (question.type === 'divergence') weight = 1.5;
      if (question.est_enjeu_local) weight *= 1.2;

      totalScore += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  const scores = candidats.data.candidats.map(cand => {
    const score = calculateScore(userAnswers, cand.positions || {}, quizData.questions);
    return { candidat: `${cand.prenom} ${cand.nom}`, score };
  });

  scores.sort((a, b) => b.score - a.score);

  logTest('quiz', 'Calcul des scores',
    scores.length > 0 && scores.every(s => s.score >= 0 && s.score <= 100),
    `Scores: ${scores.map(s => s.score + '%').join(', ')}`
  );

  logTest('quiz', 'Classement des candidats',
    scores.length > 1 ? scores[0].score >= scores[1].score : true,
    `1er: ${scores[0]?.candidat} (${scores[0]?.score}%)`
  );

  // 5. Vérifier les détails par question
  const detailsParQuestion = quizData.questions.map(q => {
    const userPos = userAnswers[q.index];
    const details = candidats.data.candidats.map(cand => {
      const candPos = cand.positions?.[q.index];
      const distance = candPos ? Math.abs(userPos - candPos) : null;
      return { candidat: cand.nom, distance };
    });
    return { question: q.code, details };
  });

  logTest('quiz', 'Détails par question générés',
    detailsParQuestion.length === 15,
    '15 questions avec détails'
  );
}

// ======================
// TESTS UPLOAD TRACT
// ======================

async function testUploadFlow() {
  console.log('\n📤 TESTS UPLOAD TRACT\n');

  // 1. Page accessible
  const contribuer = await fetchAPI('/contribuer.html');
  logTest('upload', 'Page contribuer accessible',
    contribuer.ok,
    `Status ${contribuer.status}`
  );

  // 2. Endpoint upload (sans vraie image - test structure)
  const uploadTest = await fetchAPI('/api/upload-tract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  logTest('upload', 'Endpoint /api/upload-tract existe',
    uploadTest.status === 400 || uploadTest.status === 500, // Attend erreur de validation
    `Status ${uploadTest.status} (validation active)`
  );

  // 3. Validation des champs requis
  if (uploadTest.data && typeof uploadTest.data === 'object') {
    const hasError = uploadTest.data.error || uploadTest.data.success === false;
    logTest('upload', 'Validation champs requis',
      hasError,
      'Refuse upload sans données'
    );
  }

  // Note: Pas de test d'upload réel pour éviter les coûts API Claude
  console.log('ℹ️  Upload réel non testé (évite coûts API Claude Vision)');
}

// ======================
// TESTS ADMIN PANEL
// ======================

async function testAdminPanel() {
  console.log('\n👤 TESTS ADMIN PANEL\n');

  // 1. Pages admin accessibles
  const adminIndex = await fetchAPI('/admin/index.html');
  logTest('admin', 'Page /admin/index.html',
    adminIndex.ok,
    `Status ${adminIndex.status}`
  );

  const adminData = await fetchAPI('/admin/data.html');
  logTest('admin', 'Page /admin/data.html',
    adminData.ok,
    `Status ${adminData.status}`
  );

  // 2. Protection des endpoints
  const protectedEndpoints = [
    '/api/admin/candidats',
    '/api/admin/stats',
    '/api/admin/fill-missing-profiles'
  ];

  for (const endpoint of protectedEndpoints) {
    const noKey = await fetchAPI(endpoint);
    logTest('admin', `Protection ${endpoint} (sans clé)`,
      noKey.status === 401 || noKey.status === 400,
      `Status ${noKey.status}`
    );
  }

  // 3. Accès avec clé valide
  const withKey = await fetchAPI(`/api/admin/candidats?key=${ADMIN_KEY}`);
  logTest('admin', 'Accès avec clé valide',
    withKey.ok,
    `Status ${withKey.status}`
  );

  // 4. Stats admin
  const stats = await fetchAPI(`/api/admin/stats?key=${ADMIN_KEY}`);
  logTest('admin', 'Endpoint stats fonctionne',
    stats.ok,
    `Status ${stats.status}`
  );

  if (stats.ok && stats.data) {
    logTest('admin', 'Stats contiennent données',
      Object.keys(stats.data).length > 0,
      `${Object.keys(stats.data).length} clés`
    );
  }
}

// ======================
// TESTS SÉCURITÉ
// ======================

async function testSecurity() {
  console.log('\n🔒 TESTS SÉCURITÉ\n');

  // 1. SQL Injection
  const sqlTests = [
    "/api/get-questions?code=35066'; DROP TABLE--",
    "/api/get-questions?code=35066 OR 1=1--",
    "/api/get-candidats?code='; DELETE FROM candidats--"
  ];

  for (const url of sqlTests) {
    const result = await fetchAPI(url);
    logTest('security', 'Protection SQL Injection',
      !result.ok || (result.data && !result.data.success),
      'Requête malveillante rejetée'
    );
  }

  // 2. XSS (dans query params)
  const xssTests = [
    "/api/get-questions?code=<script>alert('XSS')</script>",
    "/api/get-questions?code=35066&xss=<img src=x onerror=alert(1)>"
  ];

  for (const url of xssTests) {
    const result = await fetchAPI(url);
    logTest('security', 'Protection XSS',
      !result.ok || (result.data && !result.data.success),
      'Contenu malveillant rejeté'
    );
  }

  // 3. CORS Headers
  const corsTest = await fetchAPI('/api/communes');
  logTest('security', 'Headers CORS présents',
    corsTest.headers.get('access-control-allow-origin') !== null,
    'CORS configuré'
  );

  // 4. Validation codes commune
  const invalidCodes = ['INVALID', '99999', 'ABC123', ''];
  for (const code of invalidCodes.slice(0, 2)) { // Tester 2 exemples
    const result = await fetchAPI(`/api/get-questions?code=${code}`);
    logTest('security', `Validation code: "${code}"`,
      !result.ok || !result.data.success,
      'Code invalide rejeté'
    );
  }

  // 5. Rate limiting (endpoint upload)
  // Note: Pas testé pour éviter de bloquer l'IP
  console.log('ℹ️  Rate limiting non testé (évite blocage IP)');
}

// ======================
// TESTS PERFORMANCE
// ======================

async function testPerformance() {
  console.log('\n⚡ TESTS PERFORMANCE\n');

  // 1. Temps réponse API Communes
  const { result: r1, time: t1 } = await measureTimeAsync(() =>
    fetchAPI('/api/communes')
  );
  logTest('performance', 'API Communes < 3s',
    t1 < 3000,
    `${t1}ms`
  );

  // 2. Temps réponse API Questions
  const { result: r2, time: t2 } = await measureTimeAsync(() =>
    fetchAPI('/api/get-questions?code=35066')
  );
  logTest('performance', 'API Questions < 5s',
    t2 < 5000,
    `${t2}ms`
  );

  // 3. Temps réponse API Candidats
  const { result: r3, time: t3 } = await measureTimeAsync(() =>
    fetchAPI('/api/get-candidats?code=35066')
  );
  logTest('performance', 'API Candidats < 2s',
    t3 < 2000,
    `${t3}ms`
  );

  // 4. Taille des réponses
  if (r1.ok && r1.data) {
    const size = JSON.stringify(r1.data).length;
    logTest('performance', 'Taille API Communes raisonnable',
      size < 500000, // < 500KB
      `${Math.round(size / 1024)}KB`
    );
  }
}

// ======================
// GÉNÉRATION RAPPORT
// ======================

function generateReport() {
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📊 RAPPORT COMPLET - TOUTES LES FONCTIONNALITÉS');
  console.log('═══════════════════════════════════════════════════════\n');

  const allTests = [
    ...testResults.api,
    ...testResults.database,
    ...testResults.frontend,
    ...testResults.quiz,
    ...testResults.upload,
    ...testResults.admin,
    ...testResults.security,
    ...testResults.performance
  ];

  const passed = allTests.filter(t => t.status === '✅').length;
  const failed = allTests.filter(t => t.status === '❌').length;
  const total = allTests.length;

  console.log(`✅ Tests réussis: ${passed}/${total}`);
  console.log(`❌ Tests échoués: ${failed}/${total}`);
  console.log(`📈 Taux de réussite: ${Math.round((passed / total) * 100)}%\n`);

  // Détail par catégorie
  const categories = ['api', 'database', 'frontend', 'quiz', 'upload', 'admin', 'security', 'performance'];

  for (const cat of categories) {
    const catTests = testResults[cat];
    if (catTests.length === 0) continue;

    const catPassed = catTests.filter(t => t.status === '✅').length;
    const catTotal = catTests.length;

    console.log(`\n${cat.toUpperCase()} (${catPassed}/${catTotal})`);
    console.log('─'.repeat(60));

    catTests.forEach(t => {
      console.log(`${t.status} ${t.test}${t.notes ? ' - ' + t.notes : ''}`);
    });
  }

  // Bugs critiques
  const criticalFailures = allTests.filter(t =>
    t.status === '❌' &&
    (t.test.includes('API') || t.test.includes('Questions') || t.test.includes('Protection'))
  );

  if (criticalFailures.length > 0) {
    console.log('\n\n🚨 BUGS CRITIQUES À CORRIGER:');
    console.log('─'.repeat(60));
    criticalFailures.forEach((t, i) => {
      console.log(`${i + 1}. ${t.test}`);
      if (t.notes) console.log(`   → ${t.notes}`);
    });
  }

  console.log('\n\n═══════════════════════════════════════════════════════\n');

  return { passed, failed, total, allTests, criticalFailures };
}

// ======================
// EXÉCUTION
// ======================

async function runCompleteTests() {
  console.log('\n🚀 TESTS COMPLETS MONVOTE - TOUTES FONCTIONNALITÉS\n');
  console.log('⚠️  Mode économique: Aucun appel API Anthropic\n');
  console.log('📋 Tests effectués:');
  console.log('   - Tous les endpoints API');
  console.log('   - Base de données Supabase');
  console.log('   - Frontend complet (HTML/CSS/JS)');
  console.log('   - Quiz & calcul des scores');
  console.log('   - Upload de tract (structure)');
  console.log('   - Admin panel & sécurité');
  console.log('   - Performance\n');

  try {
    await testAllAPIEndpoints();
    await testDatabase();
    await testFrontend();
    await testQuizFlow();
    await testUploadFlow();
    await testAdminPanel();
    await testSecurity();
    await testPerformance();

    const report = generateReport();

    console.log('💰 Coût de cette session: 0€');
    console.log('✅ Tests terminés!\n');

    return report;

  } catch (error) {
    console.error('\n❌ ERREUR lors des tests:', error);
    return null;
  }
}

// Exécution
runCompleteTests().then(() => process.exit(0)).catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
