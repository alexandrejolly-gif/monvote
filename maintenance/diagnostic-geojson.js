// Script de diagnostic pour vérifier les codes communes et GeoJSON

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
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

    console.log('✅ Environment variables loaded from .env\n');
  } catch (error) {
    console.error('⚠️  No .env file found, using system environment variables');
  }
}

await loadEnv();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function diagnostic() {
  console.log('🔍 Diagnostic des codes communes et GeoJSON\n');

  // Récupérer toutes les communes
  const { data: communes, error } = await supabase
    .from('communes')
    .select('code_insee, nom, latitude, longitude')
    .order('nom');

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  console.log(`📋 ${communes.length} communes trouvées\n`);

  // Tester quelques communes problématiques
  const problematicCommunes = [
    'Châteaugiron',
    'Chevaigné',
    'Cintré',
    'Corps-Nuds',
    'Betton'
  ];

  for (const nomCommune of problematicCommunes) {
    const commune = communes.find(c => c.nom === nomCommune);

    if (!commune) {
      console.log(`❌ ${nomCommune} non trouvée dans la base`);
      continue;
    }

    console.log(`\n📍 ${commune.nom}:`);
    console.log(`   Code stocké: ${commune.code_insee}`);
    console.log(`   Lat/Lng: ${commune.latitude}, ${commune.longitude}`);

    // Tester l'API geo.gouv.fr
    try {
      const url = `https://geo.api.gouv.fr/communes/${commune.code_insee}?fields=nom,code,codesPostaux,population&format=json`;
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`   ⚠️  API retourne ${response.status}`);
        continue;
      }

      const apiData = await response.json();
      console.log(`   ✅ API retourne: "${apiData.nom}" (code: ${apiData.code})`);

      if (apiData.code !== commune.code_insee) {
        console.log(`   ⚠️  MISMATCH! Code stocké ≠ code API`);
      }
      if (apiData.nom !== commune.nom) {
        console.log(`   ⚠️  MISMATCH! Nom stocké ≠ nom API`);
      }
    } catch (err) {
      console.log(`   ❌ Erreur API: ${err.message}`);
    }

    // Petite pause pour ne pas spammer l'API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n\n📊 Liste complète des communes:\n');
  communes.forEach(c => {
    console.log(`${c.nom.padEnd(25)} | Code: ${c.code_insee}`);
  });
}

diagnostic();
