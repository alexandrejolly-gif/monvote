import { supabase } from '../lib/supabase.js';

/**
 * Consolidated diagnostic handler
 * Routes requests based on ?type= parameter
 * - type=all-candidats: List all tract-imported candidats
 * - type=submissions: Recent auto-approved submissions
 * - type=detail: Submission detail by ID
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { type = 'submissions', id } = req.query;

  try {
    // Route 1: All candidats from tracts
    if (type === 'all-candidats') {
      const { data: candidats, error } = await supabase
        .from('candidats')
        .select('nom, prenom, commune_nom, parti, liste, propositions, source_type, updated_at, submission_id')
        .eq('source_type', 'tract_auto')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const { data: testCandidats, error: testError } = await supabase
        .from('candidats')
        .select('nom, prenom, commune_nom, parti, liste, propositions, source_type, updated_at, submission_id')
        .eq('source_type', 'tract_test')
        .order('updated_at', { ascending: false });

      if (testError) throw testError;

      return res.status(200).json({
        success: true,
        tract_auto: candidats.map(c => ({
          nom: `${c.prenom || ''} ${c.nom}`,
          commune: c.commune_nom,
          parti: c.parti,
          liste: c.liste,
          propositions_count: c.propositions?.length || 0,
          updated_at: c.updated_at,
          submission_id: c.submission_id
        })),
        tract_test: testCandidats.map(c => ({
          nom: `${c.prenom || ''} ${c.nom}`,
          commune: c.commune_nom,
          parti: c.parti,
          liste: c.liste,
          propositions_count: c.propositions?.length || 0,
          updated_at: c.updated_at,
          submission_id: c.submission_id
        })),
        total_auto: candidats.length,
        total_test: testCandidats.length
      });
    }

    // Route 2: Submission detail
    if (type === 'detail') {
      const submissionId = id || '49a3d59b-a1e2-4218-93d4-47b31707c387';

      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        submission: {
          id: data.id,
          commune: data.commune_nom,
          status: data.status,
          confidence_score: data.confidence_score,
          created_at: data.created_at,
          analysis_result: data.analysis_result,
          extracted_data: data.extracted_data
        }
      });
    }

    // Route 3 (default): Recent submissions
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, commune_nom, status, analysis_result, created_at')
      .eq('status', 'auto_approved')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) throw error;

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
