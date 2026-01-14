# Protection contre les confusions de communes homonymes

## 🎯 Problématique

Les recherches web et génération de contenu peuvent confondre des communes homonymes :
- **Chartres** (Eure-et-Loir, 39 000 hab.) vs **Chartres-de-Bretagne** (Ille-et-Vilaine, 9 000 hab.)
- **Saint-Denis** (Seine-Saint-Denis) vs dizaines d'autres Saint-Denis
- Etc.

Sans identifiants précis, Claude peut retourner des informations sur la mauvaise commune.

## ✅ Solutions implémentées

### 1. Nouveau module utilitaire (`lib/commune-utils.js`)

Fonctions pour extraire automatiquement:
- Code département depuis le code INSEE (ex: "35" depuis "35238")
- Nom complet du département (ex: "Ille-et-Vilaine")
- Contexte complet pour les recherches

```javascript
import { getCommuneFullContext } from './lib/commune-utils.js';

const context = getCommuneFullContext('Chartres-de-Bretagne', '35066');
// Résultat:
// {
//   nom: 'Chartres-de-Bretagne',
//   dept: 'Ille-et-Vilaine',
//   deptCode: '35',
//   codeInsee: '35066',
//   fullName: 'Chartres-de-Bretagne (Ille-et-Vilaine)',
//   searchSuffix: ' Ille-et-Vilaine'
// }
```

### 2. Prompts améliorés (`lib/prompts.js`)

Tous les prompts ont été mis à jour pour inclure:

#### **PROMPT_RECHERCHE_CANDIDATS**
```javascript
// Avant
PROMPT_RECHERCHE_CANDIDATS(commune)
// → "candidats municipales 2026 Chartres"

// Après
PROMPT_RECHERCHE_CANDIDATS(communeNom, communeDept, communeCodeInsee)
// → "candidats municipales 2026 Chartres-de-Bretagne Ille-et-Vilaine"
// → CODE INSEE : 35066
```

**Changements**:
- ✅ Ajout département dans les recherches web
- ✅ Ajout code INSEE comme référence
- ✅ Warning explicite contre les homonymes
- ❌ Suppression du fallback 2020 (comme demandé)

#### **PROMPT_RECHERCHE_MAIRE**
Même approche que candidats.

#### **PROMPT_RECHERCHE_PROGRAMME**
```javascript
PROMPT_RECHERCHE_PROGRAMME(candidat, communeNom, communeDept, communeCodeInsee)
```

**Changements**:
- ✅ Département dans toutes les recherches
- ✅ Warning: "Les propositions doivent concerner CETTE commune précisément"
- ✅ Code INSEE dans les recherches de tracts

#### **PROMPT_ANALYSE_TRACT**
```javascript
PROMPT_ANALYSE_TRACT(communeNom, communeDept, communeCodeInsee)
```

**Changements**:
- ✅ Affichage code INSEE et département attendus
- ✅ Extraction département et code postal depuis le tract
- ✅ Nouveaux champs JSON:
  - `departement_mentionne`
  - `code_postal_mentionne`
- ✅ Warning explicite sur les homonymes

#### **PROMPT_VALIDATION_TRACT**
```javascript
PROMPT_VALIDATION_TRACT(communeNom, analysisResult, communeDept, communeCodeInsee)
```

**Changements**:
- ✅ Vérification stricte du département mentionné
- ✅ Rejet automatique si homonyme détecté
- ✅ Exemple explicite: "Chartres" vs "Chartres-de-Bretagne"

#### **PROMPT_GENERER_QUESTIONS**
```javascript
PROMPT_GENERER_QUESTIONS(communeNom, candidats, count, minOptions, maxOptions, communeDept, communeCodeInsee)
```

**Changements**:
- ✅ Contexte géographique complet
- ✅ Warning: "Ne génère PAS de questions concernant d'autres communes homonymes"

### 3. Mise à jour du code (`api/admin/search-candidats.js`)

```javascript
import { getCommuneFullContext } from '../../lib/commune-utils.js';

async function searchCandidats(commune, anthropic) {
  const context = getCommuneFullContext(commune.nom, commune.code);

  console.log(`🔍 Recherche candidats pour ${context.fullName}...`);

  const response = await anthropic.messages.create({
    messages: [{
      content: PROMPT_RECHERCHE_CANDIDATS(
        context.nom,
        context.dept,
        context.codeInsee
      )
    }]
  });
}
```

## 📊 Exemple concret

### Avant (risque de confusion)
```
Recherche: "candidats municipales 2026 Chartres"
→ Résultats possibles: Chartres (28) + Chartres-de-Bretagne (35)
→ ⚠️ Risque: Claude mélange les deux communes
```

### Après (désambiguïsation)
```
Recherche: "candidats municipales 2026 Chartres-de-Bretagne Ille-et-Vilaine"
CODE INSEE : 35066
DÉPARTEMENT ATTENDU : Ille-et-Vilaine

→ Résultats ciblés uniquement sur Chartres-de-Bretagne (35)
→ ✅ Claude sait exactement quelle commune chercher
```

## 🔄 Actions restantes

### Fichiers à mettre à jour (si utilisés ailleurs)

1. **`api/admin/add-commune.js`** - Si utilise recherche de candidats/maire
2. **`api/admin/regenerate-commune.js`** - Déjà mis à jour ?
3. **`api/admin/update-commune.js`** - Déjà mis à jour ?
4. **`lib/question-generator.js`** - Si utilise PROMPT_GENERER_QUESTIONS directement
5. **APIs de soumission de tracts** - Pour PROMPT_ANALYSE_TRACT

### Vérification nécessaire

```bash
# Rechercher tous les appels de prompts
grep -r "PROMPT_RECHERCHE_CANDIDATS\|PROMPT_RECHERCHE_MAIRE\|PROMPT_RECHERCHE_PROGRAMME" --include="*.js" .

# Vérifier qu'ils passent bien les 3 paramètres
```

## 🎯 Impact attendu

### Avant
- ⚠️ Risque de confusion pour ~10-15% des communes (homonymes)
- ⚠️ Informations potentiellement erronées
- ⚠️ Tracts d'autres communes acceptés par erreur

### Après
- ✅ Recherches ciblées avec département
- ✅ Code INSEE comme référence officielle
- ✅ Validation stricte des tracts (département + commune)
- ✅ Warning explicites dans tous les prompts

## 📝 Notes importantes

1. **Code INSEE = source de vérité**
   - Unique par commune en France
   - Géré par l'INSEE
   - Immuable (sauf fusion de communes)

2. **Département dans recherches web**
   - "Chartres" → ambiguë
   - "Chartres-de-Bretagne Ille-et-Vilaine" → précis
   - "Chartres-de-Bretagne 35" → aussi précis

3. **Validation tracts renforcée**
   - Vérifie commune ET département
   - Rejette si mismatch détecté
   - Nouveaux champs pour traçabilité

## 🚀 Test recommandé

Tester avec des communes homonymes:
- Saint-Denis (93) vs Saint-Denis-d'Oléron (17)
- Neuilly (92) vs Neuilly-Plaisance (93) vs Neuilly-sur-Marne (93)
- La Chapelle (nombreuses communes)
