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

  try {
    // Stats globales
    const [
      { count: totalCandidats },
      { count: totalQuestions },
      { count: totalSessions },
      { count: totalSubmissions },
      { data: submissions },
      { data: sessions7days },
      { data: candidatsParSource }
    ] = await Promise.all([
      supabase.from('candidats').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('sessions').select('*', { count: 'exact', head: true }),
      supabase.from('submissions').select('*', { count: 'exact', head: true }),
      supabase.from('submissions').select('status, created_at'),
      supabase.from('sessions').select('commune_code, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('candidats').select('source_type')
    ]);

    // Stats submissions par statut
    const submissionsByStatus = {
      pending: submissions?.filter(s => s.status === 'pending').length || 0,
      auto_approved: submissions?.filter(s => s.status === 'auto_approved').length || 0,
      approved: submissions?.filter(s => s.status === 'approved').length || 0,
      rejected: submissions?.filter(s => s.status === 'rejected').length || 0
    };

    // Taux d'auto-validation
    const totalValidated = submissionsByStatus.auto_approved + submissionsByStatus.approved;
    const autoValidationRate = totalValidated > 0
      ? Math.round((submissionsByStatus.auto_approved / totalValidated) * 100)
      : 0;

    // Sessions par jour (7 derniers jours)
    const sessionsByDay = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      sessionsByDay[dateStr] = 0;
    }

    sessions7days?.forEach(session => {
      const dateStr = session.created_at.split('T')[0];
      if (sessionsByDay[dateStr] !== undefined) {
        sessionsByDay[dateStr]++;
      }
    });

    // Top communes par activité
    const communeActivity = {};
    sessions7days?.forEach(session => {
      communeActivity[session.commune_code] = (communeActivity[session.commune_code] || 0) + 1;
    });

    const topCommunesCodes = Object.entries(communeActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([code, count]) => ({ commune_code: code, sessions: count }));

    // Récupérer les noms des communes
    const communeCodes = topCommunesCodes.map(c => c.commune_code);
    const { data: communes } = await supabase
      .from('communes')
      .select('code_insee, nom')
      .in('code_insee', communeCodes);

    const communeNamesMap = {};
    communes?.forEach(c => {
      communeNamesMap[c.code_insee] = c.nom;
    });

    const topCommunes = topCommunesCodes.map(c => ({
      commune_code: c.commune_code,
      commune_nom: communeNamesMap[c.commune_code] || c.commune_code,
      sessions: c.sessions
    }));

    // Candidats par source
    const candidatsSource = {
      web_search: candidatsParSource?.filter(c => c.source_type === 'web_search').length || 0,
      tract_auto: candidatsParSource?.filter(c => c.source_type === 'tract_auto').length || 0,
      tract_manual: candidatsParSource?.filter(c => c.source_type === 'tract_manual').length || 0,
      admin: candidatsParSource?.filter(c => c.source_type === 'admin').length || 0
    };

    return res.status(200).json({
      success: true,
      stats: {
        totals: {
          candidats: totalCandidats,
          questions: totalQuestions,
          sessions: totalSessions,
          submissions: totalSubmissions
        },
        submissions: {
          by_status: submissionsByStatus,
          auto_validation_rate: autoValidationRate
        },
        candidats: {
          by_source: candidatsSource
        },
        activity: {
          sessions_7days: Object.keys(sessionsByDay).length,
          sessions_by_day: sessionsByDay,
          top_communes: topCommunes
        }
      }
    });

  } catch (error) {
    console.error('Erreur stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des stats'
    });
  }
}
