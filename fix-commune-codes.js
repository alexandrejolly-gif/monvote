// Script pour corriger les codes INSEE des communes de Rennes Métropole

const COMMUNES_NAMES = [
  'Rennes',
  'Betton',
  'Bougué-Chambalud',
  'Bourgbarré',
  'Brécé',
  'Bruz',
  'Cesson-Sévigné',
  'Chantepie',
  'La Chapelle-Chaussée',
  'La Chapelle-des-Fougeretz',
  'La Chapelle-Thouarault',
  'Chartres-de-Bretagne',
  'Châteaugiron',
  'Chavagne',
  'Chevaigné',
  'Cintré',
  'Corps-Nuds',
  'Gévezé',
  'L\'Hermitage',
  'Laillé',
  'Mordelles',
  'Montgermont',
  'Noyal-Châtillon-sur-Seiche',
  'Nouvoitou',
  'Orgères',
  'Pacé',
  'Parthenay-de-Bretagne',
  'Le Rheu',
  'Pont-Péan',
  'Le Verger',
  'Romillé',
  'Saint-Armel',
  'Saint-Erblon',
  'Saint-Gilles',
  'Saint-Grégoire',
  'Saint-Jacques-de-la-Lande',
  'Saint-Sulpice-la-Forêt',
  'Thorigné-Fouillard',
  'Vern-sur-Seiche',
  'Vezin-le-Coquet',
  'Acigné',
  'Clayes',
  'Andouillé-Neuville'
];

async function fetchCorrectCodes() {
  console.log('🔍 Recherche des codes INSEE corrects pour 43 communes...\n');

  const results = [];

  for (const nom of COMMUNES_NAMES) {
    try {
      // Recherche par nom en Ille-et-Vilaine (35)
      const searchUrl = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(nom)}&codeDepartement=35&fields=nom,code,population,centre&format=json&geometry=centre`;
      const response = await fetch(searchUrl);
      const data = await response.json();

      if (data.length > 0) {
        const commune = data[0];
        const [lng, lat] = commune.centre?.coordinates || [0, 0];

        results.push({
          code: commune.code,
          nom: commune.nom,
          population: commune.population,
          lat: parseFloat(lat.toFixed(4)),
          lng: parseFloat(lng.toFixed(4))
        });

        console.log(`✓ ${commune.nom}: ${commune.code} (${commune.population.toLocaleString()} hab.)`);
      } else {
        console.log(`✗ ${nom}: Non trouvé`);
        results.push({ code: 'UNKNOWN', nom: nom, population: 0, lat: 0, lng: 0 });
      }

      // Pause pour éviter de surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`✗ ${nom}: Erreur -`, error.message);
      results.push({ code: 'ERROR', nom: nom, population: 0, lat: 0, lng: 0 });
    }
  }

  console.log('\n=== Code JavaScript à copier-coller dans lib/communes-rennes.js ===\n');
  console.log('export const COMMUNES_RENNES_METROPOLE = [');
  results.forEach((c, index) => {
    console.log(`  { code: '${c.code}', nom: '${c.nom}', population: ${c.population}, lat: ${c.lat}, lng: ${c.lng} }${index < results.length - 1 ? ',' : ''}`);
  });
  console.log('];');
}

fetchCorrectCodes();
