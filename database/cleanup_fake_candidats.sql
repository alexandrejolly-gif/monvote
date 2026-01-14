-- Nettoyer les candidats factices/placeholders de la base
-- Ces candidats ont été générés automatiquement et ne sont pas réels

-- Supprimer les candidats avec des noms factices
DELETE FROM candidats
WHERE
  LOWER(nom) IN ('opposition', 'maire', 'sortant', 'liste')
  OR LOWER(prenom) IN ('opposition', 'maire', 'sortant', 'liste')
  OR (LOWER(nom) = 'opposition' AND LOWER(prenom) = 'liste')
  OR (LOWER(prenom) = 'liste' AND LOWER(nom) = 'opposition');

-- Afficher le résultat
SELECT
  COUNT(*) as candidats_restants,
  COUNT(DISTINCT commune_code) as communes_avec_candidats
FROM candidats;
