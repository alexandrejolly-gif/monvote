import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../lib/security.js';

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

async function testRateLimiting() {
  console.log('\n🧪 Test du Rate Limiting\n');
  console.log('='.repeat(60));

  const testIP = '192.168.1.100';
  const testFingerprint = 'test-fingerprint-123';
  const testCommune = '35238';

  // Test 1: Quiz complete (limite = 50/jour)
  console.log('\n📊 Test 1: Rate limit sur quiz_complete (limite: 50/jour)');
  console.log('-'.repeat(60));

  for (let i = 1; i <= 52; i++) {
    const result = await checkRateLimit(supabase, {
      ip: testIP,
      action: 'quiz_complete'
    });

    if (result.blocked) {
      console.log(`❌ Requête ${i}: BLOQUÉE - ${result.reason}`);
      console.log(`   Retry after: ${result.retry_after} secondes`);
      break;
    } else {
      if (i % 10 === 0 || i >= 49) {
        console.log(`✅ Requête ${i}: Acceptée`);
      }
    }

    // Petite pause pour ne pas saturer
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // Test 2: Upload tract (limite = 5/jour/IP)
  console.log('\n📤 Test 2: Rate limit sur upload_tract (limite: 5/jour/IP)');
  console.log('-'.repeat(60));

  const testIP2 = '192.168.1.101'; // Nouvelle IP pour ne pas être bloqué par le test précédent

  for (let i = 1; i <= 7; i++) {
    const result = await checkRateLimit(supabase, {
      ip: testIP2,
      action: 'upload_tract'
    });

    if (result.blocked) {
      console.log(`❌ Upload ${i}: BLOQUÉ - ${result.reason}`);
      console.log(`   Retry after: ${result.retry_after} secondes`);
    } else {
      console.log(`✅ Upload ${i}: Accepté`);
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Test 3: Upload tract avec fingerprint (limite = 3/jour)
  console.log('\n🔍 Test 3: Rate limit sur fingerprint (limite: 3/jour)');
  console.log('-'.repeat(60));

  const testIP3 = '192.168.1.102';
  const testFingerprint2 = 'test-fingerprint-456';

  for (let i = 1; i <= 5; i++) {
    const result = await checkRateLimit(supabase, {
      ip: testIP3,
      fingerprint: testFingerprint2,
      action: 'upload_tract'
    });

    if (result.blocked) {
      console.log(`❌ Upload ${i}: BLOQUÉ - ${result.reason} (${result.limit_type})`);
      console.log(`   Retry after: ${result.retry_after} secondes`);
    } else {
      console.log(`✅ Upload ${i}: Accepté`);
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Test 4: Vérifier les données en base
  console.log('\n📋 Test 4: Vérification des données en base');
  console.log('-'.repeat(60));

  const { data, error } = await supabase
    .from('rate_limits')
    .select('identifier_type, action_type, count, window_start')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Erreur:', error);
  } else {
    console.log('\nDernières entrées dans rate_limits:');
    data.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.identifier_type}/${row.action_type}: ${row.count} requêtes`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests terminés !');
  console.log('\n💡 Pour nettoyer les données de test:');
  console.log('   DELETE FROM rate_limits WHERE identifier_hash LIKE \'%test%\';');
  console.log('');
}

testRateLimiting();
