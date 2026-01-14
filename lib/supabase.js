import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions pour les opérations courantes

export async function getCandidats(communeCode) {
  const { data, error } = await supabase
    .from('candidats')
    .select('*')
    .eq('commune_code', communeCode);

  if (error) throw error;
  return data;
}

export async function getQuestions(communeCode) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('commune_code', communeCode)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function saveQuestions(communeCode, communeNom, questions) {
  const { data, error } = await supabase
    .from('questions')
    .upsert({
      commune_code: communeCode,
      commune_nom: communeNom,
      questions,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'commune_code'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveCandidats(candidats) {
  const { data, error } = await supabase
    .from('candidats')
    .upsert(candidats, {
      onConflict: 'commune_code,nom'
    })
    .select();

  if (error) throw error;
  return data;
}

export async function saveSession(communeCode, responses, results) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      commune_code: communeCode,
      responses,
      results
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCandidatPositions(candidatId, positions) {
  const { data, error } = await supabase
    .from('candidats')
    .update({
      positions: positions,
      updated_at: new Date().toISOString()
    })
    .eq('id', candidatId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCandidatProgramme(candidatId, propositions) {
  const { data, error } = await supabase
    .from('candidats')
    .update({
      propositions: propositions,
      updated_at: new Date().toISOString()
    })
    .eq('id', candidatId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getApprovedSubmissions(communeCode) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('commune_code', communeCode)
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
