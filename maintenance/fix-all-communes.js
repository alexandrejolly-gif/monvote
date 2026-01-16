// Script pour corriger TOUTES les communes avec des noms incorrects

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

async function fixAllCommunes() {
  console.log('🔧 Correction de TOUTES les communes\n');

  const corrections = [
    { code: '35019', correctName: 'Bazouges-la-Pérouse', oldName: 'Bécherel' },
    { code: '35029', correctName: 'Bonnemain', oldName: 'Bourgbarré' },
    { code: '35065', correctName: 'La Chapelle-Thouarault', oldName: 'Chavagne' },
    { code: '35076', correctName: 'Chavagne', oldName: 'Clayes' },
    { code: '35132', correctName: 'Hirel', oldName: "L'Hermitage" },
    { code: '35061', correctName: 'La Chapelle-Erbrée', oldName: 'La Chapelle-Chaussée' },
    { code: '35062', correctName: 'La Chapelle-Fleurigné', oldName: 'La Chapelle-des-Fougeretz' },
    { code: '35063', correctName: 'La Chapelle-Saint-Aubert', oldName: 'La Chapelle-Thouarault' },
    { code: '35131', correctName: "L'Hermitage", oldName: 'Le Verger' },
    { code: '35170', correctName: 'Mecé', oldName: 'Melesse' },
    { code: '35183', correctName: 'Mondevert', oldName: 'Miniac-sous-Bécherel' },
    { code: '35192', correctName: 'Montreuil-des-Landes', oldName: 'Montgermont' },
    { code: '35200', correctName: 'Moutiers', oldName: 'Nouvoitou' },
    { code: '35206', correctName: 'Noyal-Châtillon-sur-Seiche', oldName: 'Orgères' },
    { code: '35215', correctName: 'Parigné', oldName: 'Parthenay-de-Bretagne' },
    { code: '35223', correctName: 'Plélan-le-Grand', oldName: 'Pont-Péan' },
    { code: '35243', correctName: 'Romagné', oldName: 'Romillé' },
    { code: '35245', correctName: 'Romillé', oldName: 'Saint-Armel' },
    { code: '35295', correctName: 'Saint-Maugan', oldName: 'Saint-Grégoire' },
    { code: '35259', correctName: 'Saint-Broladre', oldName: 'Saint-Grégoire' },
    { code: '35308', correctName: "Mesnil-Roc'h", oldName: 'Saint-Péran' },
    { code: '35320', correctName: 'Saint-Uniac', oldName: 'Saint-Sulpice-la-Forêt' }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const correction of corrections) {
    console.log(`\n📝 Code ${correction.code}: ${correction.oldName} → ${correction.correctName}`);

    try {
      const { data, error } = await supabase
        .from('communes')
        .update({ nom: correction.correctName })
        .eq('code_insee', correction.code)
        .select();

      if (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
        errorCount++;
      } else if (data && data.length > 0) {
        console.log(`   ✅ Mis à jour`);
        successCount++;
      } else {
        console.log(`   ⚠️  Aucune ligne affectée`);
        errorCount++;
      }
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
      errorCount++;
    }

    // Petite pause entre les requêtes
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n\n========================================');
  console.log('📊 RÉSULTATS');
  console.log('========================================');
  console.log(`✅ Corrections réussies: ${successCount}/${corrections.length}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log('\n✅ Toutes les corrections sont terminées!');
}

fixAllCommunes();
