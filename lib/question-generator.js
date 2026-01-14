import Anthropic from '@anthropic-ai/sdk';
import { getApprovedSubmissions } from './supabase.js';

// ============================================
// CONFIGURATION
// ============================================

const TOTAL_QUESTIONS = 15;

const DISTRIBUTION = {
  socle: 8,        // 50% - Thèmes municipaux généraux
  locaux: 5,       // 35% - Enjeux spécifiques à la commune
  divergences: 2   // 15% - Sujets où candidats s'opposent
};

const CATEGORIE_ENJEUX_MAP = {
  'transport': ['TRANSPORT_01', 'TRANSPORT_02'],
  'logement': ['LOGEMENT_01', 'LOGEMENT_02'],
  'environnement': ['ENVIRO_01', 'ENVIRO_02'],
  'economie': ['COMMERCE_01', 'ECONOMIE_01'],
  'securite': ['SECURITE_01', 'SECURITE_02'],
  'education': ['ECOLES_01', 'ECOLES_02'],
  'culture': ['CULTURE_01', 'CULTURE_02']
};

// ============================================
// DESCRIPTIONS DES PROFILS DE COMMUNES
// ============================================

function getProfilDescription(profil) {
  const descriptions = {
    'urbain_dense': `Zone urbaine dense (Rennes) :
- Transport : Métro, bus haute fréquence, vélo en libre-service
- Enjeux : Densification, stationnement, îlots de fraîcheur, vie nocturne
- Services : Tous services présents, équipements culturels nombreux`,

    'periurbain_croissance': `Commune périurbaine en croissance :
- Transport : Bus vers Rennes, future ligne métro possible, pendulaires nombreux
- Enjeux : Gestion de la croissance, nouvelles écoles, équilibre urbanisation/nature
- Services : Services de proximité, dépendance à Rennes pour certains équipements`,

    'periurbain_stable': `Commune périurbaine stable :
- Transport : Bus vers Rennes, voiture prédominante
- Enjeux : Maintien des services, cadre de vie, commerces de proximité
- Services : École, quelques commerces, mutualisation avec voisins`,

    'rural_proche': `Commune rurale proche métropole :
- Transport : Peu ou pas de transport en commun, voiture indispensable
- Enjeux : Maintien des services, attractivité, agriculture
- Services : Services limités, mutualisation intercommunale`
  };

  return descriptions[profil] || 'Profil non défini';
}

// ============================================
// FORMATAGE DES CANDIDATS
// ============================================

function formatCandidatsForPrompt(candidats) {
  if (!candidats || candidats.length === 0) {
    return `Aucun candidat déclaré pour le moment.
→ Génère les questions en mode "dégradé" (sans divergences candidats).
→ Les positions_candidats seront vides ou estimées.`;
  }

  return candidats.map((c, i) => {
    let text = `### Candidat ${i + 1} : ${c.prenom} ${c.nom}
- ID : ${c.id}
- Parti/Étiquette : ${c.parti || c.etiquette || 'Sans étiquette'}
- Liste : ${c.liste || 'Non renseigné'}
- Maire sortant : ${c.maire_sortant ? 'Oui' : 'Non'}`;

    if (c.positions && Object.keys(c.positions).length > 0) {
      text += `\n- Positions connues :`;
      Object.entries(c.positions).forEach(([questionId, position]) => {
        text += `\n  • Question ${questionId} : ${position}/5`;
      });
    }

    if (c.propositions && c.propositions.length > 0) {
      text += `\n- Propositions (${c.propositions.length} au total)`;
      c.propositions.slice(0, 5).forEach(p => {
        text += `\n  • ${p}`;
      });
      if (c.propositions.length > 5) {
        text += `\n  • ... et ${c.propositions.length - 5} autres`;
      }
    }

    return text;
  }).join('\n\n');
}

// ============================================
// FORMATAGE DU CONTEXTE
// ============================================

function formatContextForPrompt(context) {
  let text = '';

  // Actualités
  if (context.actualites && context.actualites.length > 0) {
    text += `### Actualités récentes\n`;
    context.actualites.forEach((a, i) => {
      text += `${i + 1}. **${a.titre}**\n   ${a.resume}\n   Source : ${a.source} (${a.date || 'date inconnue'})\n\n`;
    });
  } else {
    text += `### Actualités récentes\nAucune actualité spécifique trouvée.\n\n`;
  }

  // Projets
  if (context.projets && context.projets.length > 0) {
    text += `### Projets en cours\n`;
    context.projets.forEach((p, i) => {
      text += `${i + 1}. **${p.nom}** : ${p.description}\n`;
    });
    text += '\n';
  }

  // Controverses
  if (context.controverses && context.controverses.length > 0) {
    text += `### Controverses/Débats locaux\n`;
    context.controverses.forEach((c, i) => {
      text += `${i + 1}. **${c.sujet}** : ${c.description || ''}\n`;
    });
    text += '\n';
  }

  // Divergences candidats
  if (context.divergences_candidats && context.divergences_candidats.length > 0) {
    text += `### Divergences identifiées entre candidats\n`;
    text += `(Sujets où les candidats ont les positions les plus opposées)\n\n`;
    context.divergences_candidats.slice(0, 5).forEach((d, i) => {
      text += `${i + 1}. **${d.theme}** (écart : ${d.score}/4)\n`;
      d.positions.forEach(p => {
        text += `   - ${p.candidat_nom} : ${p.position}/5\n`;
      });
      text += '\n';
    });
  }

  return text || 'Aucune donnée contextuelle disponible.';
}

// ============================================
// CALCUL DES DIVERGENCES ENTRE CANDIDATS
// ============================================

function findCandidateDivergences(candidats) {
  const themes = new Map();

  // Collecter toutes les positions par thème
  for (const candidat of candidats) {
    if (!candidat.positions || Object.keys(candidat.positions).length === 0) continue;

    for (const [questionId, position] of Object.entries(candidat.positions)) {
      if (!themes.has(questionId)) {
        themes.set(questionId, []);
      }
      themes.get(questionId).push({
        candidat_id: candidat.id,
        candidat_nom: `${candidat.prenom} ${candidat.nom}`,
        position: parseInt(position),
        justification: `Position ${position}/5`
      });
    }
  }

  // Calculer les divergences
  const divergences = [];

  for (const [theme, positions] of themes) {
    if (positions.length < 2) continue;

    const values = positions.map(p => p.position);
    const maxDiv = Math.max(...values) - Math.min(...values);

    if (maxDiv >= 2) {
      divergences.push({
        theme,
        score: maxDiv,
        positions
      });
    }
  }

  return divergences.sort((a, b) => b.score - a.score);
}

// ============================================
// ENRICHISSEMENT DES CANDIDATS AVEC TRACTS
// ============================================

export async function enrichCandidatsWithTracts(candidats, communeCode) {
  if (!candidats || candidats.length === 0) {
    return candidats;
  }

  try {
    // Récupérer tous les tracts validés pour cette commune
    const approvedTracts = await getApprovedSubmissions(communeCode);

    if (!approvedTracts || approvedTracts.length === 0) {
      console.log('  Aucun tract validé trouvé');
      return candidats;
    }

    console.log(`  ${approvedTracts.length} tract(s) validé(s) trouvé(s)`);

    // Créer un map des tracts par candidat (par nom)
    const tractsByCandidat = new Map();

    for (const tract of approvedTracts) {
      const candidatNom = tract.extracted_data?.candidat?.nom?.toUpperCase();
      if (!candidatNom) continue;

      if (!tractsByCandidat.has(candidatNom)) {
        tractsByCandidat.set(candidatNom, []);
      }

      tractsByCandidat.get(candidatNom).push(tract);
    }

    // Enrichir chaque candidat avec ses tracts
    const enrichedCandidats = candidats.map(candidat => {
      const candidatNom = candidat.nom?.toUpperCase();
      const tracts = tractsByCandidat.get(candidatNom) || [];

      if (tracts.length === 0) {
        return candidat;
      }

      // Fusionner toutes les propositions des tracts avec celles existantes
      const allPropositions = [...(candidat.propositions || [])];

      for (const tract of tracts) {
        const tractPropositions = tract.extracted_data?.propositions || [];
        allPropositions.push(...tractPropositions);
      }

      // Dédupliquer les propositions similaires
      const uniquePropositions = [...new Set(allPropositions.map(p => p.toLowerCase()))]
        .map(p => allPropositions.find(orig => orig.toLowerCase() === p));

      console.log(`    ✓ ${candidat.nom}: ${tracts.length} tract(s), ${uniquePropositions.length} propositions totales`);

      return {
        ...candidat,
        propositions: uniquePropositions,
        tract_count: tracts.length
      };
    });

    return enrichedCandidats;

  } catch (error) {
    console.error('⚠️  Erreur enrichissement tracts:', error.message);
    // En cas d'erreur, retourner les candidats non enrichis
    return candidats;
  }
}

// ============================================
// COLLECTE DU CONTEXTE LOCAL
// ============================================

async function collectContextData(commune, candidats, anthropic) {
  const context = {
    actualites: [],
    projets: [],
    controverses: [],
    divergences_candidats: []
  };

  // 1. Web search pour actualités locales (optionnel, non-bloquant)
  try {
    console.log(`🔍 Recherche d'actualités pour ${commune.nom}...`);

    const searchPrompt = `Recherche les actualités récentes (2024-2026) concernant ${commune.nom} (Ille-et-Vilaine, Rennes Métropole) :
- Projets d'urbanisme ou d'aménagement en cours ou prévus
- Décisions importantes du conseil municipal
- Controverses ou débats locaux
- Enjeux spécifiques pour les municipales 2026
- Dynamiques économiques, sociales ou environnementales locales

Retourne un JSON strict : [{"titre": "...", "resume": "...", "source": "...", "date": "..."}]
Maximum 5 résultats les plus pertinents et récents.
Si aucune actualité pertinente, retourne un array vide : []`;

    const searchResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: searchPrompt }],
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search'
      }]
    });

    // Extraire TOUS les blocs de texte
    const textBlocks = searchResponse.content.filter(c => c.type === 'text');
    const textContent = textBlocks.map(b => b.text).join('');

    if (textContent) {
      // Extraire le JSON de la réponse
      let jsonText = textContent.trim();

      // Nettoyer les balises markdown
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }

      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        context.actualites = JSON.parse(jsonMatch[0]);
        console.log(`✓ ${context.actualites.length} actualité(s) locale(s) trouvée(s)`);
      } else {
        context.actualites = [];
        console.log(`ℹ️  Aucune actualité locale trouvée`);
      }
    }
  } catch (e) {
    console.warn(`⚠️  Erreur recherche actualités: ${e.message}`);
    context.actualites = [];
  }

  // 2. Calculer les divergences entre candidats
  if (candidats && candidats.length >= 2) {
    context.divergences_candidats = findCandidateDivergences(candidats);
    console.log(`✓ ${context.divergences_candidats.length} divergences identifiées`);
  }

  return context;
}

// ============================================
// CONSTRUCTION DU PROMPT
// ============================================

function buildQuestionGenerationPrompt(commune, candidats, context) {
  // Calculer la distribution
  const distribution = { ...DISTRIBUTION };

  // Si pas assez de candidats avec positions OU propositions, redistribuer les divergences
  const candidatsWithData = candidats && candidats.filter(c =>
    (c.positions && Object.keys(c.positions).length > 0) ||
    (c.propositions && c.propositions.length > 0)
  );
  const hasEnoughCandidats = candidatsWithData && candidatsWithData.length >= 2;

  if (!hasEnoughCandidats) {
    distribution.locaux += distribution.divergences;
    distribution.divergences = 0;
    console.log('⚠️  Pas assez de candidats → redistribution divergences vers locaux');
  } else {
    console.log(`✓ ${candidatsWithData.length} candidats avec données → divergences activées`);
  }

  // Construire le prompt
  return `Tu es un expert en élections municipales françaises.

Ta mission : générer ${TOTAL_QUESTIONS} questions pour le quiz électoral de **${commune.nom}** (${commune.code_insee}).

---

## 📍 CONTEXTE DE LA COMMUNE

**Données générales :**
- Nom : ${commune.nom}
- Population : ${commune.population?.toLocaleString() || 'N/A'} habitants
- Superficie : ${commune.superficie_km2 || 'N/A'} km²
- Densité : ${Math.round(commune.densite_hab_km2 || 0)} hab/km²
- Profil : ${commune.profil_commune || 'periurbain_stable'}

**Enjeux prioritaires identifiés :**
${JSON.stringify(commune.enjeux_prioritaires || [], null, 2)}

**Profil détaillé :**
${getProfilDescription(commune.profil_commune)}

---

## 👥 CANDIDATS DÉCLARÉS

${formatCandidatsForPrompt(candidats)}

---

## 📰 ACTUALITÉS ET ENJEUX LOCAUX

${formatContextForPrompt(context)}

---

## 📊 DISTRIBUTION DEMANDÉE

Tu dois générer exactement **${TOTAL_QUESTIONS} questions** réparties ainsi :

### SOCLE THÉMATIQUE : ${distribution.socle} questions
Questions sur les grands thèmes municipaux, **OBLIGATOIREMENT contextualisées aux enjeux spécifiques de ${commune.nom}**.

**IMPORTANT** : Chaque question du socle DOIT intégrer :
- Un projet, lieu ou enjeu réel de ${commune.nom}
- Une référence aux enjeux prioritaires : ${commune.enjeux_prioritaires?.join(', ') || 'non définis'}
- Une adaptation au profil "${commune.profil_commune}" de la commune

Répartition obligatoire :
- Transport/Mobilité : 2 questions (adapter selon densité: ${Math.round(commune.densite_hab_km2 || 0)} hab/km²)
- Logement/Urbanisme : 2 questions (tenir compte du profil ${commune.profil_commune})
- Environnement : 1 question (projets locaux, espaces verts, biodiversité locale)
- Fiscalité/Budget : 1 question (budget communal, investissements récents)
- Services publics : 1 question (écoles, équipements, services de proximité)
- Démocratie locale : 1 question (participation citoyenne, conseils de quartier)

### ENJEUX LOCAUX : ${distribution.locaux} questions
Questions **EXCLUSIVEMENT** basées sur ${commune.nom} :
- ${context.actualites?.length > 0 ? `Les ${context.actualites.length} actualités locales identifiées ci-dessus` : 'Les spécificités locales'}
- Les projets d'aménagement ou d'urbanisme en cours
- Les débats ou controverses récentes au conseil municipal
- Les thématiques précises abordées dans les tracts des candidats
- Les enjeux prioritaires : ${commune.enjeux_prioritaires?.join(', ') || 'à identifier'}

**RÈGLE CRITIQUE** : Ces questions doivent être IMPOSSIBLES à poser dans une autre commune sans modification.

${distribution.divergences > 0 ? `### DIVERGENCES CANDIDATS : ${distribution.divergences} questions
Questions sur les sujets où les candidats ont les positions **les plus opposées**.
Identifie les 2 thèmes avec le plus grand écart de positions entre candidats.` : ''}

---

## ⚠️ RÈGLES STRICTES À RESPECTER

### 1. NEUTRALITÉ ABSOLUE
- ❌ Jamais de questions orientées : "Ne faudrait-il pas...", "N'est-il pas évident que..."
- ❌ Jamais de mots connotés : "malheureusement", "heureusement", "évidemment"
- ✅ Questions neutres et factuelles

### 2. ANONYMAT DES CANDIDATS - RÈGLE CRITIQUE
${candidats && candidats.length > 0 ? `
**CANDIDATS À NE JAMAIS MENTIONNER :**
${candidats.map(c => `- ${c.prenom} ${c.nom}`).join('\n')}

**INTERDICTIONS ABSOLUES :**
- ❌ AUCUN nom de candidat (ni nom de famille, ni prénom) ne doit apparaître dans les questions
- ❌ AUCUN nom de liste électorale ne doit apparaître
- ❌ Jamais "Le candidat X propose...", "Selon Y...", "La liste de Z..."
- ❌ Éviter tout mot qui ressemble à un nom de candidat
- ✅ Toujours formuler de manière générique et anonyme
- ✅ Utiliser "certains proposent", "des voix s'élèvent", "le débat porte sur"
` : ''}

### 3. FORMAT DES OPTIONS
- Exactement **5 options** par question
- Échelle cohérente du plus "restrictif/contre" au plus "permissif/pour"
- Options claires et distinctes, pas de redondance

### 4. CONTEXTUALISATION LOCALE
- Mentionner des éléments spécifiques à ${commune.nom}
- Référencer des projets/lieux/enjeux locaux quand pertinent
- Adapter le vocabulaire au profil de commune

### 5. LONGUEUR ET CLARTÉ
- Question : 30 à 150 caractères
- Contexte : 50 à 200 caractères (informatif, factuel)
- Options : 10 à 60 caractères chacune

---

## 📋 FORMAT DE SORTIE (JSON STRICT)

Retourne UNIQUEMENT un tableau JSON valide, sans commentaire ni texte avant/après.

\`\`\`json
[
  {
    "code": "${commune.code_insee}_Q01",
    "index": 1,
    "type": "socle",
    "categorie": "Transport",
    "texte": "La question contextuelle...",
    "contexte": "Contexte factuel local (1-2 phrases)...",
    "options": [
      "Option 1 (position minimale/contre)",
      "Option 2 (plutôt contre)",
      "Option 3 (neutre/équilibre)",
      "Option 4 (plutôt pour)",
      "Option 5 (position maximale/pour)"
    ],
    "positions_candidats": {
      "uuid_candidat_1": {
        "position": 2,
        "justification": "Basé sur sa proposition de..."
      }
    },
    "sources": ["profil", "actualite"],
    "poids": 1.0
  }
]
\`\`\`

---

## 🏁 GÉNÈRE MAINTENANT

Génère les ${TOTAL_QUESTIONS} questions pour **${commune.nom}** en respectant :
- La distribution : ${distribution.socle} socle + ${distribution.locaux} locaux${distribution.divergences > 0 ? ` + ${distribution.divergences} divergences` : ''}
- Toutes les règles ci-dessus
- Le format JSON strict

Retourne UNIQUEMENT le JSON, sans aucun texte avant ou après.`;
}

// ============================================
// VALIDATION DES QUESTIONS
// ============================================

function validateGeneratedQuestions(questions, candidats) {
  const errors = [];
  const warnings = [];

  // Filtrer les candidats factices générés (Opposition, Maire, etc.)
  const realCandidats = candidats ? candidats.filter(c => {
    const nomLower = c.nom.toLowerCase();
    const prenomLower = c.prenom.toLowerCase();
    // Exclure les placeholders
    const isPlaceholder = nomLower === 'opposition' || nomLower === 'maire' ||
                         prenomLower === 'liste' || prenomLower === 'sortant';
    return !isPlaceholder;
  }) : [];

  const candidateNames = realCandidats.map(c =>
    [c.nom.toLowerCase(), c.prenom.toLowerCase()]
  ).flat();

  const biasedWords = [
    'évidemment', 'bien sûr', 'malheureusement', 'heureusement',
    'ne faudrait-il pas', "n'est-il pas", 'ne devrait-on pas'
  ];

  // Vérifier que c'est un array
  if (!Array.isArray(questions)) {
    errors.push('La réponse doit être un tableau de questions');
    return { valid: false, errors, warnings, stats: {} };
  }

  // Vérifier le nombre de questions
  if (questions.length !== TOTAL_QUESTIONS) {
    warnings.push(`Attendu ${TOTAL_QUESTIONS} questions, reçu ${questions.length}`);
  }

  // Vérifier chaque question
  questions.forEach((q, i) => {
    const qNum = `Q${i + 1}`;

    // Check: 5 options
    if (!q.options || q.options.length !== 5) {
      errors.push(`${qNum}: Doit avoir exactement 5 options (a ${q.options?.length || 0})`);
    }

    // Check: Pas de noms de candidats (avec word boundaries)
    if (q.texte) {
      const textLower = q.texte.toLowerCase();
      candidateNames.forEach(name => {
        // Utiliser une regex avec word boundaries pour éviter les faux positifs
        // Ex: "jean" ne matchera pas "océan"
        const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(textLower)) {
          errors.push(`${qNum}: Contient le nom d'un candidat "${name}"`);
        }
      });

      // Check: Pas de mots orientés
      biasedWords.forEach(word => {
        if (textLower.includes(word)) {
          warnings.push(`${qNum}: Mot potentiellement orienté "${word}"`);
        }
      });

      // Check: Longueur
      if (q.texte.length < 20) {
        warnings.push(`${qNum}: Question trop courte (${q.texte.length} car.)`);
      }
      if (q.texte.length > 200) {
        warnings.push(`${qNum}: Question trop longue (${q.texte.length} car.)`);
      }
    } else {
      errors.push(`${qNum}: Texte manquant`);
    }

    // Check: Contexte présent
    if (!q.contexte || q.contexte.length < 20) {
      warnings.push(`${qNum}: Contexte manquant ou trop court`);
    }

    // Check: Code unique
    if (!q.code) {
      errors.push(`${qNum}: Code manquant`);
    }

    // Check: Champs requis
    if (!q.categorie) warnings.push(`${qNum}: Catégorie manquante`);
    if (!q.type) warnings.push(`${qNum}: Type manquant`);
  });

  // Check global: Diversité des catégories
  const categories = [...new Set(questions.map(q => q.categorie).filter(Boolean))];
  if (categories.length < 5) {
    warnings.push(`Diversité faible: seulement ${categories.length} catégories différentes`);
  }

  // Check global: Distribution des types
  const types = questions.reduce((acc, q) => {
    if (q.type) {
      acc[q.type] = (acc[q.type] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      total: questions.length,
      categories: categories.length,
      types
    }
  };
}

// ============================================
// GÉNÉRATION AVEC RETRY
// ============================================

async function generateQuestionsWithRetry(anthropic, prompt, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const waitTime = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`⏳ Attente de ${waitTime / 1000}s avant nouvelle tentative...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      console.log(`\n✍️  Génération des questions avec Claude... (tentative ${attempt}/${maxRetries})`);

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      });

      console.log(`✓ Réponse reçue (${response.usage.input_tokens} tokens in, ${response.usage.output_tokens} tokens out)`);

      // Parser la réponse
      const textContent = response.content.find(c => c.type === 'text');

      // Nettoyer et parser le JSON
      let jsonText = textContent.text.trim();

      // Retirer les balises markdown
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }

      jsonText = jsonText.trim();
      const questions = JSON.parse(jsonText);

      // Succès !
      if (attempt > 1) {
        console.log(`✅ Succès après ${attempt} tentative(s)`);
      }

      return { questions, usage: response.usage };

    } catch (e) {
      lastError = e;
      console.error(`❌ Tentative ${attempt}/${maxRetries} échouée:`, e.message);

      if (attempt === maxRetries) {
        console.error('❌ Toutes les tentatives ont échoué');
        throw new Error(`Échec après ${maxRetries} tentatives: ${e.message}`);
      }
    }
  }

  throw lastError;
}

// ============================================
// GÉNÉRATION COMPLÈTE
// ============================================

export async function generateQuestionsForCommune(commune, candidats = []) {
  console.log(`\n🚀 Génération des questions pour ${commune.nom} (${commune.code_insee})`);
  console.log('='.repeat(60));

  // 1. Initialiser l'API Claude
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  // 2. Enrichir les candidats avec les tracts validés
  console.log('\n📄 Enrichissement avec tracts validés...');
  const enrichedCandidats = await enrichCandidatsWithTracts(candidats, commune.code_insee);

  // 3. Collecter le contexte
  console.log('\n📊 Collecte du contexte...');
  const context = await collectContextData(commune, enrichedCandidats, anthropic);

  // 4. Construire le prompt
  const prompt = buildQuestionGenerationPrompt(commune, enrichedCandidats, context);

  // 5. Générer les questions avec retry ET validation
  let questions, usage, validation;
  let lastValidationError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Générer
      const result = await generateQuestionsWithRetry(anthropic, prompt, 1);
      questions = result.questions;
      usage = result.usage;

      // Valider
      console.log('\n🔍 Validation des questions...');
      validation = validateGeneratedQuestions(questions, enrichedCandidats);

      if (validation.valid) {
        // Succès!
        break;
      } else {
        // Échec de validation
        lastValidationError = validation.errors.join(', ');
        console.error(`❌ Tentative ${attempt}/3 - Erreurs de validation:`);
        validation.errors.forEach(err => console.error(`  - ${err}`));

        if (attempt < 3) {
          console.log('🔄 Nouvelle tentative de génération...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (e) {
      console.error(`❌ Tentative ${attempt}/3 échouée:`, e.message);
      if (attempt === 3) {
        throw e;
      }
    }
  }

  // Vérifier si on a des questions valides
  if (!validation || !validation.valid) {
    console.error('❌ Échec après 3 tentatives de génération/validation');
    throw new Error(`Questions invalides après 3 tentatives: ${lastValidationError}`);
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Warnings:');
    validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }

  console.log('\n✅ Questions validées:');
  console.log(`  - ${validation.stats.total} questions générées`);
  console.log(`  - ${validation.stats.categories} catégories différentes`);
  console.log(`  - Distribution: ${JSON.stringify(validation.stats.types)}`);

  // 7. Retourner
  const generationMode = enrichedCandidats.length >= 2 ? 'complete' : 'degraded';
  const sources = [];
  if (commune.profil_commune) sources.push('profil');
  if (context.actualites.length > 0) sources.push('web_search');
  if (enrichedCandidats.length > 0) sources.push('candidats');

  // Vérifier si des tracts ont été utilisés
  const tractsUsed = enrichedCandidats.some(c => c.tract_count > 0);
  if (tractsUsed) {
    sources.push('tracts_valides');
    const totalTracts = enrichedCandidats.reduce((sum, c) => sum + (c.tract_count || 0), 0);
    console.log(`  ✓ ${totalTracts} tract(s) validé(s) intégré(s) dans la génération`);
  }

  return {
    commune_code: commune.code_insee,
    commune_nom: commune.nom,
    questions,
    validation,
    metadata: {
      generated_at: new Date().toISOString(),
      generated_by: 'claude-sonnet-4',
      generation_mode: generationMode,
      sources,
      total_questions: questions.length,
      question_types: validation.stats.types,
      context_data: context,
      tracts_count: tractsUsed ? enrichedCandidats.reduce((sum, c) => sum + (c.tract_count || 0), 0) : 0,
      api_usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens
      }
    }
  };
}

// Export par défaut
export default {
  generateQuestionsForCommune,
  validateGeneratedQuestions,
  buildQuestionGenerationPrompt,
  collectContextData,
  findCandidateDivergences,
  enrichCandidatsWithTracts
};
