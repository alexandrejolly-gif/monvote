// Script pour corriger les noms de communes incorrects dans la base de données

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

async function fixCommuneNames() {
  console.log('🔧 Correction des noms de communes\n');

  const corrections = [
    { code: '35069', oldName: 'Chevaigné', newName: 'Châteaugiron' },
    { code: '35080', oldName: 'Corps-Nuds', newName: 'Cintré' }
  ];

  for (const correction of corrections) {
    console.log(`\n📝 Correction: ${correction.oldName} → ${correction.newName} (code ${correction.code})`);

    // Vérifier l'état actuel
    const { data: current, error: checkError } = await supabase
      .from('communes')
      .select('nom, code_insee')
      .eq('code_insee', correction.code)
      .single();

    if (checkError) {
      console.log(`   ❌ Erreur lecture: ${checkError.message}`);
      continue;
    }

    console.log(`   Actuel: "${current.nom}"`);

    // Mettre à jour le nom
    const { data, error } = await supabase
      .from('communes')
      .update({ nom: correction.newName })
      .eq('code_insee', correction.code)
      .select();

    if (error) {
      console.log(`   ❌ Erreur mise à jour: ${error.message}`);
    } else {
      console.log(`   ✅ Mis à jour avec succès`);
    }

    // Vérifier si le nom était utilisé ailleurs
    const { data: duplicates, error: dupError } = await supabase
      .from('communes')
      .select('nom, code_insee')
      .eq('nom', correction.oldName);

    if (!dupError && duplicates && duplicates.length > 0) {
      console.log(`   ⚠️  Le nom "${correction.oldName}" existe encore ailleurs:`);
      duplicates.forEach(d => {
        console.log(`      - Code ${d.code_insee}: ${d.nom}`);
      });
    }
  }

  console.log('\n\n✅ Corrections terminées');
}

fixCommuneNames();
