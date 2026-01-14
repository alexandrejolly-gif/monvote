import { supabase } from '../../lib/supabase.js';
import { verifyAdmin } from '../../lib/auth.js';
import { getCommuneByCode } from '../../lib/communes-rennes.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = verifyAdmin(req);
  if (!auth.valid) {
    return res.status(401).json({ success: false, error: auth.error });
  }

  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (req.method === 'POST' || req.method === 'PUT') {
      // Ajouter ou modifier un candidat
      const {
        id,
        commune_code,
        nom,
        prenom,
        parti,
        liste,
        themes,
        positions,
        photo_url
      } = req.body;

      if (!commune_code || !nom) {
        return res.status(400).json({
          success: false,
          error: 'commune_code et nom requis'
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
          return res.status(400).json({
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

      const candidatData = {
        commune_code,
        commune_nom: commune.nom,
        nom,
        prenom: prenom || null,
        parti: parti || null,
        liste: liste || null,
        themes: themes || [],
        positions: positions || {},
        photo_url: photo_url || null,
        source_type: 'admin',
        updated_at: new Date().toISOString()
      };

      if (req.method === 'POST') {
        // Créer un nouveau candidat
        const { data, error } = await supabase
          .from('candidats')
          .insert(candidatData)
          .select()
          .single();

        if (error) throw error;

        return res.status(201).json({
          success: true,
          message: 'Candidat créé',
          candidat: data
        });
      } else {
        // Modifier un candidat existant
        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'id requis pour la modification'
          });
        }

        const { data, error } = await supabase
          .from('candidats')
          .update(candidatData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        return res.status(200).json({
          success: true,
          message: 'Candidat modifié',
          candidat: data
        });
      }
    } else if (req.method === 'DELETE') {
      // Supprimer un candidat
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'id requis'
        });
      }

      const { error } = await supabase
        .from('candidats')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Candidat supprimé'
      });
    }

  } catch (error) {
    console.error('Erreur candidat:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'opération'
    });
  }
}
