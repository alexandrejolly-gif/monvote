// Endpoint de test pour simuler un upload de tract sans appeler l'API Claude Vision
import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🧪 TEST UPLOAD - Début du traitement');
  const { commune_code, scenario } = req.body;
  console.log(`   Commune: ${commune_code}, Scénario: ${scenario}`);

  // Scénarios de test mockés
  const scenarios = {
    // Tract avec 4 candidats - Vitré (liste unique)
    'liste_4_candidats': {
      candidats: [
        { nom: 'DUPONT', prenom: 'Jean', fonction_actuelle: 'Maire sortant', position: 1, parti: 'Divers Gauche', liste: 'Ensemble pour Vitré' },
        { nom: 'MARTIN', prenom: 'Marie', fonction_actuelle: null, position: 2, parti: 'Divers Gauche', liste: 'Ensemble pour Vitré' },
        { nom: 'DURAND', prenom: 'Pierre', fonction_actuelle: 'Adjoint', position: 3, parti: 'Divers Gauche', liste: 'Ensemble pour Vitré' },
        { nom: 'BERNARD', prenom: 'Sophie', fonction_actuelle: null, position: 4, parti: 'Divers Gauche', liste: 'Ensemble pour Vitré' }
      ],
      tete_de_liste: { nom: 'DUPONT', prenom: 'Jean' },
      liste: 'Ensemble pour Vitré',
      parti: 'Divers Gauche',
      commune_mentionnee: 'Vitré',
      departement_mentionne: 'Ille-et-Vilaine',
      code_postal_mentionne: '35500',
      annee_mentionnee: '2026',
      mention_2026: true,
      propositions: [
        'Créer une maison de santé pluridisciplinaire',
        'Développer les pistes cyclables',
        'Rénover l\'école primaire',
        'Soutenir le commerce local'
      ],
      slogan: 'L\'avenir ensemble',
      contact: {
        site_web: 'https://ensemble-vitre.fr',
        email: 'contact@ensemble-vitre.fr',
        facebook: null,
        twitter: null
      },
      fiabilite_extraction: 'haute'
    },

    // Tract individuel - 1 candidat
    'candidat_individuel': {
      candidats: [
        { nom: 'LEFEVRE', prenom: 'Antoine', fonction_actuelle: null, position: 1, parti: 'Liste citoyenne', liste: 'Renouveau pour Vitré' }
      ],
      tete_de_liste: { nom: 'LEFEVRE', prenom: 'Antoine' },
      liste: 'Renouveau pour Vitré',
      parti: 'Liste citoyenne',
      commune_mentionnee: 'Vitré',
      departement_mentionne: '35',
      code_postal_mentionne: null,
      annee_mentionnee: '2026',
      mention_2026: true,
      propositions: [
        'Transparence de la gestion municipale',
        'Budget participatif citoyen'
      ],
      slogan: 'Une nouvelle ère',
      contact: { site_web: null, email: null, facebook: null, twitter: null },
      fiabilite_extraction: 'haute'
    },

    // Tract sans mention 2026 (devrait être rejeté)
    'sans_2026': {
      candidats: [
        { nom: 'ROBERT', prenom: 'Paul', fonction_actuelle: null, position: 1 }
      ],
      tete_de_liste: { nom: 'ROBERT', prenom: 'Paul' },
      liste: 'Vitré Avenir',
      parti: null,
      commune_mentionnee: 'Vitré',
      departement_mentionne: 'Ille-et-Vilaine',
      code_postal_mentionne: null,
      annee_mentionnee: null,
      mention_2026: false,
      propositions: ['Développer la ville'],
      slogan: null,
      contact: null,
      fiabilite_extraction: 'moyenne'
    },

    // Tract mauvaise commune
    'mauvaise_commune': {
      candidats: [
        { nom: 'DUBOIS', prenom: 'Claire', fonction_actuelle: null, position: 1, parti: null, liste: 'Pour Rennes' }
      ],
      tete_de_liste: { nom: 'DUBOIS', prenom: 'Claire' },
      liste: 'Pour Rennes',
      parti: null,
      commune_mentionnee: 'Rennes',
      departement_mentionne: 'Ille-et-Vilaine',
      code_postal_mentionne: '35000',
      annee_mentionnee: '2026',
      mention_2026: true,
      propositions: ['Rénover Rennes'],
      slogan: null,
      contact: null,
      fiabilite_extraction: 'haute'
    },

    // Tract comparatif - 4 candidats de partis différents
    'tract_comparatif': {
      candidats: [
        { nom: 'DUBOIS', prenom: 'Marie-Claire', fonction_actuelle: 'Maire sortant', position: 1, parti: 'Divers Droite', liste: 'Vitré Demain' },
        { nom: 'MARTIN', prenom: 'Jean-François', fonction_actuelle: null, position: 2, parti: 'Divers Gauche', liste: 'Vivre à Vitré' },
        { nom: 'LEGRAND', prenom: 'Sophie', fonction_actuelle: null, position: 3, parti: 'EELV', liste: 'Vitré Écologie' },
        { nom: 'RENAUD', prenom: 'Philippe', fonction_actuelle: null, position: 4, parti: 'Rassemblement National', liste: 'Vitré Français' }
      ],
      tete_de_liste: { nom: 'DUBOIS', prenom: 'Marie-Claire' },
      liste: null, // Pas de liste commune - c'est un comparatif
      parti: null, // Pas de parti commun - chacun a le sien
      commune_mentionnee: 'Vitré',
      departement_mentionne: '35',
      code_postal_mentionne: null,
      annee_mentionnee: '2026',
      mention_2026: true,
      propositions: [
        'Rénover le centre-ville',
        'Créer des pistes cyclables',
        'Développer les transports en commun',
        'Soutenir les commerces locaux'
      ],
      slogan: null,
      contact: { site_web: 'www.vitre.bzh/elections2026', email: null, facebook: null, twitter: null },
      fiabilite_extraction: 'haute'
    }
  };

  const testScenario = scenario || 'liste_4_candidats';
  const mockAnalysisResult = scenarios[testScenario];

  if (!mockAnalysisResult) {
    return res.status(400).json({
      error: 'Scénario invalide',
      scenarios_disponibles: Object.keys(scenarios)
    });
  }

  // Validation mockée
  const mockValidationResult = {
    is_valid: true,
    confidence_score: 0.92,
    needs_human_review: false,
    checks: {
      has_2026_mention: mockAnalysisResult.mention_2026,
      commune_matches: mockAnalysisResult.commune_mentionnee?.toLowerCase() === 'vitré',
      has_candidate_name: mockAnalysisResult.candidats.length > 0,
      has_propositions: mockAnalysisResult.propositions?.length > 0
    }
  };

  // Si pas de mention 2026, réduire le score
  if (!mockAnalysisResult.mention_2026) {
    mockValidationResult.confidence_score = 0.2;
    mockValidationResult.needs_human_review = true;
  }

  // Si mauvaise commune, réduire le score
  if (mockAnalysisResult.commune_mentionnee?.toLowerCase() !== 'vitré') {
    mockValidationResult.confidence_score = 0.3;
    mockValidationResult.needs_human_review = true;
  }

  const confidenceScore = mockValidationResult.confidence_score || 0;
  const isAutoApproved = confidenceScore >= 0.90 && mockValidationResult.is_valid === true;
  const status = isAutoApproved ? 'auto_approved' : 'pending';

  try {
    // Sauvegarder la soumission TEST
    const { data: submission, error: insertError } = await supabase
      .from('submissions')
      .insert({
        commune_code: commune_code || '35360',
        commune_nom: 'Vitré',
        submitter_ip: 'TEST',
        submitter_email: 'test@test.fr',
        image_url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23ddd" width="800" height="600"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="%23999"%3ETract Test%3C/text%3E%3C/svg%3E',
        image_hash: `test_${Date.now()}`,
        analysis_result: mockAnalysisResult,
        extracted_data: {
          candidats: mockAnalysisResult.candidats,
          tete_de_liste: mockAnalysisResult.tete_de_liste,
          propositions: mockAnalysisResult.propositions,
          slogan: mockAnalysisResult.slogan,
          contact: mockAnalysisResult.contact
        },
        confidence_score: confidenceScore,
        status,
        validation_details: mockValidationResult,
        reviewed_by: isAutoApproved ? 'auto' : null,
        reviewed_at: isAutoApproved ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Si auto-approuvé, ajouter les candidats
    if (isAutoApproved && mockAnalysisResult.candidats) {
      const candidatsData = mockAnalysisResult.candidats.map(cand => ({
        commune_code: commune_code || '35360',
        commune_nom: 'Vitré',
        nom: cand.nom,
        prenom: cand.prenom || null,
        // Utiliser le parti/liste individuel du candidat, sinon fallback sur le parti/liste commun
        parti: cand.parti || mockAnalysisResult.parti || null,
        liste: cand.liste || mockAnalysisResult.liste || null,
        propositions: mockAnalysisResult.propositions || [],
        source_type: 'tract_test',
        submission_id: submission.id,
        updated_at: new Date().toISOString()
      }));

      await supabase.from('candidats').upsert(candidatsData, {
        onConflict: 'commune_code,nom'
      });
    }

    const response = {
      success: true,
      test_mode: true,
      scenario: testScenario,
      submission_id: submission.id,
      status,
      candidats_extraits: mockAnalysisResult.candidats.length,
      confidence_score: confidenceScore,
      auto_approved: isAutoApproved
    };

    console.log('✅ TEST UPLOAD - Succès:', response);
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ TEST UPLOAD - Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
