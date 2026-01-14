import sharp from 'sharp';
import crypto from 'crypto';
import { supabase } from './supabase.js';

// Calculer un hash perceptuel de l'image pour détecter les doublons
export async function computeImageHash(imageBase64) {
  try {
    // Retirer le préfixe data:image/...;base64, si présent
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Redimensionner l'image à 8x8 pixels en niveaux de gris
    // Cela créé une "empreinte" de l'image résistante aux modifications mineures
    const resized = await sharp(buffer)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // Calculer la moyenne des pixels
    const pixels = Array.from(resized);
    const average = pixels.reduce((a, b) => a + b, 0) / pixels.length;

    // Créer un hash basé sur les pixels au-dessus/en-dessous de la moyenne
    let hash = '';
    for (const pixel of pixels) {
      hash += pixel >= average ? '1' : '0';
    }

    // Convertir en hexadécimal
    const hashValue = parseInt(hash, 2).toString(16).padStart(16, '0');

    return hashValue;
  } catch (error) {
    console.error('Error computing image hash:', error);
    // Fallback : hash MD5 simple
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    return crypto.createHash('md5').update(cleanBase64).digest('hex');
  }
}

// Vérifier si un hash existe déjà dans la base
export async function checkDuplicate(imageHash) {
  const { data, error } = await supabase
    .from('submissions')
    .select('id')
    .eq('image_hash', imageHash)
    .limit(1);

  if (error) {
    console.error('Error checking duplicate:', error);
    return false;
  }

  return data && data.length > 0;
}

// Valider le format et la taille de l'image
export function validateImage(imageBase64) {
  // Vérifier que c'est bien une chaîne base64
  if (typeof imageBase64 !== 'string') {
    return { valid: false, error: 'Format invalide' };
  }

  // Vérifier le préfixe data:image
  if (!imageBase64.startsWith('data:image/')) {
    return { valid: false, error: 'Le fichier doit être une image' };
  }

  // Calculer la taille approximative (base64 = 4/3 de la taille originale)
  const sizeInBytes = (imageBase64.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);

  // Limiter à 10 MB
  if (sizeInMB > 10) {
    return { valid: false, error: 'L\'image doit faire moins de 10 MB' };
  }

  return { valid: true };
}

// Valider les données extraites du tract
export function validateExtractedData(data) {
  const errors = [];

  if (!data.candidat) {
    errors.push('Aucun candidat identifié');
  } else {
    if (!data.candidat.nom) {
      errors.push('Nom du candidat manquant');
    }
  }

  if (!data.propositions || data.propositions.length === 0) {
    errors.push('Aucune proposition identifiée');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
