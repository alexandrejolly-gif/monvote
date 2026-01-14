import { getCandidats, saveSession, getQuestions, supabase } from '../lib/supabase.js';
import { getCommuneByCode } from '../lib/communes-rennes.js';
import { checkRateLimit, extractIP, extractFingerprint } from '../lib/security.js';

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

  // Rate limiting: 50 quiz par jour par IP
  const ip = extractIP(req);
  const fingerprint = extractFingerprint(req);

  const rateLimitCheck = await checkRateLimit(supabase, {
    ip,
    fingerprint,
    action: 'quiz_complete'
  });

  if (rateLimitCheck.blocked) {
    return res.status(429).json({
      success: false,
      error: 'Limite atteinte',
      message: rateLimitCheck.reason,
      retry_after: rateLimitCheck.retry_after
    });
  }

  const { commune_code, responses } = req.body;

  if (!commune_code || !responses) {
    return res.status(400).json({
      success: false,
      error: 'commune_code et responses requis'
    });
  }

  // Vérifier que la commune existe (d'abord Supabase, puis données statiques)
  let commune = null;

  try {
    // Essayer Supabase d'abord
    const { data: communeDB, error: communeError } = await supabase
      .from('communes')
      .select('code_insee, nom, population')
      .eq('code_insee', commune_code)
      .single();

    if (communeDB && !communeError) {
      commune = {
        code: communeDB.code_insee,
        nom: communeDB.nom,
        population: communeDB.population
      };
    } else {
      // Fallback sur données statiques
      commune = getCommuneByCode(commune_code);
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
    // Récupérer les candidats
    const candidats = await getCandidats(commune_code);

    if (!candidats || candidats.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucun candidat trouvé pour cette commune'
      });
    }

    // Récupérer les questions pour avoir les thèmes
    const questionsData = await getQuestions(commune_code);
    const questions = questionsData?.questions || [];

    // Grouper questions par thème
    const questionsByTheme = questions.reduce((acc, q) => {
      if (!acc[q.theme]) acc[q.theme] = [];
      acc[q.theme].push(q);
      return acc;
    }, {});

    // Calculer la compatibilité pour chaque candidat
    const results = candidats.map(candidat => {
      // Si le candidat n'a pas de positions, on ne peut pas calculer
      if (!candidat.positions || Object.keys(candidat.positions).length === 0) {
        return {
          candidat: {
            id: candidat.id,
            nom: candidat.nom,
            prenom: candidat.prenom,
            parti: candidat.parti,
            liste: candidat.liste
          },
          compatibilite: null,
          note: 'Positions non disponibles',
          details: { par_theme: [] }
        };
      }

      // Calculer la différence absolue pour chaque question (score global)
      let totalDiff = 0;
      let questionsCount = 0;

      for (const [questionId, userResponse] of Object.entries(responses)) {
        const candidatPosition = candidat.positions[questionId];

        if (candidatPosition !== undefined && candidatPosition !== null) {
          totalDiff += Math.abs(parseInt(userResponse) - parseInt(candidatPosition));
          questionsCount++;
        }
      }

      // Calculer le score de compatibilité global (0-100%)
      const maxDiff = 4 * questionsCount;
      const compatibilite = questionsCount > 0
        ? Math.round(((maxDiff - totalDiff) / maxDiff) * 100)
        : null;

      // Calculer la compatibilité par thème
      const parTheme = Object.entries(questionsByTheme).map(([theme, themeQuestions]) => {
        let themeDiff = 0;
        let themeCount = 0;

        themeQuestions.forEach(q => {
          const userResp = responses[q.id];
          const candPos = candidat.positions[q.id];

          if (userResp !== undefined && candPos !== undefined && candPos !== null) {
            themeDiff += Math.abs(parseInt(userResp) - parseInt(candPos));
            themeCount++;
          }
        });

        const themeMaxDiff = 4 * themeCount;
        const themeCompat = themeCount > 0
          ? Math.round(((themeMaxDiff - themeDiff) / themeMaxDiff) * 100)
          : null;

        return {
          theme: theme,
          compatibilite: themeCompat,
          questions_count: themeCount
        };
      }).filter(t => t.compatibilite !== null);

      return {
        candidat: {
          id: candidat.id,
          nom: candidat.nom,
          prenom: candidat.prenom,
          parti: candidat.parti,
          liste: candidat.liste,
          photo_url: candidat.photo_url,
          maire_sortant: candidat.maire_sortant || false,
          propositions: candidat.propositions || []
        },
        compatibilite: compatibilite,
        details: {
          questions_comparees: questionsCount,
          difference_totale: totalDiff,
          par_theme: parTheme
        }
      };
    });

    // Trier par compatibilité décroissante
    results.sort((a, b) => {
      if (a.compatibilite === null) return 1;
      if (b.compatibilite === null) return -1;
      return b.compatibilite - a.compatibilite;
    });

    // Sauvegarder la session (analytics)
    try {
      await saveSession(commune_code, responses, results);
    } catch (error) {
      console.error('Error saving session:', error);
      // Ne pas bloquer la réponse si la sauvegarde échoue
    }

    return res.status(200).json({
      success: true,
      commune: {
        code: commune_code,
        nom: commune.nom
      },
      results: results
    });

  } catch (error) {
    console.error('Error calculating results:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul des résultats'
    });
  }
}
