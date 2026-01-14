// Test API avec protection homonymes
import { getCommuneFullContext } from './lib/commune-utils.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

console.log('🧪 TEST API - PROTECTION HOMONYMES\n');
console.log('='.repeat(70));

// Simuler la recherche de candidats pour Chartres-de-Bretagne
async function testSearchCandidats() {
  const { PROMPT_RECHERCHE_CANDIDATS } = await import('./lib/prompts.js');

  const communeNom = 'Chartres-de-Bretagne';
  const codeInsee = '35066';

  // Extraire le contexte complet
  const context = getCommuneFullContext(communeNom, codeInsee);

  console.log('\n📍 COMMUNE TESTÉE:');
  console.log(`   ${context.fullName}`);
  console.log(`   Code INSEE: ${context.codeInsee}`);

  console.log('\n🔍 RECHERCHE DE CANDIDATS...');
  console.log('-'.repeat(70));

  // Générer le prompt avec protection homonymes
  const prompt = PROMPT_RECHERCHE_CANDIDATS(context.nom, context.dept, context.codeInsee);

  console.log('\n📝 PROMPT ENVOYÉ À CLAUDE:');
  console.log(prompt);

  console.log('\n✅ VÉRIFICATIONS:');
  const checks = [
    { label: 'Nom de la commune inclus', test: prompt.includes('Chartres-de-Bretagne') },
    { label: 'Département inclus', test: prompt.includes('Ille-et-Vilaine') },
    { label: 'Code INSEE inclus', test: prompt.includes('35066') },
    { label: 'Avertissement homonymes', test: prompt.includes('Ne confonds pas avec d\'autres communes homonymes') },
    { label: 'Requête avec département', test: prompt.includes('Chartres-de-Bretagne Ille-et-Vilaine') },
    { label: 'Pas de fallback 2020', test: !prompt.includes('2020') }
  ];

  checks.forEach(check => {
    console.log(`   ${check.test ? '✅' : '❌'} ${check.label}`);
  });

  const allPassed = checks.every(c => c.test);

  console.log('\n' + '='.repeat(70));
  console.log(allPassed ? '✅ PROTECTION HOMONYMES ACTIVE' : '❌ PROTECTION INCOMPLÈTE');
  console.log('='.repeat(70));

  return allPassed;
}

// Tester la validation de tract
async function testTractValidation() {
  const { PROMPT_ANALYSE_TRACT } = await import('./lib/prompts.js');

  const communeNom = 'Saint-Armel';
  const codeInsee = '35250';

  const context = getCommuneFullContext(communeNom, codeInsee);

  console.log('\n\n📄 TEST VALIDATION TRACT');
  console.log('='.repeat(70));
  console.log(`\n📍 Commune: ${context.fullName}`);

  const prompt = PROMPT_ANALYSE_TRACT(context.nom, context.dept, context.codeInsee);

  console.log('\n✅ VÉRIFICATIONS TRACT:');
  const checks = [
    { label: 'Département dans le prompt', test: prompt.includes('Ille-et-Vilaine') },
    { label: 'Code INSEE dans le prompt', test: prompt.includes('35250') },
    { label: 'Champs département_mentionne', test: prompt.includes('departement_mentionne') },
    { label: 'Champs code_postal_mentionne', test: prompt.includes('code_postal_mentionne') },
    { label: 'Avertissement homonymes', test: prompt.includes('homonyme') }
  ];

  checks.forEach(check => {
    console.log(`   ${check.test ? '✅' : '❌'} ${check.label}`);
  });

  const allPassed = checks.every(c => c.test);
  console.log(allPassed ? '\n✅ VALIDATION TRACT PROTÉGÉE' : '\n❌ VALIDATION INCOMPLÈTE');

  return allPassed;
}

// Exécuter les tests
(async () => {
  try {
    const test1 = await testSearchCandidats();
    const test2 = await testTractValidation();

    console.log('\n\n' + '='.repeat(70));
    console.log('📊 RÉSULTAT FINAL');
    console.log('='.repeat(70));
    console.log(`   Recherche candidats: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Validation tract: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`\n   ${test1 && test2 ? '✅ TOUS LES TESTS PASSENT' : '❌ CERTAINS TESTS ÉCHOUENT'}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  }
})();
