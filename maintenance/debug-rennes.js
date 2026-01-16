// Debug des candidats de Rennes
import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './lib/supabase.js';

async function debugRennes() {
  console.log('🔍 DEBUG CANDIDATS RENNES\n');
  console.log('='.repeat(70));

  // Récupérer tous les candidats de Rennes
  const { data: candidats, error } = await supabase
    .from('candidats')
    .select('*')
    .eq('commune_code', '35238')
    .order('nom');

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`\n📊 ${candidats.length} candidat(s) trouvé(s) pour Rennes\n`);

  candidats.forEach((candidat, index) => {
    console.log(`\n${index + 1}. ${candidat.nom} ${candidat.prenom || ''}`);
    console.log('-'.repeat(70));
    console.log(`   ID: ${candidat.id}`);
    console.log(`   Parti: ${candidat.parti || 'Non renseigné'}`);
    console.log(`   Liste: ${candidat.liste || 'Non renseigné'}`);
    console.log(`   Maire sortant: ${candidat.maire_sortant ? '✅ OUI' : '❌ Non'}`);
    console.log(`   Source: ${candidat.source_type}`);
    console.log(`   Propositions: ${candidat.propositions ? candidat.propositions.length : 0}`);

    if (candidat.propositions && candidat.propositions.length > 0) {
      console.log(`   Propositions détail:`);
      candidat.propositions.slice(0, 3).forEach((prop, i) => {
        console.log(`      ${i + 1}. ${prop}`);
      });
      if (candidat.propositions.length > 3) {
        console.log(`      ... et ${candidat.propositions.length - 3} autres`);
      }
    }

    console.log(`   Positions: ${candidat.positions ? Object.keys(candidat.positions).length + ' questions' : 'Aucune'}`);
    console.log(`   Créé le: ${candidat.created_at}`);
    console.log(`   Mis à jour: ${candidat.updated_at}`);
  });

  // Vérifier les tracts validés pour Rennes
  console.log('\n\n' + '='.repeat(70));
  console.log('📄 TRACTS VALIDÉS POUR RENNES');
  console.log('='.repeat(70));

  const { data: tracts, error: tractsError } = await supabase
    .from('submissions')
    .select('*')
    .eq('commune_code', '35238')
    .in('status', ['approved', 'auto_approved'])
    .order('created_at', { ascending: false });

  if (tractsError) {
    console.error('❌ Erreur tracts:', tractsError);
  } else {
    console.log(`\n✅ ${tracts.length} tract(s) validé(s)\n`);

    tracts.forEach((tract, index) => {
      console.log(`${index + 1}. Tract ID: ${tract.id}`);
      console.log(`   Status: ${tract.status}`);
      console.log(`   Candidat: ${tract.analysis_result?.candidat?.nom || 'Non identifié'}`);
      console.log(`   Propositions: ${tract.analysis_result?.propositions?.length || 0}`);
      console.log(`   Créé: ${tract.created_at}`);
      console.log('');
    });
  }

  // Chercher spécifiquement Nathalie Appéré
  console.log('\n' + '='.repeat(70));
  console.log('🔍 RECHERCHE NATHALIE APPÉRÉ');
  console.log('='.repeat(70));

  const nathalie = candidats.find(c =>
    c.nom.toLowerCase().includes('appéré') ||
    c.nom.toLowerCase().includes('appere')
  );

  if (nathalie) {
    console.log('\n✅ TROUVÉE:');
    console.log(JSON.stringify(nathalie, null, 2));
  } else {
    console.log('\n❌ Nathalie Appéré NON TROUVÉE dans la base');
  }

  // Chercher Carole Boulard
  console.log('\n' + '='.repeat(70));
  console.log('🔍 RECHERCHE CAROLE BOULARD');
  console.log('='.repeat(70));

  const carole = candidats.find(c =>
    c.nom.toLowerCase().includes('boulard')
  );

  if (carole) {
    console.log('\n✅ TROUVÉE:');
    console.log(JSON.stringify(carole, null, 2));
  } else {
    console.log('\n❌ Carole Boulard NON TROUVÉE dans la base');
  }
}

debugRennes().catch(console.error);
