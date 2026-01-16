// Script pour ajouter web_search manquant dans les fichiers admin
import { readFileSync, writeFileSync } from 'fs';

const files = [
  'api/admin/update-commune.js',
  'api/admin/add-commune.js'
];

console.log('🔧 FIX WEB_SEARCH dans les fichiers admin\n');
console.log('='.repeat(70));

files.forEach(filePath => {
  console.log(`\n📝 Traitement de ${filePath}...`);

  let content = readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix 1: Ajouter tools web_search après messages dans searchCandidats
  const searchCandidatsPattern = /(async function searchCandidats[\s\S]*?messages: \[\{[\s\S]*?\}\])([\s\n\s]*\})/g;

  content = content.replace(searchCandidatsPattern, (match, before, after) => {
    if (!match.includes('tools:')) {
      console.log('   ✅ Ajout web_search à searchCandidats');
      modified = true;
      return before + `,\n    tools: [{\n      type: 'web_search_20250305',\n      name: 'web_search'\n    }]` + after;
    }
    return match;
  });

  // Fix 2: Ajouter tools web_search après messages dans searchProgramme
  const searchProgrammePattern = /(async function searchProgramme[\s\S]*?messages: \[\{[\s\S]*?\}\])([\s\n\s]*\})/g;

  content = content.replace(searchProgrammePattern, (match, before, after) => {
    if (!match.includes('tools:')) {
      console.log('   ✅ Ajout web_search à searchProgramme');
      modified = true;
      return before + `,\n      tools: [{\n        type: 'web_search_20250305',\n        name: 'web_search'\n      }]` + after;
    }
    return match;
  });

  // Fix 3: Remplacer .find(c => c.type === 'text')?.text par extraction complète
  const oldParsing1 = /const textContent = response\.content\.find\(c => c\.type === 'text'\)\?\.text;/g;
  if (content.match(oldParsing1)) {
    console.log('   ✅ Fix parsing réponse (extraction tous les blocs texte)');
    content = content.replace(
      oldParsing1,
      `// Extraire et concaténer TOUS les blocks de texte\n  const textBlocks = response.content.filter(c => c.type === 'text');\n  const textContent = textBlocks.map(b => b.text).join('');`
    );
    modified = true;
  }

  // Fix 4: Pour searchProgramme qui est dans une boucle
  const oldParsing2 = /const textContent = response\.content\.find\(c => c\.type === 'text'\)\?\.text;\n\n\s+let jsonText = textContent\.trim\(\);/g;
  if (content.match(oldParsing2)) {
    console.log('   ✅ Fix parsing avec vérification de contenu vide');
    content = content.replace(
      oldParsing2,
      `// Extraire et concaténer TOUS les blocks de texte\n      const textBlocks = response.content.filter(c => c.type === 'text');\n      const textContent = textBlocks.map(b => b.text).join('');\n\n      if (!textContent) {\n        console.error(\`No text content for \${candidat.nom}\`);\n        return { propositions: [] };\n      }\n\n      let jsonText = textContent.trim();`
    );
    modified = true;
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`   💾 Fichier modifié et sauvegardé`);
  } else {
    console.log(`   ℹ️  Aucune modification nécessaire`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('✅ Tous les fichiers traités\n');
