# Guide de déploiement MonVote

Ce guide vous accompagne étape par étape pour déployer MonVote.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :
- Un compte [Anthropic](https://www.anthropic.com) avec une clé API
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit)
- Node.js 18+ installé localement

## 1️⃣ Configuration Supabase

### Créer un projet

1. Connectez-vous à [Supabase](https://supabase.com)
2. Créez un nouveau projet
3. Notez l'URL et la clé `anon public` du projet

### Créer la base de données

1. Allez dans l'éditeur SQL de Supabase
2. Copiez le contenu de `database/schema.sql`
3. Exécutez le script

### Créer le bucket Storage

1. Allez dans "Storage" dans Supabase
2. Créez un nouveau bucket nommé `submissions`
3. Rendez-le **public** :
   - Cliquez sur le bucket
   - Policies → New policy
   - Sélectionnez "Allow public read access"

## 2️⃣ Configuration locale

### Installer les dépendances

```bash
cd monvote
npm install
```

### Configurer les variables d'environnement

1. Copiez `.env.example` vers `.env`
2. Remplissez les variables :

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx  # Votre clé API Claude

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co  # URL de votre projet
SUPABASE_ANON_KEY=eyJxxxxx               # Clé anon public

# Admin
ADMIN_SECRET_KEY=VotreMotDePasseSecretTresLong2026!

# Config (valeurs par défaut OK)
CACHE_TTL_HOURS=24
MAX_CANDIDATES_PER_COMMUNE=10

# Rate Limiting
UPLOAD_LIMIT_PER_IP_PER_DAY=5
UPLOAD_LIMIT_PER_COMMUNE_PER_DAY=20
UPLOAD_LIMIT_TOTAL_PER_DAY=200

# Validation
AUTO_VALIDATION_THRESHOLD=0.80
```

### Tester en local

```bash
npm run dev
```

L'application sera disponible sur http://localhost:3000

## 3️⃣ Déploiement sur Vercel

### Via l'interface Vercel

1. Connectez-vous à [Vercel](https://vercel.com)
2. Cliquez sur "New Project"
3. Importez votre repository Git
4. Configurez les variables d'environnement (mêmes que .env)
5. Déployez !

### Via CLI

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
npm run deploy
```

### Configuration des variables d'environnement sur Vercel

1. Allez dans les paramètres du projet
2. Onglet "Environment Variables"
3. Ajoutez toutes les variables de `.env`
4. Redéployez

## 4️⃣ Configuration post-déploiement

### Activer le web_search pour Claude

Assurez-vous que votre clé API Anthropic a accès à l'outil `web_search_2026_01`.

### Tester les endpoints

```bash
# Liste des communes
curl https://votre-app.vercel.app/api/communes

# Candidats d'une commune
curl https://votre-app.vercel.app/api/candidats/35238

# Quiz d'une commune
curl https://votre-app.vercel.app/api/quiz/35238
```

### Accéder à l'admin

Rendez-vous sur : `https://votre-app.vercel.app/admin?key=VOTRE_ADMIN_SECRET_KEY`

## 5️⃣ Pré-génération des données (optionnel)

Pour économiser sur les coûts API, vous pouvez pré-générer les candidats et questions :

### Script de pré-génération (à créer)

```javascript
// scripts/pregenerate.js
import { searchCandidats, generateQuestions } from './lib/claude.js';
import { saveCandidats, saveQuestions } from './lib/supabase.js';
import { COMMUNES_RENNES_METROPOLE } from './lib/communes-rennes.js';

async function pregenerate() {
  for (const commune of COMMUNES_RENNES_METROPOLE) {
    console.log(`Traitement de ${commune.nom}...`);

    // Chercher les candidats
    const searchResult = await searchCandidats(commune.nom);

    if (searchResult.candidats.length > 0) {
      // Sauvegarder
      await saveCandidats(searchResult.candidats.map(c => ({
        commune_code: commune.code,
        commune_nom: commune.nom,
        ...c,
        source_type: 'web_search'
      })));

      // Générer les questions
      const quiz = await generateQuestions(commune.nom, searchResult.candidats);
      await saveQuestions(commune.code, commune.nom, quiz.questions);
    }

    // Attendre 2s entre chaque commune
    await new Promise(r => setTimeout(r, 2000));
  }
}

pregenerate();
```

Exécuter :
```bash
node scripts/pregenerate.js
```

## 6️⃣ Surveillance et maintenance

### Vérifier les logs Vercel

- Allez sur votre projet Vercel
- Onglet "Deployments"
- Cliquez sur un déploiement pour voir les logs

### Surveiller l'usage API Claude

- Console Anthropic → Usage
- Vérifiez que vous restez sous budget

### Nettoyer les rate limits

Exécutez périodiquement dans Supabase :

```sql
DELETE FROM rate_limits
WHERE window_start < NOW() - INTERVAL '7 days';
```

## 🔧 Résolution de problèmes

### Erreur 401 sur les endpoints admin

- Vérifiez que `ADMIN_SECRET_KEY` est bien configurée
- Passez la clé via `?key=XXX` dans l'URL

### Erreur lors de l'upload d'images

- Vérifiez que le bucket `submissions` existe et est public
- Vérifiez les permissions Supabase Storage

### "Missing Anthropic API Key"

- Vérifiez que `ANTHROPIC_API_KEY` est configurée sur Vercel
- Redéployez après avoir ajouté la variable

### Questions non générées

- Vérifiez les logs Vercel pour voir l'erreur Claude
- Assurez-vous que votre clé API a accès à `web_search`

## 📊 Monitoring

### Métriques à surveiller

- **Sessions** : Nombre d'utilisateurs qui font le quiz
- **Soumissions** : Nombre de tracts soumis par jour
- **Taux auto-validation** : % de tracts validés automatiquement
- **Coût API** : Usage Claude dans la console Anthropic

### Dashboard admin

Accédez régulièrement à `/admin` pour :
- Modérer les soumissions en attente
- Vérifier les stats d'usage
- Ajouter des candidats manquants

## 🎯 Checklist de lancement

Avant le 1er mars 2026 :

- [ ] Base de données Supabase configurée
- [ ] Bucket Storage créé et public
- [ ] Variables d'environnement Vercel configurées
- [ ] Application déployée et fonctionnelle
- [ ] Pré-génération des 43 communes effectuée
- [ ] Tests de tous les flux utilisateur
- [ ] Test du flux de contribution de tracts
- [ ] Test de l'interface admin
- [ ] Configuration d'alertes (budget API, erreurs)
- [ ] Communication du lien admin sécurisé

## 📞 Support

En cas de problème :
- Vérifiez les logs Vercel
- Consultez la documentation Anthropic
- Consultez la documentation Supabase
- Ouvrez une issue sur GitHub

---

**Bon déploiement ! 🚀**
