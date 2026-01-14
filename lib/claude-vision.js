import Anthropic from '@anthropic-ai/sdk';
import { getCommuneFullContext } from './commune-utils.js';

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

export const anthropic = new Anthropic({ apiKey });

// Fonction pour analyser un tract avec Claude Vision
export async function analyzeTract(imageBase64, communeNom, communeCode = null) {
  const { PROMPT_ANALYSE_TRACT } = await import('./prompts.js');

  // Obtenir le contexte complet si on a le code INSEE
  let context;
  if (communeCode) {
    context = getCommuneFullContext(communeNom, communeCode);
  }

  // Retirer le préfixe data:image/...;base64, si présent
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: cleanBase64
          }
        },
        {
          type: 'text',
          text: context ?
            PROMPT_ANALYSE_TRACT(context.nom, context.dept, context.codeInsee) :
            PROMPT_ANALYSE_TRACT(communeNom)
        }
      ]
    }]
  });

  const analysisText = response.content.find(c => c.type === 'text')?.text;

  try {
    // Nettoyer les backticks markdown si présents
    let cleanedText = analysisText.trim();

    // Retirer les ```json et ``` si présents
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(cleanedText);
  } catch (e) {
    console.error('Error parsing tract analysis:', e);
    return {
      erreur: 'Erreur lors de l\'analyse du document',
      raw: analysisText
    };
  }
}

// Fonction pour valider un tract
export async function validateTract(communeNom, analysisResult, communeCode = null) {
  const { PROMPT_VALIDATION_TRACT } = await import('./prompts.js');

  // Obtenir le contexte complet si on a le code INSEE
  let context;
  if (communeCode) {
    context = getCommuneFullContext(communeNom, communeCode);
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: context ?
        PROMPT_VALIDATION_TRACT(context.nom, analysisResult, context.dept, context.codeInsee) :
        PROMPT_VALIDATION_TRACT(communeNom, analysisResult)
    }]
  });

  const validationText = response.content.find(c => c.type === 'text')?.text;

  try {
    // Nettoyer les backticks markdown si présents
    let cleanedText = validationText.trim();

    // Retirer les ```json et ``` si présents
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(cleanedText);
  } catch (e) {
    console.error('Error parsing tract validation:', e);
    return {
      is_valid: false,
      confidence_score: 0,
      needs_human_review: true,
      review_reason: 'Erreur de parsing de la validation'
    };
  }
}
