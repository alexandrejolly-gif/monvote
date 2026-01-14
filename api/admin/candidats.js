import { supabase } from '../../lib/supabase.js';
import { verifyAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Vérification admin
  const auth = verifyAdmin(req);
  if (!auth.valid) {
    return res.status(401).json({ success: false, error: auth.error });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { commune_code, source_type } = req.query;

  try {
    let query = supabase
      .from('candidats')
      .select('*')
      .order('commune_nom', { ascending: true })
      .order('nom', { ascending: true });

    if (commune_code) {
      query = query.eq('commune_code', commune_code);
    }

    if (source_type) {
      query = query.eq('source_type', source_type);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Grouper par commune
    const byCommune = data.reduce((acc, candidat) => {
      if (!acc[candidat.commune_code]) {
        acc[candidat.commune_code] = {
          commune_code: candidat.commune_code,
          commune_nom: candidat.commune_nom,
          candidats: []
        };
      }
      acc[candidat.commune_code].candidats.push(candidat);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      total: data.length,
      by_commune: Object.values(byCommune),
      all_candidats: data
    });

  } catch (error) {
    console.error('Erreur liste candidats:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération'
    });
  }
}
