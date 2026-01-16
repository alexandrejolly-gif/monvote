// MonVote - Application principale

const API_BASE = window.location.origin;

// État de l'application
const state = {
  communes: [],
  selectedCommune: null,
  communeLayers: {},          // Map code -> Leaflet layer (GeoJSON ou marker)
  selectedCommuneLayer: null, // Layer actuellement surlignée
  questions: [],
  responses: {},
  currentQuestion: 0,
  results: null,
  themes: [],                 // Liste des thèmes uniques du quiz
  coveredThemes: new Set()    // Thèmes déjà abordés
};

// Mapping des emojis par thème
const THEME_EMOJIS = {
  'Transport': '🚌',
  'Logement': '🏠',
  'Environnement': '🌳',
  'Fiscalité': '💰',
  'Fiscalite': '💰',
  'Services publics': '🏛️',
  'Démocratie locale': '🗣️',
  'Democratie locale': '🗣️',
  'Urbanisme': '🏗️',
  'Sécurité': '🛡️',
  'Securite': '🛡️',
  'Social': '❤️',
  'Culture': '🎭',
  'Sport': '⚽',
  'Économie': '💼',
  'Economie': '💼',
  'Santé': '🏥',
  'Sante': '🏥',
  'Éducation': '📚',
  'Education': '📚'
};

// Éléments DOM
const elements = {
  stepCommune: document.getElementById('step-commune'),
  // stepCommuneInfo supprimé (écran 2 supprimé)
  stepQuiz: document.getElementById('step-quiz'),
  stepResults: document.getElementById('step-results'),
  communeSelect: document.getElementById('commune-select'),
  btnGeoloc: document.getElementById('btn-geoloc'),
  btnStartQuiz: document.getElementById('btn-start-quiz'),
  // btnBackToMap et btnStartQuizConfirm supprimés (écran 2 supprimé)
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  btnResults: document.getElementById('btn-results'),
  btnRestart: document.getElementById('btn-restart'),
  btnShare: document.getElementById('btn-share'),
  quizContent: document.getElementById('quiz-content'),
  quizCommune: document.getElementById('quiz-commune'),
  currentQuestionSpan: document.getElementById('current-question'),
  totalQuestionsSpan: document.getElementById('total-questions'),
  progressFill: document.getElementById('progress-fill'),
  resultsList: document.getElementById('results-list'),
  loading: document.getElementById('loading'),
  // Écran info commune
  infoPopulation: document.getElementById('info-population'),
  infoCandidats: document.getElementById('info-candidats'),
  infoQuestions: document.getElementById('info-questions'),
  // Theme indicators
  themeIndicators: document.getElementById('theme-indicators')
};

// Carte Leaflet
let map = null;
let markers = [];

// ======================
// Initialisation
// ======================

async function init() {
  try {
    showLoading('Chargement de l\'application...');
    updateLoadingProgress(20, 'Chargement des communes...');

    await loadCommunes();

    updateLoadingProgress(60, 'Initialisation de la carte...');
    await initMap();

    updateLoadingProgress(90, 'Finalisation...');
    setupEventListeners();
    initializeIcons();

    updateLoadingProgress(100, 'Prêt !');
    await new Promise(resolve => setTimeout(resolve, 300));

    hideLoading();
  } catch (error) {
    console.error('Erreur initialisation:', error);
    console.error('Stack trace:', error.stack);
    alert('Erreur lors du chargement: ' + error.message + '\nConsultez la console pour plus de détails.');
    hideLoading();
  }
}

// Initialiser les icônes statiques
function initializeIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    const iconName = el.getAttribute('data-icon');
    const iconSize = el.getAttribute('data-icon-size') || 20;
    el.innerHTML = getIcon(iconName, parseInt(iconSize));
  });
  initLucideIcons();
}

// Toggle accordéon candidats
function toggleCandidats() {
  const content = document.getElementById('candidats-liste');
  const toggle = document.getElementById('accordion-candidats-toggle');

  if (!content || !toggle) return;

  if (content.style.display === 'none') {
    content.style.display = 'block';
    toggle.classList.add('open');
  } else {
    content.style.display = 'none';
    toggle.classList.remove('open');
  }
}

// ======================
// API Calls
// ======================

async function loadCommunes() {
  const response = await fetch(`${API_BASE}/api/communes`);
  const data = await response.json();

  if (data.success) {
    state.communes = data.data;
    populateCommuneSelect();
  } else {
    throw new Error('Erreur chargement communes');
  }
}

async function loadQuiz(communeCode) {
  try {
    const response = await fetch(`${API_BASE}/api/get-questions?code=${communeCode}`);
    const data = await response.json();

    if (data.success) {
      state.questions = data.questions;
      state.responses = {};
      state.currentQuestion = 0;
      return true;
    } else {
      throw new Error('Erreur chargement quiz');
    }
  } catch (error) {
    console.error('Erreur loadQuiz:', error);
    alert('Erreur lors du chargement du quiz');
    return false;
  }
}

async function submitResults() {
  showLoading('Calcul de vos résultats...');
  updateLoadingProgress(10, 'Analyse de vos réponses...');

  try {
    const progressSim = simulateProgress(10, 80, 2000);

    const response = await fetch(`${API_BASE}/api/resultats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commune_code: state.selectedCommune.code,
        responses: state.responses
      })
    });

    clearInterval(progressSim);
    updateLoadingProgress(85, 'Calcul des compatibilités...');

    const data = await response.json();

    updateLoadingProgress(95, 'Préparation des résultats...');
    await new Promise(resolve => setTimeout(resolve, 300));

    if (data.success) {
      state.results = data.results;
      updateLoadingProgress(100, 'Résultats prêts !');
      await new Promise(resolve => setTimeout(resolve, 300));
      showResults();
    } else {
      // Afficher le message d'erreur du serveur
      const errorMsg = data.error || 'Erreur calcul résultats';
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('Erreur submitResults:', error);
    const errorMessage = error.message || 'Erreur lors du calcul des résultats';
    alert(errorMessage);
  } finally {
    hideLoading();
  }
}

// ======================
// UI Functions
// ======================

function populateCommuneSelect() {
  elements.communeSelect.innerHTML = '<option value="">Sélectionnez votre commune...</option>';

  state.communes
    .sort((a, b) => a.nom.localeCompare(b.nom))
    .forEach(commune => {
      const option = document.createElement('option');
      option.value = commune.code;

      const nbCandidats = commune.nb_candidats || 0;
      const hasCandidats = nbCandidats > 0;

      if (hasCandidats) {
        option.textContent = `${commune.nom} (${commune.population.toLocaleString()} hab.)`;
      } else {
        option.textContent = `${commune.nom} (aucun candidat)`;
        option.disabled = true;
        option.style.color = '#999';
      }

      elements.communeSelect.appendChild(option);
    });
}

async function initMap() {
  console.log('🗺️ Initialisation de la carte...');

  // Vérifier que Leaflet est chargé
  if (typeof L === 'undefined') {
    throw new Error('Leaflet (L) n\'est pas défini. Vérifiez que la bibliothèque est chargée.');
  }

  // Vérifier que le conteneur existe
  const container = document.getElementById('map-container');
  if (!container) {
    throw new Error('Le conteneur map-container est introuvable.');
  }

  // Initialiser la carte centrée sur Rennes Métropole
  map = L.map('map-container').setView([48.1119, -1.6743], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  console.log('✅ Carte Leaflet initialisée');

  // Afficher loader pendant chargement GeoJSON
  showMapLoading();

  try {
    console.log('📦 Import du module GeoJSON...');
    // Importer l'utilitaire GeoJSON
    const { fetchAllCommuneGeometries } = await import('./geojson-fetcher.js');
    console.log('✅ Module GeoJSON importé');

    console.log(`🔍 Chargement GeoJSON pour ${state.communes.length} communes...`);
    // Récupérer tous les GeoJSON en parallèle
    const geometries = await fetchAllCommuneGeometries(state.communes);
    console.log(`✅ ${geometries.length} géométries chargées`);

    // Créer les layers pour chaque commune
    geometries.forEach(({ code, geometry }) => {
      const commune = state.communes.find(c => c.code === code);

      if (!commune) {
        console.error(`❌ Commune introuvable pour le code: ${code}`);
        return;
      }

      console.log(`🔷 Création layer pour ${commune.nom} (${code})`);

      if (geometry) {
        // Vérifier si la commune a des candidats
        const nbCandidats = commune.nb_candidats || 0;
        const hasCandidats = nbCandidats > 0;

        // Créer layer GeoJSON pour le polygone
        const layer = L.geoJSON(geometry, {
          style: {
            fillColor: hasCandidats ? '#3b82f6' : '#95a5a6',
            fillOpacity: hasCandidats ? 0.2 : 0.1,
            color: hasCandidats ? '#3b82f6' : '#95a5a6',
            weight: 2,
            dashArray: hasCandidats ? null : '5, 5'
          },
          onEachFeature: (feature, layer) => {
            // Hover effects
            layer.on('mouseover', function() {
              if (hasCandidats && state.selectedCommune?.code !== code) {
                this.setStyle({ fillOpacity: 0.4, weight: 3 });
              }
            });

            layer.on('mouseout', function() {
              if (hasCandidats && state.selectedCommune?.code !== code) {
                this.setStyle({ fillOpacity: 0.2, weight: 2 });
              }
            });

            // Click handler seulement si la commune a des candidats
            if (hasCandidats) {
              layer.on('click', () => selectCommune(code));
            } else {
              // Curseur différent pour les communes sans candidats
              layer.on('mouseover', function() {
                this.setStyle({ fillOpacity: 0.15 });
              });
              layer.on('mouseout', function() {
                this.setStyle({ fillOpacity: 0.1 });
              });
            }
          }
        }).addTo(map);

        state.communeLayers[code] = layer;
      } else {
        // Fallback: marker si GeoJSON échoue
        if (commune.lat && commune.lng) {
          const nbCandidats = commune.nb_candidats || 0;
          const hasCandidats = nbCandidats > 0;

          // Icône différente pour les communes sans candidats
          const markerOptions = hasCandidats ? {} : {
            opacity: 0.4,
            icon: L.divIcon({
              className: 'disabled-marker',
              html: '<div style="background-color: #95a5a6; width: 25px; height: 41px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); opacity: 0.5;"></div>',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            })
          };

          const marker = L.marker([commune.lat, commune.lng], markerOptions)
            .addTo(map);

          // Click handler seulement si la commune a des candidats
          if (hasCandidats) {
            marker.on('click', () => selectCommune(code));
          }
          state.communeLayers[code] = marker;
        }
      }
    });

    // Ne pas ajuster le zoom automatiquement - garder la vue initiale sur Rennes Métropole
    // (sinon ça zoom bizarre quand on ajoute des communes lointaines comme Vitré)

    console.log(`✓ Map initialized with ${Object.keys(state.communeLayers).length} communes`);

  } catch (error) {
    console.error('Erreur chargement carte GeoJSON:', error);
    // Fallback complet aux marqueurs
    initMapWithMarkers();
  } finally {
    hideMapLoading();
  }
}

// Fallback si GeoJSON échoue complètement
function initMapWithMarkers() {
  state.communes.forEach(commune => {
    if (commune.lat && commune.lng) {
      const nbCandidats = commune.nb_candidats || 0;
      const hasCandidats = nbCandidats > 0;

      // Icône différente pour les communes sans candidats
      const markerOptions = hasCandidats ? {} : {
        opacity: 0.4,
        icon: L.divIcon({
          className: 'disabled-marker',
          html: '<div style="background-color: #95a5a6; width: 25px; height: 41px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); opacity: 0.5;"></div>',
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })
      };

      const marker = L.marker([commune.lat, commune.lng], markerOptions)
        .addTo(map);

      // Click handler seulement si la commune a des candidats
      if (hasCandidats) {
        marker.on('click', () => selectCommune(commune.code));
      }
      state.communeLayers[commune.code] = marker;
    }
  });
}

function showMapLoading() {
  const container = document.getElementById('map-container');
  const loader = document.createElement('div');
  loader.id = 'map-loader';
  loader.className = 'map-loader';
  loader.innerHTML = '<div class="spinner"></div><p>Chargement de la carte...</p>';
  container.appendChild(loader);
}

function hideMapLoading() {
  const loader = document.getElementById('map-loader');
  if (loader) {
    loader.remove();
  }
}

function selectCommune(code) {
  console.log(`🎯 Sélection commune: ${code}`);
  state.selectedCommune = state.communes.find(c => c.code === code);

  if (state.selectedCommune) {
    console.log(`✅ Commune trouvée: ${state.selectedCommune.nom}`);
    elements.communeSelect.value = code;
    elements.communeSelect.classList.add('commune-selected'); // Ajoute une classe pour styling
    elements.btnStartQuiz.disabled = false;

    // Surligner la commune sur la carte
    highlightCommuneOnMap(code);

    // Mettre à jour le bandeau d'infos
    updateCommuneInfoBar(state.selectedCommune);
  } else {
    console.error(`❌ Commune non trouvée pour le code: ${code}`);
  }
}

// Fonction pour mettre à jour le bandeau d'infos commune
function updateCommuneInfoBar(commune) {
  const infoBar = document.getElementById('commune-info-bar');

  if (!commune) {
    if (infoBar) infoBar.classList.add('hidden');
    return;
  }

  // Afficher le bandeau
  if (infoBar) infoBar.classList.remove('hidden');

  // Population
  const populationEl = document.getElementById('info-bar-population');
  if (populationEl) {
    const population = commune.population || commune.habitants || '-';
    populationEl.textContent = typeof population === 'number' ? population.toLocaleString('fr-FR') : population;
  }

  // Maire sortant
  const maireEl = document.getElementById('info-bar-maire');
  if (maireEl) {
    let maire = '-';
    if (commune.maire_sortant) {
      if (typeof commune.maire_sortant === 'string') {
        maire = commune.maire_sortant;
      } else if (commune.maire_sortant.nom) {
        const initiale = commune.maire_sortant.prenom ? commune.maire_sortant.prenom.charAt(0) + '. ' : '';
        maire = `${initiale}${commune.maire_sortant.nom}`;
      }
    }
    maireEl.textContent = maire;
  }

  // Charger les candidats depuis l'API
  const nbCandidatsEl = document.getElementById('info-bar-nb-candidats');
  const listElement = document.getElementById('info-bar-candidats-list');

  if (commune.code) {
    fetch(`${API_BASE}/api/get-candidats?code=${commune.code}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.candidats && data.candidats.length > 0) {
          // Nombre de candidats
          if (nbCandidatsEl) {
            nbCandidatsEl.textContent = data.candidats.length;
          }

          // Liste des candidats dans le tooltip
          if (listElement) {
            const maireNom = commune.maire_sortant?.nom || commune.maire_sortant || '';
            listElement.innerHTML = data.candidats.map(c => {
              const isSortant = c.is_maire_sortant || c.sortant || c.maire_sortant || c.nom === maireNom;
              const nom = `${c.prenom || ''} ${c.nom}`.trim();
              return `<li>${nom}${isSortant ? ' <span class="candidat-sortant">sortant</span>' : ''}</li>`;
            }).join('');
          }
        } else {
          if (nbCandidatsEl) nbCandidatsEl.textContent = commune.nb_candidats || 0;
          if (listElement) listElement.innerHTML = '<li>Aucun candidat trouvé</li>';
        }
      })
      .catch(err => {
        console.log('Impossible de charger les candidats:', err);
        if (nbCandidatsEl) nbCandidatsEl.textContent = commune.nb_candidats || 0;
        if (listElement) listElement.innerHTML = '<li>Informations non disponibles</li>';
      });
  }
}

function highlightCommuneOnMap(code) {
  // Reset de la sélection précédente
  if (state.selectedCommuneLayer) {
    if (state.selectedCommuneLayer.setStyle) {
      // Layer GeoJSON
      state.selectedCommuneLayer.setStyle({
        fillOpacity: 0.2,
        weight: 2,
        color: '#3b82f6'
      });
    }
  }

  // Surligner la nouvelle sélection
  const layer = state.communeLayers[code];
  if (layer) {
    if (layer.setStyle) {
      // Layer GeoJSON
      layer.setStyle({
        fillOpacity: 0.6,
        weight: 4,
        color: '#1d4ed8'
      });
    }

    // Centrer la carte sur la commune (sans zoomer)
    if (layer.getBounds) {
      // GeoJSON layer avec bounds - centrer sur le centre du polygone
      const center = layer.getBounds().getCenter();
      map.panTo(center, { animate: true, duration: 0.5 });
    } else if (layer.getLatLng) {
      // Marker - centrer sur le marker
      map.panTo(layer.getLatLng(), { animate: true, duration: 0.5 });
    }

    state.selectedCommuneLayer = layer;
  }
}

function showStep(stepId) {
  document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
}

async function showCommuneInfo() {
  if (!state.selectedCommune) return;

  const commune = state.selectedCommune;

  // Mettre à jour les statistiques
  elements.infoPopulation.textContent = commune.population.toLocaleString();
  elements.infoCandidats.textContent = commune.nb_candidats || 0;

  // Afficher le badge maire sortant
  const maireBadge = document.getElementById('maire-badge');
  const maireNom = document.getElementById('maire-nom');
  if (maireBadge && maireNom) {
    if (commune.maire_sortant && commune.maire_sortant.nom) {
      const initiale = commune.maire_sortant.prenom ? commune.maire_sortant.prenom.charAt(0) + '. ' : '';
      maireNom.textContent = `${initiale}${commune.maire_sortant.nom}`;
      maireBadge.style.display = 'inline-flex';
    } else {
      maireBadge.style.display = 'none';
    }
  }

  // Charger et afficher la liste des candidats
  const candidatsSection = document.getElementById('candidats-section');
  const candidatsListe = document.getElementById('candidats-liste');
  const nbCandidatsDisplay = document.getElementById('nb-candidats-display');

  if (candidatsSection && candidatsListe && commune.nb_candidats > 0) {
    fetch(`${API_BASE}/api/get-candidats?code=${commune.code}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.candidats && data.candidats.length > 0) {
          // Mettre à jour le nombre de candidats
          if (nbCandidatsDisplay) {
            nbCandidatsDisplay.textContent = data.candidats.length;
          }

          candidatsListe.innerHTML = '';
          data.candidats.forEach(candidat => {
            const div = document.createElement('div');
            div.className = 'candidat-item';
            if (candidat.maire_sortant) {
              div.classList.add('maire-sortant');
            }
            const nom = `${candidat.prenom || ''} ${candidat.nom}`.trim();
            const parti = candidat.parti ? ` (${candidat.parti})` : '';
            div.textContent = nom + parti;
            candidatsListe.appendChild(div);
          });
          candidatsSection.style.display = 'block';

          // Réinitialiser les icônes dans l'accordéon
          initializeIcons();
        } else {
          candidatsSection.style.display = 'none';
        }
      })
      .catch(err => {
        console.log('Impossible de charger les candidats:', err);
        candidatsSection.style.display = 'none';
      });
  } else {
    if (candidatsSection) {
      candidatsSection.style.display = 'none';
    }
  }

  // Mettre à jour la photo de la commune
  const photoContainer = document.getElementById('commune-photo-container');
  const photoName = document.getElementById('commune-photo-name');

  if (photoContainer && photoName) {
    photoName.textContent = commune.nom;

    // Générer un gradient unique basé sur le nom de la commune (fallback)
    const hash = commune.nom.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue1 = hash % 360;
    const hue2 = (hash + 120) % 360;

    // Créer un beau gradient personnalisé comme fallback
    photoContainer.style.background = `linear-gradient(135deg,
      hsl(${hue1}, 70%, 50%) 0%,
      hsl(${hue2}, 65%, 45%) 100%)`;

    // Charger la vraie photo de la commune via l'API
    const photoImg = document.getElementById('commune-photo');
    if (photoImg) {
      // Reset de l'image
      photoImg.style.opacity = '0';
      photoImg.style.display = 'block';
      photoImg.style.transition = 'opacity 0.5s ease';

      // Appeler l'API pour obtenir une photo de la commune
      fetch(`${API_BASE}/api/commune-photo?nom=${encodeURIComponent(commune.nom)}&code=${commune.code}`)
        .then(response => response.json())
        .then(data => {
          if (data.success && data.image) {
            photoImg.src = data.image.url;
            photoImg.alt = `${commune.nom} - ${data.image.description || 'Photo de la commune'}`;

            // Si l'image charge, on l'affiche
            photoImg.onload = () => {
              photoImg.style.opacity = '1';
            };

            // En cas d'erreur de chargement de l'image
            photoImg.onerror = () => {
              loadStaticMap();
            };
          } else {
            // Pas de photo trouvée, afficher une carte statique
            loadStaticMap();
          }
        })
        .catch(error => {
          console.log(`ℹ️ Pas de photo trouvée pour ${commune.nom}, utilisation d'une carte`);
          loadStaticMap();
        });

      // Fonction pour charger une carte statique
      function loadStaticMap() {
        if (commune.lat && commune.lng) {
          // Utiliser l'API de cartes statiques OSM via Wikimedia
          const zoom = 13;
          const width = 800;
          const height = 400;
          const mapUrl = `https://maps.wikimedia.org/img/osm-intl,${zoom},${commune.lat},${commune.lng},${width}x${height}.png`;

          photoImg.src = mapUrl;
          photoImg.alt = `Carte de ${commune.nom}`;
          photoImg.onload = () => {
            photoImg.style.opacity = '0.8';  // Légèrement transparent pour indiquer que c'est une carte
          };
          photoImg.onerror = () => {
            photoImg.style.display = 'none';  // Si la carte ne charge pas, on cache
          };
        } else {
          photoImg.style.display = 'none';
        }
      }
    }
  }

  // Le nombre de questions est fixe à 15 (déjà dans le HTML)
  // Le temps estimé est fixe à 3-5 minutes (déjà dans le HTML)

  // Afficher l'écran d'info
  showStep('step-commune-info');

  // Charger l'image de fond de la commune
  updateCommuneBackground(commune.nom);
}

function updateCommuneBackground(communeName) {
  const bgElement = document.getElementById('commune-background');
  const creditElement = document.getElementById('photo-credit');

  if (!bgElement) return;

  const imageData = getCommuneImage(communeName);

  // Précharger l'image
  const img = new Image();
  img.onload = () => {
    bgElement.style.backgroundImage = `url(${imageData.url})`;
    if (creditElement) {
      creditElement.textContent = `📷 ${imageData.description}`;
    }
  };
  img.onerror = () => {
    bgElement.style.backgroundImage = `url(${DEFAULT_IMAGE.url})`;
    if (creditElement) {
      creditElement.textContent = `📷 ${DEFAULT_IMAGE.description}`;
    }
  };
  img.src = imageData.url;
}

async function startQuiz() {
  if (!state.selectedCommune) return;

  try {
    // Chargement simple et rapide (~1s)
    showLoading('Chargement du quiz...');
    updateLoadingProgress(20, 'Chargement du quiz...');

    // Charger les candidats et questions en parallèle
    const [candidatsResponse, quizSuccess] = await Promise.all([
      fetch(`${API_BASE}/api/get-candidats?code=${state.selectedCommune.code}`),
      loadQuiz(state.selectedCommune.code)
    ]);

    const candidatsData = await candidatsResponse.json();

    updateLoadingProgress(80, 'Préparation...');

    if (!candidatsData.success) {
      throw new Error('Erreur lors de la récupération des candidats');
    }

    // Vérifier si la commune est disponible
    if (candidatsData.available === false) {
      hideLoading();
      alert(`❌ Désolé, aucun candidat ni maire identifié pour ${state.selectedCommune.nom}.\n\nCette commune n'est pas encore disponible pour le quiz.\n\n${candidatsData.note || ''}`);
      return;
    }

    // Vérifier si la liste est vide (au cas où)
    if (!candidatsData.candidats || candidatsData.candidats.length === 0) {
      hideLoading();
      alert(`❌ Aucun candidat disponible pour ${state.selectedCommune.nom}.\n\nVeuillez réessayer plus tard.`);
      return;
    }

    // Informer l'utilisateur si candidats 2020
    if (candidatsData.annee === 2020) {
      showNotification('info', `Candidats de 2020 affichés (élections 2026 à venir pour ${state.selectedCommune.nom})`);
    }

    // Informer l'utilisateur si candidats générés par défaut
    if (candidatsData.candidats.some(c => c.source_type === 'generated')) {
      showNotification('info', `Candidats génériques affichés pour ${state.selectedCommune.nom} (données 2026 en attente)`);
    }

    if (!quizSuccess) {
      throw new Error('Échec du chargement du quiz');
    }

    updateLoadingProgress(100, 'Quiz prêt !');
    await new Promise(resolve => setTimeout(resolve, 300));

    elements.quizCommune.textContent = `Quiz - ${state.selectedCommune.nom}`;
    elements.totalQuestionsSpan.textContent = state.questions.length;

    // Initialiser le suivi des thèmes
    initializeThemes();

    renderQuestion();
    showStep('step-quiz');

  } catch (error) {
    console.error('Erreur startQuiz:', error);
    alert('Erreur lors du démarrage du quiz. Veuillez réessayer.');
  } finally {
    hideLoading();
  }
}

// Fonction pour simuler une progression progressive
function simulateProgress(startPercent, endPercent, duration) {
  const startTime = Date.now();
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const currentPercent = startPercent + (endPercent - startPercent) * progress;

    const progressBar = document.getElementById('loading-progress-bar');
    const percentageText = document.getElementById('loading-percentage');

    if (progressBar && percentageText) {
      progressBar.style.width = `${currentPercent}%`;
      percentageText.textContent = `${Math.round(currentPercent)}%`;
    }

    if (progress >= 1) {
      clearInterval(interval);
    }
  }, 100);

  return interval;
}

function initializeThemes() {
  // Extraire tous les thèmes uniques des questions
  const uniqueThemes = [...new Set(state.questions.map(q => q.theme))];
  state.themes = uniqueThemes;
  state.coveredThemes = new Set();

  // Rendre les indicateurs de thèmes
  renderThemeIndicators();
}

function renderThemeIndicators() {
  if (!elements.themeIndicators || state.themes.length === 0) return;

  const html = state.themes.map(theme => {
    const isCovered = state.coveredThemes.has(theme);
    return `
      <div class="theme-indicator ${isCovered ? 'covered' : ''}">
        <div class="theme-indicator-dot"></div>
        <span>${theme}</span>
      </div>
    `;
  }).join('');

  elements.themeIndicators.innerHTML = html;
}

// Fonction pour mélanger un array (Fisher-Yates shuffle)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function updateThemeDisplay(themeName) {
  const emoji = THEME_EMOJIS[themeName] || '📋';
  const emojiEl = document.getElementById('current-theme-emoji');
  const labelEl = document.getElementById('current-theme-label');

  if (emojiEl) {
    emojiEl.textContent = emoji;
  }
  if (labelEl) {
    labelEl.textContent = themeName.toUpperCase();
  }
}

function renderQuestion() {
  const question = state.questions[state.currentQuestion];

  if (!question) return;

  // Marquer le thème comme abordé
  state.coveredThemes.add(question.theme);

  // Mettre à jour l'affichage du thème actuel avec emoji
  updateThemeDisplay(question.theme);

  // Mélanger les réponses pour éviter les biais de position
  const shuffledReponses = shuffleArray(question.reponses);

  const html = `
    <h3 class="question-text">${question.question}</h3>
    <div class="answers">
      ${shuffledReponses.map(reponse => `
        <label class="answer-option ${state.responses[question.id] === reponse.position ? 'selected' : ''}">
          <input type="radio"
                 name="q${question.id}"
                 value="${reponse.position}"
                 ${state.responses[question.id] === reponse.position ? 'checked' : ''}
                 onchange="selectAnswer(${question.id}, ${reponse.position})">
          ${reponse.texte}
        </label>
      `).join('')}
    </div>
  `;

  elements.quizContent.innerHTML = html;
  updateQuizNav();
}

function selectAnswer(questionId, position) {
  state.responses[questionId] = position;
  updateQuizNav();

  // Mettre à jour le style
  document.querySelectorAll('.answer-option').forEach(option => {
    option.classList.remove('selected');
  });
  event.target.closest('.answer-option').classList.add('selected');
}

function updateQuizNav() {
  const currentQ = state.currentQuestion;
  const totalQ = state.questions.length;
  const currentQuestion = state.questions[currentQ];

  elements.currentQuestionSpan.textContent = currentQ + 1;
  elements.progressFill.style.width = `${((currentQ + 1) / totalQ) * 100}%`;

  elements.btnPrev.disabled = currentQ === 0;
  elements.btnNext.disabled = !state.responses[currentQuestion.id];

  if (currentQ === totalQ - 1) {
    elements.btnNext.style.display = 'none';
    elements.btnResults.style.display = state.responses[currentQuestion.id] ? 'flex' : 'none';
  } else {
    elements.btnNext.style.display = 'inline-block';
    elements.btnResults.style.display = 'none';
  }
}

function prevQuestion() {
  if (state.currentQuestion > 0) {
    state.currentQuestion--;
    renderQuestion();
  }
}

function nextQuestion() {
  if (state.currentQuestion < state.questions.length - 1) {
    state.currentQuestion++;
    renderQuestion();
  }
}

function getTopMatchingPoints(result) {
  // Si pas de détails de réponses, retourner vide
  if (!result.details || !result.details.reponses) return [];

  const matches = [];

  // Pour chaque question, vérifier s'il y a accord
  result.details.reponses.forEach(rep => {
    // Si user et candidat ont choisi la même position, c'est un accord
    if (rep.user_reponse === rep.candidat_reponse && rep.user_reponse !== null) {
      matches.push({
        question: rep.question,
        theme: rep.theme || 'Général',
        agreement: true
      });
    }
  });

  // Limiter aux 3 premiers (idéalement variés par thème)
  const topMatches = [];
  const usedThemes = new Set();

  // Premier passage : prendre un match par thème différent
  for (const match of matches) {
    if (!usedThemes.has(match.theme) && topMatches.length < 3) {
      topMatches.push(match);
      usedThemes.add(match.theme);
    }
  }

  // Deuxième passage : compléter jusqu'à 3 si nécessaire
  for (const match of matches) {
    if (topMatches.length >= 3) break;
    if (!topMatches.includes(match)) {
      topMatches.push(match);
    }
  }

  return topMatches.slice(0, 3);
}

function showResults() {
  if (!state.results) return;

  // Afficher le nom de la commune dans le titre
  const resultsCommune = document.getElementById('results-commune-name');
  if (resultsCommune && state.selectedCommune) {
    resultsCommune.textContent = state.selectedCommune.nom;
  }

  let html = '';

  state.results.forEach((result, index) => {
    if (result.compatibilite === null) {
      // Candidat sans positions
      html += `
        <div class="result-card compact" style="animation-delay: ${index * 100}ms;">
          <div class="result-content">
            <div class="result-header">
              <div class="result-identity">
                <div class="result-name">${result.candidat.prenom || ''} ${result.candidat.nom}</div>
                <div class="result-meta">${result.candidat.parti || ''} ${result.candidat.liste ? '- ' + result.candidat.liste : ''}</div>
              </div>
              <div class="result-score-container">
                <div style="color: var(--secondary); font-style: italic;">Données insuffisantes</div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Candidat avec compatibilité calculée
      const compatClass = getCompatibilityClass(result.compatibilite);
      const hasThemes = result.details?.par_theme?.length > 0;
      const hasPropositions = result.candidat.propositions && result.candidat.propositions.length > 0;
      const isMaire = result.candidat.maire_sortant === true;

      // Calculer les top 3 points d'accord
      const topMatches = getTopMatchingPoints(result);

      // Classe spéciale pour le top 1
      const isTop1 = index === 0;

      html += `
        <div class="result-card compact ${isTop1 ? 'result-card-top' : ''}" style="animation-delay: ${index * 100}ms;">
          <div class="result-content">
            <!-- Header horizontal compact -->
            <div class="result-header">
              <div class="result-rank">${index + 1}</div>

              <div class="result-identity">
                <div class="result-name-line">
                  <span class="result-name">${result.candidat.prenom || ''} ${result.candidat.nom}</span>
                  ${isMaire ? `<span class="badge-maire">${getIcon('building', 16)} Maire</span>` : ''}
                  ${hasPropositions ? `
                    <button class="btn-toggle-proposals" onclick="togglePropositions(${index})" aria-label="Voir les propositions">
                      <span class="toggle-arrow" id="toggle-arrow-${index}">▼</span>
                    </button>
                  ` : ''}
                </div>
                <div class="result-meta">${result.candidat.liste || ''} ${result.candidat.parti ? '(' + result.candidat.parti + ')' : ''}</div>
              </div>

              <!-- Barre de progression horizontale intégrée -->
              <div class="result-bar-container">
                <div class="compatibility-bar-fill ${compatClass}" style="width: ${result.compatibilite}%"></div>
              </div>

              <!-- Score à droite -->
              <div class="result-score-container">
                <div class="score-value">${result.compatibilite}%</div>
                <div class="score-label">compatible</div>
              </div>
            </div>

            <!-- Top 3 points d'accord (toujours visible) -->
            ${topMatches.length > 0 ? `
              <div class="top-matches-section">
                <div class="section-title-inline">${getIcon('check', 16)} Top 3 points d'accord</div>
                <ul class="top-matches-list">
                  ${topMatches.map(match => `
                    <li class="match-item">
                      <span class="match-theme">${match.theme}</span>
                      <span class="match-question">${match.question}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            <!-- Section propositions (expandable) -->
            ${hasPropositions ? `
              <div class="expandable-section propositions-details" id="propositions-${index}">
                <div class="section-title">Principales propositions</div>
                <ul class="propositions-list">
                  ${result.candidat.propositions.map(prop => `
                    <li class="proposition-item">${prop}</li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
  });

  elements.resultsList.innerHTML = html;
  initLucideIcons(); // Initialiser les icônes Lucide après injection du HTML
  showStep('step-results');

  // Trigger animations
  setTimeout(() => {
    document.querySelectorAll('.compatibility-bar-fill').forEach(bar => {
      bar.style.width = bar.style.width;
    });
  }, 100);
}

function getCompatibilityClass(percentage) {
  if (percentage >= 70) return 'high';
  if (percentage >= 50) return 'medium';
  return 'low';
}

function toggleThemeDetails(index) {
  const details = document.getElementById(`theme-details-${index}`);
  if (details) {
    details.classList.toggle('open');
  }
}

function togglePropositions(index) {
  const details = document.getElementById(`propositions-${index}`);
  const arrow = document.getElementById(`toggle-arrow-${index}`);
  if (details) {
    details.classList.toggle('open');
    if (arrow) {
      arrow.style.transform = details.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }
}

function restart() {
  state.selectedCommune = null;
  state.questions = [];
  state.responses = {};
  state.currentQuestion = 0;
  state.results = null;

  elements.communeSelect.value = '';
  elements.communeSelect.classList.remove('commune-selected'); // Retire la classe de styling
  elements.btnStartQuiz.disabled = true;

  showStep('step-commune');
}

// ======================
// Partage des résultats
// ======================

function shareResults() {
  if (!state.results || state.results.length === 0) return;

  const topResult = state.results[0];
  const communeName = state.selectedCommune?.nom || 'ma commune';
  const scoreTop = topResult.compatibilite !== null ? `${topResult.compatibilite}%` : 'N/A';

  const shareText = `J'ai fait le quiz MonVote pour ${communeName} !\n\nMon meilleur match : ${topResult.candidat.prenom || ''} ${topResult.candidat.nom} (${scoreTop} de compatibilité)\n\nFaites le quiz vous aussi sur MonVote !`;

  // Web Share API si disponible
  if (navigator.share) {
    navigator.share({
      title: 'MonVote - Mes résultats',
      text: shareText,
      url: window.location.href
    }).catch(err => {
      console.log('Partage annulé ou erreur:', err);
    });
  } else {
    // Fallback : copier dans le presse-papiers
    navigator.clipboard.writeText(shareText).then(() => {
      alert('Résultats copiés dans le presse-papiers !');
    }).catch(() => {
      alert('Impossible de partager automatiquement. Copiez le texte manuellement.');
    });
  }
}

// ======================
// Event Listeners
// ======================

function setupEventListeners() {
  // Rendre le titre cliquable pour revenir à l'accueil (ancien header - legacy)
  const appTitle = document.getElementById('app-title');
  if (appTitle) {
    appTitle.addEventListener('click', restart);
  }

  // Rendre le nouveau header cliquable pour revenir à l'accueil
  const header = document.querySelector('.header');
  if (header) {
    header.addEventListener('click', restart);
  }

  elements.communeSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      selectCommune(e.target.value);
    }
  });

  elements.btnGeoloc.addEventListener('click', () => {
    if ('geolocation' in navigator) {
      showLoading('Géolocalisation en cours...');
      updateLoadingProgress(30, 'Recherche de votre position...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateLoadingProgress(100, 'Position trouvée !');
          setTimeout(() => {
            hideLoading();
            // Dans un vrai projet, on trouverait la commune la plus proche
            alert('Géolocalisation réussie ! Sélectionnez votre commune dans la liste.');
            map.setView([position.coords.latitude, position.coords.longitude], 13);
          }, 300);
        },
        (error) => {
          hideLoading();
          alert('Erreur de géolocalisation. Veuillez sélectionner manuellement votre commune.');
        }
      );
    } else {
      alert('Géolocalisation non disponible');
    }
  });

  // Démarrer le quiz directement depuis l'écran 1 (l'écran 2 info commune a été supprimé)
  elements.btnStartQuiz.addEventListener('click', startQuiz);

  // Les éléments suivants ont été supprimés avec l'écran 2 :
  // - linkBackToMap (lien "Changer de commune")
  // - btnStartQuizConfirm (bouton "Commencer le quiz" de l'écran 2)
  elements.btnPrev.addEventListener('click', prevQuestion);
  elements.btnNext.addEventListener('click', nextQuestion);
  elements.btnResults.addEventListener('click', submitResults);
  elements.btnRestart.addEventListener('click', restart);

  // Partage des résultats
  if (elements.btnShare) {
    elements.btnShare.addEventListener('click', shareResults);
  }

  // Lien retour depuis le quiz
  const linkBackToCommune = document.getElementById('link-back-to-commune');
  if (linkBackToCommune) {
    linkBackToCommune.addEventListener('click', (e) => {
      e.preventDefault();
      showStep('step-commune');  // Retour direct à l'écran de sélection commune (écran 2 supprimé)
    });
  }
}

// ======================
// Loading avec progression
// ======================

let progressInterval = null;

function showLoading(message = null) {
  const loadingMessage = document.getElementById('loading-message');
  const loadingPercentage = document.getElementById('loading-percentage');
  const loadingProgressBar = document.getElementById('loading-progress-bar');

  if (message) {
    loadingMessage.textContent = message;
  } else {
    loadingMessage.textContent = 'Chargement...';
  }

  loadingPercentage.textContent = '0%';
  loadingProgressBar.style.width = '0%';

  elements.loading.style.display = 'flex';
}

function hideLoading() {
  elements.loading.style.display = 'none';
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function updateLoadingProgress(percentage, message) {
  const loadingMessage = document.getElementById('loading-message');
  const loadingPercentage = document.getElementById('loading-percentage');
  const loadingProgressBar = document.getElementById('loading-progress-bar');

  if (message) {
    loadingMessage.textContent = message;
  }

  loadingPercentage.textContent = `${Math.round(percentage)}%`;
  loadingProgressBar.style.width = `${percentage}%`;
}

function showCandidateSearchLoading(communeName) {
  showLoading(`Recherche des candidats pour ${communeName}...`);
  updateLoadingProgress(5, `Recherche des candidats pour ${communeName}...`);
}

// Fonction pour afficher des notifications toast
function showNotification(type, message) {
  const notif = document.createElement('div');
  notif.className = `notification notification-${type}`;
  notif.textContent = message;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.classList.add('fade-out');
    setTimeout(() => notif.remove(), 300);
  }, 5000);
}


// ======================
// Init au chargement
// ======================

document.addEventListener('DOMContentLoaded', () => {
  init();
});

// ======================
// Theme Toggle
// ======================

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  
  if (isDark) {
    html.removeAttribute('data-theme');
    localStorage.setItem('pqv-theme', 'light');
  } else {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('pqv-theme', 'dark');
  }
}

function initTheme() {
  const saved = localStorage.getItem('pqv-theme');
  
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (saved === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    // Pas de préférence sauvée → utiliser préférence système
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }
}

// Écouter les changements de préférence système
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  // Seulement si pas de préférence sauvée
  if (!localStorage.getItem('pqv-theme')) {
    if (e.matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
});

// Initialiser le thème au chargement
initTheme();

// ======================
//   SERVICE WORKER - PWA
// ======================

// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker enregistré:', registration.scope);
      })
      .catch((error) => {
        console.log('❌ Service Worker erreur:', error);
      });
  });
}
