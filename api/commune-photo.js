// API pour récupérer une photo d'une commune depuis Google Images ou Wikimedia Commons

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nom, code } = req.query;

  if (!nom) {
    return res.status(400).json({
      success: false,
      error: 'Le paramètre "nom" est requis'
    });
  }

  try {
    // Recherche directe sur Wikimedia Commons
    console.log(`🔍 Recherche Wikimedia Commons pour ${nom}...`);
    const wikiResult = await searchWikimediaCommons(nom);
    if (wikiResult) {
      console.log(`✅ Photo trouvée via Wikimedia Commons`);
      return res.status(200).json({
        success: true,
        image: wikiResult
      });
    }

    // Aucune image trouvée
    return res.status(404).json({
      success: false,
      error: 'Aucune image trouvée pour cette commune'
    });

  } catch (error) {
    console.error('Erreur récupération photo commune:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la photo'
    });
  }
}

// ============================================================
// GOOGLE CUSTOM SEARCH API
// ============================================================

async function searchGoogleImages(communeName) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    // Requêtes simples pour avoir un maximum de résultats variés
    const queries = [
      `mairie ${communeName} 35`,
      `${communeName} Ille-et-Vilaine mairie`,
      `${communeName} 35 hôtel de ville`,
      `${communeName} 35 église`,
      `${communeName} Ille-et-Vilaine patrimoine`
    ];

    // Essayer chaque requête jusqu'à trouver une bonne image
    for (const query of queries) {
      // Analyser 30 images (3 pages) pour le debug
      const allImages = [];
      for (let page = 0; page < 3; page++) {
        const start = page * 10 + 1;
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&searchType=image&num=10&imgSize=large&safe=active&start=${start}`;

        try {
          const response = await fetch(url);
          const data = await response.json();

          // Afficher les erreurs de l'API si présentes
          if (data.error) {
            console.log(`  ❌ Erreur API Google (page ${page + 1}):`);
            console.log(`     Code: ${data.error.code}`);
            console.log(`     Message: ${data.error.message}`);
            if (data.error.errors) {
              data.error.errors.forEach(err => {
                console.log(`     → ${err.reason}: ${err.message}`);
              });
            }
          }

          if (data.items && data.items.length > 0) {
            if (page === 0) {
              console.log(`  📸 Recherche: "${query}" (30 images max)`);
            }

            // Collecter TOUTES les images pour debug
            for (const item of data.items) {
              const title = item.title || 'Sans titre';
              const snippet = item.snippet || '';

              allImages.push({
                url: item.link,
                title: title,
                snippet: snippet,
                displayLink: item.displayLink || '',
                page: page + 1
              });

              console.log(`  [${allImages.length}] (page ${page + 1}) ${title}`);
              if (snippet) {
                console.log(`      → ${snippet.substring(0, 100)}`);
              }
            }
          }

          // Petite pause entre les requêtes pour ne pas surcharger l'API
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.log(`  ⚠️ Erreur page ${page + 1}: ${error.message}`);
          break; // Arrêter si erreur (quota dépassé par exemple)
        }
      }

      // Après avoir collecté toutes les images, afficher le résumé et retourner la première
      console.log(`\n  📊 Total: ${allImages.length} images collectées pour "${query}"`);
      if (allImages.length > 0) {
        console.log(`  🎯 Sélection de la première image: ${allImages[0].title}\n`);
        return {
          url: allImages[0].url,
          description: allImages[0].title,
          credit: allImages[0].displayLink || 'Google Images',
          source: 'Google Images'
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Erreur Google Custom Search:', error);
    return null;
  }
}

function isImageValid(text) {
  if (!text) return true;

  const lowerText = text.toLowerCase();

  // Rejeter les images de personnes
  const personKeywords = [
    'portrait', 'maire actuel', 'politician', 'homme politique',
    'député', 'conseiller', 'sénateur', 'personnalité',
    'ministre', 'président', 'adjointe', 'adjoint',
    // Patterns pour détecter des noms de personnes
    'emmanuel', 'grégoire (', '(politician)', '(maire',
    'visage', 'face', 'headshot'
  ];

  for (const keyword of personKeywords) {
    if (lowerText.includes(keyword)) {
      return false;
    }
  }

  return true;
}

// ============================================================
// WIKIMEDIA COMMONS (FALLBACK)
// ============================================================

async function searchWikimediaCommons(communeName) {
  try {
    // 1. Essayer de trouver la page Wikipedia de la commune
    const wikipediaSearchUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(communeName + ' Ille-et-Vilaine commune')}&format=json&origin=*`;

    const searchResponse = await fetch(wikipediaSearchUrl);
    const searchData = await searchResponse.json();

    if (searchData.query?.search?.length > 0) {
      const pageTitle = searchData.query.search[0].title;

      // 2. Récupérer les images de la page Wikipedia
      const imagesUrl = `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&imlimit=20&format=json&origin=*`;

      const imagesResponse = await fetch(imagesUrl);
      const imagesData = await imagesResponse.json();

      const pages = imagesData.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];

        if (page.images && page.images.length > 0) {
          console.log(`  📷 ${page.images.length} images trouvées sur Wikipedia`);

          // Filtrer pour obtenir des images pertinentes
          const relevantImages = page.images.filter(img => {
            const name = img.title.toLowerCase();

            // Rejeter les fichiers contenant des noms de personnes
            if (name.includes('emmanuel') || name.includes('portrait')) {
              return false;
            }

            // Rejeter les logos, blasons, cartes
            if (name.includes('blason') || name.includes('logo') ||
                name.includes('coat of arms') || name.includes('armoiries') ||
                name.includes('map.') || name.includes('location') ||
                name.includes('relief')) {
              return false;
            }

            return isImageValid(name) &&
                   !name.includes('.svg') &&
                   (name.includes('.jpg') || name.includes('.jpeg') || name.includes('.png'));
          });

          console.log(`  ✅ ${relevantImages.length} images pertinentes après filtrage`);

          if (relevantImages.length > 0) {
            // 3. Récupérer les métadonnées pour les images candidates
            const imagesWithMetadata = [];

            // Analyser jusqu'à 10 images
            for (const image of relevantImages.slice(0, 10)) {
              try {
                const imageInfoUrl = `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(image.title)}&prop=imageinfo&iiprop=url|extmetadata|timestamp&iiurlwidth=800&format=json&origin=*`;
                const imageInfoResponse = await fetch(imageInfoUrl);
                const imageInfoData = await imageInfoResponse.json();

                const imagePages = imageInfoData.query?.pages;
                if (imagePages) {
                  const imagePage = Object.values(imagePages)[0];

                  if (imagePage.imageinfo && imagePage.imageinfo[0]) {
                    const imageUrl = imagePage.imageinfo[0].thumburl || imagePage.imageinfo[0].url;
                    const description = imagePage.imageinfo[0].extmetadata?.ImageDescription?.value || '';
                    const artist = imagePage.imageinfo[0].extmetadata?.Artist?.value || '';
                    const timestamp = imagePage.imageinfo[0].timestamp;
                    const dateTimeOriginal = imagePage.imageinfo[0].extmetadata?.DateTimeOriginal?.value || '';

                    // Nettoyer les balises HTML de la description
                    const cleanDescription = description.replace(/<[^>]*>/g, '').toLowerCase();

                    // Vérifier si l'image est valide (pas de personne dans la description)
                    if (!isImageValid(cleanDescription)) {
                      console.log(`    ⛔ Rejetée (contenu invalide): ${image.title}`);
                      continue;
                    }

                    // Marquer les images de bâtiments/monuments comme prioritaires
                    const buildingKeywords = [
                      'mairie', 'église', 'church', 'château', 'castle',
                      'monument', 'place', 'centre', 'hôtel de ville',
                      'town hall', 'city hall', 'beffroi', 'basilique',
                      'cathédrale', 'abbaye', 'chapelle',
                      'panorama', 'vue', 'view', 'aerial'
                    ];

                    const hasRelevantKeyword = buildingKeywords.some(keyword =>
                      image.title.toLowerCase().includes(keyword) ||
                      cleanDescription.includes(keyword)
                    );

                    // Filtrer les photos trop anciennes (avant 2010)
                    let photoDate = null;
                    if (dateTimeOriginal) {
                      const yearMatch = dateTimeOriginal.match(/(\d{4})/);
                      if (yearMatch) {
                        photoDate = new Date(yearMatch[1]);
                      }
                    }
                    if (!photoDate && timestamp) {
                      photoDate = new Date(timestamp);
                    }

                    const isTooOld = photoDate && photoDate.getFullYear() < 2010;
                    if (isTooOld) {
                      console.log(`    ⛔ Rejetée (trop ancienne: ${photoDate?.getFullYear()}): ${image.title}`);
                      continue;
                    }

                    imagesWithMetadata.push({
                      title: image.title,
                      url: imageUrl,
                      description: description,
                      artist: artist,
                      cleanDescription: cleanDescription,
                      year: photoDate?.getFullYear() || null,
                      isBuilding: hasRelevantKeyword
                    });
                  }
                }

                // Petite pause entre les requêtes
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (err) {
                console.log(`    ⚠️  Erreur métadonnées: ${image.title}`);
              }
            }

            console.log(`  ✅ ${imagesWithMetadata.length} images valides`);

            if (imagesWithMetadata.length > 0) {
              // Séparer images de bâtiments et autres
              const buildingImages = imagesWithMetadata.filter(img => img.isBuilding);
              const otherImages = imagesWithMetadata.filter(img => !img.isBuilding);

              console.log(`     → ${buildingImages.length} images de bâtiments, ${otherImages.length} autres images`);

              // Trier par année (les plus récentes en premier)
              const sortByYear = (a, b) => {
                if (!a.year && !b.year) return 0;
                if (!a.year) return 1;
                if (!b.year) return -1;
                return b.year - a.year;
              };

              buildingImages.sort(sortByYear);
              otherImages.sort(sortByYear);

              let selectedImage = null;

              // 1. D'abord chercher parmi les images de bâtiments avec priorité
              if (buildingImages.length > 0) {
                const priorityKeywords = [
                  'mairie', 'hôtel de ville', 'town hall',  // Mairie en priorité
                  'église', 'church', 'chapelle',           // Église
                  'château', 'castle',                      // Château
                  'place', 'centre',                        // Place centrale
                  'monument',                               // Monuments
                  'panorama', 'vue', 'view'                 // Vues générales
                ];

                for (const keyword of priorityKeywords) {
                  const priorityImage = buildingImages.find(img =>
                    img.title.toLowerCase().includes(keyword) ||
                    img.cleanDescription.includes(keyword)
                  );
                  if (priorityImage) {
                    selectedImage = priorityImage;
                    console.log(`  🎯 Image sélectionnée (bâtiment prioritaire "${keyword}"): ${selectedImage.title}`);
                    break;
                  }
                }

                // Si aucun mot-clé prioritaire, prendre le premier bâtiment
                if (!selectedImage) {
                  selectedImage = buildingImages[0];
                  console.log(`  🎯 Image sélectionnée (premier bâtiment): ${selectedImage.title}`);
                }
              }

              // 2. Sinon prendre n'importe quelle image valide (récente)
              if (!selectedImage && otherImages.length > 0) {
                selectedImage = otherImages[0];
                console.log(`  🎯 Image sélectionnée (image valide): ${selectedImage.title}`);
              }

              // Retourner l'image
              if (selectedImage) {
                return {
                  url: selectedImage.url,
                  description: selectedImage.description,
                  credit: selectedImage.artist,
                  source: 'Wikimedia Commons'
                };
              }
            }

            // Aucune image trouvée → fallback carte
            console.log(`  ⚠️ Aucune image trouvée, fallback sur carte`);
            return null;
          }
        }
      }
    }

    // Si aucune image trouvée via Wikipedia, essayer une recherche directe sur Commons
    const commonsSearchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(communeName + ' france mairie OR église OR monument')}&srnamespace=6&srlimit=5&format=json&origin=*`;

    const commonsResponse = await fetch(commonsSearchUrl);
    const commonsData = await commonsResponse.json();

    if (commonsData.query?.search?.length > 0) {
      const imageTitle = commonsData.query.search[0].title;

      // Obtenir l'URL de l'image
      const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(imageTitle)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;

      const imageInfoResponse = await fetch(imageInfoUrl);
      const imageInfoData = await imageInfoResponse.json();

      const imagePages = imageInfoData.query?.pages;
      if (imagePages) {
        const imagePage = Object.values(imagePages)[0];

        if (imagePage.imageinfo && imagePage.imageinfo[0]) {
          const imageUrl = imagePage.imageinfo[0].thumburl || imagePage.imageinfo[0].url;

          return {
            url: imageUrl,
            description: communeName,
            credit: '',
            source: 'Wikimedia Commons'
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Erreur Wikimedia Commons:', error);
    return null;
  }
}
