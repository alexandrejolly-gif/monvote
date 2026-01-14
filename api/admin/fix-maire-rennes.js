// API endpoint pour corriger le maire sortant de Rennes
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

  const { key, action } = req.body;

  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('\n🔍 VÉRIFICATION MAIRE RENNES');
  console.log('='.repeat(70));

  try {
    // Récupérer tous les candidats de Rennes
    const { data: candidats, error: candidatsError } = await supabase
      .from('candidats')
      .select('*')
      .eq('commune_code', '35238')
      .order('nom', { ascending: true });

    if (candidatsError) throw candidatsError;

    console.log(`\n📊 ${candidats.length} candidats trouvés pour Rennes:`);

    candidats.forEach(c => {
      const maireBadge = c.maire_sortant ? '👔' : '  ';
      console.log(`${maireBadge} ${(c.prenom || '').padEnd(15)} ${c.nom.padEnd(20)} - ID: ${c.id}`);
    });

    const maires = candidats.filter(c => c.maire_sortant === true);
    console.log(`\n⚠️  ${maires.length} candidat(s) marqué(s) comme maire sortant`);

    if (maires.length > 1) {
      console.log('❌ PROBLÈME: Plusieurs maires sortants!');
    }

    // Si action = "fix", corriger
    if (action === 'fix') {
      console.log('\n🔧 CORRECTION EN COURS...');

      // Trouver Nathalie Appéré
      const nathalie = candidats.find(c =>
        c.nom && c.nom.toLowerCase().includes('appéré') ||
        c.nom && c.nom.toLowerCase().includes('appere')
      );

      if (!nathalie) {
        return res.status(404).json({
          success: false,
          error: 'Nathalie Appéré non trouvée',
          candidats: candidats.map(c => ({ id: c.id, nom: c.nom, prenom: c.prenom, maire_sortant: c.maire_sortant }))
        });
      }

      console.log(`✅ Nathalie Appéré trouvée: ${nathalie.prenom} ${nathalie.nom} (ID: ${nathalie.id})`);

      // Mettre tous les autres à false
      const autresCandidats = candidats.filter(c => c.id !== nathalie.id && c.maire_sortant === true);

      for (const candidat of autresCandidats) {
        console.log(`   ⚙️  Retrait maire_sortant pour: ${candidat.prenom} ${candidat.nom}`);

        const { error: updateError } = await supabase
          .from('candidats')
          .update({ maire_sortant: false })
          .eq('id', candidat.id);

        if (updateError) {
          console.error(`      ❌ Erreur: ${updateError.message}`);
        } else {
          console.log(`      ✅ Corrigé`);
        }
      }

      // S'assurer que Nathalie est bien maire_sortant
      if (!nathalie.maire_sortant) {
        console.log(`   ⚙️  Ajout maire_sortant pour: ${nathalie.prenom} ${nathalie.nom}`);

        const { error: updateError } = await supabase
          .from('candidats')
          .update({ maire_sortant: true })
          .eq('id', nathalie.id);

        if (updateError) {
          console.error(`      ❌ Erreur: ${updateError.message}`);
        } else {
          console.log(`      ✅ Corrigé`);
        }
      }

      console.log('\n✅ CORRECTION TERMINÉE');

      return res.status(200).json({
        success: true,
        message: 'Maire corrigé',
        maire: {
          id: nathalie.id,
          nom: nathalie.nom,
          prenom: nathalie.prenom
        },
        autres_corriges: autresCandidats.length
      });
    }

    return res.status(200).json({
      success: true,
      total_candidats: candidats.length,
      maires_sortants: maires.length,
      candidats: candidats.map(c => ({
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        maire_sortant: c.maire_sortant
      })),
      besoin_correction: maires.length !== 1
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
