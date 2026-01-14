import { supabase } from '../../lib/supabase.js';
import Anthropic from '@anthropic-ai/sdk';
import { getCommuneFullContext } from '../../lib/commune-utils.js';

const ADMIN_KEY = process.env.ADMIN_KEY || 'TonMotDePasseAdmin2026!';

// Fonction pour rechercher les candidats via Claude + web search
async function searchCandidats(commune, anthropic) {
  const { PROMPT_RECHERCHE_CANDIDATS } = await import('../../lib/prompts.js');

  // Obtenir le contexte complet de la commune (département, etc.)
  const context = getCommuneFullContext(commune.nom, commune.code);

  console.log(`🔍 Recherche candidats pour ${context.fullName}...`);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: PROMPT_RECHERCHE_CANDIDATS(context.nom, context.dept, context.codeInsee)
      }]
    });

    const textContent = response.content.find(c => c.type === 'text')?.text;

    // Nettoyer le JSON
    let jsonText = textContent.trim();
    if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
    if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
    if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);

    const result = JSON.parse(jsonText.trim());
    return result.candidats || [];
  } catch (e) {
    console.error(`Erreur parsing candidats ${commune.nom}:`, e);
    return [];
  }
}

// Fonction pour rechercher les programmes
async function searchProgrammes(candidats, commune, anthropic) {
  const { PROMPT_RECHERCHE_PROGRAMME } = await import('../../lib/prompts.js');

  // Obtenir le contexte complet de la commune
  const context = getCommuneFullContext(commune.nom, commune.code);

  const candidatsWithProgrammes = [];

  for (const candidat of candidats) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: PROMPT_RECHERCHE_PROGRAMME(candidat, context.nom, context.dept, context.codeInsee)
        }]
      });

      const textContent = response.content.find(c => c.type === 'text')?.text;

      let jsonText = textContent.trim();
      if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
      if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
      if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);

      const result = JSON.parse(jsonText.trim());

      candidatsWithProgrammes.push({
        ...candidat,
        propositions: result.propositions || []
      });
    } catch (e) {
      console.error(`Erreur programme ${candidat.nom}:`, e.message);
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
  const { key, commune_codes } = req.body;

  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!commune_codes || !Array.isArray(commune_codes) || commune_codes.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Liste de codes INSEE requise'
    });
  }

  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔍 RECHERCHE MASSIVE CANDIDATS`);
    console.log(`📊 ${commune_codes.length} communes à traiter`);
    console.log('='.repeat(70));

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const results = {
      total_communes: commune_codes.length,
      processed: 0,
      candidats_total: 0,
      errors: []
    };

    // Récupérer les communes depuis Supabase
    const { data: communesFromDB, error: communesError } = await supabase
      .from('communes')
      .select('code_insee, nom, population')
      .in('code_insee', commune_codes);

    if (communesError || !communesFromDB || communesFromDB.length === 0) {
      console.log('❌ Communes demandées:', commune_codes);
      console.log('❌ Erreur Supabase:', communesError?.message);
      return res.status(404).json({
        success: false,
        error: 'Aucune commune trouvée dans la base de données. Ajoutez d\'abord les communes via "Ajouter une commune".'
      });
    }

    // Adapter le format pour correspondre à ce qui est attendu
    const communes = communesFromDB.map(c => ({
      code: c.code_insee,
      nom: c.nom,
      population: c.population
    }));

    console.log(`✅ ${communes.length} communes trouvées`);

    // Traiter chaque commune
    for (const commune of communes) {
      try {
        console.log(`\n📍 Traitement de ${commune.nom}...`);

        // Rechercher les candidats
        const candidats = await searchCandidats(commune, anthropic);
        console.log(`  ✅ ${candidats.length} candidats trouvés`);

        if (candidats.length === 0) {
          results.processed++;
          continue;
        }

        // Rechercher les programmes
        const candidatsWithProgrammes = await searchProgrammes(candidats, commune, anthropic);
        console.log(`  ✅ Programmes recherchés`);

        // Sauvegarder en base
        const { error: insertError } = await supabase
          .from('candidats')
          .upsert(
            candidatsWithProgrammes.map(c => ({
              commune_code: commune.code,  // Utiliser 'code' depuis communes-rennes.js
              commune_nom: commune.nom,
              nom: c.nom,
              prenom: c.prenom || null,
              parti: c.parti || null,
              liste: c.liste || null,
              maire_sortant: c.fonction_actuelle?.toLowerCase().includes('maire') || false,
              propositions: c.propositions || [],
              source_type: 'web_search_massive',
              updated_at: new Date().toISOString()
            })),
            {
              onConflict: 'commune_code,nom',
              ignoreDuplicates: false
            }
          );

        if (insertError) {
          console.error(`  ⚠️  Erreur sauvegarde:`, insertError);
          results.errors.push({
            commune: commune.nom,
            error: insertError.message
          });
        } else {
          console.log(`  ✅ ${candidatsWithProgrammes.length} candidats sauvegardés`);
          results.candidats_total += candidatsWithProgrammes.length;
        }

        results.processed++;

      } catch (error) {
        console.error(`❌ Erreur ${commune.nom}:`, error);
        results.errors.push({
          commune: commune.nom,
          error: error.message
        });
        results.processed++;
      }
    }

    console.log('\n✅ RECHERCHE MASSIVE TERMINÉE');
    console.log(`📊 ${results.processed}/${results.total_communes} communes traitées`);
    console.log(`👥 ${results.candidats_total} candidats au total`);
    console.log('='.repeat(70));

    return res.status(200).json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ Erreur recherche massive:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
