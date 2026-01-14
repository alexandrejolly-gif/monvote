import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { computePerceptualHash, checkDuplicateHash } from '../lib/security.js';
import sharp from 'sharp';

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

async function testDuplicateDetection() {
  console.log('\n🧪 Test de la Détection de Doublons (pHash)\n');
  console.log('='.repeat(60));

  // Créer 3 images de test
  console.log('\n📸 Création d\'images de test...\n');

  // Image 1: Rouge uni
  const image1 = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }
    }
  })
    .png()
    .toBuffer();

  // Image 2: Rouge uni (identique à image1)
  const image2 = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }
    }
  })
    .png()
    .toBuffer();

  // Image 3: Bleu uni (différente)
  const image3 = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 0, g: 0, b: 255 }
    }
  })
    .png()
    .toBuffer();

  // Image 4: Rouge légèrement modifié
  const image4 = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 250, g: 5, b: 5 }
    }
  })
    .png()
    .toBuffer();

  console.log('✅ 4 images de test créées');

  // Test 1: Calculer les hashs
  console.log('\n🔢 Test 1: Calcul des hashs perceptuels');
  console.log('-'.repeat(60));

  const hash1 = await computePerceptualHash(image1);
  const hash2 = await computePerceptualHash(image2);
  const hash3 = await computePerceptualHash(image3);
  const hash4 = await computePerceptualHash(image4);

  console.log(`Hash image 1 (rouge):          ${hash1}`);
  console.log(`Hash image 2 (rouge identique): ${hash2}`);
  console.log(`Hash image 3 (bleu):            ${hash3}`);
  console.log(`Hash image 4 (rouge modifié):   ${hash4}`);

  // Test 2: Vérifier la similarité
  console.log('\n🔍 Test 2: Vérification de similarité');
  console.log('-'.repeat(60));

  function hammingDistance(h1, h2) {
    const b1 = parseInt(h1, 16).toString(2).padStart(64, '0');
    const b2 = parseInt(h2, 16).toString(2).padStart(64, '0');
    let d = 0;
    for (let i = 0; i < 64; i++) {
      if (b1[i] !== b2[i]) d++;
    }
    return d;
  }

  const distance1_2 = hammingDistance(hash1, hash2);
  const distance1_3 = hammingDistance(hash1, hash3);
  const distance1_4 = hammingDistance(hash1, hash4);

  console.log(`Distance image1 ↔ image2 (identiques): ${distance1_2} ${distance1_2 < 5 ? '✅ DOUBLON' : '❌ DIFFÉRENT'}`);
  console.log(`Distance image1 ↔ image3 (différentes): ${distance1_3} ${distance1_3 < 5 ? '✅ DOUBLON' : '❌ DIFFÉRENT'}`);
  console.log(`Distance image1 ↔ image4 (similaires):  ${distance1_4} ${distance1_4 < 5 ? '✅ DOUBLON' : '❌ DIFFÉRENT'}`);

  console.log('\n💡 Seuil de détection: distance < 5 = doublon');

  // Test 3: Simulation avec base de données
  console.log('\n💾 Test 3: Simulation avec base de données');
  console.log('-'.repeat(60));

  // Insérer une "soumission" de test
  const { data: insertData, error: insertError } = await supabase
    .from('submissions')
    .insert({
      commune_code: '35238',
      commune_nom: 'Rennes',
      image_url: 'https://test.com/image1.png',
      image_hash: hash1,
      status: 'approved',
      submitter_ip: '127.0.0.1'
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Erreur insertion:', insertError.message);
    return;
  }

  console.log(`✅ Soumission test créée (ID: ${insertData.id.substring(0, 8)}...)`);

  // Vérifier si image2 (identique) est détectée comme doublon
  const check1 = await checkDuplicateHash(supabase, hash2, '35238');
  console.log(`\n🔍 Check image2 (identique): ${check1.isDuplicate ? '✅ DOUBLON DÉTECTÉ' : '❌ NON DÉTECTÉ'}`);
  if (check1.isDuplicate) {
    console.log(`   Distance Hamming: ${check1.hammingDistance}`);
    console.log(`   ID existant: ${check1.existingId.substring(0, 8)}...`);
  }

  // Vérifier si image3 (différente) est détectée
  const check2 = await checkDuplicateHash(supabase, hash3, '35238');
  console.log(`\n🔍 Check image3 (différente): ${check2.isDuplicate ? '❌ FAUX POSITIF' : '✅ NON DÉTECTÉ (correct)'}`);

  // Vérifier si image4 (similaire) est détectée
  const check3 = await checkDuplicateHash(supabase, hash4, '35238');
  console.log(`\n🔍 Check image4 (légèrement modifiée): ${check3.isDuplicate ? '✅ DOUBLON DÉTECTÉ' : '❌ NON DÉTECTÉ'}`);
  if (check3.isDuplicate) {
    console.log(`   Distance Hamming: ${check3.hammingDistance}`);
  }

  // Nettoyage
  console.log('\n🧹 Nettoyage des données de test...');
  await supabase
    .from('submissions')
    .delete()
    .eq('id', insertData.id);

  console.log('✅ Données de test supprimées');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests terminés !');
  console.log('\n💡 Résumé:');
  console.log('   - Hash perceptuel (pHash): calcule une empreinte 8x8 de l\'image');
  console.log('   - Distance Hamming: mesure les différences entre deux hashs');
  console.log('   - Seuil < 5: considéré comme doublon (ajustable)');
  console.log('');
}

testDuplicateDetection();
