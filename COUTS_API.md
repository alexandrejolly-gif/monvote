# 💰 RÉCAPITULATIF COMPLET DES COÛTS API - MonVote

Date: 2026-01-12
Modèle principal: Claude Sonnet 4 (claude-sonnet-4-20250514)

## 📊 TARIFS DE BASE (Claude Sonnet 4)

- **Input tokens**: $3.00 / 1M tokens
- **Output tokens**: $15.00 / 1M tokens

---

## 🏘️ 1. AJOUTER UNE COMMUNE COMPLÈTE

### Scénario A: Commune avec 5 candidats trouvés
**Coût total estimé: $0.20-0.25**

| Opération | Input tokens | Output tokens | Coût |
|-----------|--------------|---------------|------|
| 1. Recherche maire sortant | 500 | 300 | $0.006 |
| 2. Recherche candidats (web_search) | 800 | 500 | $0.010 |
| 3. Recherche programme candidat 1 | 600 | 400 | $0.008 |
| 4. Recherche programme candidat 2 | 600 | 400 | $0.008 |
| 5. Recherche programme candidat 3 | 600 | 400 | $0.008 |
| 6. Recherche programme candidat 4 | 600 | 400 | $0.008 |
| 7. Recherche programme candidat 5 | 600 | 400 | $0.008 |
| 8. Recherche actualités locales (web_search) | 1000 | 800 | $0.015 |
| 9. Génération 15 questions | 12000 | 8000 | $0.156 |
| 10. Positionnement candidat 1 | 3000 | 300 | $0.014 |
| 11. Positionnement candidat 2 | 3000 | 300 | $0.014 |
| 12. Positionnement candidat 3 | 3000 | 300 | $0.014 |
| 13. Positionnement candidat 4 | 3000 | 300 | $0.014 |
| 14. Positionnement candidat 5 | 3000 | 300 | $0.014 |
| **TOTAL** | **32,300** | **13,100** | **~$0.293** |

### Scénario B: Commune avec 3 candidats trouvés
**Coût total estimé: $0.15-0.20**

| Opération | Différence vs Scénario A | Coût |
|-----------|--------------------------|------|
| Moins 2 recherches de programmes | -1200 input, -800 output | -$0.016 |
| Moins 2 positionnements | -6000 input, -600 output | -$0.028 |
| **TOTAL** | **25,100 input, 11,700 output** | **~$0.251** |

### Scénario C: Commune avec 0 candidat trouvé
**Coût total estimé: $0.07-0.10**

| Opération | Input tokens | Output tokens | Coût |
|-----------|--------------|---------------|------|
| 1. Recherche maire sortant | 500 | 300 | $0.006 |
| 2. Recherche candidats (aucun trouvé) | 800 | 500 | $0.010 |
| 3. Recherche actualités locales | 1000 | 800 | $0.015 |
| 4. Génération 15 questions (mode dégradé) | 8000 | 6000 | $0.114 |
| **TOTAL** | **10,300** | **7,600** | **~$0.145** |

> ⚠️ **Mode dégradé**: Sans candidats, les questions sont générées uniquement sur les enjeux locaux (pas de divergences candidats)

---

## 🔍 2. RECHERCHE MASSIVE DE CANDIDATS

**Coût par commune: ~$0.10**

| Opération | Input tokens | Output tokens | Coût unitaire |
|-----------|--------------|---------------|---------------|
| Recherche candidats | 800 | 500 | $0.010 |
| Recherche programme (×3 en moyenne) | 1800 | 1200 | $0.024 |
| **TOTAL par commune** | **2,600** | **1,700** | **~$0.033** |

> 📝 **Note**: Le coût réel dépend du nombre de candidats trouvés. Si 5 candidats: ~$0.056/commune

### Exemples de coûts totaux:
- **10 communes**: ~$0.30-0.60
- **42 communes (toutes)**: ~$1.40-2.40
- **100 communes**: ~$3.30-5.60

---

## 🔄 3. MISE À JOUR INTELLIGENTE

**Coût par commune: $0.05-0.10**

### Scénario: Mise à jour avec nouveaux tracts
| Opération | Input tokens | Output tokens | Coût |
|-----------|--------------|---------------|------|
| Recherche nouveaux candidats | 800 | 300 | $0.008 |
| Enrichissement programmes (tracts) | 2000 | 1000 | $0.021 |
| Régénération positions si nécessaire | 3000 | 300 | $0.014 |
| **TOTAL** | **5,800** | **1,600** | **~$0.041** |

### Scénario: Régénération questions nécessaire
| Opération | Input tokens | Output tokens | Coût |
|-----------|--------------|---------------|------|
| Opérations ci-dessus | 5,800 | 1,600 | $0.041 |
| Régénération 15 questions | 12,000 | 8,000 | $0.156 |
| Repositionnement candidats (×5) | 15,000 | 1,500 | $0.068 |
| **TOTAL** | **32,800** | **11,100** | **~$0.265** |

---

## 🔥 4. TOUT REGÉNÉRER

**Coût par commune: $0.15-0.25**

| Opération | Input tokens | Output tokens | Coût |
|-----------|--------------|---------------|------|
| Recherche actualités | 1000 | 800 | $0.015 |
| Génération 15 questions | 12,000 | 8,000 | $0.156 |
| Positionnement candidats (×5) | 15,000 | 1,500 | $0.068 |
| **TOTAL** | **28,000** | **10,300** | **~$0.239** |

---

## 📋 5. VALIDATION AUTOMATIQUE DE TRACTS

**Coût par tract: $0.02-0.04**

| Opération | Input tokens | Output tokens | Coût |
|-----------|--------------|---------------|------|
| Analyse image (vision) | 2000 | 800 | $0.018 |
| Validation contenu | 1500 | 500 | $0.012 |
| **TOTAL par tract** | **3,500** | **1,300** | **~$0.030** |

> 📷 **Note**: L'analyse d'images peut varier selon la complexité et la taille du document

---

## 📊 6. RÉCAPITULATIF PAR ACTIONS ADMIN

| Action | Coût minimum | Coût maximum | Coût moyen |
|--------|--------------|--------------|------------|
| Ajouter 1 commune (0 candidats) | $0.07 | $0.10 | $0.09 |
| Ajouter 1 commune (3-5 candidats) | $0.15 | $0.25 | $0.20 |
| Rechercher candidats (1 commune) | $0.03 | $0.06 | $0.05 |
| Mise à jour intelligente (1 commune) | $0.04 | $0.27 | $0.08 |
| Tout regénérer (1 commune) | $0.15 | $0.25 | $0.20 |
| Valider 1 tract | $0.02 | $0.04 | $0.03 |

---

## 🌍 7. SCÉNARIOS COMPLETS

### Scénario A: Démarrage complet (42 communes)
```
42 communes × $0.20 (moyenne) = $8.40
```

### Scénario B: Maintenance mensuelle
```
- 5 nouvelles communes: 5 × $0.20 = $1.00
- 15 mises à jour intelligentes: 15 × $0.08 = $1.20
- 50 validations de tracts: 50 × $0.03 = $1.50
TOTAL: ~$3.70/mois
```

### Scénario C: Grande mise à jour (régénération)
```
42 communes × $0.20 = $8.40
```

---

## 💡 8. OPTIMISATIONS POSSIBLES

### Actuelles:
✅ Cache Wikimedia (15 min) pour photos
✅ Mode dégradé si 0 candidat
✅ Pas de positionnement si propositions vides
✅ Web search uniquement si communes > 50k habitants

### Potentielles:
🔸 Utiliser Haiku pour validations simples (-70% coût)
🔸 Cache Claude avec prompt caching (-90% sur prompts répétés)
🔸 Batch processing pour positionnements multiples
🔸 Limiter web_search à 3 actualités max au lieu de 5

---

## 🎯 9. RECOMMANDATIONS BUDGÉTAIRES

**Budget mensuel recommandé selon usage:**

| Type d'usage | Budget suggéré | Détail |
|--------------|----------------|--------|
| Développement/Test | $5-10/mois | Tests limités, quelques communes |
| Démarrage | $10-20 | Setup initial ~40 communes |
| Production stable | $5-15/mois | Mises à jour, nouveaux tracts |
| Expansion active | $20-50/mois | Ajouts fréquents, régénérations |

---

## ⚠️ 10. ALERTES ET LIMITES

### Limites quotidiennes suggérées:
- **Max 50 ajouts de communes/jour** → $10/jour max
- **Max 100 validations tracts/jour** → $3/jour max
- **Max 20 régénérations/jour** → $4/jour max

### Alertes à configurer:
🚨 **$20/jour** → Investigation
🚨 **$50/semaine** → Révision usage
🚨 **$200/mois** → Audit complet

---

## 📈 11. TRACKING RECOMMANDÉ

Ajouter dans le code:
```javascript
// Logger chaque appel Claude avec:
- timestamp
- operation_type (add_commune, search, generate, etc.)
- input_tokens
- output_tokens
- estimated_cost
- commune_code (si applicable)
```

Créer un dashboard:
- Coût par jour/semaine/mois
- Coût par type d'opération
- Top communes coûteuses
- Taux d'échec (coûts perdus)

---

## 🔐 12. SÉCURITÉ BUDGET

### Implémenter:
1. **Rate limiting** par IP admin
2. **Confirmation obligatoire** pour opérations > $5
3. **Logs d'audit** de toutes opérations payantes
4. **Budget cap** configurable dans .env
5. **Notifications email** si budget dépassé

---

*Généré le 2026-01-12*
*Tarifs basés sur Claude Sonnet 4 API pricing*
