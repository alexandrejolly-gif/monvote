import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
async function loadEnv() {
  try {
    const envContent = await readFile(join(__dirname, '.env'), 'utf-8');
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  } catch (error) {
    console.error('Failed to load .env file');
    process.exit(1);
  }
}

await loadEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

// Create Supabase client with service role if available, otherwise use anon key
const supabase = createClient(supabaseUrl, supabaseKey);

async function initDatabase() {
  console.log('🚀 Initializing Supabase database...\n');

  try {
    // Read SQL schema
    const schemaPath = join(__dirname, 'database', 'schema.sql');
    const schema = await readFile(schemaPath, 'utf-8');

    console.log('📋 SQL schema loaded from database/schema.sql');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // For Supabase, we need to use the SQL API
    // This requires making raw SQL requests
    console.log('⚠️  Note: You need to execute the SQL schema manually in Supabase SQL Editor');
    console.log('📍 Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new\n');

    console.log('📋 Copy and paste this SQL:\n');
    console.log('='.repeat(80));
    console.log(schema);
    console.log('='.repeat(80));
    console.log('\nPress ENTER after you\'ve executed the SQL in Supabase...');

    // Alternative: Check if tables exist
    console.log('\n🔍 Checking if tables already exist...');

    const tables = ['candidats', 'questions', 'sessions', 'submissions', 'rate_limits'];
    let allExist = true;

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        console.log(`❌ Table '${table}' does not exist or is not accessible`);
        allExist = false;
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    }

    if (allExist) {
      console.log('\n✅ All required tables exist!');
      console.log('🎉 Database is ready to use');

      // Insert test data if tables are empty
      const { data: candidatsData } = await supabase.from('candidats').select('id').limit(1);
      if (!candidatsData || candidatsData.length === 0) {
        console.log('\n📝 Tables are empty. Adding test data...');
        await insertTestData();
      }
    } else {
      console.log('\n⚠️  Some tables are missing. Please create them using the SQL schema above.');
      console.log('📖 Instructions:');
      console.log('   1. Open https://supabase.com/dashboard');
      console.log('   2. Select your project');
      console.log('   3. Go to SQL Editor');
      console.log('   4. Click "New query"');
      console.log('   5. Paste the SQL schema from database/schema.sql');
      console.log('   6. Click "Run"');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function insertTestData() {
  try {
    // Insert test candidates for Rennes
    const { error: candidatsError } = await supabase.from('candidats').insert([
      {
        commune_code: '35238',
        commune_nom: 'Rennes',
        nom: 'APPÉRÉ',
        prenom: 'Nathalie',
        parti: 'PS',
        liste: 'Rennes, la Ville en commun',
        source_type: 'admin',
        positions: {
          'transports': 2,
          'logement': 1,
          'environnement': 1,
          'économie': 3,
          'culture': 2
        }
      },
      {
        commune_code: '35238',
        commune_nom: 'Rennes',
        nom: 'GUYON',
        prenom: 'Carole',
        parti: 'EELV',
        liste: 'Rennes Écologie Solidarité',
        source_type: 'admin',
        positions: {
          'transports': 1,
          'logement': 2,
          'environnement': 1,
          'économie': 2,
          'culture': 2
        }
      },
      {
        commune_code: '35238',
        commune_nom: 'Rennes',
        nom: 'LE VERT',
        prenom: 'Matthieu',
        parti: 'LR',
        liste: 'Rennes au Cœur',
        source_type: 'admin',
        positions: {
          'transports': 4,
          'logement': 4,
          'environnement': 3,
          'économie': 5,
          'culture': 3
        }
      }
    ]);

    if (candidatsError) {
      console.error('⚠️  Could not insert test candidates:', candidatsError.message);
    } else {
      console.log('✅ Test candidates inserted for Rennes');
    }

  } catch (error) {
    console.error('⚠️  Error inserting test data:', error.message);
  }
}

// Run initialization
initDatabase();
