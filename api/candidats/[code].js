import { getCandidats, saveCandidats, getQuestions, supabase } from '../../lib/supabase.js';
import { searchCandidats, searchMaire, positionCandidat } from '../../lib/claude.js';
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

  // Vérifier que la commune existe (d'abord Supabase, puis fallback sur liste statique)
  let commune = null;

  const { data: communeDB } = await supabase
    .from('communes')
    .select('code_insee, nom, population')
    .eq('code_insee', code)
    .single();

  if (communeDB) {
    commune = {
      code: communeDB.code_insee,
      nom: communeDB.nom,
      population: communeDB.population
    };
  } else {
    // Fallback sur liste statique
    commune = getCommuneByCode(code);
  }

  if (!commune) {
    return res.status(404).json({
      success: false,
      error: 'Commune non trouvée'
    });
  }

  try {
    // 1. Chercher en cache (Supabase)
    let candidats = await getCandidats(code);

    // 2. Si pas de candidats en cache, rechercher avec Claude
    if (!candidats || candidats.length === 0) {
      console.log(`No cached candidates for ${commune.nom}, searching with Claude...`);

      // 2a. Rechercher le maire actuel d'abord
      console.log(`🏛️ Searching for current mayor of ${commune.nom} (${code})...`);
      const maireResult = await searchMaire(commune.nom, code);

      // 2b. Rechercher les candidats
      const searchResult = await searchCandidats(commune.nom, code);

      if (searchResult.candidats && searchResult.candidats.length > 0) {
        console.log(`Found ${searchResult.candidats.length} candidates`);

        // Sauvegarder d'abord les candidats SANS positions
        const formattedCandidats = searchResult.candidats.map(c => {
          // Vérifier si ce candidat est le maire actuel
          const isMaire = maireResult.maire &&
                          c.nom.toUpperCase() === maireResult.maire.nom.toUpperCase();

          if (isMaire) {
            console.log(`✅ Identified ${c.prenom} ${c.nom} as current mayor`);
          }

          return {
            commune_code: code,
            commune_nom: commune.nom,
            nom: c.nom,
            prenom: c.prenom,
            parti: c.parti,
            liste: c.liste,
            maire_sortant: isMaire,
            source_url: c.source_url,
            source_type: 'web_search',
            themes: [],
            positions: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        candidats = await saveCandidats(formattedCandidats);
        console.log(`✅ Saved ${candidats.length} candidates (positions will be added later by quiz generation)`);
      } else {
        // Aucun candidat 2026/2020 trouvé
        console.log(`⚠️ No candidates found for ${commune.nom}`);

        // Si un maire est identifié, créer 2 candidats fictifs
        if (maireResult.maire) {
          console.log(`Creating default candidates (incumbent + opposition) for ${commune.nom}`);

          const defaultCandidats = [
            {
              commune_code: code,
              commune_nom: commune.nom,
              nom: maireResult.maire.nom,
              prenom: maireResult.maire.prenom,
              parti: maireResult.maire.parti || 'Liste sortante',
              liste: maireResult.maire.liste || 'Continuité',
              maire_sortant: true,
              source_url: maireResult.source_url || null,
              source_type: 'generated',
              themes: [],
              positions: {},
              propositions: ['Poursuite des projets en cours', 'Maintien des services publics', 'Gestion équilibrée du budget'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              commune_code: code,
              commune_nom: commune.nom,
              nom: 'Opposition',
              prenom: 'Liste',
              parti: 'Opposition municipale',
              liste: 'Renouveau',
              maire_sortant: false,
              source_url: null,
              source_type: 'generated',
              themes: [],
              positions: {},
              propositions: ['Changement de politique', 'Nouvelles priorités', 'Écoute des citoyens'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];

          candidats = await saveCandidats(defaultCandidats);
          console.log(`✅ Created 2 default candidates for ${commune.nom}`);
        } else {
          // Aucun maire identifié -> marquer la commune comme non disponible
          console.log(`❌ No mayor or candidates found for ${commune.nom} - commune unavailable`);
          return res.status(200).json({
            success: true,
            candidats: [],
            source: 'search',
            available: false,
            note: 'Aucun candidat ni maire identifié pour cette commune'
          });
        }
      }
    }

    // Vérifier le cache TTL
    const cacheTTL = parseInt(process.env.CACHE_TTL_HOURS) || 24;
    const now = new Date();
    const oldestCandidat = candidats.reduce((oldest, c) =>
      new Date(c.updated_at) < new Date(oldest.updated_at) ? c : oldest
    );
    const cacheAge = (now - new Date(oldestCandidat.updated_at)) / (1000 * 60 * 60);

    return res.status(200).json({
      success: true,
      candidats: candidats,
      source: 'cache',
      cache_age_hours: Math.round(cacheAge),
      cache_fresh: cacheAge < cacheTTL
    });

  } catch (error) {
    console.error('Error fetching candidates:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des candidats'
    });
  }
}
