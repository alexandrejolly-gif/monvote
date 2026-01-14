// Fixtures de test pour MonVote (éviter les coûts API)

export const MOCK_CANDIDATS = [
  {
    id: "test_candidat_1",
    commune_code: "35066",
    commune_nom: "Chartres-de-Bretagne",
    nom: "DUPONT",
    prenom: "Jean",
    parti: "DVD",
    liste: "Continuité et Avenir",
    maire_sortant: true,
    source_type: "tract_auto",
    propositions: [
      "Développer les transports en commun",
      "Créer une piste cyclable sécurisée",
      "Rénover l'école primaire",
      "Soutenir les commerces locaux",
      "Améliorer la sécurité routière"
    ],
    positions: {
      "1": 2,  // Transport: favorable
      "2": 1,  // Logement: très favorable
      "3": 3,  // Environnement: neutre
      "4": 4,  // Services: défavorable
      "5": 2,  // Écoles: favorable
      "6": 3,
      "7": 2,
      "8": 1,
      "9": 2,
      "10": 3,
      "11": 4,
      "12": 2,
      "13": 1,
      "14": 3,
      "15": 2
    }
  },
  {
    id: "test_candidat_2",
    commune_code: "35066",
    commune_nom: "Chartres-de-Bretagne",
    nom: "MARTIN",
    prenom: "Marie",
    parti: "DVG",
    liste: "Renouveau Municipal",
    maire_sortant: false,
    source_type: "tract_auto",
    propositions: [
      "Créer un budget participatif",
      "Augmenter les espaces verts",
      "Développer l'énergie solaire",
      "Favoriser l'agriculture locale",
      "Rénover la bibliothèque"
    ],
    positions: {
      "1": 4,  // Transport: défavorable (préfère vélo)
      "2": 2,  // Logement: favorable
      "3": 1,  // Environnement: très favorable
      "4": 2,  // Services: favorable
      "5": 1,  // Écoles: très favorable
      "6": 2,
      "7": 4,
      "8": 2,
      "9": 1,
      "10": 2,
      "11": 3,
      "12": 1,
      "13": 2,
      "14": 4,
      "15": 1
    }
  }
];

export const MOCK_QUESTIONS = [
  {
    code: "35066_Q01",
    index: 1,
    type: "socle",
    theme: "Transport",
    categorie: "transport",
    est_enjeu_local: false,
    question: "Faut-il développer les transports en commun dans la commune ?",
    contexte: "Les déplacements domicile-travail sont un enjeu majeur",
    reponses: [
      { valeur: 1, texte: "Oui, investir massivement", position: 1 },
      { valeur: 2, texte: "Oui, de manière progressive", position: 2 },
      { valeur: 3, texte: "Non prioritaire", position: 3 },
      { valeur: 4, texte: "Non, favoriser la voiture", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q02",
    index: 2,
    type: "socle",
    theme: "Logement",
    categorie: "logement",
    est_enjeu_local: false,
    question: "La commune doit-elle construire plus de logements sociaux ?",
    contexte: "Le logement social représente 15% du parc immobilier",
    reponses: [
      { valeur: 1, texte: "Oui, beaucoup plus", position: 1 },
      { valeur: 2, texte: "Oui, modérément", position: 2 },
      { valeur: 3, texte: "Maintenir le niveau actuel", position: 3 },
      { valeur: 4, texte: "Non, réduire", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q03",
    index: 3,
    type: "socle",
    theme: "Environnement",
    categorie: "environnement",
    est_enjeu_local: true,
    question: "Faut-il créer plus d'espaces verts en zone urbaine ?",
    contexte: "La commune dispose de 12 m² d'espaces verts par habitant",
    reponses: [
      { valeur: 1, texte: "Oui, priorité absolue", position: 1 },
      { valeur: 2, texte: "Oui, graduellement", position: 2 },
      { valeur: 3, texte: "Maintenir l'existant", position: 3 },
      { valeur: 4, texte: "Non, autres priorités", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q04",
    index: 4,
    type: "socle",
    theme: "Services publics",
    categorie: "services",
    est_enjeu_local: false,
    question: "La mairie doit-elle élargir ses horaires d'ouverture ?",
    contexte: "La mairie est actuellement ouverte 35h/semaine",
    reponses: [
      { valeur: 1, texte: "Oui, y compris samedi", position: 1 },
      { valeur: 2, texte: "Oui, étendre en semaine", position: 2 },
      { valeur: 3, texte: "Maintenir les horaires", position: 3 },
      { valeur: 4, texte: "Non, réduire les coûts", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q05",
    index: 5,
    type: "local",
    theme: "Écoles",
    categorie: "ecoles",
    est_enjeu_local: true,
    question: "Faut-il rénover l'école primaire du centre-ville ?",
    contexte: "L'école date des années 1970 et nécessite des travaux",
    reponses: [
      { valeur: 1, texte: "Oui, rénovation complète", position: 1 },
      { valeur: 2, texte: "Oui, travaux partiels", position: 2 },
      { valeur: 3, texte: "Attendre quelques années", position: 3 },
      { valeur: 4, texte: "Non, budget insuffisant", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q06",
    index: 6,
    type: "socle",
    theme: "Économie",
    categorie: "economie",
    est_enjeu_local: false,
    question: "La commune doit-elle soutenir les commerces de proximité ?",
    contexte: "3 commerces ont fermé l'année dernière",
    reponses: [
      { valeur: 1, texte: "Oui, aides financières directes", position: 1 },
      { valeur: 2, texte: "Oui, accompagnement modéré", position: 2 },
      { valeur: 3, texte: "Laisser le marché réguler", position: 3 },
      { valeur: 4, texte: "Non, pas de dépense publique", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q07",
    index: 7,
    type: "socle",
    theme: "Sécurité",
    categorie: "securite",
    est_enjeu_local: false,
    question: "Faut-il installer plus de caméras de vidéosurveillance ?",
    contexte: "15 caméras sont actuellement installées",
    reponses: [
      { valeur: 1, texte: "Oui, déploiement massif", position: 1 },
      { valeur: 2, texte: "Oui, quelques emplacements", position: 2 },
      { valeur: 3, texte: "Maintenir le niveau actuel", position: 3 },
      { valeur: 4, texte: "Non, retirer les existantes", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q08",
    index: 8,
    type: "socle",
    theme: "Culture",
    categorie: "culture",
    est_enjeu_local: false,
    question: "Le budget culturel doit-il être augmenté ?",
    contexte: "Le budget culture représente 5% du budget municipal",
    reponses: [
      { valeur: 1, texte: "Oui, augmentation significative", position: 1 },
      { valeur: 2, texte: "Oui, légère augmentation", position: 2 },
      { valeur: 3, texte: "Maintenir le budget", position: 3 },
      { valeur: 4, texte: "Non, réduire", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q09",
    index: 9,
    type: "local",
    theme: "Sport",
    categorie: "sport",
    est_enjeu_local: true,
    question: "Faut-il construire un nouveau gymnase ?",
    contexte: "Le gymnase actuel est saturé en soirée",
    reponses: [
      { valeur: 1, texte: "Oui, construction prioritaire", position: 1 },
      { valeur: 2, texte: "Oui, mais après 2027", position: 2 },
      { valeur: 3, texte: "Non, rénover l'existant", position: 3 },
      { valeur: 4, texte: "Non, budget insuffisant", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q10",
    index: 10,
    type: "local",
    theme: "Mobilité",
    categorie: "transport",
    est_enjeu_local: true,
    question: "Une piste cyclable sécurisée doit-elle relier le centre au métro ?",
    contexte: "Actuellement, les cyclistes partagent la route avec les voitures",
    reponses: [
      { valeur: 1, texte: "Oui, urgence absolue", position: 1 },
      { valeur: 2, texte: "Oui, dans les 2 prochaines années", position: 2 },
      { valeur: 3, texte: "Pas prioritaire", position: 3 },
      { valeur: 4, texte: "Non, coût trop élevé", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q11",
    index: 11,
    type: "socle",
    theme: "Participation",
    categorie: "democratie",
    est_enjeu_local: false,
    question: "Faut-il créer un budget participatif citoyen ?",
    contexte: "Les habitants pourraient décider de l'utilisation de 100k€",
    reponses: [
      { valeur: 1, texte: "Oui, 500k€ ou plus", position: 1 },
      { valeur: 2, texte: "Oui, 100k€ pour tester", position: 2 },
      { valeur: 3, texte: "Non, élus décident", position: 3 },
      { valeur: 4, texte: "Non, risque de dérive", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q12",
    index: 12,
    type: "local",
    theme: "Aménagement",
    categorie: "urbanisme",
    est_enjeu_local: true,
    question: "Faut-il piétonniser la rue principale le samedi ?",
    contexte: "Les commerçants sont divisés sur cette question",
    reponses: [
      { valeur: 1, texte: "Oui, tous les week-ends", position: 1 },
      { valeur: 2, texte: "Oui, 2 samedis par mois", position: 2 },
      { valeur: 3, texte: "Non, gênerait la circulation", position: 3 },
      { valeur: 4, texte: "Non, perte d'attractivité", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q13",
    index: 13,
    type: "divergence",
    theme: "Fiscalité",
    categorie: "finances",
    est_enjeu_local: false,
    question: "Les impôts locaux doivent-ils augmenter pour financer de nouveaux projets ?",
    contexte: "La dette communale est faible, marge de manœuvre disponible",
    reponses: [
      { valeur: 1, texte: "Oui, investir massivement", position: 1 },
      { valeur: 2, texte: "Oui, légère hausse", position: 2 },
      { valeur: 3, texte: "Maintenir le niveau", position: 3 },
      { valeur: 4, texte: "Non, baisser les impôts", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q14",
    index: 14,
    type: "divergence",
    theme: "Énergie",
    categorie: "environnement",
    est_enjeu_local: true,
    question: "La commune doit-elle installer des panneaux solaires sur tous les bâtiments publics ?",
    contexte: "Investissement initial élevé, rentabilité à 15 ans",
    reponses: [
      { valeur: 1, texte: "Oui, tous les bâtiments", position: 1 },
      { valeur: 2, texte: "Oui, progressivement", position: 2 },
      { valeur: 3, texte: "Non, pas rentable", position: 3 },
      { valeur: 4, texte: "Non, autres priorités", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  },
  {
    code: "35066_Q15",
    index: 15,
    type: "local",
    theme: "Santé",
    categorie: "sante",
    est_enjeu_local: true,
    question: "Faut-il créer une maison de santé pluridisciplinaire ?",
    contexte: "La commune manque de médecins généralistes",
    reponses: [
      { valeur: 1, texte: "Oui, construction rapide", position: 1 },
      { valeur: 2, texte: "Oui, étude préalable", position: 2 },
      { valeur: 3, texte: "Non, attirer médecins autrement", position: 3 },
      { valeur: 4, texte: "Non, coût trop élevé", position: 4 },
      { valeur: 5, texte: "Sans opinion", position: 5 }
    ]
  }
];

export const MOCK_COMMUNES = [
  {
    code_insee: "35066",
    nom: "Chartres-de-Bretagne",
    code: "35066",
    profil_commune: "periurbain_croissance",
    enjeux_prioritaires: ["transport", "logement", "ecoles"],
    population: 8500,
    superficie_km2: 8.5,
    densite_hab_km2: 1000,
    latitude: 48.0442,
    longitude: -1.7069,
    nb_candidats: 2,
    questions_generated: true,
    maire_sortant: {
      nom: "DUPONT",
      prenom: "Jean"
    }
  }
];

export const MOCK_TRACT_ANALYSIS = {
  success: true,
  est_document_electoral: true,
  mention_2026: true,
  commune_mentionnee: "Chartres-de-Bretagne",
  candidats: [
    {
      nom: "DUPONT",
      prenom: "Jean",
      parti: "DVD",
      liste: "Continuité et Avenir"
    }
  ],
  tete_de_liste: {
    nom: "DUPONT",
    prenom: "Jean"
  },
  propositions: [
    "Développer les transports en commun",
    "Créer une piste cyclable sécurisée",
    "Rénover l'école primaire",
    "Soutenir les commerces locaux",
    "Améliorer la sécurité routière"
  ],
  slogan: "Ensemble pour Chartres",
  contact: {
    email: "contact@exemple.fr",
    site_web: "www.exemple.fr"
  }
};

// Fonction pour calculer le score de compatibilité (logique métier)
export function calculateCompatibility(userAnswers, candidatPositions) {
  if (!userAnswers || !candidatPositions) return 0;

  let totalWeight = 0;
  let totalScore = 0;

  Object.entries(userAnswers).forEach(([questionIndex, userPosition]) => {
    const candidatPosition = candidatPositions[questionIndex];
    if (!candidatPosition) return;

    // Validation: positions doivent être des nombres entre 1 et 5
    if (typeof userPosition !== 'number' || userPosition < 1 || userPosition > 5) return;
    if (typeof candidatPosition !== 'number' || candidatPosition < 1 || candidatPosition > 5) return;

    // Récupérer la question pour savoir si c'est enjeu local ou divergence
    const question = MOCK_QUESTIONS.find(q => q.index === parseInt(questionIndex));
    if (!question) return;

    // Calculer la distance (0 = accord parfait, 4 = désaccord total)
    const distance = Math.abs(userPosition - candidatPosition);
    const score = 100 - (distance * 25); // 0→100, 1→75, 2→50, 3→25, 4→0

    // Appliquer les pondérations
    let weight = 1.0;
    if (question.type === "divergence") {
      weight = 1.5; // Questions divergences ×1.5
    }
    if (question.est_enjeu_local) {
      weight *= 1.2; // Enjeux locaux ×1.2
    }

    totalScore += score * weight;
    totalWeight += weight;
  });

  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

  // Borner le score entre 0 et 100
  return Math.max(0, Math.min(100, finalScore));
}
