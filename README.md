# MonVote - Quiz Electoral Municipales 2026

Application web de quiz électoral pour les municipales françaises de mars 2026.

## 🎯 Description

**MonVote** permet aux électeurs de :
- Choisir leur commune (géolocalisation ou liste)
- Répondre à 10 questions adaptées aux enjeux locaux
- Voir leur compatibilité avec les candidats

**Nouveauté V3** : Les utilisateurs peuvent contribuer en important des tracts de campagne, analysés automatiquement par Claude Vision.

## 📍 Périmètre MVP

- **Zone géographique** : Rennes Métropole (43 communes)
- **Date de lancement** : 1er mars 2026
- **Technologies** : Node.js, Vercel (serverless), Supabase, Claude API

## 🚀 Installation

### Prérequis

- Node.js >= 18
- Compte Anthropic (API Claude)
- Compte Supabase (base de données)
- Compte Vercel (déploiement)

### Configuration

1. Cloner le projet
```bash
git clone <repo-url>
cd monvote
```

2. Installer les dépendances
```bash
npm install
```

3. Créer le fichier `.env`
```bash
cp .env.example .env
```

4. Remplir les variables d'environnement dans `.env`

5. Créer la base de données Supabase
- Exécuter le script SQL dans `database/schema.sql`
- Créer un bucket Storage public nommé "submissions"

### Développement local

```bash
npm run dev
```

L'application sera disponible sur http://localhost:3000

### Déploiement

```bash
npm run deploy
```

## 📁 Structure du projet

```
monvote/
├── api/                  # Endpoints serverless
│   ├── communes.js
│   ├── candidats/[code].js
│   ├── quiz/[code].js
│   ├── resultats.js
│   ├── upload-tract.js
│   └── admin/
├── lib/                  # Code partagé
│   ├── claude.js
│   ├── claude-vision.js
│   ├── supabase.js
│   ├── auth.js
│   ├── validation.js
│   ├── rate-limit.js
│   ├── communes-rennes.js
│   └── prompts.js
├── public/              # Frontend utilisateur
│   ├── index.html
│   ├── contribuer.html
│   ├── styles.css
│   └── app.js
├── admin/               # Frontend admin
│   ├── index.html
│   ├── moderation.html
│   └── admin.js
└── database/            # Scripts SQL
    └── schema.sql
```

## 🔑 API Endpoints

### Public
- `GET /api/communes` - Liste des 43 communes
- `GET /api/candidats/:code` - Candidats d'une commune
- `GET /api/quiz/:code` - Questions pour une commune
- `POST /api/resultats` - Calcul de compatibilité
- `POST /api/upload-tract` - Import de tract (public)

### Admin (protégé par clé)
- `GET /api/admin/submissions` - Liste des soumissions
- `POST /api/admin/validate` - Valider/rejeter une soumission
- `POST /api/admin/candidat` - Ajouter/modifier un candidat
- `GET /api/admin/candidats` - Liste tous les candidats
- `GET /api/admin/stats` - Statistiques

## 🛡️ Sécurité

- Rate limiting sur les uploads (5/jour par IP, 20/jour par commune)
- Détection de doublons par hash perceptuel
- Validation automatique par Claude (score de confiance > 80%)
- Interface admin protégée par clé secrète

## 💰 Budget

- Budget total API Claude : 100€ maximum
- Hébergement Vercel : gratuit
- Base de données Supabase : gratuit (tier gratuit)

## 📊 Analytics

Les sessions utilisateur sont enregistrées de manière anonyme pour générer des statistiques d'utilisation.

## 📄 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir `CONTRIBUTING.md` pour plus de détails.

---

**MonVote MVP V3** - Municipales 2026 - Rennes Métropole
