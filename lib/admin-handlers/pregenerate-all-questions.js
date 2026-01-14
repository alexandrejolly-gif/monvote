import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { start } = req.query;

  if (start !== 'true') {
    return res.status(200).json({
      success: true,
      message: 'Ajoutez ?start=true pour lancer la pré-génération de toutes les communes',
      info: 'Cela prendra environ 10-15 minutes pour 44 communes'
    });
  }

  try {
    console.log('🚀 Pré-génération de toutes les questions...\n');

    // Récupérer toutes les communes
    const { data: allCommunes, error: communesError } = await supabase
      .from('communes')
      .select('code_insee, nom')
      .order('nom');

    if (communesError) throw communesError;

    console.log(`📋 ${allCommunes.length} communes à traiter\n`);

    const results = {
      success: [],
      skipped: [],
      failed: []
    };

    // Traiter chaque commune séquentiellement (éviter trop de requêtes parallèles)
    for (const commune of allCommunes) {
      try {
        console.log(`\n▶️  ${commune.nom} (${commune.code_insee})...`);

        // Vérifier si déjà généré
        const { data: existing } = await supabase
          .from('generated_questions')
          .select('id')
          .eq('commune_code', commune.code_insee)
          .single();

        if (existing) {
          console.log(`   ⏭️  Déjà généré, skip`);
          results.skipped.push(commune.nom);
          continue;
        }

        // Vérifier le nombre de candidats
        const { count: candidatsCount } = await supabase
          .from('candidats')
          .select('*', { count: 'exact', head: true })
          .eq('commune_code', commune.code_insee);

        // Si 0 candidat, déclencher la création de candidats génériques
        if (candidatsCount === 0) {
          console.log(`   🔍 0 candidat détecté, création candidats génériques...`);

          try {
            const candidatsResponse = await fetch(`http://localhost:3000/api/get-candidats?code=${commune.code_insee}`);
            const candidatsData = await candidatsResponse.json();

            if (candidatsData.success && candidatsData.candidats?.length > 0) {
              console.log(`   ✅ ${candidatsData.candidats.length} candidats génériques créés`);
            } else {
              console.log(`   ⚠️  Aucun maire trouvé, génération en mode dégradé`);
            }
          } catch (candidatsError) {
            console.error(`   ⚠️  Erreur création candidats: ${candidatsError.message}`);
            // Continuer quand même (génération en mode dégradé)
          }

          // Attendre 1s pour laisser le temps aux candidats d'être sauvegardés
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Appeler l'API de génération des questions
        const response = await fetch(`http://localhost:3000/api/get-questions?code=${commune.code_insee}`);
        const data = await response.json();

        if (data.success) {
          console.log(`   ✅ Succès`);
          results.success.push(commune.nom);
        } else {
          console.log(`   ❌ Échec: ${data.error}`);
          results.failed.push({ nom: commune.nom, error: data.error });
        }

        // Attendre 2s entre chaque génération pour ne pas surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`   ❌ Erreur: ${error.message}`);
        results.failed.push({ nom: commune.nom, error: error.message });
      }
    }

    console.log('\n\n📊 RÉSULTATS:');
    console.log(`  ✅ Générées: ${results.success.length}`);
    console.log(`  ⏭️  Skipped: ${results.skipped.length}`);
    console.log(`  ❌ Échecs: ${results.failed.length}`);

    return res.status(200).json({
      success: true,
      message: 'Pré-génération terminée',
      results
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
