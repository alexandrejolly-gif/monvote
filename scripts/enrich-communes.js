import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
async function loadEnv() {
  try {
    const envContent = await readFile(join(__dirname, '..', '.env'), 'utf-8');
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

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function enrichCommunes() {
  console.log('\n🚀 Enrichissement des communes de Rennes Métropole\n');

  // Charger les communes avec profils
  const communesData = JSON.parse(
    await readFile(join(__dirname, '..', 'data', 'communes-rm.json'), 'utf-8')
  );

  console.log(`📊 ${communesData.length} communes à enrichir\n`);

  let count = 0;
  for (const commune of communesData) {
    try {
      console.log(`🔍 ${commune.nom} (${commune.code_insee})...`);

      // Appeler l'API geo.gouv.fr
      const response = await fetch(
        `https://geo.api.gouv.fr/communes/${commune.code_insee}?fields=nom,code,population,surface`
      );

      if (!response.ok) {
        console.log(`   ⚠️  API error: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }

      const geoData = await response.json();

      // Calculer la densité
      const densiteHabKm2 = geoData.surface && geoData.population
        ? Math.round(geoData.population / (geoData.surface / 100) * 100) / 100
        : null;

      // Créer le slug
      const slug = commune.nom
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Upsert dans Supabase
      const { error } = await supabase
        .from('communes')
        .upsert({
          code_insee: commune.code_insee,
          nom: commune.nom,
          slug,
          population: geoData.population || null,
          superficie_km2: geoData.surface ? Math.round(geoData.surface / 100) / 100 : null,
          densite_hab_km2: densiteHabKm2,
          profil_commune: commune.profil,
          enjeux_prioritaires: commune.enjeux
        }, {
          onConflict: 'code_insee'
        });

      if (error) {
        console.log(`   ❌ Supabase error: ${error.message}`);
      } else {
        count++;
        console.log(`   ✅ ${commune.nom} - ${geoData.population} hab - ${densiteHabKm2} hab/km²`);
      }

      // Respecter un délai de 200ms entre appels
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`   ❌ Error for ${commune.nom}:`, error.message);
    }
  }

  console.log(`\n✅ Enrichissement terminé : ${count}/${communesData.length} communes\n`);
}

enrichCommunes();
