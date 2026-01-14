import { COMMUNES_RENNES_METROPOLE } from '../lib/communes-rennes.js';
import { supabase } from '../lib/supabase.js';

// API endpoint pour récupérer les communes enrichies avec candidats
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

  try {
    // Récupérer toutes les communes depuis Supabase
    const { data: communesDB, error: communesError } = await supabase
      .from('communes')
      .select('code_insee, nom, population, latitude, longitude, profil_commune, enjeux_prioritaires, superficie_km2, densite_hab_km2');

    if (communesError) {
      console.error('⚠️ Erreur récupération communes:', communesError);
      // Fallback sur communes statiques MAIS récupérer quand même les candidats

      // Récupérer tous les candidats groupés par commune
      const { data: candidats, error: candidatsError } = await supabase
        .from('candidats')
        .select('commune_code, nom, prenom, maire_sortant');

      const candidatsParCommune = {};
      if (!candidatsError && candidats && candidats.length > 0) {
        candidats.forEach(candidat => {
          if (!candidatsParCommune[candidat.commune_code]) {
            candidatsParCommune[candidat.commune_code] = [];
          }
          candidatsParCommune[candidat.commune_code].push(candidat);
        });
      }

      const communesEnrichies = COMMUNES_RENNES_METROPOLE.map(c => {
        const candidatsCommune = candidatsParCommune[c.code] || [];
        const maireSortant = candidatsCommune.find(cand => cand.maire_sortant === true);

        return {
          ...c,
          nb_candidats: candidatsCommune.length,
          maire_sortant: maireSortant ? {
            nom: maireSortant.nom,
            prenom: maireSortant.prenom
          } : null
        };
      });

      return res.status(200).json({
        success: true,
        count: communesEnrichies.length,
        data: communesEnrichies
      });
    }

    // Récupérer tous les candidats groupés par commune
    const { data: candidats, error: candidatsError } = await supabase
      .from('candidats')
      .select('commune_code, nom, prenom, maire_sortant');

    const candidatsParCommune = {};
    if (!candidatsError && candidats && candidats.length > 0) {
      console.log(`✅ ${candidats.length} candidats chargés depuis Supabase`);

      // Grouper par commune
      candidats.forEach(candidat => {
        if (!candidatsParCommune[candidat.commune_code]) {
          candidatsParCommune[candidat.commune_code] = [];
        }
        candidatsParCommune[candidat.commune_code].push(candidat);
      });
    }

    // Récupérer les questions V5 pour vérifier quelles communes ont des questions générées
    const { data: questions, error: questionsError } = await supabase
      .from('generated_questions')
      .select('commune_code');

    if (questionsError) {
      console.error('⚠️ Erreur récupération questions V5:', questionsError);
    }

    const communesAvecQuestions = new Set();
    if (!questionsError && questions && questions.length > 0) {
      console.log(`✅ ${questions.length} questions V5 trouvées dans generated_questions`);
      questions.forEach(q => communesAvecQuestions.add(q.commune_code));
      console.log(`✅ ${communesAvecQuestions.size} communes distinctes avec questions`);
    } else {
      console.log('⚠️ Aucune question trouvée dans generated_questions');
    }

    // Enrichir les communes avec les candidats
    const communesEnrichies = communesDB.map(commune => {
      const candidatsCommune = candidatsParCommune[commune.code_insee] || [];
      const maireSortant = candidatsCommune.find(c => c.maire_sortant === true);

      return {
        code: commune.code_insee,
        nom: commune.nom,
        population: commune.population || 0,
        lat: commune.latitude,
        lng: commune.longitude,
        profil_commune: commune.profil_commune,
        enjeux_prioritaires: commune.enjeux_prioritaires || [],
        superficie_km2: commune.superficie_km2,
        densite_hab_km2: commune.densite_hab_km2,
        nb_candidats: candidatsCommune.length,
        maire_sortant: maireSortant ? {
          nom: maireSortant.nom,
          prenom: maireSortant.prenom
        } : null,
        questions_generated: communesAvecQuestions.has(commune.code_insee)
      };
    });

    console.log(`✅ ${communesEnrichies.length} communes retournées`);

    return res.status(200).json({
      success: true,
      count: communesEnrichies.length,
      data: communesEnrichies
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    // Fallback sur communes statiques
    const communesEnrichies = COMMUNES_RENNES_METROPOLE.map(c => ({
      ...c,
      nb_candidats: 0,
      maire_sortant: null
    }));

    return res.status(200).json({
      success: true,
      count: communesEnrichies.length,
      data: communesEnrichies
    });
  }
}
