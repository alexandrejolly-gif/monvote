import { getQuestions, saveQuestions, getCandidats, updateCandidatPositions, updateCandidatProgramme, supabase } from '../../lib/supabase.js';
import { generateQuestions, positionCandidat, searchProgramme } from '../../lib/claude.js';
import { getCommuneByCode } from '../../lib/communes-rennes.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Code commune requis'
    });
  }

  // Vérifier que la commune existe (d'abord Supabase, puis données statiques)
  let commune = null;

  try {
    // Essayer Supabase d'abord
    const { data: communeDB, error: communeError } = await supabase
      .from('communes')
      .select('code_insee, nom, population')
      .eq('code_insee', code)
      .single();

    if (communeDB && !communeError) {
      commune = {
        code: communeDB.code_insee,
        nom: communeDB.nom,
        population: communeDB.population
      };
    } else {
      // Fallback sur données statiques
      commune = getCommuneByCode(code);
    }

    if (!commune) {
      return res.status(404).json({
        success: false,
        error: 'Commune non trouvée'
      });
    }
  } catch (verifyError) {
    console.error('Erreur vérification commune:', verifyError);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification de la commune'
    });
  }

  try {
    // 1. Chercher les questions en cache
    let questionsData = await getQuestions(code);

    // 2. Si pas de questions en cache, générer avec Claude
    if (!questionsData || !questionsData.questions) {
      console.log(`No cached questions for ${commune.nom}, generating with Claude...`);

      // Récupérer les candidats pour contextualiser les questions
      const candidats = await getCandidats(code);

      // Générer les questions
      const generated = await generateQuestions(commune.nom, candidats);

      if (!generated || !generated.questions) {
        throw new Error('Failed to generate questions');
      }

      // Sauvegarder en cache
      questionsData = await saveQuestions(code, commune.nom, generated.questions);
    }

    // 3. Positionner les candidats sans positions (TOUJOURS, même si questions en cache)
    const candidats = await getCandidats(code);
    if (candidats && candidats.length > 0 && questionsData?.questions) {
      const candidatsSansPositions = candidats.filter(c =>
        !c.positions || Object.keys(c.positions).length === 0
      );

      if (candidatsSansPositions.length > 0) {
        console.log(`Positioning ${candidatsSansPositions.length} candidates without positions...`);

        for (const candidat of candidatsSansPositions) {
          console.log(`Positioning ${candidat.prenom || ''} ${candidat.nom}...`);

          try {
            const positions = await positionCandidat(candidat, questionsData.questions);

            if (positions && Object.keys(positions).length > 0) {
              // Mettre à jour les positions du candidat
              await updateCandidatPositions(candidat.id, positions);
              console.log(`✅ ${candidat.prenom || ''} ${candidat.nom} positioned on ${Object.keys(positions).length} questions`);
            } else {
              console.warn(`⚠️ No positions generated for ${candidat.nom}`);
            }
          } catch (error) {
            console.error(`❌ Error positioning ${candidat.nom}:`, error);
          }
        }
      }
    }

    // 4. Rechercher les programmes des candidats sans propositions
    if (candidats && candidats.length > 0) {
      const candidatsSansProgramme = candidats.filter(c =>
        !c.propositions || c.propositions.length === 0
      );

      if (candidatsSansProgramme.length > 0) {
        console.log(`📋 Searching programmes for ${candidatsSansProgramme.length} candidates...`);

        for (const candidat of candidatsSansProgramme) {
          try {
            console.log(`🔍 Searching programme for ${candidat.prenom} ${candidat.nom}...`);
            const programmeResult = await searchProgramme(candidat, commune.nom, code);

            if (programmeResult.propositions && programmeResult.propositions.length > 0) {
              // Limiter au nombre configuré
              const maxPropositions = parseInt(process.env.CANDIDAT_PROPOSITIONS_MAX) || 5;
              const propositions = programmeResult.propositions.slice(0, maxPropositions);

              await updateCandidatProgramme(candidat.id, propositions);
              console.log(`✅ Found ${propositions.length} propositions for ${candidat.nom}`);
            } else {
              console.log(`ℹ️ No propositions found for ${candidat.nom}`);
            }
          } catch (error) {
            console.error(`Error searching programme for ${candidat.nom}:`, error);
            // Continue with other candidates even if one fails
          }
        }
      }
    }

    // Vérifier le cache TTL
    const cacheTTL = parseInt(process.env.CACHE_TTL_HOURS) || 24;
    const now = new Date();
    const cacheAge = (now - new Date(questionsData.updated_at)) / (1000 * 60 * 60);

    return res.status(200).json({
      success: true,
      commune: {
        code: code,
        nom: commune.nom
      },
      questions: questionsData.questions,
      source: 'cache',
      cache_age_hours: Math.round(cacheAge),
      cache_fresh: cacheAge < cacheTTL
    });

  } catch (error) {
    console.error('Error fetching quiz:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du quiz'
    });
  }
}
