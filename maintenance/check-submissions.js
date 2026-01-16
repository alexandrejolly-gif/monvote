import { supabase } from './lib/supabase.js';

(async () => {
  // Get recent auto-approved submissions
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('id, commune_nom, status, analysis_result, created_at')
    .eq('status', 'auto_approved')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`\n📊 Found ${submissions.length} recent auto-approved submissions:\n`);

  submissions.forEach((sub, i) => {
    console.log(`\n━━━ Submission ${i + 1} ━━━`);
    console.log(`📍 Commune: ${sub.commune_nom}`);
    console.log(`📅 Date: ${new Date(sub.created_at).toLocaleString('fr-FR')}`);
    console.log(`\n🔍 Analysis Result:`);

    const result = sub.analysis_result;
    console.log(`  Liste: ${result.liste || 'NULL'}`);
    console.log(`  Parti: ${result.parti || 'NULL'}`);
    console.log(`  Tête de liste: ${result.tete_de_liste ? `${result.tete_de_liste.prenom} ${result.tete_de_liste.nom}` : 'NULL'}`);
    console.log(`  Candidats: ${result.candidats?.length || (result.candidat ? 1 : 0)}`);

    if (result.candidats) {
      result.candidats.forEach((c, idx) => {
        console.log(`    ${idx + 1}. ${c.prenom} ${c.nom}${c.fonction_actuelle ? ' (' + c.fonction_actuelle + ')' : ''}`);
      });
    } else if (result.candidat) {
      console.log(`    1. ${result.candidat.prenom} ${result.candidat.nom}`);
    }

    console.log(`  Propositions: ${result.propositions?.length || 0}`);
    if (result.propositions?.length > 0) {
      result.propositions.slice(0, 2).forEach((p, idx) => {
        console.log(`    ${idx + 1}. ${p.substring(0, 60)}...`);
      });
    }
  });

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Now check what's in the candidats table
  console.log(`\n📊 Checking candidats table for tract-imported entries:\n`);

  const { data: candidats, error: candError } = await supabase
    .from('candidats')
    .select('nom, prenom, commune_nom, parti, liste, propositions, source_type')
    .eq('source_type', 'tract_auto')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (candError) {
    console.error('❌ Error:', candError);
  } else {
    console.log(`Found ${candidats.length} tract-imported candidats:\n`);
    candidats.forEach((c, i) => {
      console.log(`${i + 1}. ${c.prenom} ${c.nom} (${c.commune_nom})`);
      console.log(`   Parti: ${c.parti || 'NULL'}`);
      console.log(`   Liste: ${c.liste || 'NULL'}`);
      console.log(`   Propositions: ${c.propositions?.length || 0} items`);
    });
  }

})();
