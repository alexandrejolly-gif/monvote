import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { generateQuestionsForCommune } from '../lib/question-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// CHARGEMENT ENVIRONNEMENT
// ============================================

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

// ============================================
// GÉNÉRATION POUR UNE COMMUNE
// ============================================

async function generateForCommune(communeCode, force = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🏘️  Génération pour ${communeCode}`);
  console.log('='.repeat(70));

  try {
    // 1. Récupérer la commune
    const { data: commune, error: communeError } = await supabase
      .from('communes')
      .select('id, code_insee, nom, population, profil_commune, enjeux_prioritaires, superficie_km2, densite_hab_km2')
      .eq('code_insee', communeCode)
      .single();

    if (communeError || !commune) {
      console.error(`❌ Commune ${communeCode} non trouvée`);
      return { success: false, commune: communeCode, error: 'Commune non trouvée' };
    }

    console.log(`📍 ${commune.nom} - ${commune.profil_commune || 'profil non défini'}`);
    console.log(`   Population: ${commune.population?.toLocaleString() || 'N/A'} habitants`);
    console.log(`   Enjeux: ${commune.enjeux_prioritaires?.join(', ') || 'non définis'}`);

    // 2. Vérifier si questions déjà générées
    if (!force) {
      const { data: existing } = await supabase
        .from('generated_questions')
        .select('id, generated_at')
        .eq('commune_code', communeCode)
        .limit(1)
        .single();

      if (existing) {
        console.log(`⚠️  Questions déjà générées le ${new Date(existing.generated_at).toLocaleString()}`);
        console.log('   Utilisez --force pour régénérer');
        return { success: false, commune: commune.nom, error: 'Already exists' };
      }
    }

    // 3. Récupérer les candidats
    const { data: candidats } = await supabase
      .from('candidats')
      .select('id, nom, prenom, parti, liste, maire_sortant, positions, propositions')
      .eq('commune_code', communeCode);

    console.log(`👥 ${candidats?.length || 0} candidat(s) trouvé(s)`);

    // 4. Générer les questions
    console.log('\n🚀 Génération des questions avec Claude...');
    const result = await generateQuestionsForCommune(commune, candidats || []);

    // 5. Stocker en base (ou mettre à jour si force)
    if (force) {
      // Supprimer l'ancienne version
      await supabase
        .from('generated_questions')
        .delete()
        .eq('commune_code', communeCode);

      console.log('🔄 Ancienne version supprimée');
    }

    const { data, error } = await supabase
      .from('generated_questions')
      .insert({
        commune_id: commune.id,
        commune_code: commune.code_insee,
        commune_nom: commune.nom,
        questions: result.questions,
        generated_by: result.metadata.generated_by,
        generation_mode: result.metadata.generation_mode,
        sources: result.metadata.sources,
        context_data: result.metadata.context_data,
        total_questions: result.metadata.total_questions,
        question_types: result.metadata.question_types,
        version: 1,
        expires_at: null
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur stockage:', error);
      return { success: false, commune: commune.nom, error: error.message };
    }

    console.log('\n✅ SUCCÈS');
    console.log(`   - ${result.questions.length} questions générées et stockées`);
    console.log(`   - Mode: ${result.metadata.generation_mode}`);
    console.log(`   - Sources: ${result.metadata.sources.join(', ')}`);
    console.log(`   - API usage: ${result.metadata.api_usage.input_tokens}in/${result.metadata.api_usage.output_tokens}out tokens`);

    return { success: true, commune: commune.nom, data };

  } catch (error) {
    console.error(`❌ ERREUR pour ${communeCode}:`, error.message);
    return { success: false, commune: communeCode, error: error.message };
  }
}

// ============================================
// GÉNÉRATION MASSIVE (TOUTES LES COMMUNES)
// ============================================

async function generateAll(force = false) {
  console.log('\n🚀 GÉNÉRATION MASSIVE - 43 COMMUNES DE RENNES MÉTROPOLE');
  console.log('='.repeat(70));

  // Récupérer toutes les communes
  const { data: communes, error } = await supabase
    .from('communes')
    .select('code_insee, nom')
    .order('nom');

  if (error || !communes) {
    console.error('❌ Erreur récupération communes:', error);
    return;
  }

  console.log(`📊 ${communes.length} communes à traiter\n`);

  const results = {
    total: communes.length,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  let index = 1;

  for (const commune of communes) {
    console.log(`\n[${index}/${communes.length}] ${commune.nom} (${commune.code_insee})`);

    const result = await generateForCommune(commune.code_insee, force);

    if (result.success) {
      results.success++;
    } else if (result.error === 'Already exists') {
      results.skipped++;
    } else {
      results.failed++;
      results.errors.push({
        commune: commune.nom,
        code: commune.code_insee,
        error: result.error
      });
    }

    // Pause pour éviter rate limiting API
    if (index < communes.length) {
      console.log('⏳ Pause 5 secondes...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    index++;
  }

  // Résumé
  console.log('\n' + '='.repeat(70));
  console.log('📊 RÉSUMÉ DE LA GÉNÉRATION MASSIVE');
  console.log('='.repeat(70));
  console.log(`Total communes:     ${results.total}`);
  console.log(`✅ Succès:          ${results.success}`);
  console.log(`⏭️  Déjà existantes:  ${results.skipped}`);
  console.log(`❌ Échecs:          ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Erreurs détaillées:');
    results.errors.forEach(e => {
      console.log(`   - ${e.commune} (${e.code}): ${e.error}`);
    });
  }

  console.log('');
}

// ============================================
// CLI
// ============================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
📝 GÉNÉRATEUR DE QUESTIONS V5 - MonVote

USAGE:
  node scripts/generate-questions.js [OPTIONS] [COMMUNE_CODE]

OPTIONS:
  --all, -a              Générer pour toutes les 43 communes
  --force, -f            Forcer la régénération même si existe déjà
  --help, -h             Afficher cette aide

EXEMPLES:
  # Générer pour Rennes
  node scripts/generate-questions.js 35238

  # Générer pour Bruz avec force
  node scripts/generate-questions.js 35047 --force

  # Générer toutes les communes
  node scripts/generate-questions.js --all

  # Régénérer toutes les communes (écrase existantes)
  node scripts/generate-questions.js --all --force

COMMUNES DISPONIBLES:
  35238 - Rennes
  35047 - Bruz
  35206 - Mordelles
  ... (43 communes au total)

NOTES:
  - Les questions sont stockées dans la table 'generated_questions'
  - La génération prend ~30-60 secondes par commune
  - Budget API: ~8000 tokens par commune (input + output)
  - Les questions sont figées après génération (pas d'expiration)
    `);
    return;
  }

  const force = args.includes('--force') || args.includes('-f');
  const all = args.includes('--all') || args.includes('-a');

  if (all) {
    await generateAll(force);
  } else {
    // Récupérer le code commune
    const communeCode = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));

    if (!communeCode) {
      console.error('❌ Code commune manquant');
      console.error('Usage: node scripts/generate-questions.js [--force] <COMMUNE_CODE>');
      process.exit(1);
    }

    await generateForCommune(communeCode, force);
  }
}

main().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
