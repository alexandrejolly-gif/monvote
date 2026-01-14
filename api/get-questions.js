import { readFile, access } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from '../lib/supabase.js';
import { generateQuestionsForCommune } from '../lib/question-generator.js';
import { getCommuneByCode } from '../lib/communes-rennes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// V5: QUESTIONS GÉNÉRÉES PAR CLAUDE
// ============================================

async function getV5Questions(supabase, commune) {
  console.log(`🔍 Recherche questions V5 pour ${commune.nom}...`);

  const { data, error } = await supabase
    .from('generated_questions')
    .select('*')
    .eq('commune_code', commune.code_insee)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Pas de questions générées
      console.log('⚠️  Aucune question V5 trouvée');
      return null;
    }
    console.error('Erreur récupération V5:', error);
    return null;
  }

  // Vérifier expiration (si TTL activé)
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    console.log('⚠️  Questions V5 expirées');
    return null;
  }

  console.log(`✅ Questions V5 trouvées (générées le ${new Date(data.generated_at).toLocaleDateString()})`);
  return data;
}

async function generateAndStoreV5Questions(supabase, commune, candidats) {
  console.log(`🚀 Génération lazy loading pour ${commune.nom}...`);

  try {
    // Générer les questions
    const result = await generateQuestionsForCommune(commune, candidats);

    // Stocker en base
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
        expires_at: null // Pas d'expiration (questions figées)
      })
      .select()
      .single();

    if (error) {
      // Si c'est une erreur de duplicate key (race condition), récupérer les questions existantes
      if (error.code === '23505') {
        console.log('⚠️  Questions déjà générées (race condition détectée), récupération...');

        // Attendre un peu que la transaction soit commitée
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Attendre 500ms
          const existing = await getV5Questions(supabase, commune);
          if (existing) {
            console.log('✅ Questions récupérées après retry');
            return existing;
          }
          console.log(`  Retry ${i + 1}/5...`);
        }

        // Si toujours pas trouvé après 5 retries, throw error
        console.error('❌ Questions non trouvées après 5 retries');
      }
      console.error('Erreur stockage V5:', error);
      throw error;
    }

    console.log('✅ Questions V5 générées et stockées');
    return data;
  } catch (error) {
    console.error('❌ Erreur génération V5:', error.message);
    throw error;
  }
}

// ============================================
// V4: QUESTIONS STATIQUES (FALLBACK)
// ============================================

// Mapping catégories → enjeux
const CATEGORIE_ENJEUX_MAP = {
  'transport': ['TRANSPORT_01', 'TRANSPORT_02', 'TRANSPORT_03'],
  'logement': ['LOGEMENT_01', 'LOGEMENT_02'],
  'environnement': ['ENVIRO_01', 'ENVIRO_02'],
  'services': ['SERVICES_01', 'SERVICES_02'],
  'services_publics': ['SERVICES_01', 'SERVICES_02'],
  'economie': ['ECO_01', 'ECO_02'],
  'securite': ['SECU_01'],
  'ecoles': ['ECOLES_01']
};

// Questions obligatoires (posées à toutes les communes)
const QUESTIONS_OBLIGATOIRES = ['FISCAL_01', 'DEMO_01', 'ENVIRO_01'];

async function getV4QuestionsFallback(commune) {
  console.log(`⚠️  Fallback vers V4 pour ${commune.nom}...`);

  // Vérifier si le fichier V4 existe
  const v4FilePath = join(__dirname, '..', '..', 'data', 'questions.json');
  try {
    await access(v4FilePath);
  } catch {
    throw new Error('Les questions V4 ne sont plus disponibles. Veuillez réessayer pour générer de nouvelles questions V5.');
  }

  // Charger la banque de questions V4
  const questionsData = JSON.parse(
    await readFile(v4FilePath, 'utf-8')
  );

  const allQuestions = questionsData.questions;
  const profil = commune.profil_commune || 'periurbain_stable';
  const enjeux = commune.enjeux_prioritaires || [];

  // Sélectionner les 15 questions
  const selectedQuestions = [];
  const usedCodes = new Set();

  // Étape 1: Ajouter les 3 questions obligatoires
  for (const code of QUESTIONS_OBLIGATOIRES) {
    const question = allQuestions.find(q => q.code === code);
    if (question && !usedCodes.has(code)) {
      selectedQuestions.push(question);
      usedCodes.add(code);
    }
  }

  // Étape 2: Ajouter jusqu'à 6 questions selon les enjeux prioritaires
  let enjeuxCount = 0;
  for (const enjeu of enjeux) {
    if (enjeuxCount >= 6) break;

    const questionCodes = CATEGORIE_ENJEUX_MAP[enjeu] || [];

    for (const code of questionCodes) {
      if (enjeuxCount >= 6) break;
      if (usedCodes.has(code)) continue;

      const question = allQuestions.find(q => q.code === code);
      if (question) {
        selectedQuestions.push(question);
        usedCodes.add(code);
        enjeuxCount++;
      }
    }
  }

  // Étape 3: Compléter à 15 avec d'autres questions variées
  const remainingQuestions = allQuestions.filter(q => !usedCodes.has(q.code));

  // Prioriser les catégories non encore représentées
  const categoriesUsed = new Set(selectedQuestions.map(q => q.categorie));
  const diversifiedQuestions = [
    ...remainingQuestions.filter(q => !categoriesUsed.has(q.categorie)),
    ...remainingQuestions.filter(q => categoriesUsed.has(q.categorie))
  ];

  for (const question of diversifiedQuestions) {
    if (selectedQuestions.length >= 15) break;
    if (!usedCodes.has(question.code)) {
      selectedQuestions.push(question);
      usedCodes.add(question.code);
    }
  }

  // Adapter le texte au profil et formater pour compatibilité frontend
  const adaptedQuestions = selectedQuestions.map((q, index) => {
    let texte;
    const profilKey = `texte_${profil}`;

    if (q[profilKey] && q[profilKey] !== null) {
      texte = q[profilKey];
    } else {
      texte = q.texte_generique;
    }

    return {
      id: index + 1,
      code: q.code,
      theme: q.theme,
      question: texte,
      reponses: q.options.map((opt, i) => ({
        id: String.fromCharCode(97 + i), // a, b, c, d, e
        texte: opt,
        position: i + 1
      })),
      ordre: index + 1
    };
  });

  console.log(`✅ ${adaptedQuestions.length} questions V4 sélectionnées (fallback)`);

  return {
    questions: adaptedQuestions,
    metadata: {
      version: 'V4',
      mode: 'fallback',
      total: adaptedQuestions.length,
      obligatoires: QUESTIONS_OBLIGATOIRES.length,
      selon_enjeux: enjeuxCount,
      autres: adaptedQuestions.length - QUESTIONS_OBLIGATOIRES.length - enjeuxCount
    }
  };
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { code: communeCode } = req.query;

  if (!communeCode) {
    return res.status(400).json({ success: false, error: 'Code commune manquant (paramètre ?code=...)' });
  }

  try {
    // 1. Récupérer la commune depuis Supabase d'abord, puis fallback sur données statiques
    let commune = null;

    // Essayer Supabase d'abord
    const { data: communeDB, error: communeError } = await supabase
      .from('communes')
      .select('code_insee, nom, population, latitude, longitude, profil_commune, enjeux_prioritaires, superficie_km2, densite_hab_km2')
      .eq('code_insee', communeCode)
      .single();

    if (communeDB && !communeError) {
      // Commune trouvée dans Supabase
      commune = {
        code_insee: communeDB.code_insee,
        nom: communeDB.nom,
        population: communeDB.population,
        profil_commune: communeDB.profil_commune || 'periurbain_stable',
        enjeux_prioritaires: communeDB.enjeux_prioritaires || [],
        superficie_km2: communeDB.superficie_km2,
        densite_hab_km2: communeDB.densite_hab_km2
      };
    } else {
      // Fallback sur les données statiques
      const communeStatic = getCommuneByCode(communeCode);

      if (!communeStatic) {
        return res.status(404).json({
          success: false,
          error: 'Commune non trouvée'
        });
      }

      commune = {
        code_insee: communeStatic.code,
        nom: communeStatic.nom,
        population: communeStatic.population,
        profil_commune: 'periurbain_stable',
        enjeux_prioritaires: [],
        superficie_km2: null,
        densite_hab_km2: null
      };
    }

    console.log(`\n📍 Requête questions pour ${commune.nom} (${commune.code_insee})`);

    // 2. Récupérer les candidats (pour V5)
    const { data: candidats } = await supabase
      .from('candidats')
      .select('id, nom, prenom, parti, liste, maire_sortant, positions, propositions')
      .eq('commune_code', communeCode);

    // 3. Stratégie V5 → V4 fallback
    let v5Data = null;
    let questionsResponse;

    try {
      // Essayer de récupérer V5
      v5Data = await getV5Questions(supabase, commune);

      if (!v5Data) {
        // Pas de questions V5 → Générer (lazy loading)
        console.log('🔄 Lazy loading activé...');
        v5Data = await generateAndStoreV5Questions(supabase, commune, candidats || []);
      }

      // Formater les questions V5 pour compatibilité frontend
      questionsResponse = {
        questions: v5Data.questions.map((q, index) => ({
          id: index + 1,
          code: q.code,
          theme: q.categorie || 'Général',
          question: q.texte,
          contexte: q.contexte,
          reponses: q.options.map((opt, i) => ({
            id: String.fromCharCode(97 + i), // a, b, c, d, e
            texte: opt,
            position: i + 1
          })),
          ordre: index + 1,
          type: q.type,
          poids: q.poids || 1.0
        })),
        metadata: {
          version: 'V5',
          mode: v5Data.generation_mode,
          generated_at: v5Data.generated_at,
          sources: v5Data.sources,
          total: v5Data.total_questions,
          types: v5Data.question_types
        }
      };

      console.log('✅ Questions V5 retournées');

    } catch (v5Error) {
      // Erreur V5 → Fallback V4
      console.error('❌ Erreur V5:', v5Error.message);
      console.log('🔄 Activation fallback V4...');

      questionsResponse = await getV4QuestionsFallback(commune);
    }

    // 4. Retourner la réponse
    res.status(200).json({
      success: true,
      commune: {
        code: commune.code_insee,
        nom: commune.nom,
        profil: commune.profil_commune || 'periurbain_stable',
        enjeux: commune.enjeux_prioritaires || []
      },
      questions: questionsResponse.questions,
      metadata: questionsResponse.metadata
    });

  } catch (error) {
    console.error('❌ Error in questions API:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des questions'
    });
  }
}
