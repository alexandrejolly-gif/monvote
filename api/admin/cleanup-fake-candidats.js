import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Protection simple: méthode POST uniquement (changé plus tard si besoin de clé)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    console.log('🧹 Nettoyage des candidats factices...');

    // 1. Compter les candidats factices
    const { data: fakes, error: countError } = await supabase
      .from('candidats')
      .select('id, nom, prenom, commune_nom')
      .or('nom.ilike.opposition,nom.ilike.maire,nom.ilike.sortant,nom.ilike.liste,prenom.ilike.opposition,prenom.ilike.maire,prenom.ilike.sortant,prenom.ilike.liste');

    if (countError) throw countError;

    if (fakes.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Aucun candidat factice trouvé',
        deleted: 0
      });
    }

    console.log(`📋 ${fakes.length} candidat(s) factice(s) trouvé(s)`);

    // 2. Supprimer les candidats factices
    const { error: deleteError } = await supabase
      .from('candidats')
      .delete()
      .or('nom.ilike.opposition,nom.ilike.maire,nom.ilike.sortant,nom.ilike.liste,prenom.ilike.opposition,prenom.ilike.maire,prenom.ilike.sortant,prenom.ilike.liste');

    if (deleteError) throw deleteError;

    console.log(`✅ ${fakes.length} candidat(s) factice(s) supprimé(s)`);

    // 3. Compter les candidats restants
    const { count: remaining, error: finalError } = await supabase
      .from('candidats')
      .select('*', { count: 'exact', head: true });

    if (finalError) throw finalError;

    return res.status(200).json({
      success: true,
      message: `${fakes.length} candidat(s) factice(s) supprimé(s)`,
      deleted: fakes.length,
      fakes: fakes.map(c => `${c.prenom} ${c.nom} (${c.commune_nom})`),
      remaining: remaining
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
