import { supabase } from './supabase.js';

// Vérifier si un identifiant (IP ou commune) a dépassé sa limite
export async function checkRateLimit(identifier, type, maxCount) {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('identifier', identifier)
    .eq('identifier_type', type)
    .gte('window_start', today)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Rate limit check error:', error);
    return { allowed: true }; // Fail open en cas d'erreur
  }

  const currentCount = data?.count || 0;

  if (currentCount >= maxCount) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      allowed: false,
      current: currentCount,
      max: maxCount,
      retry_after: tomorrow.toISOString()
    };
  }

  return {
    allowed: true,
    current: currentCount,
    max: maxCount
  };
}

// Incrémenter le compteur pour un identifiant
export async function incrementRateLimit(identifier, type) {
  const today = new Date().toISOString().split('T')[0];

  // D'abord essayer de récupérer l'enregistrement existant
  const { data: existing, error: selectError } = await supabase
    .from('rate_limits')
    .select('id, count')
    .eq('identifier', identifier)
    .eq('identifier_type', type)
    .gte('window_start', today)
    .maybeSingle();

  if (selectError && selectError.code !== 'PGRST116') {
    console.error('Rate limit select error:', selectError);
    return;
  }

  if (existing) {
    // Mettre à jour le compteur
    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);

    if (updateError) {
      console.error('Rate limit update error:', updateError);
    }
  } else {
    // Créer un nouvel enregistrement
    const { error: insertError } = await supabase
      .from('rate_limits')
      .insert({
        identifier,
        identifier_type: type,
        count: 1,
        window_start: new Date(today).toISOString()
      });

    if (insertError) {
      console.error('Rate limit insert error:', insertError);
    }
  }
}

// Nettoyer les anciens enregistrements (à appeler périodiquement)
export async function cleanupOldRateLimits() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { error } = await supabase
    .from('rate_limits')
    .delete()
    .lt('window_start', sevenDaysAgo.toISOString());

  if (error) {
    console.error('Rate limit cleanup error:', error);
  }
}
