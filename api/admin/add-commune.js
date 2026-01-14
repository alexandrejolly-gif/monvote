import { supabase } from '../../lib/supabase.js';
import { generateQuestionsForCommune } from '../../lib/question-generator.js';
import { getCommuneFullContext } from '../../lib/commune-utils.js';
import Anthropic from '@anthropic-ai/sdk';

const ADMIN_KEY = process.env.ADMIN_KEY || 'TonMotDePasseAdmin2026!';

// Fonction pour récupérer les infos de la commune depuis l'API Géo
async function getCommuneInfoFromAPI(codeInsee) {
  const response = await fetch(`https://geo.api.gouv.fr/communes/${codeInsee}?fields=nom,code,codesPostaux,population,surface,centre,departement,region`);

  if (!response.ok) {
    throw new Error(`Commune ${codeInsee} introuvable dans l'API Géo`);
  }

  const data = await response.json();

  return {
    code_insee: data.code,
    nom: data.nom,
    population: data.population || null,
    superficie_km2: data.surface ? (data.surface / 100).toFixed(2) : null, // convertir m² en km²
    densite_hab_km2: data.population && data.surface ? Math.round(data.population / (data.surface / 1000000)) : null,
    latitude: data.centre?.coordinates?.[1] || null,
    longitude: data.centre?.coordinates?.[0] || null,
    departement: data.departement?.nom || null,
    region: data.region?.nom || null
  };
}

// Fonction pour rechercher les candidats via Claude + web search
async function searchCandidats(commune, anthropic) {
  const { PROMPT_RECHERCHE_CANDIDATS } = await import('../../lib/prompts.js');

  const context = getCommuneFullContext(commune.nom, commune.code_insee);
  console.log(`🔍 Recherche des candidats pour ${context.fullName}...`);

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
    // Nettoyer le JSON
    let jsonText = textContent.trim();
    if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
    if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
    if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);

    const result = JSON.parse(jsonText.trim());
    console.log(`✅ ${result.candidats?.length || 0} candidats trouvés`);

    return result.candidats || [];
  } catch (e) {
    console.error('Erreur parsing candidats:', e);
    return [];
  }
}

// Fonction pour rechercher les programmes des candidats
async function searchProgrammes(candidats, commune, anthropic) {
  const { PROMPT_RECHERCHE_PROGRAMME } = await import('../../lib/prompts.js');

  const context = getCommuneFullContext(commune.nom, commune.code_insee);
  console.log(`📰 Recherche des programmes de ${candidats.length} candidats...`);

  const candidatsWithProgrammes = [];

  for (const candidat of candidats) {
    try {
      console.log(`  Recherche programme de ${candidat.nom}...`);

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
        candidatsWithProgrammes.push({
          ...candidat,
          propositions: []
        });
        continue;
      }

      let jsonText = textContent.trim();
      if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
      if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
      if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);

      const result = JSON.parse(jsonText.trim());

      candidatsWithProgrammes.push({
        ...candidat,
        propositions: result.propositions || []
      });

      console.log(`  ✅ ${result.propositions?.length || 0} propositions trouvées`);
    } catch (e) {
      console.error(`  ❌ Erreur programme ${candidat.nom}:`, e.message);
      candidatsWithProgrammes.push({
        ...candidat,
        propositions: []
      });
    }
  }

  return candidatsWithProgrammes;
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
  const { key, code_insee } = req.body;

  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!code_insee || !/^\d{5}$/.test(code_insee)) {
    return res.status(400).json({
      success: false,
      error: 'Code INSEE invalide (doit être 5 chiffres)'
    });
  }

  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🏘️  AJOUT COMMUNE ${code_insee}`);
    console.log('='.repeat(70));

    // ÉTAPE 1 : Récupérer les infos de la commune
    console.log('\n📍 ÉTAPE 1/5 : Récupération infos commune...');
    const communeInfo = await getCommuneInfoFromAPI(code_insee);
    console.log(`✅ ${communeInfo.nom} trouvée (${communeInfo.population} habitants)`);

    // Vérifier si la commune existe déjà
    const { data: existingCommune } = await supabase
      .from('communes')
      .select('id')
      .eq('code_insee', code_insee)
      .single();

    if (existingCommune) {
      return res.status(409).json({
        success: false,
        error: `La commune ${communeInfo.nom} existe déjà`
      });
    }

    // Insérer la commune en base (colonnes minimales)
    const { data: commune, error: insertError } = await supabase
      .from('communes')
      .insert({
        code_insee: communeInfo.code_insee,
        nom: communeInfo.nom,
        population: communeInfo.population,
        latitude: communeInfo.latitude,
        longitude: communeInfo.longitude
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erreur insertion commune: ${insertError.message}`);
    }

    console.log(`✅ Commune ajoutée en base (ID: ${commune.id})`);

    // Initialiser l'API Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // ÉTAPE 2 : Rechercher les candidats
    console.log('\n🔍 ÉTAPE 2/5 : Recherche des candidats...');
    const candidats = await searchCandidats(commune, anthropic);

    // ÉTAPE 3 : Rechercher les programmes
    console.log('\n📰 ÉTAPE 3/5 : Recherche des programmes...');
    const candidatsWithProgrammes = await searchProgrammes(candidats, commune, anthropic);

    // Sauvegarder les candidats
    if (candidatsWithProgrammes.length > 0) {
      const { error: candidatsError } = await supabase
        .from('candidats')
        .insert(
          candidatsWithProgrammes.map(c => ({
            commune_code: commune.code_insee,
            commune_nom: commune.nom,
            nom: c.nom,
            prenom: c.prenom || null,
            parti: c.parti || null,
            liste: c.liste || null,
            maire_sortant: c.fonction_actuelle?.toLowerCase().includes('maire') || false,
            propositions: c.propositions || [],
            source_type: 'web_search',
            updated_at: new Date().toISOString()
          }))
        );

      if (candidatsError) {
        console.error('⚠️  Erreur sauvegarde candidats:', candidatsError);
      } else {
        console.log(`✅ ${candidatsWithProgrammes.length} candidats sauvegardés`);
      }
    }

    // ÉTAPE 4 : Générer les questions du quiz
    console.log('\n📋 ÉTAPE 4/5 : Génération des questions...');
    const questionsResult = await generateQuestionsForCommune(commune, candidatsWithProgrammes);
    console.log(`✅ ${questionsResult.questions.length} questions générées`);

    // Sauvegarder les questions
    const { error: questionsError } = await supabase
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
        version: 1,
        expires_at: null
      });

    if (questionsError) {
      console.error('⚠️  Erreur sauvegarde questions:', questionsError);
    }

    // ÉTAPE 5 : Positionner les candidats sur les questions
    console.log('\n📊 ÉTAPE 5/5 : Positionnement des candidats...');
    const { PROMPT_POSITIONNER_CANDIDAT } = await import('../../lib/prompts.js');

    // Récupérer les candidats depuis la DB avec leurs IDs
    const { data: savedCandidats } = await supabase
      .from('candidats')
      .select('*')
      .eq('commune_code', commune.code_insee);

    if (savedCandidats && savedCandidats.length > 0) {
      for (const candidat of savedCandidats) {
        try {
          console.log(`  Positionnement de ${candidat.nom}...`);

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [{
              role: 'user',
              content: PROMPT_POSITIONNER_CANDIDAT(candidat, questionsResult.questions)
            }]
          });

          const textContent = response.content.find(c => c.type === 'text')?.text;
          let jsonText = textContent.trim();
          if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
          if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
          if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);

          const result = JSON.parse(jsonText.trim());

          // Mettre à jour les positions
          await supabase
            .from('candidats')
            .update({
              positions: result.positions,
              updated_at: new Date().toISOString()
            })
            .eq('id', candidat.id);

          console.log(`  ✅ ${candidat.nom} positionné`);
        } catch (e) {
          console.error(`  ❌ Erreur positionnement ${candidat.nom}:`, e.message);
        }
      }
    }

    console.log('\n✅ GÉNÉRATION COMPLÈTE TERMINÉE');
    console.log('='.repeat(70));

    return res.status(200).json({
      success: true,
      commune: {
        id: commune.id,
        code_insee: commune.code_insee,
        nom: commune.nom,
        population: commune.population
      },
      stats: {
        candidats_trouves: candidatsWithProgrammes.length,
        questions_generees: questionsResult.questions.length,
        candidats_positionnes: savedCandidats?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur ajout commune:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
