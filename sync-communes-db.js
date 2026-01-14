// Script pour synchroniser la base de données avec le référentiel communes-rennes.js

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
async function loadEnv() {
  try {
    const envPath = join(__dirname, '.env');
    const envContent = await readFile(envPath, 'utf-8');

    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;

      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  } catch (error) {
    console.error('⚠️  No .env file found');
  }
}

await loadEnv();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function syncCommunes() {
  console.log('🔄 Synchronisation des communes avec le référentiel\n');

  // 1. Charger le référentiel
  const { COMMUNES_RENNES_METROPOLE } = await import('./lib/communes-rennes.js');

  console.log(`📋 Référentiel: ${COMMUNES_RENNES_METROPOLE.length} communes`);

  // 2. Récupérer les communes actuelles dans la DB
  const { data: dbCommunes, error } = await supabase
    .from('communes')
    .select('code_insee, nom, population, latitude, longitude');

  if (error) {
    console.error('❌ Erreur récupération DB:', error);
    return;
  }

  console.log(`💾 Base de données: ${dbCommunes.length} communes\n`);

  // 3. Identifier les différences
  const toDelete = [];
  const toUpdate = [];
  const toAdd = [];

  // Communes à supprimer (dans DB mais pas dans référentiel)
  for (const dbCommune of dbCommunes) {
    const refCommune = COMMUNES_RENNES_METROPOLE.find(c => c.code === dbCommune.code_insee);
    if (!refCommune) {
      toDelete.push(dbCommune);
    }
  }

  // Communes à ajouter ou mettre à jour
  for (const refCommune of COMMUNES_RENNES_METROPOLE) {
    const dbCommune = dbCommunes.find(c => c.code_insee === refCommune.code);

    if (!dbCommune) {
      // Pas dans la DB, à ajouter
      toAdd.push(refCommune);
    } else {
      // Dans la DB, vérifier si différente
      const needsUpdate =
        dbCommune.nom !== refCommune.nom ||
        dbCommune.population !== refCommune.population ||
        dbCommune.latitude !== refCommune.lat ||
        dbCommune.longitude !== refCommune.lng;

      if (needsUpdate) {
        toUpdate.push({ db: dbCommune, ref: refCommune });
      }
    }
  }

  console.log('📊 Analyse des différences:');
  console.log(`   ❌ À supprimer: ${toDelete.length}`);
  console.log(`   ✏️  À mettre à jour: ${toUpdate.length}`);
  console.log(`   ➕ À ajouter: ${toAdd.length}\n`);

  // 4. Afficher les détails
  if (toDelete.length > 0) {
    console.log('❌ COMMUNES À SUPPRIMER (pas dans le référentiel):');
    toDelete.forEach(c => {
      console.log(`   ${c.code_insee} - ${c.nom}`);
    });
    console.log();
  }

  if (toUpdate.length > 0) {
    console.log('✏️  COMMUNES À METTRE À JOUR:');
    toUpdate.forEach(({ db, ref }) => {
      console.log(`   ${ref.code} - ${db.nom} → ${ref.nom}`);
      if (db.population !== ref.population) {
        console.log(`      Population: ${db.population} → ${ref.population}`);
      }
      if (db.latitude !== ref.lat || db.longitude !== ref.lng) {
        console.log(`      Coordonnées: (${db.latitude}, ${db.longitude}) → (${ref.lat}, ${ref.lng})`);
      }
    });
    console.log();
  }

  if (toAdd.length > 0) {
    console.log('➕ COMMUNES À AJOUTER:');
    toAdd.forEach(c => {
      console.log(`   ${c.code} - ${c.nom}`);
    });
    console.log();
  }

  // 5. Demander confirmation
  console.log('⚠️  ATTENTION: Cette opération va modifier la base de données!');
  console.log('Voulez-vous continuer? (commentez la ligne suivante pour exécuter)\n');

  // SÉCURITÉ: Décommenter cette ligne pour exécuter les modifications
  // return;

  // 6. Exécuter les suppressions
  if (toDelete.length > 0) {
    console.log('🗑️  Suppression des communes...');
    for (const commune of toDelete) {
      const { error } = await supabase
        .from('communes')
        .delete()
        .eq('code_insee', commune.code_insee);

      if (error) {
        console.log(`   ❌ Erreur suppression ${commune.nom}:`, error.message);
      } else {
        console.log(`   ✅ ${commune.nom} supprimée`);
      }
    }
    console.log();
  }

  // 7. Exécuter les mises à jour
  if (toUpdate.length > 0) {
    console.log('✏️  Mise à jour des communes...');
    for (const { ref } of toUpdate) {
      const { error } = await supabase
        .from('communes')
        .update({
          nom: ref.nom,
          population: ref.population,
          latitude: ref.lat,
          longitude: ref.lng
        })
        .eq('code_insee', ref.code);

      if (error) {
        console.log(`   ❌ Erreur mise à jour ${ref.nom}:`, error.message);
      } else {
        console.log(`   ✅ ${ref.nom} mise à jour`);
      }
    }
    console.log();
  }

  // 8. Exécuter les ajouts
  if (toAdd.length > 0) {
    console.log('➕ Ajout des communes...');
    for (const commune of toAdd) {
      const { error } = await supabase
        .from('communes')
        .insert({
          code_insee: commune.code,
          nom: commune.nom,
          population: commune.population,
          latitude: commune.lat,
          longitude: commune.lng
        });

      if (error) {
        console.log(`   ❌ Erreur ajout ${commune.nom}:`, error.message);
      } else {
        console.log(`   ✅ ${commune.nom} ajoutée`);
      }
    }
    console.log();
  }

  console.log('✅ Synchronisation terminée!');
}

syncCommunes();
