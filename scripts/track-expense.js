#!/usr/bin/env node
// Script pour ajouter une dépense Anthropic au fichier de suivi
// Usage: node scripts/track-expense.js "Description" "Type" "Coût"

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEPENSES_FILE = path.join(__dirname, '..', '..', 'DEPENSES_ANTHROPIC.md');

// Types d'opérations avec coûts unitaires
const OPERATION_TYPES = {
  'generation_questions': { name: 'Génération Questions V5', cost: 1.00, unit: 'commune' },
  'web_search_massive': { name: 'Recherche Web Massive', cost: 0.50, unit: 'candidat' },
  'web_search': { name: 'Recherche Web Standard', cost: 0.10, unit: 'candidat' },
  'tract_analysis': { name: 'Analyse Tract', cost: 0.05, unit: 'tract' },
  'regeneration': { name: 'Régénération Questions', cost: 1.00, unit: 'commune' },
  'custom': { name: 'Opération Custom', cost: 0.00, unit: 'opération' }
};

function formatDate(date = new Date()) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('fr-FR', options);
}

function formatDateShort(date = new Date()) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function parseExpenseFile() {
  const content = fs.readFileSync(DEPENSES_FILE, 'utf-8');

  // Extraire le total actuel
  const totalMatch = content.match(/\*\*Total Cumulé:\*\* ~([\d,]+)€/);
  const currentTotal = totalMatch ? parseFloat(totalMatch[1].replace(',', '.')) : 0;

  return { content, currentTotal };
}

function addExpense(description, type, count = 1, customCost = null) {
  const { content, currentTotal } = parseExpenseFile();

  // Obtenir les infos du type d'opération
  const opType = OPERATION_TYPES[type] || OPERATION_TYPES.custom;
  const unitCost = customCost !== null ? customCost : opType.cost;
  const totalCost = unitCost * count;

  // Calculer le nouveau total
  const newTotal = currentTotal + totalCost;

  // Créer l'entrée
  const today = new Date();
  const dateStr = formatDate(today);
  const dateShort = formatDateShort(today);

  const expenseEntry = `
#### ${dateStr}

**${getCurrentExpenseNumber(content)}. ${description}**
- **Action:** ${opType.name} ${count > 1 ? `(×${count})` : ''}
- **API:** ${getAPIType(type)}
- **Coût estimé:** ${totalCost.toFixed(2)}€
- **Détails:** ${description}

**Total jour:** ${totalCost.toFixed(2)}€

---
`;

  // Trouver où insérer (avant "## 📈 Évolution des Dépenses")
  const insertPoint = content.indexOf('## 📈 Évolution des Dépenses');

  if (insertPoint === -1) {
    console.error('❌ Section "Évolution des Dépenses" non trouvée');
    return;
  }

  // Insérer la nouvelle dépense
  const newContent = content.slice(0, insertPoint) + expenseEntry + '\n' + content.slice(insertPoint);

  // Mettre à jour le total cumulé
  const updatedContent = newContent.replace(
    /\*\*Total Cumulé:\*\* ~[\d,]+€/,
    `**Total Cumulé:** ~${newTotal.toFixed(2).replace('.', ',')}€`
  );

  // Mettre à jour le tableau récapitulatif
  const updatedContentWithTable = updateSummaryTable(updatedContent, type, count, totalCost);

  // Sauvegarder
  fs.writeFileSync(DEPENSES_FILE, updatedContentWithTable, 'utf-8');

  console.log('✅ Dépense ajoutée avec succès!');
  console.log(`   Description: ${description}`);
  console.log(`   Type: ${opType.name}`);
  console.log(`   Coût: ${totalCost.toFixed(2)}€`);
  console.log(`   Nouveau total: ${newTotal.toFixed(2)}€`);
}

function getCurrentExpenseNumber(content) {
  // Trouver le dernier numéro d'opération
  const matches = content.match(/\*\*(\d+)\. /g);
  if (!matches || matches.length === 0) return 1;

  const lastNumber = Math.max(...matches.map(m => parseInt(m.match(/\d+/)[0])));
  return lastNumber + 1;
}

function getAPIType(type) {
  const apiMap = {
    'generation_questions': 'Claude Opus 4.5',
    'web_search_massive': 'Claude Opus 4.5 + Web Search',
    'web_search': 'Claude Sonnet 3.5 + Web Search',
    'tract_analysis': 'Claude Sonnet 3.5 + Vision',
    'regeneration': 'Claude Opus 4.5',
    'custom': 'Claude (Type non spécifié)'
  };
  return apiMap[type] || 'Claude';
}

function updateSummaryTable(content, type, count, cost) {
  // Mise à jour du tableau récapitulatif en haut du fichier
  const tableRegex = /\| \*\*([^*]+)\*\* \| (\d+) \| ~([\d,]+)€ \| ([\d,]+)€ \|/g;

  // Pour l'instant, retourner le contenu tel quel
  // Une vraie implémentation nécessiterait de parser et mettre à jour chaque ligne
  return content;
}

// Interface CLI
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log(`
📊 Script de Suivi des Dépenses Anthropic

Usage:
  node scripts/track-expense.js <description> <type> <count> [customCost]

Types disponibles:
  - generation_questions  : Génération questions (1€/commune)
  - web_search_massive   : Recherche web approfondie (0.50€/candidat)
  - web_search           : Recherche web standard (0.10€/candidat)
  - tract_analysis       : Analyse de tract (0.05€/tract)
  - regeneration         : Régénération questions (1€/commune)
  - custom               : Opération personnalisée (spécifier coût)

Exemples:
  node scripts/track-expense.js "Génération Vitré" generation_questions 1
  node scripts/track-expense.js "Recherche 5 candidats" web_search 5
  node scripts/track-expense.js "Analyse 3 tracts" tract_analysis 3
  node scripts/track-expense.js "Opération spéciale" custom 1 2.50
  `);
  process.exit(1);
}

const [description, type, count, customCost] = args;

if (!OPERATION_TYPES[type] && type !== 'custom') {
  console.error(`❌ Type d'opération invalide: ${type}`);
  console.error(`Types valides: ${Object.keys(OPERATION_TYPES).join(', ')}`);
  process.exit(1);
}

addExpense(description, type, parseInt(count), customCost ? parseFloat(customCost) : null);
