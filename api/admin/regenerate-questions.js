// Endpoint admin pour forcer la régénération des questions d'une commune
import { supabase } from '../../lib/supabase.js';
import { verifyAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier authentification admin
  if (!verifyAdmin(req)) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  const { commune_code } = req.body;

  if (!commune_code) {
    return res.status(400).json({ error: 'commune_code requis' });
  }

  try {
    console.log(`🗑️ Suppression des questions pour commune ${commune_code}...`);

    // Supprimer les questions existantes de la table generated_questions
    const { error: deleteError } = await supabase
      .from('generated_questions')
      .delete()
      .eq('commune_code', commune_code);

    if (deleteError) {
      console.error('Erreur suppression:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression des questions',
        details: deleteError.message
      });
    }

    console.log(`✅ Questions supprimées pour ${commune_code}`);
    console.log(`ℹ️  Les nouvelles questions seront générées au prochain accès (lazy loading)`);

    return res.status(200).json({
      success: true,
      message: `Questions supprimées pour la commune ${commune_code}. Elles seront régénérées au prochain accès.`,
      commune_code
    });

  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      details: error.message
    });
  }
}
