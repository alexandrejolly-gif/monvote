import { supabase } from '../../lib/supabase.js';
import { generateQuestionsForCommune } from '../../lib/question-generator.js';

// ============================================
// ENDPOINT ADMIN - GESTION DES QUESTIONS V5
// ============================================

const ADMIN_KEY = process.env.ADMIN_KEY || 'TonMotDePasseAdmin2026!';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ============================================
    // GET: Liste toutes les communes + statut
    // ============================================
    if (req.method === 'GET') {
      // Récupérer toutes les communes
      const { data: communes, error: communesError } = await supabase
        .from('communes')
        .select('id, code_insee, nom, population, profil_commune, enjeux_prioritaires')
        .order('nom');

      if (communesError) {
        return res.status(500).json({
          success: false,
          error: 'Erreur récupération communes'
        });
      }

      // Récupérer les questions générées
      const { data: generated, error: generatedError } = await supabase
        .from('generated_questions')
        .select('commune_code, generated_at, generation_mode, total_questions, sources');

      if (generatedError) {
        console.error('Erreur récupération generated_questions:', generatedError);
      }

      // Mapper les statuts
      const generatedMap = new Map(
        (generated || []).map(g => [g.commune_code, g])
      );

      const communesWithStatus = communes.map(c => ({
        code: c.code_insee,
        nom: c.nom,
        population: c.population,
        profil: c.profil_commune,
        enjeux: c.enjeux_prioritaires || [],
        status: generatedMap.has(c.code_insee) ? 'generated' : 'pending',
        generated_at: generatedMap.get(c.code_insee)?.generated_at,
        mode: generatedMap.get(c.code_insee)?.generation_mode,
        total_questions: generatedMap.get(c.code_insee)?.total_questions,
        sources: generatedMap.get(c.code_insee)?.sources
      }));

      const stats = {
        total: communesWithStatus.length,
        generated: communesWithStatus.filter(c => c.status === 'generated').length,
        pending: communesWithStatus.filter(c => c.status === 'pending').length
      };

      return res.status(200).json({
        success: true,
        communes: communesWithStatus,
        stats
      });
    }

    // ============================================
    // POST: Générer questions pour une commune
    // ============================================
    if (req.method === 'POST') {
      const { commune_code, force, key } = req.body;

      if (key !== ADMIN_KEY) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      if (!commune_code) {
        return res.status(400).json({
          success: false,
          error: 'commune_code requis'
        });
      }

      console.log(`\n🚀 Requête génération admin pour ${commune_code}`);

      // 1. Récupérer la commune
      const { data: commune, error: communeError } = await supabase
        .from('communes')
        .select('id, code_insee, nom, population, profil_commune, enjeux_prioritaires, superficie_km2, densite_hab_km2')
        .eq('code_insee', commune_code)
        .single();

      if (communeError || !commune) {
        return res.status(404).json({
          success: false,
          error: 'Commune non trouvée'
        });
      }

      // 2. Vérifier si déjà généré (si pas force)
      if (!force) {
        const { data: existing } = await supabase
          .from('generated_questions')
          .select('id')
          .eq('commune_code', commune_code)
          .limit(1)
          .single();

        if (existing) {
          return res.status(409).json({
            success: false,
            error: 'Questions déjà générées',
            message: 'Utilisez force=true pour régénérer'
          });
        }
      }

      // 3. Récupérer les candidats
      const { data: candidats } = await supabase
        .from('candidats')
        .select('id, nom, prenom, parti, liste, maire_sortant, positions, propositions')
        .eq('commune_code', commune_code);

      // 4. Générer les questions
      console.log(`📝 Génération pour ${commune.nom}...`);
      const result = await generateQuestionsForCommune(commune, candidats || []);

      // 5. Supprimer l'ancienne version si force
      if (force) {
        await supabase
          .from('generated_questions')
          .delete()
          .eq('commune_code', commune_code);
      }

      // 6. Stocker en base
      const { data, error } = await supabase
        .from('generated_questions')
        .insert({
          commune_id: commune.id,
          commune_code: commune.code_insee,
          commune_nom: commune.nom,
          questions: result.questions,
          generated_by: result.metadata.generated_by,
          generation_mode: result.metadata.generation_mode,
          sources: result.metadata.sources,
          context_data: result.metadata.context_data,
          total_questions: result.metadata.total_questions,
          question_types: result.metadata.question_types,
          version: 1,
          expires_at: null
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur stockage:', error);
        return res.status(500).json({
          success: false,
          error: 'Erreur stockage des questions'
        });
      }

      console.log('✅ Questions générées et stockées');

      return res.status(200).json({
        success: true,
        message: `Questions générées pour ${commune.nom}`,
        data: {
          commune: commune.nom,
          total_questions: result.questions.length,
          generation_mode: result.metadata.generation_mode,
          sources: result.metadata.sources,
          api_usage: result.metadata.api_usage
        }
      });
    }

    // ============================================
    // DELETE: Supprimer les questions d'une commune
    // ============================================
    if (req.method === 'DELETE') {
      const { commune_code } = req.body;

      if (!commune_code) {
        return res.status(400).json({
          success: false,
          error: 'commune_code requis'
        });
      }

      const { error } = await supabase
        .from('generated_questions')
        .delete()
        .eq('commune_code', commune_code);

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Erreur suppression'
        });
      }

      return res.status(200).json({
        success: true,
        message: `Questions supprimées pour ${commune_code}`
      });
    }

    // Méthode non supportée
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Erreur endpoint admin:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
