// Régénération des positions uniquement (pas de recherche candidats/questions)
// Utile quand les candidats et questions existent déjà mais positions manquantes
import { supabase } from './lib/supabase.js';
import Anthropic from '@anthropic-ai/sdk';
import { PROMPT_POSITIONNER_CANDIDAT } from './lib/prompts.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function regeneratePositionsForAllCommunes() {
  console.log('🔄 RÉGÉNÉRATION DES POSITIONS POUR TOUTES LES COMMUNES\n');
  console.log('='.repeat(70));
  console.log('ℹ️  Conserve les candidats et questions existants');
  console.log('ℹ️  Régénère uniquement les positions (compatibilité quiz)\n');

  try {
    // Récupérer toutes les communes qui ont des questions
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('commune_code, commune_nom, questions');

    if (questionsError) throw questionsError;

    if (!questionsData || questionsData.length === 0) {
      console.log('❌ Aucune commune avec questions trouvée');
      return;
    }

    console.log(`✅ ${questionsData.length} communes avec questions trouvées\n`);

    let totalCandidatsUpdated = 0;
    let totalErrors = 0;

    for (const questionSet of questionsData) {
      console.log(`\n📍 ${questionSet.commune_nom} (${questionSet.commune_code})`);
      console.log('-'.repeat(70));

      // Récupérer les candidats de cette commune
      const { data: candidats, error: candidatsError } = await supabase
        .from('candidats')
        .select('*')
        .eq('commune_code', questionSet.commune_code);

      if (candidatsError) {
        console.error(`   ❌ Erreur récupération candidats: ${candidatsError.message}`);
        totalErrors++;
        continue;
      }

      if (!candidats || candidats.length === 0) {
        console.log('   ⚠️  Aucun candidat trouvé');
        continue;
      }

      console.log(`   ${candidats.length} candidat(s) trouvé(s)`);

      // Positionner chaque candidat
      let updated = 0;
      for (const candidat of candidats) {
        try {
          console.log(`   📊 ${candidat.prenom || ''} ${candidat.nom}...`);

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [{
              role: 'user',
              content: PROMPT_POSITIONNER_CANDIDAT(candidat, questionSet.questions)
            }]
          });

          const textContent = response.content.find(c => c.type === 'text')?.text;
          if (!textContent) {
            console.error(`      ❌ Pas de réponse Claude`);
            totalErrors++;
            continue;
          }

          let jsonText = textContent.trim();
          if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
          if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
          if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);

          const result = JSON.parse(jsonText.trim());

          // Mettre à jour les positions
          const { error: updateError } = await supabase
            .from('candidats')
            .update({
              positions: result.positions,
              updated_at: new Date().toISOString()
            })
            .eq('id', candidat.id);

          if (updateError) {
            console.error(`      ❌ Erreur MAJ: ${updateError.message}`);
            totalErrors++;
          } else {
            console.log(`      ✅ Positionné`);
            updated++;
            totalCandidatsUpdated++;
          }

          // Pause pour éviter rate limits
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (e) {
          console.error(`      ❌ Erreur: ${e.message}`);
          totalErrors++;
        }
      }

      console.log(`   ✅ ${updated}/${candidats.length} candidats positionnés`);
    }

    console.log('\n\n' + '='.repeat(70));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(70));
    console.log(`✅ Communes traitées: ${questionsData.length}`);
    console.log(`✅ Candidats positionnés: ${totalCandidatsUpdated}`);
    console.log(`❌ Erreurs: ${totalErrors}`);
    console.log('\n💡 Testez maintenant le quiz sur l\'application\n');

  } catch (error) {
    console.error('❌ Erreur globale:', error.message);
  }
}

regeneratePositionsForAllCommunes();
