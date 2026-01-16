// Script temporaire pour récupérer les coordonnées des communes
import { COMMUNES_RENNES_METROPOLE } from './lib/communes-rennes.js';

async function fetchCoordinates() {
  console.log('Récupération des coordonnées pour 43 communes...\n');

  const results = [];

  for (const commune of COMMUNES_RENNES_METROPOLE) {
    try {
      const url = `https://geo.api.gouv.fr/communes/${commune.code}?fields=nom,code,centre&format=json&geometry=centre`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.centre && data.centre.coordinates) {
        const [lng, lat] = data.centre.coordinates;
        results.push({
          ...commune,
          lat: parseFloat(lat.toFixed(4)),
          lng: parseFloat(lng.toFixed(4))
        });
        console.log(`✓ ${commune.nom}: lat=${lat.toFixed(4)}, lng=${lng.toFixed(4)}`);
      } else {
        console.log(`✗ ${commune.nom}: Pas de coordonnées disponibles`);
        results.push(commune);
      }

      // Pause pour éviter de surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`✗ ${commune.nom}: Erreur -`, error.message);
      results.push(commune);
    }
  }

  console.log('\n=== Code JavaScript à copier-coller ===\n');
  console.log('export const COMMUNES_RENNES_METROPOLE = [');
  results.forEach((c, index) => {
    const lat = c.lat || 'MISSING';
    const lng = c.lng || 'MISSING';
    console.log(`  { code: '${c.code}', nom: '${c.nom}', population: ${c.population}, lat: ${lat}, lng: ${lng} }${index < results.length - 1 ? ',' : ''}`);
  });
  console.log('];');
}

fetchCoordinates();
