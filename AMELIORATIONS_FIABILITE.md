# Améliorations de Fiabilité - MonVote

Date: 11 janvier 2026

## 🔍 Problèmes Identifiés

### 1. Absence de Web Search dans les fonctions admin
**Impact**: Les fonctions `regenerate-commune`, `update-commune` et `add-commune` ne trouvaient AUCUN candidat car Claude n'avait pas accès à la recherche web.

**Symptômes**:
- Rennes: 0 candidats trouvés lors de la régénération
- Candidats avec "Données insuffisantes" (9/15 à Rennes)

**Fichiers affectés**:
- `api/admin/regenerate-commune.js`
- `api/admin/update-commune.js`
- `api/admin/add-commune.js`

### 2. Parsing incorrect des réponses Claude
**Impact**: Les réponses de Claude avec web_search contiennent plusieurs blocs (web_search_tool_result + text). Le code ne prenait que le premier bloc text avec `.find()`, ce qui manquait le contenu principal.

**Solution**: Utiliser `.filter()` pour extraire TOUS les blocs text et les concaténer.

```javascript
// ❌ AVANT (incorrect)
const textContent = response.content.find(c => c.type === 'text')?.text;

// ✅ APRÈS (correct)
const textBlocks = response.content.filter(c => c.type === 'text');
const textContent = textBlocks.map(b => b.text).join('');
```

### 3. Détection maire sortant peu fiable
**Impact**: Erreurs d'identification comme Betton (Thierry GAUTIER au lieu de Laurence Besserve).

**Améliorations apportées au prompt**:
1. Précision temporelle: "maire ACTUEL (en exercice en janvier 2026)"
2. Instructions claires:
   - Chercher le maire élu en 2020
   - Vérifier s'il est toujours en fonction
   - Privilégier sources officielles
   - En cas de doute, choisir la source la plus récente

3. Requêtes web améliorées:
   - "maire [commune] 2025"
   - "maire [commune] élu 2020"
   - "municipalité [commune] conseil municipal"
   - "mairie [commune] équipe"

## ✅ Corrections Appliquées

### Fichiers modifiés (10 au total)

1. **lib/claude.js** (déjà fait)
   - ✅ `searchCandidats()` avec context + web_search
   - ✅ `searchMaire()` avec context + web_search
   - ✅ `searchProgramme()` avec context + web_search

2. **api/admin/regenerate-commune.js**
   - ✅ Ajout `tools: [{ type: 'web_search_20250305' }]` dans `searchCandidats()`
   - ✅ Ajout `tools: [{ type: 'web_search_20250305' }]` dans `searchProgrammes()`
   - ✅ Fix parsing réponse (extraction tous les blocs text)

3. **api/admin/update-commune.js**
   - ✅ Ajout `tools: [{ type: 'web_search_20250305' }]` dans `searchCandidats()`
   - ✅ Ajout `tools: [{ type: 'web_search_20250305' }]` dans `searchProgramme()`
   - ✅ Fix parsing réponse

4. **api/admin/add-commune.js**
   - ✅ Ajout `tools: [{ type: 'web_search_20250305' }]` dans `searchCandidats()`
   - ✅ Ajout `tools: [{ type: 'web_search_20250305' }]` dans `searchProgrammes()`
   - ✅ Fix parsing réponse

5. **api/candidats/[code].js** (déjà fait)
   - ✅ Passe `code` commune aux fonctions

6. **api/quiz/[code].js** (déjà fait)
   - ✅ Passe `code` commune à `searchProgramme()`

7. **lib/prompts.js**
   - ✅ Protection homonymes complète (session précédente)
   - ✅ Prompt maire amélioré avec instructions temporelles

## 📊 Résultats Attendus

### Avant les corrections:
- ❌ Régénération Rennes: 0 candidats
- ❌ 9/15 candidats sans propositions
- ❌ Nathalie Appéré non identifiée comme maire
- ❌ Betton: mauvais maire identifié

### Après les corrections:
- ✅ Web search actif partout
- ✅ Parsing complet des réponses
- ✅ Protection homonymes sur toutes les recherches
- ✅ Prompt maire plus précis et fiable
- ✅ Meilleure détection du maire sortant

## 💡 Recommandations pour Maintenir la Fiabilité

### 1. Toujours utiliser web_search
Toute fonction qui interroge Claude pour des informations factuelles (candidats, maires, programmes) DOIT inclure:
```javascript
tools: [{
  type: 'web_search_20250305',
  name: 'web_search'
}]
```

### 2. Toujours extraire tous les blocs text
```javascript
const textBlocks = response.content.filter(c => c.type === 'text');
const textContent = textBlocks.map(b => b.text).join('');

if (!textContent) {
  console.error('No text content');
  return defaultValue;
}
```

### 3. Toujours passer le contexte géographique complet
```javascript
const context = getCommuneFullContext(communeNom, communeCode);
// Puis utiliser context.nom, context.dept, context.codeInsee
```

### 4. Vérification périodique
Créer un script de vérification qui:
- Compare les maires en base avec des sources officielles
- Identifie les communes sans maire sortant
- Signale les candidats sans propositions
- Peut utiliser WebSearch (gratuit) au lieu de Claude (payant)

### 5. Logs et monitoring
- Logger tous les appels API avec résultats
- Tracer les erreurs de parsing
- Surveiller le taux de candidats "sans données"

## 🔧 Scripts Utiles

### verify-maires.js
Script de vérification des maires sortants qui:
- Lit la base de données
- Compare avec les attentes
- Identifie les erreurs
- **N'utilise QUE l'API** (pas de crédits Claude consommés)

### test-homonymes.js
Valide que la protection homonymes fonctionne.

### regenerate-rennes.js
Régénère complètement une commune (exemple: Rennes).

## 📈 Coût Optimisé

Pour vérifier 42 communes sans exploser les coûts:
1. **Vérification base de données** (gratuit): Lister les communes sans maire/candidats
2. **WebSearch ciblé** (API gratuite): Vérifier uniquement les communes suspectes
3. **Claude uniquement si nécessaire**: Régénérer seulement les communes avec erreurs confirmées

**Estimation**:
- Vérification BD: 0€ (lecture locale)
- WebSearch: 0€ (API gratuite)
- Régénération 1 commune: ~5-10 requêtes Claude = ~$0.20-0.40

Donc pour vérifier intelligemment les 42 communes et régénérer seulement celles avec erreurs:
- Coût total: < $5 (au lieu de $15-20 si on régénère tout aveuglément)

## 🎯 Cas d'Usage

### Pour ajouter une nouvelle commune:
1. Utiliser `api/admin/add-commune` (AVEC web_search maintenant ✅)
2. Vérifier le maire sortant identifié
3. Si doute, utiliser WebSearch manuel pour confirmer

### Pour mettre à jour une commune:
1. Si nouveaux tracts: utiliser `api/admin/update-commune`
2. Si pas de nouveaux tracts mais données obsolètes: `regenerate-commune`

### Pour vérifier l'existant sans coût:
1. Lancer `verify-maires.js`
2. Noter les communes suspectes
3. Régénérer UNIQUEMENT celles-là

## 📝 Notes sur Betton

**Problème détecté**: Thierry GAUTIER identifié au lieu de Laurence Besserve

**Causes possibles**:
1. Thierry GAUTIER était peut-être maire adjoint ou conseiller très visible
2. Sources web contradictoires ou obsolètes
3. Changement récent (démission, décès)

**Solution**:
- Prompt maire amélioré avec consignes temporelles claires
- Régénération de Betton recommandée après Rennes
- Vérification manuelle sur site officiel de la mairie

**TODO**: Après régénération de Rennes, régénérer Betton et vérifier.
