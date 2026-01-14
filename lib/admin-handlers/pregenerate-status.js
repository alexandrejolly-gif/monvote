import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Compter les questions générées
    const { count: generated, error: genError } = await supabase
      .from('generated_questions')
      .select('*', { count: 'exact', head: true });

    if (genError) throw genError;

    // Compter le total de communes
    const { count: total, error: totalError } = await supabase
      .from('communes')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    const remaining = total - generated;
    const percentage = Math.round((generated / total) * 100);

    return res.status(200).json({
      success: true,
      generated,
      total,
      remaining,
      percentage,
      status: remaining === 0 ? 'COMPLETED ✅' : `IN PROGRESS (${generated}/${total})`,
      message: remaining === 0
        ? 'Toutes les communes ont leurs questions!'
        : `${remaining} communes restantes à générer`
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
