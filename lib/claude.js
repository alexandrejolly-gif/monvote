import Anthropic from '@anthropic-ai/sdk';
import { getCommuneFullContext } from './commune-utils.js';

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

export const anthropic = new Anthropic({ apiKey });

// ============================================
// CONFIGURATION DES MODÈLES ET TOKENS
// ============================================
const MODELS = {
  SONNET: 'claude-sonnet-4-20250514',
  HAIKU: 'claude-haiku-4-20250514'
};

const TASK_CONFIG = {
  searchCandidats: { model: MODELS.SONNET, maxTokens: 1024 },
  searchMaire: { model: MODELS.SONNET, maxTokens: 512 },
  searchProgramme: { model: MODELS.SONNET, maxTokens: 1024 },
  generateQuestions: { model: MODELS.SONNET, maxTokens: 2048 },
  positionCandidat: { model: MODELS.HAIKU, maxTokens: 512 },
  analyseTract: { model: MODELS.SONNET, maxTokens: 1024 },
  validationTract: { model: MODELS.HAIKU, maxTokens: 1024 }
};

// Fonction helper pour les requêtes texte simples
export async function callClaude(prompt, options = {}) {
  const {
    model = MODELS.SONNET,
    maxTokens = 2048,
    system = null,
    temperature = 1.0
  } = options;

  const params = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{
      role: 'user',
      content: prompt
    }]
  };

  if (system) {
    params.system = system;
  }

  const response = await anthropic.messages.create(params);

  return response.content.find(c => c.type === 'text')?.text;
}

// Fonction pour rechercher des candidats avec web_search
export async function searchCandidats(communeNom, communeCode = null) {
  const { PROMPT_RECHERCHE_CANDIDATS } = await import('./prompts.js');

  // Extraire le contexte complet si on a le code INSEE
  let context;
  if (communeCode) {
    context = getCommuneFullContext(communeNom, communeCode);
  }

  const config = TASK_CONFIG.searchCandidats;
  const response = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    messages: [{
      role: 'user',
      content: context ?
        PROMPT_RECHERCHE_CANDIDATS(context.nom, context.dept, context.codeInsee) :
        PROMPT_RECHERCHE_CANDIDATS(communeNom)
    }],
    tools: [{
      type: 'web_search_20250305',
      name: 'web_search'
    }]
  });

  // Debug: log response structure
  console.log('Response content blocks:', response.content.map(c => ({ type: c.type, preview: c.text?.substring(0, 50) })));

  // Extraire et concaténer TOUS les blocks de texte
  const textBlocks = response.content.filter(c => c.type === 'text');
  const textContent = textBlocks.map(b => b.text).join('');

  if (!textContent) {
    console.error('No text content in Claude response');
    return { candidats: [], annee: null, note: 'Pas de contenu texte dans la réponse' };
  }

  // Helper function to extract JSON from markdown code blocks
  function extractJSON(text) {
    // Try to find JSON in markdown code blocks
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }

    // Try to find JSON in generic code blocks
    const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Return as-is if no code blocks found
    return text.trim();
  }

  try {
    const jsonText = extractJSON(textContent);
    console.log('Extracted JSON preview:', jsonText.substring(0, 100));
    return JSON.parse(jsonText);
  } catch (e) {
    console.error('Error parsing Claude response:', e);
    console.error('Raw text content preview:', textContent.substring(0, 200));
    return { candidats: [], annee: null, note: 'Erreur de parsing' };
  }
}

// Fonction pour rechercher le maire actuel avec web_search
export async function searchMaire(communeNom, communeCode = null) {
  const { PROMPT_RECHERCHE_MAIRE } = await import('./prompts.js');

  // Extraire le contexte complet si on a le code INSEE
  let context;
  if (communeCode) {
    context = getCommuneFullContext(communeNom, communeCode);
  }

  const config = TASK_CONFIG.searchMaire;
  const response = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    messages: [{
      role: 'user',
      content: context ?
        PROMPT_RECHERCHE_MAIRE(context.nom, context.dept, context.codeInsee) :
        PROMPT_RECHERCHE_MAIRE(communeNom)
    }],
    tools: [{
      type: 'web_search_20250305',
      name: 'web_search'
    }]
  });

  // Extraire et concaténer TOUS les blocks de texte
  const textBlocks = response.content.filter(c => c.type === 'text');
  const textContent = textBlocks.map(b => b.text).join('');

  if (!textContent) {
    console.error('No text content in maire search response');
    return { maire: null, note: 'Pas de contenu texte dans la réponse' };
  }

  try {
    const jsonText = extractJSON(textContent);
    console.log('📍 Maire search result preview:', jsonText.substring(0, 100));
    return JSON.parse(jsonText);
  } catch (e) {
    console.error('Error parsing maire search response:', e);
    console.error('Raw text content preview:', textContent.substring(0, 200));
    return { maire: null, note: 'Erreur de parsing' };
  }
}

// Fonction pour rechercher le programme d'un candidat avec web_search
export async function searchProgramme(candidat, communeNom, communeCode = null) {
  const { PROMPT_RECHERCHE_PROGRAMME } = await import('./prompts.js');

  // Extraire le contexte complet si on a le code INSEE
  let context;
  if (communeCode) {
    context = getCommuneFullContext(communeNom, communeCode);
  }

  const config = TASK_CONFIG.searchProgramme;
  const response = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    messages: [{
      role: 'user',
      content: context ?
        PROMPT_RECHERCHE_PROGRAMME(candidat, context.nom, context.dept, context.codeInsee) :
        PROMPT_RECHERCHE_PROGRAMME(candidat, communeNom)
    }],
    tools: [{
      type: 'web_search_20250305',
      name: 'web_search'
    }]
  });

  // Extraire et concaténer TOUS les blocks de texte
  const textBlocks = response.content.filter(c => c.type === 'text');
  const textContent = textBlocks.map(b => b.text).join('');

  if (!textContent) {
    console.error('No text content in programme search response');
    return { propositions: [], note: 'Pas de contenu texte dans la réponse' };
  }

  try {
    const jsonText = extractJSON(textContent);
    console.log(`💡 Programme search result for ${candidat.nom}:`, jsonText.substring(0, 100));
    return JSON.parse(jsonText);
  } catch (e) {
    console.error(`Error parsing programme search for ${candidat.nom}:`, e);
    console.error('Raw text content preview:', textContent.substring(0, 200));
    return { propositions: [], note: 'Erreur de parsing' };
  }
}

// Helper function to extract JSON from markdown code blocks (reusable)
function extractJSON(text) {
  // Try to find JSON in markdown code blocks
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }

  // Try to find JSON in generic code blocks
  const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Return as-is if no code blocks found
  return text.trim();
}

// Fonction pour générer des questions
export async function generateQuestions(commune, candidats = []) {
  const { PROMPT_GENERER_QUESTIONS } = await import('./prompts.js');

  // Lire la config depuis .env
  const count = parseInt(process.env.QUESTIONS_COUNT) || 10;
  const minOptions = parseInt(process.env.QUESTIONS_MIN_OPTIONS) || 3;
  const maxOptions = parseInt(process.env.QUESTIONS_MAX_OPTIONS) || 5;

  const config = TASK_CONFIG.generateQuestions;
  const response = await callClaude(
    PROMPT_GENERER_QUESTIONS(commune, candidats, count, minOptions, maxOptions),
    { model: config.model, maxTokens: config.maxTokens }
  );

  try {
    const jsonText = extractJSON(response);
    return JSON.parse(jsonText);
  } catch (e) {
    console.error('Error parsing questions:', e);
    console.error('Response was:', response);
    throw new Error('Failed to generate questions');
  }
}

// Fonction pour positionner un candidat
export async function positionCandidat(candidat, questions) {
  const { PROMPT_POSITIONNER_CANDIDAT } = await import('./prompts.js');

  const config = TASK_CONFIG.positionCandidat;
  const response = await callClaude(
    PROMPT_POSITIONNER_CANDIDAT(candidat, questions),
    { model: config.model, maxTokens: config.maxTokens }
  );

  try {
    const jsonText = extractJSON(response);
    const parsed = JSON.parse(jsonText);

    // Si le JSON a une clé "positions", l'extraire
    if (parsed.positions) {
      console.log(`📊 Extracted ${Object.keys(parsed.positions).length} positions for ${candidat.nom}`);
      return parsed.positions;
    }

    // Sinon, retourner tel quel (format direct)
    console.log(`📊 Extracted ${Object.keys(parsed).length} positions for ${candidat.nom}`);
    return parsed;
  } catch (e) {
    console.error('Error parsing positions:', e);
    console.error('Response was:', response.substring(0, 500));
    return null;
  }
}
