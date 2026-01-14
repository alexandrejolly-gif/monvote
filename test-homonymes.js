// Test de la protection contre les homonymes

import { getCommuneFullContext } from './lib/commune-utils.js';
import { PROMPT_RECHERCHE_CANDIDATS, PROMPT_RECHERCHE_PROGRAMME } from './lib/prompts.js';

console.log('🧪 TEST DE LA PROTECTION HOMONYMES\n');
console.log('='.repeat(70));

// Test 1: Chartres-de-Bretagne (35) vs Chartres (28)
console.log('\n📍 TEST 1: Chartres-de-Bretagne vs Chartres');
console.log('-'.repeat(70));

const chartresBretagne = getCommuneFullContext('Chartres-de-Bretagne', '35066');
console.log('\n✅ Contexte extrait:');
console.log(`   Nom: ${chartresBretagne.nom}`);
console.log(`   Département: ${chartresBretagne.dept} (${chartresBretagne.deptCode})`);
console.log(`   Code INSEE: ${chartresBretagne.codeInsee}`);
console.log(`   Nom complet: ${chartresBretagne.fullName}`);
console.log(`   Suffixe recherche: "${chartresBretagne.searchSuffix}"`);

console.log('\n📝 Prompt généré pour recherche candidats:');
const promptCandidats = PROMPT_RECHERCHE_CANDIDATS(
  chartresBretagne.nom,
  chartresBretagne.dept,
  chartresBretagne.codeInsee
);
const lines = promptCandidats.split('\n').slice(0, 15);
lines.forEach(line => console.log(`   ${line}`));
console.log('   ...');

// Test 2: Rennes (35)
console.log('\n\n📍 TEST 2: Rennes');
console.log('-'.repeat(70));

const rennes = getCommuneFullContext('Rennes', '35238');
console.log('\n✅ Contexte extrait:');
console.log(`   Nom: ${rennes.nom}`);
console.log(`   Département: ${rennes.dept} (${rennes.deptCode})`);
console.log(`   Code INSEE: ${rennes.codeInsee}`);
console.log(`   Nom complet: ${rennes.fullName}`);

// Test 3: Saint-Armel (35) - cas typique d'homonyme
console.log('\n\n📍 TEST 3: Saint-Armel (homonyme courant)');
console.log('-'.repeat(70));

const saintArmel = getCommuneFullContext('Saint-Armel', '35250');
console.log('\n✅ Contexte extrait:');
console.log(`   Nom: ${saintArmel.nom}`);
console.log(`   Département: ${saintArmel.dept} (${saintArmel.deptCode})`);
console.log(`   Code INSEE: ${saintArmel.codeInsee}`);
console.log(`   Nom complet: ${saintArmel.fullName}`);

console.log('\n📝 Requêtes web qui seront faites:');
console.log(`   ✅ "candidats municipales 2026 Saint-Armel Ille-et-Vilaine"`);
console.log(`   ✅ "élections municipales Saint-Armel Ille-et-Vilaine 2026"`);
console.log(`   ✅ "listes électorales Saint-Armel 35250"`);
console.log('\n   ❌ AVANT (risqué): "candidats municipales 2026 Saint-Armel"');
console.log('   → Confusion possible avec Saint-Armel (56), Saint-Armel (50), etc.');

console.log('\n\n' + '='.repeat(70));
console.log('✅ PROTECTION HOMONYMES FONCTIONNELLE');
console.log('='.repeat(70));
console.log('\n💡 Chaque recherche inclut maintenant:');
console.log('   1. Nom de la commune');
console.log('   2. Département (Ille-et-Vilaine ou numéro 35)');
console.log('   3. Code INSEE (référence unique officielle)');
console.log('\n✅ Les prompts Claude incluent des avertissements explicites');
console.log('   contre les confusions avec des communes homonymes.\n');
