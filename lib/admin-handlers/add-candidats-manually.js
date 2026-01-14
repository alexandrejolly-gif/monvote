// API endpoint pour ajouter des candidats manuellement
import { supabase } from '../../lib/supabase.js';

const ADMIN_KEY = process.env.ADMIN_KEY || 'TonMotDePasseAdmin2026!';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key, candidats } = req.body;

  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!candidats || candidats.length === 0) {
    return res.status(400).json({ error: 'Candidats requis' });
  }

  console.log(`\n➕ AJOUT MANUEL DE ${candidats.length} CANDIDAT(S)`);
  console.log('='.repeat(70));

  const added = [];
  const errors = [];

  try {
    for (const candidat of candidats) {
      console.log(`\n📝 ${candidat.prenom || ''} ${candidat.nom} (${candidat.commune_nom})`);

      // Vérifier si le candidat existe déjà
      const { data: existing, error: checkError } = await supabase
        .from('candidats')
        .select('id')
        .eq('commune_code', candidat.commune_code)
        .eq('nom', candidat.nom)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`   ❌ Erreur vérification: ${checkError.message}`);
        errors.push({ candidat: candidat.nom, error: checkError.message });
        continue;
      }

      if (existing) {
        console.log('   ⚠️  Candidat déjà existant, ignoré');
        continue;
      }

      // Insérer le candidat
      const { data: inserted, error: insertError } = await supabase
        .from('candidats')
        .insert({
          commune_code: candidat.commune_code,
          commune_nom: candidat.commune_nom,
          nom: candidat.nom,
          prenom: candidat.prenom || null,
          parti: candidat.parti || null,
          liste: candidat.liste || null,
          maire_sortant: candidat.maire_sortant || false,
          propositions: candidat.propositions || [],
          positions: {},
          source_type: 'manual',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error(`   ❌ Erreur insertion: ${insertError.message}`);
        errors.push({ candidat: candidat.nom, error: insertError.message });
        continue;
      }

      console.log(`   ✅ Candidat ajouté (ID: ${inserted.id})`);
      added.push(inserted);
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ ${added.length} candidat(s) ajouté(s)`);
    if (errors.length > 0) {
      console.log(`❌ ${errors.length} erreur(s)`);
    }

    return res.status(200).json({
      success: true,
      added: added.length,
      errors: errors.length,
      candidats_ajoutes: added.map(c => ({ id: c.id, nom: c.nom, prenom: c.prenom })),
      erreurs: errors
    });

  } catch (error) {
    console.error('❌ Erreur globale:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
