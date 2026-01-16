# MonVote - Instructions pour Claude Code

## Architecture

- **public/** : Frontend (app.js, styles.css, index.html)
- **api/** : Endpoints Vercel serverless
- **lib/** : Logique métier partagée
- **admin/** : Interface d'administration
- **data/** : Données statiques (communes, questions)

## Fichiers principaux à modifier

| Fichier | Rôle | Lignes |
|---------|------|--------|
| public/app.js | Frontend principal | ~1400 |
| public/styles.css | Styles | ~2700 |
| public/index.html | Structure HTML | ~260 |
| lib/claude.js | Appels API Claude | ~260 |
| lib/prompts.js | Prompts pour Claude | ~440 |

## Variables CSS (thème)

Light mode:
--primary: #0f172a
--bg-body: #f8fafc
--accent: #2563eb

Dark mode:
--bg-body: #0f172a
--bg-card: #1e293b

## Conventions

- Vanilla JS (pas de framework)
- CSS custom properties pour les couleurs
- API serverless Vercel
- Supabase pour la BDD
