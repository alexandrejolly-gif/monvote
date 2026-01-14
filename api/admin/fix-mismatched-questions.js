import { supabase } from '../../lib/supabase.js';
import { getCommuneByCode } from '../../lib/communes-rennes.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    console.log('🔍 Détection des questions mal associées...\n');

    // 1. Récupérer toutes les questions générées
    const { data: allQuestions, error } = await supabase
      .from('generated_questions')
      .select('id, commune_code, commune_nom, generated_at')
      .order('commune_code');

    if (error) throw error;

    // 2. Vérifier chaque commune
    const mismatches = [];

    for (const q of allQuestions) {
      // Récupérer la bonne commune depuis Supabase
      const { data: commune } = await supabase
        .from('communes')
        .select('code_insee, nom')
        .eq('code_insee', q.commune_code)
        .single();

      const expectedName = commune ? commune.nom : getCommuneByCode(q.commune_code)?.nom;

      if (expectedName && expectedName !== q.commune_nom) {
        mismatches.push({
          id: q.id,
          commune_code: q.commune_code,
          stored_name: q.commune_nom,
          expected_name: expectedName,
          generated_at: q.generated_at
        });
      }
    }

    console.log(`📊 ${mismatches.length} questions mal associées détectées\n`);

    if (mismatches.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Aucune question mal associée',
        mismatches: []
      });
    }

    // 3. Option: supprimer les questions mal associées
    const { fix } = req.query;

    if (fix === 'true') {
      console.log('🗑️  Suppression des questions mal associées...');

      const idsToDelete = mismatches.map(m => m.id);
      const { error: deleteError } = await supabase
        .from('generated_questions')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;

      console.log(`✅ ${mismatches.length} questions supprimées`);

      return res.status(200).json({
        success: true,
        message: `${mismatches.length} questions mal associées supprimées`,
        deleted: mismatches
      });
    }

    // Sinon, juste lister
    return res.status(200).json({
      success: true,
      message: `${mismatches.length} questions mal associées détectées`,
      mismatches,
      info: 'Ajoutez ?fix=true pour les supprimer'
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
