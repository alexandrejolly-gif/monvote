import { supabase } from '../../lib/supabase.js';
import { verifyAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = verifyAdmin(req);
  if (!auth.valid) {
    return res.status(401).json({ success: false, error: auth.error });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    submission_id,
    action,              // "approve" ou "reject"
    rejection_reason,    // Si reject
    modified_data,       // Données modifiées par l'admin
    admin_notes
  } = req.body;

  if (!submission_id || !action) {
    return res.status(400).json({
      success: false,
      error: 'submission_id et action requis'
    });
  }

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({
      success: false,
      error: 'action doit être "approve" ou "reject"'
    });
  }

  try {
    // Récupérer la soumission
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({
        success: false,
        error: 'Soumission non trouvée'
      });
    }

    if (action === 'approve') {
      // Mettre à jour la soumission
      await supabase
        .from('submissions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin',
          admin_notes,
          extracted_data: modified_data || submission.extracted_data
        })
        .eq('id', submission_id);

      // Ajouter/mettre à jour le candidat
      const candidatData = modified_data?.candidat || submission.extracted_data?.candidat;

      if (candidatData) {
        await supabase.from('candidats').upsert({
          commune_code: submission.commune_code,
          commune_nom: submission.commune_nom,
          nom: candidatData.nom,
          prenom: candidatData.prenom || null,
          parti: candidatData.parti || null,
          liste: candidatData.liste || null,
          propositions: modified_data?.propositions || submission.extracted_data?.propositions || [],
          source_type: 'tract_manual',
          submission_id: submission.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'commune_code,nom'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Soumission approuvée et candidat ajouté',
        commune_code: submission.commune_code,
        commune_nom: submission.commune_nom,
        should_prompt_update: true  // Signal pour afficher le prompt de mise à jour
      });

    } else {
      // Rejeter
      await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          rejection_reason: rejection_reason || 'Rejeté par l\'administrateur',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin',
          admin_notes
        })
        .eq('id', submission_id);

      return res.status(200).json({
        success: true,
        message: 'Soumission rejetée'
      });
    }

  } catch (error) {
    console.error('Erreur validation:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la validation'
    });
  }
}
