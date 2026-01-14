import { supabase } from '../lib/supabase.js';
import { analyzeTract, validateTract } from '../lib/claude-vision.js';
import { checkRateLimit, extractIP, extractFingerprint } from '../lib/security.js';
import { computeImageHash, checkDuplicate, validateImage } from '../lib/validation.js';
import { getCommuneByCode } from '../lib/communes-rennes.js';

const AUTO_VALIDATION_THRESHOLD = parseFloat(process.env.AUTO_VALIDATION_THRESHOLD) || 0.90;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image_base64, commune_code, email } = req.body;

  // Validation des inputs
  if (!image_base64 || !commune_code) {
    return res.status(400).json({
      success: false,
      error: 'image_base64 et commune_code requis'
    });
  }

  // Vérifier que la commune existe (d'abord Supabase, puis données statiques)
  let commune = null;

  try {
    // Essayer Supabase d'abord
    const { data: communeDB, error: communeError } = await supabase
      .from('communes')
      .select('code_insee, nom, population')
      .eq('code_insee', commune_code)
      .single();

    if (communeDB && !communeError) {
      commune = {
        code: communeDB.code_insee,
        nom: communeDB.nom,
        population: communeDB.population
      };
    } else {
      // Fallback sur données statiques
      commune = getCommuneByCode(commune_code);
    }

    if (!commune) {
      return res.status(400).json({
        success: false,
        error: 'Commune non trouvée'
      });
    }
  } catch (verifyError) {
    console.error('Erreur vérification commune:', verifyError);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification de la commune'
    });
  }

  // Valider le format de l'image
  const imageValidation = validateImage(image_base64);
  if (!imageValidation.valid) {
    return res.status(400).json({
      success: false,
      error: imageValidation.error
    });
  }

  // Récupérer l'IP et le fingerprint
  const ip = extractIP(req);
  const fingerprint = extractFingerprint(req);

  try {
    console.log(`📤 Upload tract pour ${commune.nom} (${commune_code})`);

    // 1. Rate limiting
    console.log('🔒 Vérification rate limit...');
    const rateLimitCheck = await checkRateLimit(supabase, {
      ip,
      fingerprint,
      commune: commune_code,
      action: 'upload_tract'
    });

    if (rateLimitCheck.blocked) {
      return res.status(429).json({
        success: false,
        error: 'Limite d\'envoi atteinte',
        message: rateLimitCheck.reason,
        retry_after: rateLimitCheck.retry_after
      });
    }

    // 2. Vérification doublon
    console.log('🔍 Vérification doublon...');
    const imageHash = await computeImageHash(image_base64);
    const isDuplicate = await checkDuplicate(imageHash);
    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        error: 'Ce document a déjà été soumis.'
      });
    }

    // 3. Upload image vers Supabase Storage
    console.log('☁️  Upload vers Supabase Storage...');
    const fileName = `tracts/${commune_code}/${Date.now()}_${imageHash.substring(0, 8)}.jpg`;
    const cleanBase64 = image_base64.replace(/^data:image\/\w+;base64,/, '');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(fileName, Buffer.from(cleanBase64, 'base64'), {
        contentType: 'image/jpeg'
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'upload de l\'image',
        details: uploadError.message,
        code: 'STORAGE_UPLOAD_ERROR'
      });
    }
    console.log('✅ Image uploadée:', fileName);

    const { data: { publicUrl } } = supabase.storage
      .from('submissions')
      .getPublicUrl(fileName);

    // 4. Analyse Claude Vision
    console.log('🤖 Analyse du tract avec Claude Vision...');
    const analysisResult = await analyzeTract(image_base64, commune.nom, commune.code);
    console.log('✅ Analyse terminée');

    // Vérifier si c'est un document électoral valide
    if (analysisResult.erreur) {
      // Sauvegarder quand même pour audit
      await supabase.from('submissions').insert({
        commune_code,
        commune_nom: commune.nom,
        submitter_ip: ip,
        submitter_email: email || null,
        image_url: publicUrl,
        image_hash: imageHash,
        analysis_result: analysisResult,
        status: 'rejected',
        rejection_reason: analysisResult.erreur,
        reviewed_by: 'auto',
        reviewed_at: new Date().toISOString()
      });

      return res.status(400).json({
        success: false,
        error: analysisResult.erreur
      });
    }

    // Vérification STRICTE : le tract doit mentionner 2026
    if (!analysisResult.mention_2026) {
      console.log('❌ Tract rejeté : ne mentionne pas 2026');
      await supabase.from('submissions').insert({
        commune_code,
        commune_nom: commune.nom,
        submitter_ip: ip,
        submitter_email: email || null,
        image_url: publicUrl,
        image_hash: imageHash,
        analysis_result: analysisResult,
        status: 'rejected',
        rejection_reason: 'Le tract doit mentionner explicitement "2026" ou "municipales 2026"',
        reviewed_by: 'auto',
        reviewed_at: new Date().toISOString()
      });

      return res.status(400).json({
        success: false,
        error: 'Ce tract ne mentionne pas les élections de 2026. Seuls les tracts pour les municipales 2026 sont acceptés.'
      });
    }

    // Vérification STRICTE : la commune doit correspondre
    if (analysisResult.commune_mentionnee &&
        analysisResult.commune_mentionnee.toLowerCase() !== commune.nom.toLowerCase()) {
      console.log(`❌ Tract rejeté : commune "${analysisResult.commune_mentionnee}" ne correspond pas à "${commune.nom}"`);
      await supabase.from('submissions').insert({
        commune_code,
        commune_nom: commune.nom,
        submitter_ip: ip,
        submitter_email: email || null,
        image_url: publicUrl,
        image_hash: imageHash,
        analysis_result: analysisResult,
        status: 'rejected',
        rejection_reason: `Commune mentionnée (${analysisResult.commune_mentionnee}) ne correspond pas à la commune sélectionnée (${commune.nom})`,
        reviewed_by: 'auto',
        reviewed_at: new Date().toISOString()
      });

      return res.status(400).json({
        success: false,
        error: `Ce tract concerne "${analysisResult.commune_mentionnee}", pas "${commune.nom}". Veuillez sélectionner la bonne commune.`
      });
    }

    // 5. Validation automatique
    console.log('✅ Validation du tract...');
    const validationResult = await validateTract(commune.nom, analysisResult, commune.code);
    console.log(`✅ Score de confiance: ${validationResult.confidence_score}`);

    // 6. Décision
    const confidenceScore = validationResult.confidence_score || 0;
    const isAutoApproved = confidenceScore >= AUTO_VALIDATION_THRESHOLD &&
                           validationResult.is_valid === true;

    const status = isAutoApproved ? 'auto_approved' : 'pending';

    // 7. Sauvegarder la soumission
    console.log('💾 Sauvegarde de la soumission...');
    const { data: submission, error: insertError } = await supabase
      .from('submissions')
      .insert({
        commune_code,
        commune_nom: commune.nom,
        submitter_ip: ip,
        submitter_email: email || null,
        image_url: publicUrl,
        image_hash: imageHash,
        analysis_result: analysisResult,
        extracted_data: (analysisResult.candidats || analysisResult.candidat) ? {
          candidats: analysisResult.candidats || (analysisResult.candidat ? [analysisResult.candidat] : []),
          tete_de_liste: analysisResult.tete_de_liste || analysisResult.candidat,
          propositions: analysisResult.propositions,
          slogan: analysisResult.slogan,
          contact: analysisResult.contact
        } : null,
        confidence_score: confidenceScore,
        status,
        validation_details: validationResult,
        reviewed_by: isAutoApproved ? 'auto' : null,
        reviewed_at: isAutoApproved ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la sauvegarde',
        details: insertError.message,
        code: 'DATABASE_INSERT_ERROR'
      });
    }
    console.log('✅ Soumission sauvegardée');

    // 8. Si auto-approuvé, ajouter tous les candidats
    if (isAutoApproved) {
      const candidatsToInsert = analysisResult.candidats || (analysisResult.candidat ? [analysisResult.candidat] : []);

      if (candidatsToInsert.length > 0) {
        const candidatsData = candidatsToInsert.map(cand => ({
          commune_code,
          commune_nom: commune.nom,
          nom: cand.nom,
          prenom: cand.prenom || null,
          // Utiliser le parti/liste individuel du candidat, sinon fallback sur le parti/liste commun
          parti: cand.parti || analysisResult.parti || null,
          liste: cand.liste || analysisResult.liste || null,
          propositions: analysisResult.propositions || [],
          source_type: 'tract_auto',
          submission_id: submission.id,
          updated_at: new Date().toISOString()
        }));

        await supabase.from('candidats').upsert(candidatsData, {
          onConflict: 'commune_code,nom'
        });

        console.log(`✅ ${candidatsData.length} candidat(s) ajouté(s) automatiquement`);
      }
    }

    // 9. Réponse (rate limit déjà incrémenté automatiquement par checkRateLimit)
    return res.status(200).json({
      success: true,
      submission_id: submission.id,
      status: status,
      status_message: isAutoApproved
        ? 'Votre contribution a été validée automatiquement. Merci !'
        : 'Votre contribution est en attente de validation. Merci !',
      extracted_data: (analysisResult.candidats || analysisResult.candidat) ? {
        candidats: analysisResult.candidats || (analysisResult.candidat ? [analysisResult.candidat] : []),
        nombre_candidats: (analysisResult.candidats || [analysisResult.candidat]).length,
        propositions: analysisResult.propositions
      } : null,
      confidence_score: confidenceScore
    });

  } catch (error) {
    console.error('❌ Erreur upload tract:', error);

    // Déterminer le type d'erreur pour un message plus clair
    let errorMessage = 'Erreur lors du traitement';
    let errorCode = 'UNKNOWN_ERROR';

    if (error.message?.includes('ANTHROPIC_API_KEY')) {
      errorMessage = 'Configuration API manquante';
      errorCode = 'API_CONFIG_ERROR';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Erreur d\'authentification API';
      errorCode = 'API_AUTH_ERROR';
    } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      errorMessage = 'Délai d\'attente dépassé. Réessayez.';
      errorCode = 'TIMEOUT_ERROR';
    } else if (error.message?.includes('storage') || error.message?.includes('bucket')) {
      errorMessage = 'Erreur de stockage';
      errorCode = 'STORAGE_ERROR';
    } else if (error.message?.includes('rate_limits')) {
      errorMessage = 'Tables de rate limiting manquantes';
      errorCode = 'RATE_LIMIT_TABLE_ERROR';
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
      code: errorCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Augmenter la limite de taille du body pour les images
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};
