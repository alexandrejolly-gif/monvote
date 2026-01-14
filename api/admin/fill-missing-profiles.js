import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { start, key } = req.query;

  if (key !== 'TonMotDePasseAdmin2026!') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (start !== 'true') {
    return res.status(200).json({
      success: true,
      message: 'Ajoutez ?start=true&key=ADMIN_KEY pour lancer le remplissage des profils manquants',
      info: 'Détermine automatiquement le profil et les enjeux selon la population et la densité'
    });
  }

  try {
    console.log('🚀 Remplissage des profils et enjeux manquants...\n');

    // Récupérer toutes les communes sans profil
    const { data: communes, error: communesError } = await supabase
      .from('communes')
      .select('code_insee, nom, population, densite_hab_km2, profil_commune, enjeux_prioritaires')
      .or('profil_commune.is.null,enjeux_prioritaires.is.null');

    if (communesError) throw communesError;

    console.log(`📋 ${communes.length} communes à traiter\n`);

    const results = {
      updated: [],
      skipped: [],
      failed: []
    };

    // Fonction pour déterminer le profil selon population et densité
    function determineProfile(population, densite) {
      // Urbain dense: Rennes uniquement (très grande ville)
      if (population > 100000) {
        return 'urbain_dense';
      }

      // Périurbain croissance: villes moyennes/grandes en périphérie (>8000 hab ou densité >500)
      if (population > 8000 || (densite && densite > 500)) {
        return 'periurbain_croissance';
      }

      // Périurbain stable: petites villes périurbaines (2000-8000 hab)
      if (population >= 2000 && population <= 8000) {
        return 'periurbain_stable';
      }

      // Rural proche: villages (<2000 hab)
      return 'rural_proche';
    }

    // Fonction pour déterminer les enjeux selon le profil et la population
    function determineEnjeux(profil, population) {
      switch (profil) {
        case 'urbain_dense':
          return ['transport', 'logement', 'securite'];

        case 'periurbain_croissance':
          // Grandes communes périurbaines: accent sur croissance
          if (population > 10000) {
            return ['transport', 'logement', 'services'];
          }
          // Moyennes communes: accent sur écoles
          return ['transport', 'logement', 'ecoles'];

        case 'periurbain_stable':
          // Accent sur qualité de vie
          return ['transport', 'services', 'environnement'];

        case 'rural_proche':
          // Villages: services de proximité
          return ['services', 'environnement', 'economie'];

        default:
          return ['services', 'environnement', 'transport'];
      }
    }

    // Traiter chaque commune
    for (const commune of communes) {
      try {
        console.log(`\n▶️  ${commune.nom} (${commune.code_insee})...`);
        console.log(`   Population: ${commune.population}, Densité: ${commune.densite_hab_km2 || 'N/A'}`);

        // Si profil déjà renseigné, skip
        if (commune.profil_commune && commune.enjeux_prioritaires?.length > 0) {
          console.log(`   ⏭️  Profil déjà renseigné, skip`);
          results.skipped.push(commune.nom);
          continue;
        }

        // Déterminer le profil si manquant
        const profil = commune.profil_commune || determineProfile(
          commune.population,
          commune.densite_hab_km2
        );

        // Déterminer les enjeux si manquants
        const enjeux = (commune.enjeux_prioritaires?.length > 0)
          ? commune.enjeux_prioritaires
          : determineEnjeux(profil, commune.population);

        console.log(`   📊 Profil: ${profil}`);
        console.log(`   🎯 Enjeux: ${enjeux.join(', ')}`);

        // Mettre à jour en base
        const { error: updateError } = await supabase
          .from('communes')
          .update({
            profil_commune: profil,
            enjeux_prioritaires: enjeux
          })
          .eq('code_insee', commune.code_insee);

        if (updateError) {
          console.error(`   ❌ Erreur: ${updateError.message}`);
          results.failed.push({ nom: commune.nom, error: updateError.message });
        } else {
          console.log(`   ✅ Mis à jour`);
          results.updated.push({
            nom: commune.nom,
            profil,
            enjeux
          });
        }

      } catch (error) {
        console.error(`   ❌ Erreur: ${error.message}`);
        results.failed.push({ nom: commune.nom, error: error.message });
      }
    }

    console.log('\n\n📊 RÉSULTATS:');
    console.log(`  ✅ Mis à jour: ${results.updated.length}`);
    console.log(`  ⏭️  Skipped: ${results.skipped.length}`);
    console.log(`  ❌ Échecs: ${results.failed.length}`);

    return res.status(200).json({
      success: true,
      message: 'Remplissage terminé',
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
