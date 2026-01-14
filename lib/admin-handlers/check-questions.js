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
    const { data, error } = await supabase
      .from('generated_questions')
      .select('commune_code, commune_nom, generated_at, questions')
      .eq('commune_code', commune_code)
      .single();

    if (error) throw error;

    // Analyser les questions pour voir si elles mentionnent la bonne commune
    const communeMentions = [];
    data.questions.forEach((q, i) => {
      const text = (q.texte + ' ' + q.contexte).toLowerCase();
      // Chercher des noms de communes
      const communes = ['chavagne', 'chapelle-thouarault', 'thouarault'];
      communes.forEach(commune => {
        if (text.includes(commune)) {
          communeMentions.push({ question: i + 1, commune, where: q.texte.toLowerCase().includes(commune) ? 'texte' : 'contexte' });
        }
      });
    });

    return res.status(200).json({
      success: true,
      stored_commune_code: data.commune_code,
      stored_commune_nom: data.commune_nom,
      generated_at: data.generated_at,
      total_questions: data.questions.length,
      commune_mentions: communeMentions,
      sample_questions: data.questions.slice(0, 3).map(q => ({
        code: q.code,
        texte: q.texte,
        contexte: q.contexte?.substring(0, 100)
      }))
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
