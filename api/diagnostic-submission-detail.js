import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const submissionId = req.query.id || '49a3d59b-a1e2-4218-93d4-47b31707c387';

  try {
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

  } catch (error) {
    console.error('Diagnostic error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
