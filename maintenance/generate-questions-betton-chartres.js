// Générer les questions pour Betton et Chartres-de-Bretagne
const COMMUNES = [
  { code: '35024', nom: 'Betton' },
  { code: '35066', nom: 'Chartres-de-Bretagne' }
];

async function generateQuestions(commune) {
  console.log(`\n📝 ${commune.nom} (${commune.code})`);
  console.log('-'.repeat(70));
  console.log('⏳ Génération des questions (1-2 minutes)...\n');

  try {
    const response = await fetch('http://localhost:3000/api/admin/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'TonMotDePasseAdmin2026!',
        commune_code: commune.code
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Questions générées: ${data.nb_questions}`);
      return { success: true, nb_questions: data.nb_questions };
    } else {
      console.log(`❌ Erreur: ${data.error}`);
      return { success: false, error: data.error };
    }

  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('📝 GÉNÉRATION DES QUESTIONS\n');
  console.log('='.repeat(70));
  console.log('⏳ Durée estimée: 2-4 minutes\n');

  const results = [];

  for (const commune of COMMUNES) {
    const result = await generateQuestions(commune);
    results.push({ commune: commune.nom, ...result });

    // Pause
    if (commune !== COMMUNES[COMMUNES.length - 1]) {
      console.log('\n⏳ Pause 2s...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(70));

  let totalQuestions = 0;
  results.forEach(r => {
    if (r.success) {
      console.log(`✅ ${r.commune}: ${r.nb_questions} questions`);
      totalQuestions += r.nb_questions;
    } else {
      console.log(`❌ ${r.commune}: ${r.error}`);
    }
  });

  console.log(`\n📊 Total: ${totalQuestions} questions générées`);

  if (results.every(r => r.success)) {
    console.log('\n💡 Prochaine étape: Positionner les candidats sur ces questions');
  }

  console.log('');
}

main();
