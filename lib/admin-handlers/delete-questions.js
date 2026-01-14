import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { commune_code } = req.query;

  if (!commune_code) {
    return res.status(400).json({
      success: false,
      error: 'commune_code requis'
    });
  }

  try {
    const { error } = await supabase
      .from('generated_questions')
      .delete()
      .eq('commune_code', commune_code);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: `Questions supprimées pour commune ${commune_code}`
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
