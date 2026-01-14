// Endpoint temporaire pour dev local (sans route dynamique)
import { getCandidats, saveCandidats, supabase } from '../lib/supabase.js';
import { searchCandidats, searchMaire } from '../lib/claude.js';
import { getCommuneByCode } from '../lib/communes-rennes.js';

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
      error: 'Code commune requis (paramètre ?code=...)'
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
  } catch (error) {
    console.error('Erreur vérification commune:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification de la commune'
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

        // Sauvegarder les candidats
        const formattedCandidats = searchResult.candidats.map(c => {
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
        console.log(`✅ Saved ${candidats.length} candidates`);
      } else {
        // Créer des candidats par défaut si un maire est trouvé
        if (maireResult.maire) {
          console.log(`Creating default candidates for ${commune.nom}`);

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
          console.log(`❌ No mayor or candidates found for ${commune.nom}`);
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

    return res.status(200).json({
      success: true,
      candidats: candidats,
      source: 'cache'
    });

  } catch (error) {
    console.error('Error fetching candidates:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des candidats'
    });
  }
}
