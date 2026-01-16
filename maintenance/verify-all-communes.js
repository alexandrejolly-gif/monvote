// Script pour vérifier TOUTES les communes et identifier les mismatches

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
  } catch (error) {
    console.error('⚠️  No .env file found');
  }
}

await loadEnv();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function verifyAllCommunes() {
  console.log('🔍 Vérification complète de TOUTES les communes\n');

  // Récupérer toutes les communes
  const { data: communes, error } = await supabase
    .from('communes')
    .select('code_insee, nom')
    .order('nom');

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  console.log(`📋 ${communes.length} communes à vérifier\n`);

  const mismatches = [];
  const correct = [];

  for (const commune of communes) {
    try {
      const url = `https://geo.api.gouv.fr/communes/${commune.code_insee}?fields=nom,code&format=json`;
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`⚠️  ${commune.nom} (${commune.code_insee}) - API erreur ${response.status}`);
        continue;
      }

      const apiData = await response.json();

      if (apiData.nom !== commune.nom) {
        mismatches.push({
          code: commune.code_insee,
          storedName: commune.nom,
          apiName: apiData.nom
        });
        console.log(`❌ MISMATCH: Code ${commune.code_insee}`);
        console.log(`   Base de données: "${commune.nom}"`);
        console.log(`   API (correct):   "${apiData.nom}"\n`);
      } else {
        correct.push(commune);
        console.log(`✅ ${commune.nom} (${commune.code_insee})`);
      }

      // Pause pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (err) {
      console.log(`❌ Erreur pour ${commune.nom}: ${err.message}`);
    }
  }

  console.log('\n\n========================================');
  console.log('📊 RÉSUMÉ');
  console.log('========================================');
  console.log(`✅ Communes correctes: ${correct.length}`);
  console.log(`❌ Communes incorrectes: ${mismatches.length}\n`);

  if (mismatches.length > 0) {
    console.log('🔧 Corrections nécessaires:\n');
    mismatches.forEach(m => {
      console.log(`UPDATE communes SET nom = '${m.apiName}' WHERE code_insee = '${m.code}'; -- actuellement: "${m.storedName}"`);
    });
  }
}

verifyAllCommunes();
