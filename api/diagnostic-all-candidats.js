import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Get ALL tract-imported candidats
    const { data: candidats, error } = await supabase
      .from('candidats')
      .select('nom, prenom, commune_nom, parti, liste, propositions, source_type, updated_at, submission_id')
      .eq('source_type', 'tract_auto')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Also get test-imported ones
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

  } catch (error) {
    console.error('Diagnostic error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
