// API endpoint pour régénérer uniquement les positions de tous les candidats
import { supabase } from '../../lib/supabase.js';
import Anthropic from '@anthropic-ai/sdk';
import { PROMPT_POSITIONNER_CANDIDAT } from '../../lib/prompts.js';

const ADMIN_KEY = process.env.ADMIN_KEY || 'TonMotDePasseAdmin2026!';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key } = req.body;

  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  console.log('\n🔄 RÉGÉNÉRATION DES POSITIONS POUR TOUTES LES COMMUNES');
  console.log('='.repeat(70));

  try {
    // Récupérer toutes les communes qui ont des questions
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('commune_code, commune_nom, questions');

    if (questionsError) throw questionsError;

    if (!questionsData || questionsData.length === 0) {
      console.log('❌ Aucune commune avec questions trouvée');
      return res.status(404).json({
        success: false,
        error: 'Aucune commune avec questions'
      });
    }

    console.log(`✅ ${questionsData.length} communes avec questions trouvées\n`);

    let totalCandidatsUpdated = 0;
    let totalErrors = 0;
    const results = [];

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
        results.push({
          commune: questionSet.commune_nom,
          success: false,
          error: candidatsError.message
        });
        continue;
      }

      if (!candidats || candidats.length === 0) {
        console.log('   ⚠️  Aucun candidat trouvé');
        results.push({
          commune: questionSet.commune_nom,
          success: true,
          candidats_updated: 0,
          message: 'Aucun candidat'
        });
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
      results.push({
        commune: questionSet.commune_nom,
        success: true,
        candidats_total: candidats.length,
        candidats_updated: updated,
        errors: candidats.length - updated
      });
    }

    console.log('\n\n' + '='.repeat(70));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(70));
    console.log(`✅ Communes traitées: ${questionsData.length}`);
    console.log(`✅ Candidats positionnés: ${totalCandidatsUpdated}`);
    console.log(`❌ Erreurs: ${totalErrors}`);

    return res.status(200).json({
      success: true,
      communes_traitees: questionsData.length,
      candidats_positionnes: totalCandidatsUpdated,
      erreurs: totalErrors,
      details: results
    });

  } catch (error) {
    console.error('❌ Erreur globale:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
