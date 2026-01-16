import { getCommuneFullContext } from '../../lib/commune-utils.js';
import { supabase, getCandidats, getApprovedSubmissions } from '../../lib/supabase.js';
import { generateQuestionsForCommune, enrichCandidatsWithTracts } from '../../lib/question-generator.js';
import Anthropic from '@anthropic-ai/sdk';

const ADMIN_KEY = process.env.ADMIN_KEY || 'TonMotDePasseAdmin2026!';

// Fonction pour rechercher les candidats via Claude + web search
async function searchCandidats(commune, anthropic) {
  const { PROMPT_RECHERCHE_CANDIDATS } = await import('../../lib/prompts.js');

  const context = getCommuneFullContext(commune.nom, commune.code);
  console.log(`🔍 Recherche de nouveaux candidats pour ${context.fullName}...`);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: PROMPT_RECHERCHE_CANDIDATS(context.nom, context.dept, context.codeInsee)
    }],
    tools: [{
      type: 'web_search_20250305',
      name: 'web_search'
    }]
  });

  // Extraire et concaténer TOUS les blocks de texte
  const textBlocks = response.content.filter(c => c.type === 'text');
  const textContent = textBlocks.map(b => b.text).join('');

  if (!textContent) {
    console.error('No text content in Claude response');
    return [];
  }

  try {
    let jsonText = textContent.trim();
    if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
    if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
    if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);

    const result = JSON.parse(jsonText.trim());
    return result.candidats || [];
  } catch (e) {
    console.error('Erreur parsing candidats:', e);
    return [];
  }
}

// Fonction pour rechercher le programme d'un candidat
async function searchProgramme(candidat, commune, anthropic) {
  const { PROMPT_RECHERCHE_PROGRAMME } = await import('../../lib/prompts.js');

  const context = getCommuneFullContext(commune.nom, commune.code);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: PROMPT_RECHERCHE_PROGRAMME(candidat, context.nom, context.dept, context.codeInsee)
    }],
    tools: [{
      type: 'web_search_20250305',
      name: 'web_search'
    }]
  });

  // Extraire et concaténer TOUS les blocks de texte
  const textBlocks = response.content.filter(c => c.type === 'text');
  const textContent = textBlocks.map(b => b.text).join('');

  if (!textContent) {
    console.error(`No text content for ${candidat.nom}`);
    return [];
  }

  let jsonText = textContent.trim();
  if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
  if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
  if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);

  const result = JSON.parse(jsonText.trim());
  return result.propositions || [];
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérification clé admin
  const { key, commune_code } = req.body;

  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!commune_code) {
    return res.status(400).json({
      success: false,
      error: 'Code commune requis'
    });
  }

  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔄 MISE À JOUR INTELLIGENTE - ${commune_code}`);
    console.log('='.repeat(70));

    // ÉTAPE 1 : Récupérer la commune
    console.log('\n📍 ÉTAPE 1/6 : Récupération commune...');
    const { data: commune, error: communeError } = await supabase
      .from('communes')
      .select('*')
      .eq('code_insee', commune_code)
      .single();

    if (communeError || !commune) {
      return res.status(404).json({
        success: false,
        error: 'Commune non trouvée'
      });
    }

    console.log(`✅ ${commune.nom} trouvée`);

    // Initialiser l'API Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // ÉTAPE 2 : Récupérer les candidats existants
    console.log('\n👥 ÉTAPE 2/6 : Analyse des candidats existants...');
    const existingCandidats = await getCandidats(commune_code);
    console.log(`  ${existingCandidats.length} candidat(s) existant(s)`);

    // ÉTAPE 3 : Rechercher de nouveaux candidats
    console.log('\n🔍 ÉTAPE 3/6 : Recherche de nouveaux candidats...');
    const searchedCandidats = await searchCandidats(commune, anthropic);
    console.log(`  ${searchedCandidats.length} candidat(s) trouvé(s) par recherche`);

    // Identifier les nouveaux candidats (en gérant les valeurs null)
    const existingNames = new Set(
      existingCandidats
        .filter(c => c.nom)
        .map(c => c.nom.toUpperCase())
    );
    const newCandidats = searchedCandidats.filter(c =>
      c.nom && !existingNames.has(c.nom.toUpperCase())
    );

    console.log(`  ➕ ${newCandidats.length} nouveau(x) candidat(s) à ajouter`);

    // Ajouter les nouveaux candidats
    let addedCandidats = [];
    if (newCandidats.length > 0) {
      console.log('\n📰 Recherche des programmes des nouveaux candidats...');

      for (const candidat of newCandidats) {
        try {
          console.log(`  Recherche programme de ${candidat.nom}...`);
          const propositions = await searchProgramme(candidat, commune, anthropic);
          console.log(`    ✅ ${propositions.length} propositions trouvées`);

          candidat.propositions = propositions;
        } catch (e) {
          console.error(`    ❌ Erreur: ${e.message}`);
          candidat.propositions = [];
        }
      }

      // Sauvegarder les nouveaux candidats (filtrer ceux sans nom)
      const validCandidats = newCandidats.filter(c => c.nom && c.nom.trim());

      if (validCandidats.length === 0) {
        console.log('  ⚠️  Aucun candidat valide à insérer');
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('candidats')
          .insert(
            validCandidats.map(c => ({
              commune_code: commune.code_insee,
              commune_nom: commune.nom,
              nom: c.nom.trim(),
              prenom: c.prenom?.trim() || null,
              parti: c.parti?.trim() || null,
              liste: c.liste?.trim() || null,
              maire_sortant: c.fonction_actuelle?.toLowerCase().includes('maire') || false,
              propositions: c.propositions || [],
              source_type: 'web_search',
              updated_at: new Date().toISOString()
            }))
          )
          .select();

        if (!insertError && inserted) {
          addedCandidats = inserted;
          console.log(`✅ ${inserted.length} nouveau(x) candidat(s) ajouté(s)`);
        }
      }
    }

    // ÉTAPE 4 : Enrichir tous les candidats avec tracts validés
    console.log('\n📄 ÉTAPE 4/6 : Enrichissement avec tracts validés...');

    // Récupérer tous les candidats actuels (existants + nouveaux)
    const allCandidats = await getCandidats(commune_code);
    const enrichedCandidats = await enrichCandidatsWithTracts(allCandidats, commune_code);

    // Mettre à jour les propositions des candidats qui ont des tracts
    let updatedCount = 0;
    for (const candidat of enrichedCandidats) {
      if (candidat.tract_count > 0) {
        await supabase
          .from('candidats')
          .update({
            propositions: candidat.propositions,
            updated_at: new Date().toISOString()
          })
          .eq('id', candidat.id);
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`✅ ${updatedCount} candidat(s) enrichi(s) avec tracts`);
    }

    // ÉTAPE 5 : Décider si on regénère les questions
    console.log('\n📋 ÉTAPE 5/6 : Évaluation du besoin de régénération...');

    let regenerateQuestions = false;
    let regenerationReason = '';

    // Si nouveaux candidats, on regénère
    if (newCandidats.length > 0) {
      regenerateQuestions = true;
      regenerationReason = `${newCandidats.length} nouveau(x) candidat(s)`;
    }

    // Si des tracts ont été ajoutés depuis la dernière génération
    const { data: lastGeneration } = await supabase
      .from('generated_questions')
      .select('created_at, tracts_count')
      .eq('commune_code', commune_code)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const totalTracts = enrichedCandidats.reduce((sum, c) => sum + (c.tract_count || 0), 0);
    const lastTractsCount = lastGeneration?.tracts_count || 0;

    if (totalTracts > lastTractsCount) {
      regenerateQuestions = true;
      regenerationReason += (regenerationReason ? ' + ' : '') + `${totalTracts - lastTractsCount} nouveau(x) tract(s)`;
    }

    let newVersion = null;

    if (regenerateQuestions) {
      console.log(`  ✅ Régénération nécessaire : ${regenerationReason}`);

      try {
        const questionsResult = await generateQuestionsForCommune(commune, enrichedCandidats);
        console.log(`  ✅ ${questionsResult.questions.length} questions générées`);

        // Récupérer la version actuelle
        const { data: currentQuestions } = await supabase
          .from('generated_questions')
          .select('version')
          .eq('commune_code', commune_code)
          .order('version', { ascending: false })
          .limit(1)
          .single();

        newVersion = (currentQuestions?.version || 0) + 1;

        // Sauvegarder les nouvelles questions
        await supabase
          .from('generated_questions')
          .insert({
            commune_id: commune.id,
            commune_code: commune.code_insee,
            commune_nom: commune.nom,
            questions: questionsResult.questions,
            generated_by: questionsResult.metadata.generated_by,
            generation_mode: questionsResult.metadata.generation_mode,
            sources: questionsResult.metadata.sources,
            context_data: questionsResult.metadata.context_data,
            total_questions: questionsResult.metadata.total_questions,
            question_types: questionsResult.metadata.question_types,
            version: newVersion,
            tracts_count: totalTracts,
            expires_at: null
          });

        console.log(`  ✅ Questions sauvegardées (version ${newVersion})`);
      } catch (genError) {
        console.error(`  ❌ Erreur génération questions: ${genError.message}`);
        regenerateQuestions = false; // Marquer comme non régénéré
      }
    } else {
      console.log(`  ℹ️  Pas de régénération nécessaire (aucun changement significatif)`);
    }

    // ÉTAPE 6 : Repositionner les candidats modifiés
    console.log('\n📊 ÉTAPE 6/6 : Positionnement des candidats...');

    let candidatsToPosition = [];

    // Récupérer les questions actuelles (nouvelles ou existantes)
    const { data: currentQuestions } = await supabase
      .from('generated_questions')
      .select('questions')
      .eq('commune_code', commune_code)
      .order('version', { ascending: false})
      .limit(1)
      .single();

    if (!currentQuestions) {
      console.log('  ⚠️  Aucune question disponible, positionnement impossible');
    } else {
      const { PROMPT_POSITIONNER_CANDIDAT } = await import('../../lib/prompts.js');

      // Positionner seulement les nouveaux candidats ou ceux enrichis avec tracts
      candidatsToPosition = enrichedCandidats.filter(c =>
        // Nouveau candidat
        addedCandidats.some(added => added.id === c.id) ||
        // Ou candidat enrichi avec tracts
        c.tract_count > 0
      );

      console.log(`  ${candidatsToPosition.length} candidat(s) à positionner`);

      for (const candidat of candidatsToPosition) {
        try {
          console.log(`    Positionnement de ${candidat.nom}...`);

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [{
              role: 'user',
              content: PROMPT_POSITIONNER_CANDIDAT(candidat, currentQuestions.questions)
            }]
          });

          const textContent = response.content.find(c => c.type === 'text')?.text;
          let jsonText = textContent.trim();
          if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
          if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
          if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);

          const result = JSON.parse(jsonText.trim());

          await supabase
            .from('candidats')
            .update({
              positions: result.positions,
              updated_at: new Date().toISOString()
            })
            .eq('id', candidat.id);

          console.log(`    ✅ ${candidat.nom} positionné`);
        } catch (e) {
          console.error(`    ❌ Erreur positionnement ${candidat.nom}:`, e.message);
        }
      }
    }

    console.log('\n✅ MISE À JOUR INTELLIGENTE TERMINÉE');
    console.log('='.repeat(70));

    return res.status(200).json({
      success: true,
      commune: {
        code: commune.code_insee,
        nom: commune.nom
      },
      stats: {
        existing_candidats: existingCandidats.length,
        new_candidats: newCandidats.length,
        total_candidats: enrichedCandidats.length,
        tracts_used: totalTracts,
        questions_regenerated: regenerateQuestions,
        new_version: newVersion,
        candidats_repositioned: regenerateQuestions ? enrichedCandidats.length : candidatsToPosition.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour:', error);
    console.error('Stack:', error.stack);

    // S'assurer de retourner du JSON valide
    const errorMessage = error.message || 'Erreur inconnue';

    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
