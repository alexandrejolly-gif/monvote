// Tous les prompts Claude utilisés dans l'application

export const PROMPT_RECHERCHE_CANDIDATS = (communeNom, communeDept = null, communeCodeInsee = null) => `
Tu es un assistant de recherche électorale française.

MISSION : Trouve les candidats aux élections municipales 2026 à ${communeNom}${communeDept ? ` (${communeDept})` : ''}.

${communeCodeInsee ? `CODE INSEE : ${communeCodeInsee}` : ''}

IMPORTANT : Il faut chercher spécifiquement la commune "${communeNom}"${communeDept ? ` dans le département ${communeDept}` : ''}.
Ne confonds pas avec d'autres communes homonymes.

Utilise web_search pour chercher :
- "candidats municipales 2026 ${communeNom}${communeDept ? ` ${communeDept}` : ''}"
- "élections municipales ${communeNom}${communeDept ? ` ${communeDept}` : ''} 2026"
- "listes électorales ${communeNom}${communeCodeInsee ? ` ${communeCodeInsee}` : ''}"

Si aucun candidat n'est trouvé, retourne une liste vide.

IMPORTANT : Ta réponse DOIT être UNIQUEMENT un bloc JSON valide, rien d'autre. Pas de texte avant ou après le JSON.

FORMAT DE RÉPONSE (JSON strict) :
\`\`\`json
{
  "candidats": [
    {
      "nom": "NOM",
      "prenom": "Prénom",
      "parti": "Parti politique",
      "liste": "Nom de la liste",
      "fonction_actuelle": "Maire sortant" ou "Conseiller" ou null,
      "source_url": "URL de la source"
    }
  ],
  "annee": 2026,
  "note": "Commentaire sur la recherche"
}
\`\`\`

Si aucun candidat n'est trouvé, retourne :
\`\`\`json
{
  "candidats": [],
  "annee": null,
  "note": "Aucun candidat trouvé pour les municipales 2026"
}
\`\`\`

Réponds UNIQUEMENT avec le bloc JSON, sans texte explicatif.
`;

export const PROMPT_RECHERCHE_MAIRE = (communeNom, communeDept = null, communeCodeInsee = null) => `
Tu es un assistant de recherche électorale française.

MISSION : Identifie le maire ACTUEL (en exercice en janvier 2026) de ${communeNom}${communeDept ? ` (${communeDept})` : ''}.

${communeCodeInsee ? `CODE INSEE : ${communeCodeInsee}` : ''}

IMPORTANT : Cherche spécifiquement pour "${communeNom}"${communeDept ? ` dans le département ${communeDept}` : ''}.
Ne confonds pas avec d'autres communes homonymes.

CONSIGNES DE RECHERCHE :
1. Cherche le maire élu lors des dernières élections municipales (2020)
2. Vérifie s'il est toujours en fonction (pas de démission, décès, etc.)
3. Privilégie les sources officielles (site de la mairie, préfecture, journaux locaux)
4. Si tu trouves plusieurs noms, choisis le plus récent et le mieux sourcé

Utilise web_search pour chercher :
- "maire ${communeNom}${communeDept ? ` ${communeDept}` : ''} 2025"
- "maire ${communeNom}${communeDept ? ` ${communeDept}` : ''} élu 2020"
- "municipalité ${communeNom}${communeCodeInsee ? ` ${communeCodeInsee}` : ''} conseil municipal"
- "mairie ${communeNom}${communeDept ? ` ${communeDept}` : ''} équipe"

IMPORTANT : Ta réponse DOIT être UNIQUEMENT un bloc JSON valide.

FORMAT DE RÉPONSE (JSON strict) :
\`\`\`json
{
  "maire": {
    "nom": "NOM",
    "prenom": "Prénom",
    "parti": "Parti politique",
    "en_exercice_depuis": 2020,
    "liste": "Nom de la liste" ou null
  },
  "source_url": "URL de la source",
  "note": "Commentaire sur la recherche"
}
\`\`\`

Si aucun maire trouvé :
\`\`\`json
{
  "maire": null,
  "note": "Aucun maire identifié"
}
\`\`\`

Réponds UNIQUEMENT avec le bloc JSON.
`;

export const PROMPT_RECHERCHE_PROGRAMME = (candidat, communeNom, communeDept = null, communeCodeInsee = null) => `
Tu es un assistant de recherche électorale française.

MISSION : Trouve les principales propositions de campagne de ${candidat.prenom} ${candidat.nom} pour les élections municipales à ${communeNom}${communeDept ? ` (${communeDept})` : ''}.

${communeCodeInsee ? `CODE INSEE : ${communeCodeInsee}` : ''}

CANDIDAT :
- Nom : ${candidat.nom}
- Prénom : ${candidat.prenom}
- Parti : ${candidat.parti || 'inconnu'}
- Liste : ${candidat.liste || 'inconnue'}

IMPORTANT : Cherche spécifiquement pour "${communeNom}"${communeDept ? ` dans le département ${communeDept}` : ''}.
Ne confonds pas avec d'autres communes homonymes. Les propositions doivent concerner CETTE commune précisément.

Utilise web_search pour chercher :
- "${candidat.nom} ${communeNom}${communeDept ? ` ${communeDept}` : ''} propositions municipales 2026"
- "${candidat.liste} ${communeNom}${communeDept ? ` ${communeDept}` : ''} programme électoral"
- "tract ${candidat.nom} ${communeNom}${communeCodeInsee ? ` ${communeCodeInsee}` : ''}"

Extrais 3 à 5 propositions concrètes et spécifiques.

IMPORTANT : Les propositions doivent être :
- Courtes et claires (1-2 lignes max chacune)
- Concrètes et actionables
- Spécifiques au candidat (pas de généralités)

FORMAT DE RÉPONSE (JSON strict) :
\`\`\`json
{
  "propositions": [
    "Proposition 1 concise et claire",
    "Proposition 2 concise et claire",
    "Proposition 3 concise et claire"
  ],
  "source_url": "URL de la source principale",
  "fiabilite": "haute/moyenne/basse"
}
\`\`\`

Si aucune proposition trouvée :
\`\`\`json
{
  "propositions": [],
  "note": "Aucune proposition spécifique trouvée"
}
\`\`\`

Réponds UNIQUEMENT avec le bloc JSON.
`;

export const PROMPT_GENERER_QUESTIONS = (communeNom, candidats, count = 10, minOptions = 3, maxOptions = 5, communeDept = null, communeCodeInsee = null) => `
Tu es un expert en politique locale française.

MISSION : Génère ${count} questions de quiz sur les enjeux municipaux de ${communeNom}${communeDept ? ` (${communeDept})` : ''}.

${communeCodeInsee ? `CODE INSEE : ${communeCodeInsee}` : ''}

CONTEXTE :
- Commune : ${communeNom}${communeDept ? ` (${communeDept})` : ''}
- Candidats : ${candidats.length > 0 ? candidats.map(c => c.nom).join(', ') : 'Non disponibles'}

IMPORTANT : Les questions doivent concerner spécifiquement "${communeNom}"${communeDept ? ` dans le département ${communeDept}` : ''}.
Ne génère PAS de questions concernant d'autres communes homonymes.

CONSIGNES :
1. Questions pertinentes pour une commune française
2. Mélange d'enjeux locaux et de thématiques générales
3. Couvre différents domaines : urbanisme, transports, écologie, social, économie, sécurité, culture
4. Questions claires et compréhensibles par tous
5. Évite les questions trop techniques
6. IMPORTANT : Chaque question doit avoir entre ${minOptions} et ${maxOptions} options de réponse

FORMAT DE RÉPONSE (JSON strict) :
{
  "questions": [
    {
      "id": 1,
      "question": "Texte de la question ?",
      "theme": "urbanisme",
      "reponses": [
        {
          "id": "a",
          "texte": "Option A",
          "position": 1
        },
        {
          "id": "b",
          "texte": "Option B",
          "position": 3
        },
        {
          "id": "c",
          "texte": "Option C",
          "position": 5
        }
        // Ajouter d ou e si maxOptions > 3
      ]
    }
  ]
}

Échelle de position :
- 1 = Très progressiste / écologique / interventionniste
- 3 = Modéré / centriste
- 5 = Très conservateur / libéral / sécuritaire

Génère exactement ${count} questions avec ${minOptions}-${maxOptions} options chacune.
`;

export const PROMPT_POSITIONNER_CANDIDAT = (candidat, questions) => `
Tu es un analyste politique.

MISSION : Positionne le candidat ${candidat.nom} sur TOUTES les ${questions.length} questions ci-dessous.

CANDIDAT :
${JSON.stringify(candidat, null, 2)}

QUESTIONS (${questions.length} au total) :
${JSON.stringify(questions, null, 2)}

CONSIGNES IMPÉRATIVES :
1. Analyse le profil du candidat (parti: ${candidat.parti || 'inconnu'}, fonction, historique)
2. Pour CHAQUE question (IDs: ${questions.map(q => q.id).join(', ')}), estime sa position sur l'échelle 1-5:
   - 1 = Position très progressiste / écologiste / interventionniste / gauche
   - 2 = Position progressiste modérée
   - 3 = Position centriste / équilibrée (par défaut si incertain)
   - 4 = Position libérale / conservatrice modérée
   - 5 = Position très libérale / conservatrice / droite
3. Sois cohérent avec la ligne politique du parti
4. Si incertain, utilise la position médiane (3)

IMPORTANT : Tu DOIS fournir exactement ${questions.length} positions (une pour CHAQUE question listée ci-dessus).

FORMAT DE RÉPONSE (JSON strict uniquement, sans texte explicatif) :
{
  "positions": {
${questions.map(q => `    "${q.id}": 3`).join(',\n')}
  }
}

Réponds UNIQUEMENT avec le bloc JSON contenant les ${questions.length} positions, rien d'autre.
`;

export const PROMPT_ANALYSE_TRACT = (communeNom, communeDept = null, communeCodeInsee = null) => `
Tu es un assistant d'analyse de documents électoraux français.

MISSION : Analyse cette image de tract de campagne pour les élections municipales 2026 à ${communeNom}${communeDept ? ` (${communeDept})` : ''}.

${communeCodeInsee ? `CODE INSEE ATTENDU : ${communeCodeInsee}` : ''}
${communeDept ? `DÉPARTEMENT ATTENDU : ${communeDept}` : ''}

IMPORTANT : Ce tract doit concerner "${communeNom}"${communeDept ? ` dans le département ${communeDept}` : ''}.
Si le tract mentionne une autre commune (homonyme ou non), indique-le clairement dans le champ "commune_mentionnee".

EXTRAIS les informations suivantes avec précision :

1. CANDIDAT(S) - TRÈS IMPORTANT
   - Si le tract présente PLUSIEURS candidats (liste électorale), EXTRAIS-LES TOUS
   - Si c'est un tract individuel, extrais uniquement ce candidat
   - Pour CHAQUE candidat visible :
     * Nom de famille
     * Prénom
     * Fonction actuelle (si mentionnée)
     * Parti politique (si mentionné pour CE candidat spécifiquement)
     * Liste (si mentionnée pour CE candidat spécifiquement)
   - Ordre : le tête de liste en premier, puis les autres dans l'ordre d'apparition
   - IMPORTANT : Dans les tracts comparatifs (plusieurs candidats de partis différents), chaque candidat a son propre parti/liste
   - Dans les tracts de liste unique (une seule équipe), tous les candidats partagent le même parti/liste

2. LISTE ÉLECTORALE COMMUNE (si applicable)
   - Nom exact de la liste COMMUNE à tous les candidats (si tract de liste unique)
   - Parti politique COMMUN (si tous les candidats sont du même parti)
   - Mettre à null si c'est un tract comparatif avec plusieurs partis différents

3. PROPOSITIONS - ATTENTION
   - Liste exhaustive des propositions/engagements
   - Reformule de manière concise si nécessaire
   - IMPORTANT : Si le tract présente PLUSIEURS candidats avec des propositions DIFFÉRENTES pour chacun :
     * Extrais UNIQUEMENT les propositions du PROGRAMME COMMUN de la liste (le plus courant)
     * OU les propositions du candidat tête de liste si c'est un tract individuel
     * NE MÉLANGE PAS les propositions de différents candidats
   - Si impossible de distinguer, indique-le dans "notes"

4. LOCALISATION ET ÉLECTION (CRITIQUE)
   - Commune mentionnée EXACTEMENT comme écrite dans le tract (attention aux homonymes!)
   - Département mentionné (si visible)
   - Code postal mentionné (si visible)
   - Année ou date de l'élection mentionnée (cherche "2026", "municipales 2026", dates précises)

5. AUTRES INFORMATIONS
   - Slogan de campagne
   - Site web
   - Email ou contact
   - Réseaux sociaux

FORMAT DE RÉPONSE (JSON strict) :
{
  "candidats": [
    {
      "nom": "NOM",
      "prenom": "Prénom",
      "fonction_actuelle": "..." ou null,
      "position": 1,
      "parti": "Parti politique de CE candidat" ou null,
      "liste": "Liste de CE candidat" ou null
    },
    {
      "nom": "NOM2",
      "prenom": "Prénom2",
      "fonction_actuelle": "..." ou null,
      "position": 2,
      "parti": "Parti politique de CE candidat" ou null,
      "liste": "Liste de CE candidat" ou null
    }
  ],
  "tete_de_liste": {
    "nom": "NOM du premier candidat",
    "prenom": "Prénom du premier candidat"
  },
  "liste": "Nom exact de la liste COMMUNE (ou null si tract comparatif)",
  "parti": "Parti politique COMMUN (ou null si tract comparatif ou pas de parti commun)",
  "commune_mentionnee": "Nom EXACT de la commune tel qu'écrit dans le tract" ou null,
  "departement_mentionne": "Nom du département ou numéro (ex: 35, Ille-et-Vilaine)" ou null,
  "code_postal_mentionne": "Code postal si visible (ex: 35510)" ou null,
  "annee_mentionnee": "2026" ou autre année si visible, ou null si absente,
  "mention_2026": true/false (true si "2026" ou "municipales 2026" apparaît explicitement),
  "propositions": [
    "Proposition 1",
    "Proposition 2",
    "Proposition 3"
  ],
  "slogan": "Slogan de campagne" ou null,
  "contact": {
    "site_web": "https://..." ou null,
    "email": "..." ou null,
    "facebook": "..." ou null,
    "twitter": "..." ou null
  },
  "fiabilite_extraction": "haute/moyenne/basse",
  "notes": "Remarques sur la qualité du document, correspondance avec la commune attendue, ou informations manquantes"
}

Si le document n'est PAS un tract électoral municipal, retourne :
{
  "erreur": "Ce document ne semble pas être un tract électoral municipal."
}

Si le document est illisible ou de trop mauvaise qualité :
{
  "erreur": "Document illisible ou de qualité insuffisante."
}
`;

export const PROMPT_VALIDATION_TRACT = (communeNom, analysisResult, communeDept = null, communeCodeInsee = null) => `
Tu es un modérateur de contenus pour une application électorale.

MISSION : Valide si cette soumission peut être automatiquement approuvée.

COMMUNE ATTENDUE : ${communeNom}${communeDept ? ` (${communeDept})` : ''}
${communeCodeInsee ? `CODE INSEE ATTENDU : ${communeCodeInsee}` : ''}
${communeDept ? `DÉPARTEMENT ATTENDU : ${communeDept}` : ''}

DONNÉES EXTRAITES :
${JSON.stringify(analysisResult, null, 2)}

CRITÈRES DE VALIDATION (tous doivent être vrais pour validation auto) :

1. TYPE DE DOCUMENT
   - Est-ce un tract/affiche/programme électoral officiel ?
   - Pas une capture d'écran de réseau social
   - Pas un article de presse

2. ÉLECTION CONCERNÉE (CRITÈRE STRICT)
   - Le tract DOIT mentionner explicitement "2026" ou "municipales 2026"
   - Vérifie le champ "mention_2026" qui DOIT être true
   - Les tracts sans mention d'année sont REFUSÉS

3. COMMUNE ET LOCALISATION (CRITÈRE FLEXIBLE)
   - IDÉALEMENT : commune_mentionnee correspond exactement à "${communeNom}"
   - ACCEPTABLE : commune_mentionnee est null MAIS departement_mentionne ou code_postal_mentionne permet d'identifier la commune
   - Pour "${communeNom}"${communeDept ? `, département attendu: "${communeDept}"` : ''}${communeCodeInsee ? `, code postal: ${communeCodeInsee.substring(0, 2)}XXX` : ''}
   - ACCEPTER SI :
     * commune_mentionnee = "${communeNom}" OU
     * (commune_mentionnee = null ET departement_mentionne = ${communeDept ? `"${communeDept}" ou "${communeCodeInsee?.substring(0, 2)}"` : 'correct'}) OU
     * (commune_mentionnee = null ET code_postal_mentionne commence par ${communeCodeInsee ? `"${communeCodeInsee.substring(0, 2)}"` : 'le bon préfixe'})
   - REJETER UNIQUEMENT SI : le tract mentionne explicitement une AUTRE commune différente de "${communeNom}"
   - Un tract avec juste le département (ex: "35" ou "Ille-et-Vilaine") pour Vitré est ACCEPTABLE

4. CONTENU APPROPRIÉ
   - Pas de contenu haineux, diffamatoire ou illégal
   - Pas d'appel à la violence
   - Contenu factuel (propositions, présentation)

5. QUALITÉ DES DONNÉES
   - Nom du candidat identifiable ?
   - Au moins une proposition extraite ?
   - Données cohérentes ?

RÉPONSE JSON :
{
  "is_valid": true/false,
  "confidence_score": 0.00 à 1.00,
  "validation_checks": {
    "is_electoral_document": {
      "passed": true/false,
      "reason": "..."
    },
    "is_2026_or_undated": {
      "passed": true/false,
      "reason": "..."
    },
    "commune_matches": {
      "passed": true/false,
      "reason": "..."
    },
    "content_appropriate": {
      "passed": true/false,
      "reason": "..."
    },
    "data_quality": {
      "passed": true/false,
      "reason": "..."
    }
  },
  "needs_human_review": true/false,
  "review_reason": "..." ou null,
  "recommendation": "auto_approve/manual_review/reject"
}

CALCUL DU SCORE DE CONFIANCE :
- Tous les checks passés + données complètes = 0.90-1.00
- Tous les checks passés + données partielles = 0.75-0.89
- 1 check incertain = 0.60-0.74
- 2+ checks incertains ou 1 échec = 0.00-0.59
`;
