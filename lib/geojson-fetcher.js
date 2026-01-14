// Utilitaire pour récupérer les contours GeoJSON des communes
// avec cache localStorage pour éviter les requêtes répétées

const CACHE_KEY_PREFIX = 'geojson_commune_';
const CACHE_DURATION_DAYS = 30;

/**
 * Récupère la géométrie (contour) d'une commune depuis l'API geo.gouv.fr
 * Utilise le cache localStorage pour éviter les requêtes répétées
 */
export async function fetchCommuneGeometry(communeCode) {
  // 1. Vérifier cache localStorage
  const cached = getCachedGeometry(communeCode);
  if (cached) {
    console.log(`✓ GeoJSON cached for ${communeCode}`);
    return cached;
  }

  // 2. Fetch depuis API geo.gouv.fr
  const url = `https://geo.api.gouv.fr/communes/${communeCode}?fields=nom,code,contour&format=json&geometry=contour`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.contour) {
      // 3. Mettre en cache
      cacheGeometry(communeCode, data.contour);
      console.log(`✓ GeoJSON fetched for ${communeCode}`);
      return data.contour;
    } else {
      console.warn(`⚠ No contour for ${communeCode}`);
      return null;
    }
  } catch (error) {
    console.error(`✗ Error fetching GeoJSON for ${communeCode}:`, error.message);
    return null; // Fallback to marker
  }
}

/**
 * Récupère la géométrie depuis le cache localStorage
 */
function getCachedGeometry(code) {
  try {
    const item = localStorage.getItem(CACHE_KEY_PREFIX + code);
    if (!item) return null;

    const { geometry, timestamp } = JSON.parse(item);
    const age = Date.now() - timestamp;

    // Vérifier si le cache a expiré
    if (age > CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(CACHE_KEY_PREFIX + code);
      return null;
    }

    return geometry;
  } catch (e) {
    console.error('Cache read error:', e);
    return null;
  }
}

/**
 * Sauvegarde la géométrie dans le cache localStorage
 */
function cacheGeometry(code, geometry) {
  try {
    const item = {
      geometry,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY_PREFIX + code, JSON.stringify(item));
  } catch (e) {
    console.error('Cache write error (localStorage may be full):', e);
  }
}

/**
 * Récupère les géométries de plusieurs communes en parallèle
 * Limite à 5 requêtes simultanées pour éviter de surcharger l'API
 */
export async function fetchAllCommuneGeometries(communes) {
  const BATCH_SIZE = 5;
  const results = [];

  // Traiter par lots de 5 requêtes
  for (let i = 0; i < communes.length; i += BATCH_SIZE) {
    const batch = communes.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(c =>
      fetchCommuneGeometry(c.code)
        .then(geom => ({ code: c.code, geometry: geom }))
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Petite pause entre les lots pour être poli avec l'API
    if (i + BATCH_SIZE < communes.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Efface le cache GeoJSON (utile pour debug)
 */
export function clearGeometryCache() {
  const keys = Object.keys(localStorage);
  let count = 0;

  keys.forEach(key => {
    if (key.startsWith(CACHE_KEY_PREFIX)) {
      localStorage.removeItem(key);
      count++;
    }
  });

  console.log(`Cleared ${count} cached geometries`);
  return count;
}
