// Test de régénération des questions pour Rennes avec les nouvelles améliorations
async function regenerateRennesQuestions() {
  console.log('🧪 TEST - RÉGÉNÉRATION RENNES AVEC NOUVELLES AMÉLIORATIONS\n');
  console.log('='.repeat(70));
  console.log('✨ Changements testés:');
  console.log('   - Web search pour actualités locales');
  console.log('   - Prompt amélioré pour spécificité');
  console.log('   - Comparaison avec Betton');
  console.log('\n⏳ Durée estimée: 1-2 minutes\n');

  try {
    const response = await fetch('http://localhost:3000/api/admin/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'TonMotDePasseAdmin2026!',
        commune_code: '35238',  // Rennes
        force: true  // Régénérer même si déjà existant
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('\n✅ RÉGÉNÉRATION RÉUSSIE\n');
      console.log('='.repeat(70));
      console.log(`📝 Questions générées: ${data.nb_questions || 'N/A'}`);
      console.log(`🔍 Sources utilisées: ${data.sources?.join(', ') || 'N/A'}`);
      console.log(`📰 Actualités trouvées: ${data.actualites_count || 0}`);

      if (data.questions && data.questions.length > 0) {
        console.log('\n📋 APERÇU DES QUESTIONS:\n');

        data.questions.slice(0, 5).forEach((q, i) => {
          console.log(`\n${i + 1}. [${q.type}] ${q.categorie}`);
          console.log(`   Q: ${q.texte}`);
          console.log(`   Contexte: ${q.contexte}`);
          console.log(`   Sources: ${q.sources?.join(', ') || 'non spécifié'}`);
        });

        if (data.questions.length > 5) {
          console.log(`\n   ... et ${data.questions.length - 5} autres questions`);
        }

        // Analyser la spécificité
        console.log('\n📊 ANALYSE DE SPÉCIFICITÉ:\n');

        const mentionsRennes = data.questions.filter(q =>
          q.texte.toLowerCase().includes('rennes') ||
          q.contexte.toLowerCase().includes('rennes')
        ).length;

        const questionsLocales = data.questions.filter(q => q.type === 'local').length;
        const questionsSocle = data.questions.filter(q => q.type === 'socle').length;

        console.log(`   Mentions de "Rennes": ${mentionsRennes}/${data.questions.length}`);
        console.log(`   Questions locales: ${questionsLocales}`);
        console.log(`   Questions socle: ${questionsSocle}`);

        // Vérifier si actualités utilisées
        const avecActualites = data.questions.filter(q =>
          q.sources && q.sources.includes('actualite')
        ).length;
        console.log(`   Questions basées sur actualités: ${avecActualites}`);

        // Exemples de mots-clés spécifiques à Rennes
        const motsRennes = ['métro', 'couvent', 'vilaine', 'zac', 'cleunay', 'maurepas', 'beauregard'];
        const mentionsSpecifiques = data.questions.filter(q =>
          motsRennes.some(mot => q.texte.toLowerCase().includes(mot) || q.contexte.toLowerCase().includes(mot))
        ).length;
        console.log(`   Mentions de lieux/projets spécifiques: ${mentionsSpecifiques}`);

      }

      console.log('\n💡 Testez maintenant le quiz sur Rennes et comparez avec Betton !');

    } else {
      console.error('\n❌ ERREUR:', data.error);
      if (data.message) {
        console.error('   Message:', data.message);
      }
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }

  console.log('\n');
}

regenerateRennesQuestions();
