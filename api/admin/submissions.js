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

  const { status = 'pending', commune_code, limit = 50 } = req.query;

  try {
    let query = supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (commune_code) {
      query = query.eq('commune_code', commune_code);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Stats rapides
    const { data: stats } = await supabase
      .from('submissions')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const todayStats = {
      total: stats?.length || 0,
      pending: stats?.filter(s => s.status === 'pending').length || 0,
      auto_approved: stats?.filter(s => s.status === 'auto_approved').length || 0,
      approved: stats?.filter(s => s.status === 'approved').length || 0,
      rejected: stats?.filter(s => s.status === 'rejected').length || 0
    };

    return res.status(200).json({
      success: true,
      submissions: data,
      stats: todayStats
    });

  } catch (error) {
    console.error('Erreur liste submissions:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération'
    });
  }
}
