// API endpoint pour vérifier les candidats d'une commune
import { supabase } from '../../lib/supabase.js';

const ADMIN_KEY = process.env.ADMIN_KEY || 'TonMotDePasseAdmin2026!';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key, commune_code } = req.body;

  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log(`\n🔍 VÉRIFICATION CANDIDATS - ${commune_code}`);
  console.log('='.repeat(70));

  try {
    // Récupérer les candidats
    const { data: candidats, error: candidatsError } = await supabase
      .from('candidats')
      .select('*')
      .eq('commune_code', commune_code)
      .order('nom', { ascending: true });

    if (candidatsError) throw candidatsError;

    console.log(`\n📊 ${candidats.length} candidat(s) trouvé(s):`);

    if (candidats.length > 0) {
      candidats.forEach(c => {
        const maireBadge = c.maire_sortant ? '👔' : '  ';
        const props = c.propositions ? ` (${c.propositions.length} props)` : ' (0 props)';
        const positions = c.positions ? ` [${Object.keys(c.positions).length} pos]` : ' [0 pos]';
        console.log(`${maireBadge} ${(c.prenom || '').padEnd(15)} ${c.nom.padEnd(20)}${props}${positions}`);
      });
    }

    const maires = candidats.filter(c => c.maire_sortant === true);
    console.log(`\n👔 Maire(s) sortant(s): ${maires.length}`);
    if (maires.length > 0) {
      maires.forEach(m => console.log(`   - ${m.prenom} ${m.nom}`));
    }

    // Vérifier les questions
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('commune_code', commune_code)
      .single();

    console.log(`\n📝 Questions: ${questions ? questions.questions?.length || 0 : 0}`);

    return res.status(200).json({
      success: true,
      commune_code,
      candidats: candidats.map(c => ({
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        maire_sortant: c.maire_sortant,
        nb_propositions: c.propositions?.length || 0,
        nb_positions: c.positions ? Object.keys(c.positions).length : 0
      })),
      nb_candidats: candidats.length,
      nb_maires: maires.length,
      nb_questions: questions?.questions?.length || 0,
      has_questions: !!questions
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
