// MonVote - Admin Panel

const API_BASE = window.location.origin;

// État
const state = {
  adminKey: null,
  communes: [],
  stats: null,
  submissions: [],
  currentSubmission: null
};

// Éléments DOM
const elements = {
  loginSection: document.getElementById('login-section'),
  loginForm: document.getElementById('login-form'),
  adminKeyInput: document.getElementById('admin-key-input'),
  dashboardSection: document.getElementById('dashboard-section'),
  moderationSection: document.getElementById('moderation-section'),
  loading: document.getElementById('loading')
};

// ======================
// Initialisation
// ======================

function init() {
  // Vérifier si admin key dans URL
  const params = new URLSearchParams(window.location.search);
  const keyFromUrl = params.get('key');

  if (keyFromUrl) {
    state.adminKey = keyFromUrl;
    checkAuth();
  }

  setupEventListeners();
}

// ======================
// Authentification
// ======================

function setupEventListeners() {
  if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.adminKey = elements.adminKeyInput.value;
      checkAuth();
    });
  }
}

async function checkAuth() {
  if (!state.adminKey) return;

  try {
    const response = await fetch(`${API_BASE}/api/admin?action=stats&key=${state.adminKey}`);

    if (response.ok) {
      // Authentifié
      if (elements.loginSection) {
        elements.loginSection.style.display = 'none';
      }

      const pageName = window.location.pathname.split('/').pop();

      if (pageName.includes('moderation')) {
        await initModeration();
      } else {
        await initDashboard();
      }
    } else {
      alert('Clé admin invalide');
      state.adminKey = null;
    }
  } catch (error) {
    console.error('Erreur auth:', error);
    alert('Erreur de connexion');
  }
}

// ======================
// Dashboard
// ======================

async function initDashboard() {
  if (elements.dashboardSection) {
    elements.dashboardSection.style.display = 'block';
  }

  await loadStats();
  initializeIcons();
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

async function loadStats() {
  try {
    const response = await fetch(`${API_BASE}/api/admin?action=stats&key=${state.adminKey}`);
    const data = await response.json();

    if (data.success) {
      state.stats = data.stats;
      displayStats();
    }
  } catch (error) {
    console.error('Erreur loadStats:', error);
  }
}

function displayStats() {
  const s = state.stats;

  // Stats principales
  document.getElementById('stat-candidats').textContent = s.totals.candidats;
  document.getElementById('stat-questions').textContent = s.totals.questions;
  document.getElementById('stat-sessions').textContent = s.totals.sessions;
  document.getElementById('stat-pending').textContent = s.submissions.by_status.pending;

  // Stats soumissions
  const submissionsList = document.getElementById('submissions-stats');
  submissionsList.innerHTML = `
    <li><span>Pending</span> <strong>${s.submissions.by_status.pending}</strong></li>
    <li><span>Auto-validés</span> <strong>${s.submissions.by_status.auto_approved}</strong></li>
    <li><span>Approuvés</span> <strong>${s.submissions.by_status.approved}</strong></li>
    <li><span>Rejetés</span> <strong>${s.submissions.by_status.rejected}</strong></li>
    <li><span>Taux auto</span> <strong>${s.submissions.auto_validation_rate}%</strong></li>
  `;

  // Stats sources
  const sourcesList = document.getElementById('sources-stats');
  sourcesList.innerHTML = `
    <li><span>Web search</span> <strong>${s.candidats.by_source.web_search}</strong></li>
    <li><span>Tract auto</span> <strong>${s.candidats.by_source.tract_auto}</strong></li>
    <li><span>Tract manuel</span> <strong>${s.candidats.by_source.tract_manual}</strong></li>
    <li><span>Admin</span> <strong>${s.candidats.by_source.admin}</strong></li>
  `;

  // Top communes
  const communesList = document.getElementById('top-communes');
  if (s.activity.top_communes.length > 0) {
    communesList.innerHTML = s.activity.top_communes
      .map(c => `<li><span>${c.commune_nom} (${c.commune_code})</span> <strong>${c.sessions}</strong></li>`)
      .join('');
  } else {
    communesList.innerHTML = '<li>Aucune activité</li>';
  }
}

// Fonction loadCandidates supprimée - la liste des candidats est maintenant dans l'onglet Données

async function refreshStats() {
  showLoading();
  await loadStats();
  hideLoading();
}

function openAddCandidat() {
  alert('Fonctionnalité à venir : formulaire d\'ajout de candidat');
}

// ======================
// Modération
// ======================

async function initModeration() {
  if (elements.moderationSection) {
    elements.moderationSection.style.display = 'block';
  }

  await loadCommunes();
  await loadSubmissions();
  initializeIcons();
}

async function loadCommunes() {
  try {
    const response = await fetch(`${API_BASE}/api/communes`);
    const data = await response.json();

    if (data.success) {
      state.communes = data.data;
      populateCommuneFilter();
    }
  } catch (error) {
    console.error('Erreur loadCommunes:', error);
  }
}

function populateCommuneFilter() {
  const select = document.getElementById('filter-commune');
  if (!select) return;

  select.innerHTML = '<option value="">Toutes les communes</option>';
  state.communes.forEach(c => {
    const option = document.createElement('option');
    option.value = c.code;
    option.textContent = c.nom;
    select.appendChild(option);
  });
}

async function loadSubmissions() {
  const status = document.getElementById('filter-status')?.value || 'pending';
  const commune = document.getElementById('filter-commune')?.value || '';

  showLoading();

  try {
    let url = `${API_BASE}/api/admin?action=submissions&key=${state.adminKey}&status=${status}`;
    if (commune) {
      url += `&commune_code=${commune}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      state.submissions = data.submissions;
      displaySubmissions();
      updateModerationStats(data.stats);
    }
  } catch (error) {
    console.error('Erreur loadSubmissions:', error);
  } finally {
    hideLoading();
  }
}

function displaySubmissions() {
  const list = document.getElementById('submissions-list');

  if (state.submissions.length === 0) {
    list.innerHTML = '<p style="text-align:center; color:#666;">Aucune soumission</p>';
    return;
  }

  list.innerHTML = state.submissions.map(sub => {
    const candidat = sub.extracted_data?.candidat;
    const propositions = sub.extracted_data?.propositions || [];

    return `
      <div class="submission-card">
        <img src="${sub.image_url}"
             class="submission-image"
             alt="Tract"
             onclick="openReviewModal('${sub.id}')">
        <div class="submission-info">
          <div class="submission-meta">
            ${sub.commune_nom} • ${new Date(sub.created_at).toLocaleString()}
            <span class="status-badge ${sub.status}">${sub.status}</span>
          </div>

          ${candidat ? `
            <div class="submission-data">
              <strong>${candidat.prenom || ''} ${candidat.nom}</strong>
              ${candidat.parti ? `<br>Parti: ${candidat.parti}` : ''}
              ${sub.extracted_data.liste ? `<br>Liste: ${sub.extracted_data.liste}` : ''}
            </div>
          ` : ''}

          ${propositions.length > 0 ? `
            <div class="submission-data">
              <strong>Propositions:</strong>
              <ul>
                ${propositions.slice(0, 3).map(p => `<li>${p}</li>`).join('')}
                ${propositions.length > 3 ? `<li><em>+ ${propositions.length - 3} autres</em></li>` : ''}
              </ul>
            </div>
          ` : ''}

          <div style="margin-top:10px;">
            <strong>Confiance:</strong> ${Math.round((sub.confidence_score || 0) * 100)}%
          </div>

          ${sub.status === 'pending' ? `
            <div class="submission-actions">
              <button class="btn btn-sm btn-primary" onclick="openReviewModal('${sub.id}')">
                ${getIcon('eye', 16)} Examiner
              </button>
            </div>
          ` : ''}

          ${sub.reviewed_by ? `
            <div style="margin-top:10px; font-size:0.9rem; color:#666;">
              Reviewé par: ${sub.reviewed_by}
              ${sub.admin_notes ? `<br>Notes: ${sub.admin_notes}` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  initLucideIcons(); // Initialiser les icônes après génération du HTML
}

function updateModerationStats(stats) {
  document.getElementById('stat-pending').textContent = stats.pending;
  document.getElementById('stat-today').textContent = stats.total;
  document.getElementById('stat-auto').textContent = stats.auto_approved;
}

function openReviewModal(submissionId) {
  state.currentSubmission = state.submissions.find(s => s.id === submissionId);

  if (!state.currentSubmission) return;

  const modal = document.getElementById('review-modal');
  const sub = state.currentSubmission;
  const candidat = sub.extracted_data?.candidat || {};
  const propositions = sub.extracted_data?.propositions || [];

  document.getElementById('review-image-src').src = sub.image_url;
  document.getElementById('review-nom').value = candidat.nom || '';
  document.getElementById('review-prenom').value = candidat.prenom || '';
  document.getElementById('review-parti').value = candidat.parti || '';
  document.getElementById('review-liste').value = sub.extracted_data?.liste || '';
  document.getElementById('review-propositions').value = propositions.join('\n');
  document.getElementById('review-notes').value = '';
  document.getElementById('review-confidence').textContent = Math.round((sub.confidence_score || 0) * 100);

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('review-modal').style.display = 'none';
  state.currentSubmission = null;
}

async function approveSubmission() {
  if (!state.currentSubmission) return;

  const modified = {
    candidat: {
      nom: document.getElementById('review-nom').value,
      prenom: document.getElementById('review-prenom').value,
      parti: document.getElementById('review-parti').value,
      liste: document.getElementById('review-liste').value
    },
    propositions: document.getElementById('review-propositions').value.split('\n').filter(p => p.trim())
  };

  const notes = document.getElementById('review-notes').value;

  showLoading();

  try {
    const response = await fetch(`${API_BASE}/api/admin?action=validate&key=${state.adminKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: state.currentSubmission.id,
        action: 'approve',
        modified_data: modified,
        admin_notes: notes
      })
    });

    const data = await response.json();

    if (data.success) {
      closeModal();
      await loadSubmissions();

      // Proposer de mettre à jour le quiz de la commune
      if (data.should_prompt_update && data.commune_code) {
        const shouldUpdate = confirm(
          `✅ Tract validé pour ${data.commune_nom}!\n\n` +
          `Voulez-vous mettre à jour le quiz de cette commune maintenant ?\n` +
          `(Les propositions du tract seront intégrées dans les questions)`
        );

        if (shouldUpdate) {
          // Lancer la mise à jour intelligente pour cette commune
          hideLoading();

          const updateResponse = await fetch(`${API_BASE}/api/admin?action=update-commune`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: state.adminKey,
              commune_code: data.commune_code
            })
          });

          const updateResult = await updateResponse.json();

          if (updateResult.success) {
            alert(
              `✅ Quiz mis à jour pour ${data.commune_nom}!\n\n` +
              `• ${updateResult.stats.new_candidats} nouveau(x) candidat(s)\n` +
              `• ${updateResult.stats.tracts_used} tract(s) intégré(s)\n` +
              `${updateResult.stats.questions_regenerated ? '• Questions régénérées' : '• Questions inchangées'}`
            );
          } else {
            alert(`❌ Erreur lors de la mise à jour: ${updateResult.error}`);
          }
        } else {
          alert('Tract validé ! Vous pourrez mettre à jour la commune plus tard via "Mettre à jour".');
        }
      } else {
        alert('Soumission approuvée !');
      }
    } else {
      alert('Erreur: ' + data.error);
    }
  } catch (error) {
    console.error('Erreur approve:', error);
    alert('Erreur lors de l\'approbation');
  } finally {
    hideLoading();
  }
}

async function rejectSubmission() {
  if (!state.currentSubmission) return;

  const reason = prompt('Raison du rejet:');
  if (!reason) return;

  const notes = document.getElementById('review-notes').value;

  showLoading();

  try {
    const response = await fetch(`${API_BASE}/api/admin?action=validate&key=${state.adminKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: state.currentSubmission.id,
        action: 'reject',
        rejection_reason: reason,
        admin_notes: notes
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('Soumission rejetée');
      closeModal();
      await loadSubmissions();
    } else {
      alert('Erreur: ' + data.error);
    }
  } catch (error) {
    console.error('Erreur reject:', error);
    alert('Erreur lors du rejet');
  } finally {
    hideLoading();
  }
}

// ======================
// Loading
// ======================

function showLoading() {
  if (elements.loading) {
    elements.loading.style.display = 'flex';
  }
}

function hideLoading() {
  if (elements.loading) {
    elements.loading.style.display = 'none';
  }
}

// ======================
// Recherche Massive Candidats
// ======================

let allCommunes = [];

async function openSearchCandidats() {
  const modal = document.getElementById('modal-search-candidats');
  if (modal) {
    modal.style.display = 'block';

    // Réinitialiser l'état de la modal
    document.querySelector('.search-options').style.display = 'block';
    document.getElementById('commune-selector').style.display = 'none';
    document.getElementById('search-progress').style.display = 'none';

    // Charger la liste des communes
    await loadCommunesList();
  }
}

function closeSearchCandidats() {
  const modal = document.getElementById('modal-search-candidats');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function loadCommunesList() {
  try {
    console.log('🔄 Chargement des communes...');

    // Récupérer toutes les communes depuis Supabase
    const communesResponse = await fetch('/api/communes');
    const communesData = await communesResponse.json();

    if (communesData.success && communesData.data) {
      allCommunes = communesData.data;
      console.log(`✅ ${allCommunes.length} communes chargées`);
    } else {
      console.error('❌ Erreur dans la réponse:', communesData);
      allCommunes = [];
    }
  } catch (error) {
    console.error('❌ Erreur chargement communes:', error);
    allCommunes = [];
  }
}

async function toggleCommuneSelector() {
  const selector = document.getElementById('commune-selector');
  const isVisible = selector.style.display !== 'none';

  console.log('🔘 toggleCommuneSelector appelé, isVisible:', isVisible);

  if (!isVisible) {
    // S'assurer que les communes sont chargées
    console.log('📊 allCommunes.length avant chargement:', allCommunes.length);
    if (allCommunes.length === 0) {
      await loadCommunesList();
      console.log('📊 allCommunes.length après chargement:', allCommunes.length);
    }
    // Afficher et remplir la liste
    selector.style.display = 'block';
    console.log('🎨 Appel de renderCommunesList()');
    renderCommunesList();
  } else {
    selector.style.display = 'none';
  }
}

function updateSearchCostEstimate() {
  const selectedCheckboxes = document.querySelectorAll('#commune-list input[type="checkbox"]:checked');
  const numSelected = selectedCheckboxes.length;
  const costElement = document.getElementById('search-cost-estimate');

  if (costElement) {
    if (numSelected === 0) {
      costElement.textContent = 'Sélectionnez des communes pour voir le coût';
    } else {
      const estimatedCost = (numSelected * 0.025).toFixed(3);
      costElement.textContent = `~$${estimatedCost} pour ${numSelected} commune(s)`;
    }
  }
}

function renderCommunesList() {
  const list = document.getElementById('commune-list');
  const searchInput = document.getElementById('search-commune-input');

  console.log('🎨 renderCommunesList appelé, allCommunes.length:', allCommunes.length);
  console.log('🎨 list element:', list);

  if (!list) {
    console.error('❌ Element commune-list non trouvé !');
    return;
  }

  const searchTerm = searchInput?.value.toLowerCase() || '';

  const filteredCommunes = allCommunes.filter(c =>
    c.nom.toLowerCase().includes(searchTerm)
  );

  console.log(`🔍 ${filteredCommunes.length} communes après filtrage (terme: "${searchTerm}")`);

  if (filteredCommunes.length === 0) {
    list.innerHTML = '<p>Aucune commune trouvée</p>';
  } else {
    list.innerHTML = filteredCommunes.map(commune => `
      <label class="commune-item">
        <input type="checkbox" value="${commune.code}" data-nom="${commune.nom}">
        <span>${commune.nom} (${commune.code})</span>
        <small>${commune.nb_candidats || 0} candidat(s)</small>
      </label>
    `).join('');

    // Ajouter event listeners pour mettre à jour le coût
    document.querySelectorAll('#commune-list input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', updateSearchCostEstimate);
    });
  }

  console.log('✅ Liste rendue avec', filteredCommunes.length, 'communes');
  updateSearchCostEstimate();
}

// Filtrage en temps réel
document.getElementById('search-commune-input')?.addEventListener('input', renderCommunesList);

function selectAllCommunes() {
  document.querySelectorAll('#commune-list input[type="checkbox"]').forEach(cb => {
    cb.checked = true;
  });
  updateSearchCostEstimate();
}

function deselectAllCommunes() {
  document.querySelectorAll('#commune-list input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
  updateSearchCostEstimate();
}

async function searchAllCommunes() {
  const numCommunes = allCommunes.length;
  const estimatedCost = (numCommunes * 0.10).toFixed(2);

  if (!confirm(`Rechercher les candidats pour TOUTES les communes (${numCommunes}) ?\n\nCoût estimé : ~$${estimatedCost}\n\nCela peut prendre plusieurs minutes.`)) {
    return;
  }

  const communeCodes = allCommunes.map(c => c.code);
  await executeSearch(communeCodes);
}

async function searchSelectedCommunes() {
  const selectedCheckboxes = document.querySelectorAll('#commune-list input[type="checkbox"]:checked');

  if (selectedCheckboxes.length === 0) {
    alert('Veuillez sélectionner au moins une commune');
    return;
  }

  const numCommunes = selectedCheckboxes.length;
  const estimatedCost = (numCommunes * 0.10).toFixed(2);

  if (!confirm(`Rechercher les candidats pour ${numCommunes} commune(s) ?\n\nCoût estimé : ~$${estimatedCost}`)) {
    return;
  }

  const communeCodes = Array.from(selectedCheckboxes).map(cb => cb.value);
  await executeSearch(communeCodes);
}

async function executeSearch(communeCodes) {
  const progressContainer = document.getElementById('search-progress');
  const progressBar = document.getElementById('search-progress-bar-fill');
  const progressText = document.getElementById('search-progress-text');
  const progressLog = document.getElementById('search-progress-log');

  // Masquer les options, afficher la progression
  document.querySelector('.search-options').style.display = 'none';
  document.getElementById('commune-selector').style.display = 'none';
  progressContainer.style.display = 'block';
  progressLog.innerHTML = '';

  function updateProgress(percent, text, log) {
    progressBar.style.width = percent + '%';
    progressText.textContent = text;
    if (log) {
      const logEntry = document.createElement('div');
      logEntry.textContent = log;
      progressLog.appendChild(logEntry);
      progressLog.scrollTop = progressLog.scrollHeight;
    }
  }

  try {
    const communeText = communeCodes.length === 1 ? 'commune' : 'communes';
    updateProgress(10, 'Démarrage...', `🔍 Recherche de candidats pour ${communeCodes.length} ${communeText}...`);

    const response = await fetch('/api/admin?action=search-candidats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: state.adminKey,
        commune_codes: communeCodes
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la recherche');
    }

    const data = await response.json();

    updateProgress(100, 'Terminé !', `✅ Recherche terminée !`);
    updateProgress(100, '', `📊 ${data.results.processed}/${data.results.total_communes} communes traitées`);
    updateProgress(100, '', `👥 ${data.results.candidats_total} candidats trouvés au total`);

    if (data.results.errors.length > 0) {
      updateProgress(100, '', `⚠️  ${data.results.errors.length} erreur(s)`);
    }

    // Attendre 3 secondes puis fermer et refresh
    setTimeout(() => {
      closeSearchCandidats();
      refreshStats();
      alert(`Recherche terminée !\n\n${data.results.candidats_total} candidats trouvés\n${data.results.processed} communes traitées`);
    }, 3000);

  } catch (error) {
    console.error('Erreur recherche:', error);
    updateProgress(0, 'Erreur', `❌ ${error.message}`);

    // Réafficher les options
    setTimeout(() => {
      document.querySelector('.search-options').style.display = 'block';
      progressContainer.style.display = 'none';
    }, 3000);
  }
}

// ======================
// Ajouter Communes (merged modal)
// ======================

let addCommunesList = [];

async function openAddCommunes() {
  const modal = document.getElementById('modal-add-communes');
  if (modal) {
    modal.style.display = 'block';
    document.getElementById('add-progress').style.display = 'none';

    // Load communes list
    await loadAddCommunesList();
  }
}

function closeAddCommunes() {
  const modal = document.getElementById('modal-add-communes');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function loadAddCommunesList() {
  const listContainer = document.getElementById('add-commune-list');
  listContainer.innerHTML = '<p>Chargement...</p>';

  try {
    const response = await fetch(`${API_BASE}/api/communes`);
    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('Erreur chargement communes');
    }

    // Filter to show only communes without candidats (new communes to add)
    addCommunesList = data.data;
    renderAddCommunesList();
  } catch (error) {
    console.error('Erreur:', error);
    listContainer.innerHTML = '<p class="error">Erreur de chargement</p>';
  }
}

function updateAddCostEstimate() {
  const selectedCheckboxes = document.querySelectorAll('#add-commune-list input[type="checkbox"]:checked');
  const numSelected = selectedCheckboxes.length;
  const costElement = document.getElementById('add-cost-estimate');

  // Count checked options
  const searchCandidats = document.getElementById('opt-search-candidats')?.checked;
  const searchProgrammes = document.getElementById('opt-search-programmes')?.checked;
  const generateQuestions = document.getElementById('opt-generate-questions')?.checked;
  const calculatePositions = document.getElementById('opt-calculate-positions')?.checked;

  // Rough cost estimation based on options (optimized with Haiku)
  let costPerCommune = 0;
  if (searchCandidats) costPerCommune += 0.012;  // Sonnet 1024 tokens
  if (searchProgrammes) costPerCommune += 0.01;   // Sonnet 1024 tokens (per candidat, avg 2-3)
  if (generateQuestions) costPerCommune += 0.02;  // Sonnet 2048 tokens
  if (calculatePositions) costPerCommune += 0.0005; // Haiku 512 tokens (negligible)

  if (costElement) {
    if (numSelected === 0) {
      costElement.textContent = 'Sélectionnez des communes pour voir le coût';
    } else {
      const estimatedCost = (numSelected * costPerCommune).toFixed(2);
      costElement.textContent = `~$${estimatedCost} pour ${numSelected} commune(s)`;
    }
  }
}

function renderAddCommunesList(searchTerm = '') {
  const listContainer = document.getElementById('add-commune-list');

  const filtered = addCommunesList.filter(c =>
    c.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filtered.length === 0) {
    listContainer.innerHTML = '<p>Aucune commune trouvée</p>';
    return;
  }

  const html = filtered.map(commune => {
    const nbCandidats = commune.nb_candidats || 0;
    const badge = nbCandidats > 0
      ? `<span class="badge badge-candidats">${nbCandidats} candidat${nbCandidats > 1 ? 's' : ''}</span>`
      : '<span class="badge badge-nocandidats">Nouvelle commune</span>';

    return `
      <div class="commune-list-item">
        <input type="checkbox" id="add-commune-${commune.code}" value="${commune.code}">
        <label for="add-commune-${commune.code}">
          <div class="commune-info">
            <span class="commune-name">${commune.nom}</span>
            <span class="commune-meta">${(commune.population || 0).toLocaleString()} hab.</span>
          </div>
          ${badge}
        </label>
      </div>
    `;
  }).join('');

  listContainer.innerHTML = html;

  // Add event listeners for cost update
  document.querySelectorAll('#add-commune-list input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', updateAddCostEstimate);
  });

  updateAddCostEstimate();
}

// Update cost when options change
document.addEventListener('DOMContentLoaded', () => {
  ['opt-search-candidats', 'opt-search-programmes', 'opt-generate-questions', 'opt-calculate-positions'].forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', updateAddCostEstimate);
    }
  });

  const addSearchInput = document.getElementById('add-commune-search');
  if (addSearchInput) {
    addSearchInput.addEventListener('input', (e) => {
      renderAddCommunesList(e.target.value);
    });
  }
});

function selectAllAddCommunes() {
  const checkboxes = document.querySelectorAll('#add-commune-list input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
  updateAddCostEstimate();
}

function deselectAllAddCommunes() {
  const checkboxes = document.querySelectorAll('#add-commune-list input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  updateAddCostEstimate();
}

async function startAddCommunes() {
  const checkboxes = document.querySelectorAll('#add-commune-list input[type="checkbox"]:checked');
  const selectedCodes = Array.from(checkboxes).map(cb => cb.value);

  if (selectedCodes.length === 0) {
    alert('Veuillez sélectionner au moins une commune');
    return;
  }

  // Get selected options
  const options = {
    search_candidats: document.getElementById('opt-search-candidats')?.checked,
    search_programmes: document.getElementById('opt-search-programmes')?.checked,
    generate_questions: document.getElementById('opt-generate-questions')?.checked,
    calculate_positions: document.getElementById('opt-calculate-positions')?.checked
  };

  const communeText = selectedCodes.length === 1 ? 'commune' : 'communes';

  if (!confirm(`Ajouter ${selectedCodes.length} ${communeText} avec les options sélectionnées ?`)) {
    return;
  }

  document.getElementById('btn-start-add').disabled = true;
  document.getElementById('add-progress').style.display = 'block';

  const progressBar = document.getElementById('add-progress-bar-fill');
  const progressText = document.getElementById('add-progress-text');
  const progressLog = document.getElementById('add-progress-log');

  progressLog.innerHTML = '';

  try {
    for (let i = 0; i < selectedCodes.length; i++) {
      const code = selectedCodes[i];
      const commune = addCommunesList.find(c => c.code === code);

      const progress = Math.round(((i) / selectedCodes.length) * 100);
      progressBar.style.width = progress + '%';
      progressText.textContent = `Traitement de ${commune.nom} (${i + 1}/${selectedCodes.length})...`;

      progressLog.innerHTML += `<div>🔄 ${commune.nom}...</div>`;
      progressLog.scrollTop = progressLog.scrollHeight;

      try {
        const response = await fetch(`${API_BASE}/api/admin?action=add-commune`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: state.adminKey,
            code_insee: code,
            options: options
          })
        });

        const result = await response.json();

        if (result.success) {
          const stats = `${result.stats?.candidats_trouves || 0} candidats, ${result.stats?.questions_generees || 0} questions`;
          progressLog.innerHTML += `<div class="success">  ✅ ${commune.nom} : ${stats}</div>`;
        } else {
          progressLog.innerHTML += `<div class="error">  ❌ ${commune.nom} : ${result.error}</div>`;
        }
      } catch (error) {
        progressLog.innerHTML += `<div class="error">  ❌ ${commune.nom} : ${error.message}</div>`;
      }

      progressLog.scrollTop = progressLog.scrollHeight;
    }

    progressBar.style.width = '100%';
    progressText.textContent = `✅ Ajout terminé (${selectedCodes.length} ${communeText})`;
    progressLog.innerHTML += `<div class="success"><strong>✅ Ajout terminé</strong></div>`;

    setTimeout(() => {
      refreshStats();
    }, 1000);

  } catch (error) {
    console.error('Erreur:', error);
    progressLog.innerHTML += `<div class="error">❌ Erreur globale : ${error.message}</div>`;
  } finally {
    document.getElementById('btn-start-add').disabled = false;
  }
}

// ======================
// Old single commune addition (kept for backward compatibility, can be removed)
// ======================

async function openAddCommune() {
  // This function is deprecated - redirect to the new unified modal
  openAddCommunes();
}

function closeAddCommune() {
  closeAddCommunes();
}

// Recherche de commune (nom ou code INSEE)
let searchTimeout;
document.getElementById('commune-search-input')?.addEventListener('input', async (e) => {
  const searchTerm = e.target.value.trim();
  const resultsDiv = document.getElementById('commune-search-results');

  // Réinitialiser le preview
  document.getElementById('commune-preview').style.display = 'none';
  document.getElementById('code-insee-input').value = '';

  if (searchTerm.length < 2) {
    resultsDiv.style.display = 'none';
    return;
  }

  // Debounce
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      // Si c'est un code INSEE (5 chiffres commençant par 35)
      if (/^35\d{3}$/.test(searchTerm)) {
        const response = await fetch(`https://geo.api.gouv.fr/communes/${searchTerm}?fields=nom,code,population,surface,centre`);
        if (response.ok) {
          const commune = await response.json();
          displaySearchResults([commune]);
        } else {
          resultsDiv.innerHTML = '<div class="search-result-item">Aucune commune trouvée</div>';
          resultsDiv.style.display = 'block';
        }
      } else {
        // Recherche par nom dans le département 35
        const response = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(searchTerm)}&codeDepartement=35&fields=nom,code,population,surface,centre&limit=10`);
        if (response.ok) {
          const communes = await response.json();
          displaySearchResults(communes);
        }
      }
    } catch (error) {
      console.error('Erreur recherche commune:', error);
      resultsDiv.innerHTML = '<div class="search-result-item">Erreur de recherche</div>';
      resultsDiv.style.display = 'block';
    }
  }, 300);
});

function displaySearchResults(communes) {
  const resultsDiv = document.getElementById('commune-search-results');

  if (communes.length === 0) {
    resultsDiv.innerHTML = '<div class="search-result-item">Aucune commune trouvée</div>';
    resultsDiv.style.display = 'block';
    return;
  }

  resultsDiv.innerHTML = communes.map(c => `
    <div class="search-result-item" onclick="selectCommune35('${c.code}', '${c.nom}', ${c.population})">
      <strong>${c.nom}</strong> (${c.code})
      <br><small>${c.population ? c.population.toLocaleString() + ' hab.' : 'Population inconnue'}</small>
    </div>
  `).join('');
  resultsDiv.style.display = 'block';
}

function selectCommune35(code, nom, population) {
  // Remplir le code INSEE caché
  document.getElementById('code-insee-input').value = code;

  // Remplir le champ de recherche
  document.getElementById('commune-search-input').value = nom;

  // Masquer les résultats
  document.getElementById('commune-search-results').style.display = 'none';

  // Afficher l'aperçu
  const preview = document.getElementById('commune-preview');
  const content = document.getElementById('commune-preview-content');

  content.innerHTML = `
    <p><strong>Code INSEE :</strong> ${code}</p>
    <p><strong>Nom :</strong> ${nom}</p>
    <p><strong>Population :</strong> ${population ? population.toLocaleString() : 'Inconnue'} habitants</p>
  `;
  preview.style.display = 'block';
}

// Preview commune info when INSEE code is entered (ancien code pour compatibilité)
document.getElementById('code-insee-input-old')?.addEventListener('input', async (e) => {
  const codeInsee = e.target.value;
  if (codeInsee.length === 5 && /^\d{5}$/.test(codeInsee)) {
    try {
      const response = await fetch(`https://geo.api.gouv.fr/communes/${codeInsee}?fields=nom,population,surface`);
      if (response.ok) {
        const data = await response.json();
        const preview = document.getElementById('commune-preview');
        const content = document.getElementById('commune-preview-content');

        content.innerHTML = `
          <p><strong>Nom :</strong> ${data.nom}</p>
          <p><strong>Population :</strong> ${data.population?.toLocaleString() || 'N/A'} habitants</p>
          <p><strong>Superficie :</strong> ${data.surface ? (data.surface / 100).toFixed(2) : 'N/A'} km²</p>
        `;
        preview.style.display = 'block';
      }
    } catch (error) {
      console.error('Erreur preview commune:', error);
    }
  } else {
    document.getElementById('commune-preview').style.display = 'none';
  }
});

// Handle form submission
document.getElementById('add-commune-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const codeInsee = document.getElementById('code-insee-input').value;
  if (!codeInsee || !/^\d{5}$/.test(codeInsee)) {
    alert('Code INSEE invalide (5 chiffres requis)');
    return;
  }

  const progressContainer = document.getElementById('add-commune-progress');
  const progressBar = document.getElementById('progress-bar-fill');
  const progressText = document.getElementById('progress-text');
  const progressLog = document.getElementById('progress-log');
  const submitBtn = document.getElementById('btn-add-commune');

  // Show progress
  progressContainer.style.display = 'block';
  submitBtn.disabled = true;
  progressLog.innerHTML = '';

  function updateProgress(percent, text, log) {
    progressBar.style.width = percent + '%';
    progressText.textContent = text;
    if (log) {
      const logEntry = document.createElement('div');
      logEntry.textContent = log;
      progressLog.appendChild(logEntry);
      progressLog.scrollTop = progressLog.scrollHeight;
    }
  }

  try {
    updateProgress(10, 'Démarrage...', '🏘️ Ajout de la commune...');

    const response = await fetch('/api/admin?action=add-commune', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: state.adminKey,
        code_insee: codeInsee
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de l\'ajout');
    }

    const data = await response.json();

    updateProgress(100, 'Terminé !', `✅ Commune ${data.commune.nom} ajoutée avec succès !`);
    updateProgress(100, 'Terminé !', `📊 ${data.stats.candidats_trouves} candidats trouvés`);
    updateProgress(100, 'Terminé !', `📋 ${data.stats.questions_generees} questions générées`);
    updateProgress(100, 'Terminé !', `✅ ${data.stats.candidats_positionnes} candidats positionnés`);

    // Attendre 2 secondes puis fermer et refresh
    setTimeout(() => {
      closeAddCommune();
      refreshStats();
      alert(`Commune ${data.commune.nom} ajoutée avec succès !\n\n${data.stats.candidats_trouves} candidats trouvés\n${data.stats.questions_generees} questions générées`);
    }, 2000);

  } catch (error) {
    console.error('Erreur ajout commune:', error);
    updateProgress(0, 'Erreur', `❌ ${error.message}`);
    submitBtn.disabled = false;
  }
});

// ======================
// Mise à jour des communes
// ======================

let updateCommunesList = [];

async function openUpdateCommunes() {
  document.getElementById('modal-update-communes').style.display = 'flex';
  await loadUpdateCommunesList();
}

function closeUpdateCommunes() {
  document.getElementById('modal-update-communes').style.display = 'none';
  document.getElementById('update-progress').style.display = 'none';
}

async function loadUpdateCommunesList() {
  const listContainer = document.getElementById('update-commune-list');
  listContainer.innerHTML = '<p>Chargement...</p>';

  try {
    const response = await fetch(`${API_BASE}/api/communes`);
    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('Erreur chargement communes');
    }

    updateCommunesList = data.data;
    renderUpdateCommunesList();
  } catch (error) {
    console.error('Erreur:', error);
    listContainer.innerHTML = '<p class="error">Erreur de chargement</p>';
  }
}

function updateUpdateCostEstimate() {
  const selectedCheckboxes = document.querySelectorAll('#update-commune-list input[type="checkbox"]:checked');
  const numSelected = selectedCheckboxes.length;
  const costElement = document.getElementById('update-cost-estimate');

  // Count checked options
  const searchCandidats = document.getElementById('opt-update-search-candidats')?.checked;
  const updateProgrammes = document.getElementById('opt-update-programmes')?.checked;
  const regenerateQuestions = document.getElementById('opt-update-regenerate-questions')?.checked;
  const recalculatePositions = document.getElementById('opt-update-recalculate-positions')?.checked;

  // Rough cost estimation based on options (optimized with Haiku)
  let costPerCommune = 0;
  if (searchCandidats) costPerCommune += 0.012;  // Sonnet 1024 tokens
  if (updateProgrammes) costPerCommune += 0.01;   // Sonnet 1024 tokens (per candidat)
  if (regenerateQuestions) costPerCommune += 0.02;  // Sonnet 2048 tokens
  if (recalculatePositions) costPerCommune += 0.0005; // Haiku 512 tokens (negligible)

  if (costElement) {
    if (numSelected === 0) {
      costElement.textContent = 'Sélectionnez des communes pour voir le coût';
    } else {
      const estimatedCost = (numSelected * costPerCommune).toFixed(2);
      costElement.textContent = `~$${estimatedCost} pour ${numSelected} commune(s)`;
    }
  }
}

function renderUpdateCommunesList(searchTerm = '') {
  const listContainer = document.getElementById('update-commune-list');

  const filtered = updateCommunesList.filter(c =>
    c.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filtered.length === 0) {
    listContainer.innerHTML = '<p>Aucune commune trouvée</p>';
    return;
  }

  const html = filtered.map(commune => {
    const nbCandidats = commune.nb_candidats || 0;
    const hasCandidats = nbCandidats > 0;
    const badge = hasCandidats
      ? `<span class="badge badge-candidats">${nbCandidats} candidat${nbCandidats > 1 ? 's' : ''}</span>`
      : '<span class="badge badge-nocandidats">Aucun candidat</span>';

    return `
      <div class="commune-list-item">
        <input type="checkbox" id="update-commune-${commune.code}" value="${commune.code}" ${hasCandidats ? '' : 'disabled'}>
        <label for="update-commune-${commune.code}">
          <div class="commune-info">
            <span class="commune-name">${commune.nom}</span>
            <span class="commune-meta">${(commune.population || 0).toLocaleString()} hab.</span>
          </div>
          ${badge}
        </label>
      </div>
    `;
  }).join('');

  listContainer.innerHTML = html;

  // Ajouter event listeners pour mettre à jour le coût
  document.querySelectorAll('#update-commune-list input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', updateUpdateCostEstimate);
  });

  updateUpdateCostEstimate();
}

// Update cost when update options change
document.addEventListener('DOMContentLoaded', () => {
  ['opt-update-search-candidats', 'opt-update-programmes', 'opt-update-regenerate-questions', 'opt-update-recalculate-positions'].forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', updateUpdateCostEstimate);
    }
  });
});

function selectAllUpdateCommunes() {
  const checkboxes = document.querySelectorAll('#update-commune-list input[type="checkbox"]:not([disabled])');
  checkboxes.forEach(cb => cb.checked = true);
  updateUpdateCostEstimate();
}

function deselectAllUpdateCommunes() {
  const checkboxes = document.querySelectorAll('#update-commune-list input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  updateUpdateCostEstimate();
}

async function startUpdate() {
  const checkboxes = document.querySelectorAll('#update-commune-list input[type="checkbox"]:checked');
  const selectedCodes = Array.from(checkboxes).map(cb => cb.value);

  if (selectedCodes.length === 0) {
    alert('Veuillez sélectionner au moins une commune');
    return;
  }

  // Get selected options
  const options = {
    search_candidats: document.getElementById('opt-update-search-candidats')?.checked,
    update_programmes: document.getElementById('opt-update-programmes')?.checked,
    regenerate_questions: document.getElementById('opt-update-regenerate-questions')?.checked,
    recalculate_positions: document.getElementById('opt-update-recalculate-positions')?.checked
  };

  const communeText = selectedCodes.length === 1 ? 'commune' : 'communes';

  // Build options summary for confirmation
  const optionsList = [];
  if (options.search_candidats) optionsList.push('Rechercher candidats');
  if (options.update_programmes) optionsList.push('Mettre à jour programmes');
  if (options.regenerate_questions) optionsList.push('Régénérer questions');
  if (options.recalculate_positions) optionsList.push('Recalculer positions');
  const optionsText = optionsList.join(', ');

  if (!confirm(`Mettre à jour ${selectedCodes.length} ${communeText} ?\n\nOptions : ${optionsText || 'Aucune'}`)) {
    return;
  }

  document.getElementById('btn-start-update').disabled = true;
  document.getElementById('update-progress').style.display = 'block';

  const progressBar = document.getElementById('update-progress-bar-fill');
  const progressText = document.getElementById('update-progress-text');
  const progressLog = document.getElementById('update-progress-log');

  progressLog.innerHTML = '';

  try {
    for (let i = 0; i < selectedCodes.length; i++) {
      const code = selectedCodes[i];
      const commune = updateCommunesList.find(c => c.code === code);

      const progress = Math.round(((i) / selectedCodes.length) * 100);
      progressBar.style.width = progress + '%';
      progressText.textContent = `Traitement de ${commune.nom} (${i + 1}/${selectedCodes.length})...`;

      progressLog.innerHTML += `<div>🔄 ${commune.nom}...</div>`;
      progressLog.scrollTop = progressLog.scrollHeight;

      try {
        const response = await fetch(`${API_BASE}/api/admin?action=update-commune`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: state.adminKey,
            commune_code: code,
            options: options
          })
        });

        const result = await response.json();

        if (result.success) {
          const stats = `${result.stats?.new_candidats || 0} nouv. candidats, ${result.stats?.tracts_used || 0} tract(s)${result.stats?.questions_regenerated ? ', questions OK' : ''}`;
          progressLog.innerHTML += `<div class="success">  ✅ ${commune.nom} : ${stats}</div>`;
        } else {
          progressLog.innerHTML += `<div class="error">  ❌ ${commune.nom} : ${result.error}</div>`;
        }
      } catch (error) {
        progressLog.innerHTML += `<div class="error">  ❌ ${commune.nom} : ${error.message}</div>`;
      }

      progressLog.scrollTop = progressLog.scrollHeight;
    }

    progressBar.style.width = '100%';
    progressText.textContent = `✅ Mise à jour terminée (${selectedCodes.length} ${communeText})`;
    progressLog.innerHTML += `<div class="success"><strong>✅ Mise à jour terminée</strong></div>`;

    setTimeout(() => {
      refreshStats();
    }, 1000);

  } catch (error) {
    console.error('Erreur:', error);
    progressLog.innerHTML += `<div class="error">❌ Erreur globale : ${error.message}</div>`;
  } finally {
    document.getElementById('btn-start-update').disabled = false;
  }
}

// ======================
// Init
// ======================

document.addEventListener('DOMContentLoaded', init);

// Recherche dans la liste de mise à jour
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('update-commune-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderUpdateCommunesList(e.target.value);
    });
  }
});
