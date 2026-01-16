// Tous les prompts Claude utilisés dans l'application

export const PROMPT_RECHERCHE_CANDIDATS = (communeNom, communeDept = null, communeCodeInsee = null) => `
Recherche les candidats aux municipales 2026 à ${communeNom}${communeDept ? ` (${communeDept})` : ''}${communeCodeInsee ? ` - INSEE: ${communeCodeInsee}` : ''}.

Utilise web_search avec : "candidats municipales 2026 ${communeNom}${communeDept ? ` ${communeDept}` : ''}"

ATTENTION : Ne confonds pas avec des communes homonymes.

Réponds UNIQUEMENT en JSON :
{
  "candidats": [{"nom": "NOM", "prenom": "Prénom", "parti": "...", "liste": "...", "fonction_actuelle": "..." ou null, "source_url": "..."}],
  "annee": 2026,
  "note": "..."
}

Si aucun candidat : {"candidats": [], "annee": null, "note": "Aucun trouvé"}
`;

export const PROMPT_RECHERCHE_MAIRE = (communeNom, communeDept = null, communeCodeInsee = null) => `
Identifie le maire ACTUEL (janvier 2026) de ${communeNom}${communeDept ? ` (${communeDept})` : ''}${communeCodeInsee ? ` - INSEE: ${communeCodeInsee}` : ''}.

Utilise web_search avec : "maire ${communeNom}${communeDept ? ` ${communeDept}` : ''} 2025"

ATTENTION : Ne confonds pas avec des communes homonymes.

Réponds UNIQUEMENT en JSON :
{
  "maire": {"nom": "NOM", "prenom": "Prénom", "parti": "...", "en_exercice_depuis": 2020, "liste": "..." ou null},
  "source_url": "...",
  "note": "..."
}

Si non trouvé : {"maire": null, "note": "Non identifié"}
`;

export const PROMPT_RECHERCHE_PROGRAMME = (candidat, communeNom, communeDept = null, communeCodeInsee = null) => `
Trouve les propositions de ${candidat.prenom} ${candidat.nom} (${candidat.parti || 'parti inconnu'}) pour les municipales à ${communeNom}${communeDept ? ` (${communeDept})` : ''}.

Utilise web_search avec : "${candidat.nom} ${communeNom} programme municipales 2026"

Extrais 3-5 propositions concrètes et courtes.

Réponds UNIQUEMENT en JSON :
{
  "propositions": ["Proposition 1", "Proposition 2", "Proposition 3"],
  "source_url": "...",
  "fiabilite": "haute/moyenne/basse"
}

Si rien trouvé : {"propositions": [], "note": "Aucune proposition trouvée"}
`;

export const PROMPT_GENERER_QUESTIONS = (communeNom, candidats, count = 15, minOptions = 3, maxOptions = 5, communeDept = null, communeCodeInsee = null) => `
Génère ${count} questions de quiz sur les enjeux municipaux de ${communeNom}${communeDept ? ` (${communeDept})` : ''}.

Candidats : ${candidats.length > 0 ? candidats.map(c => c.nom).join(', ') : 'Non disponibles'}

Règles :
- Questions claires, variées (urbanisme, transports, écologie, social, économie, sécurité, culture)
- ${minOptions}-${maxOptions} options par question
- Échelle position : 1=progressiste/gauche, 3=centre, 5=conservateur/droite

JSON strict :
{
  "questions": [{
    "id": 1,
    "question": "Texte ?",
    "theme": "urbanisme",
    "reponses": [
      {"id": "a", "texte": "Option A", "position": 1},
      {"id": "b", "texte": "Option B", "position": 3},
      {"id": "c", "texte": "Option C", "position": 5}
    ]
  }]
}
`;

export const PROMPT_POSITIONNER_CANDIDAT = (candidat, questions) => `
Positionne ${candidat.prenom || ''} ${candidat.nom} (${candidat.parti || 'inconnu'}) sur chaque question.

Échelle : 1=gauche/progressiste, 2=centre-gauche, 3=centre, 4=centre-droit, 5=droite/conservateur

Questions IDs : ${questions.map(q => q.id).join(', ')}

Réponds JSON uniquement :
{
  "positions": {
${questions.map(q => `    "${q.id}": 3`).join(',\n')}
  }
}
`;

export const PROMPT_ANALYSE_TRACT = (communeNom, communeDept = null, communeCodeInsee = null) => `
Analyse ce tract de campagne pour les municipales 2026 à ${communeNom}${communeDept ? ` (${communeDept})` : ''}${communeCodeInsee ? ` - INSEE: ${communeCodeInsee}` : ''}.

Extrais :
1. Candidat(s) : nom, prénom, fonction, parti, liste
2. Propositions (3-5 max, concises)
3. Commune/département/code postal mentionnés
4. Mention de "2026" (oui/non)
5. Contact (site, email, réseaux)

JSON strict :
{
  "candidats": [{"nom": "NOM", "prenom": "Prénom", "fonction_actuelle": null, "parti": null, "liste": null, "position": 1}],
  "tete_de_liste": {"nom": "NOM", "prenom": "Prénom"},
  "liste": "Nom de liste" ou null,
  "parti": "Parti" ou null,
  "commune_mentionnee": "..." ou null,
  "departement_mentionne": "..." ou null,
  "code_postal_mentionne": "..." ou null,
  "mention_2026": true/false,
  "propositions": ["Prop 1", "Prop 2"],
  "slogan": "..." ou null,
  "contact": {"site_web": null, "email": null, "facebook": null, "twitter": null},
  "fiabilite_extraction": "haute/moyenne/basse",
  "notes": "..."
}

Si pas un tract : {"erreur": "Document non électoral"}
Si illisible : {"erreur": "Document illisible"}
`;

export const PROMPT_VALIDATION_TRACT = (communeNom, analysisResult, communeDept = null, communeCodeInsee = null) => `
Valide ce tract pour ${communeNom}${communeDept ? ` (${communeDept})` : ''}.

Données extraites :
${JSON.stringify(analysisResult, null, 2)}

Critères (tous requis pour auto-approve) :
1. Document électoral officiel (pas capture réseau social)
2. Mention "2026" explicite
3. Commune correspond ou département/CP permettent identification
4. Contenu approprié (pas haineux/illégal)
5. Données exploitables (nom candidat + 1 proposition min)

JSON strict :
{
  "is_valid": true/false,
  "confidence_score": 0.0-1.0,
  "validation_checks": {
    "is_electoral_document": {"passed": true/false, "reason": "..."},
    "is_2026": {"passed": true/false, "reason": "..."},
    "commune_matches": {"passed": true/false, "reason": "..."},
    "content_appropriate": {"passed": true/false, "reason": "..."},
    "data_quality": {"passed": true/false, "reason": "..."}
  },
  "recommendation": "auto_approve/manual_review/reject"
}
`;
