import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Get recent auto-approved submissions
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, commune_nom, status, analysis_result, created_at')
      .eq('status', 'auto_approved')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) throw error;

    // Get tract-imported candidats
    const { data: candidats, error: candError } = await supabase
      .from('candidats')
      .select('nom, prenom, commune_nom, parti, liste, propositions, source_type')
      .eq('source_type', 'tract_auto')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (candError) throw candError;

    return res.status(200).json({
      success: true,
      submissions: submissions.map(s => ({
        commune: s.commune_nom,
        date: s.created_at,
        liste: s.analysis_result.liste || null,
        parti: s.analysis_result.parti || null,
        tete_de_liste: s.analysis_result.tete_de_liste,
        candidats_count: s.analysis_result.candidats?.length || (s.analysis_result.candidat ? 1 : 0),
        propositions_count: s.analysis_result.propositions?.length || 0
      })),
      candidats: candidats.map(c => ({
        nom: `${c.prenom} ${c.nom}`,
        commune: c.commune_nom,
        parti: c.parti,
        liste: c.liste,
        propositions_count: c.propositions?.length || 0
      }))
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
