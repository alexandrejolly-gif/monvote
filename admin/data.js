const API_BASE = window.location.origin;
let ADMIN_KEY = null;
let communes = [];
let candidats = [];

// Login
function loginData() {
  const key = document.getElementById('admin-key-input').value;
  if (!key) {
    alert('Clé requise');
    return;
  }

  ADMIN_KEY = key;
  localStorage.setItem('adminKey', key);

  document.getElementById('login-section').style.display = 'none';
  document.getElementById('data-section').style.display = 'block';

  loadData();
}

// Init
async function init() {
  const savedKey = localStorage.getItem('adminKey');
  if (savedKey) {
    ADMIN_KEY = savedKey;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('data-section').style.display = 'block';
    await loadData();
    initializeIcons();
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

// Charger toutes les données
async function loadData() {
  showLoading();

  try {
    const communeFilter = document.getElementById('filter-commune-data')?.value || '';

    // Charger communes seulement si pas encore chargées
    if (communes.length === 0) {
      await loadCommunes();
    }

    // Charger liste complète des candidats
    await loadCandidatsList(communeFilter);

    // Charger candidats avec propositions
    await loadPropositions(communeFilter);

    // Charger positions
    await loadPositions(communeFilter);

    // Charger infos communes
    await loadCommunesInfo(communeFilter);

    // Charger questions des quiz
    await loadQuestions(communeFilter);

  } catch (error) {
    console.error('Erreur loadData:', error);
    alert('Erreur de chargement');
  } finally {
    hideLoading();
  }
}

async function loadCommunes() {
  try {
    const response = await fetch(`${API_BASE}/api/communes`);
    const data = await response.json();

    if (data.success) {
      communes = data.data;

      // Remplir le filtre (trié alphabétiquement)
      const select = document.getElementById('filter-commune-data');
      select.innerHTML = '<option value="">Toutes les communes</option>';
      communes
        .sort((a, b) => a.nom.localeCompare(b.nom))
        .forEach(c => {
          const option = document.createElement('option');
          option.value = c.code;
          option.textContent = `${c.nom} (${c.code})`;
          select.appendChild(option);
        });
    }
  } catch (error) {
    console.error('Erreur loadCommunes:', error);
  }
}

async function loadCandidatsList(communeFilter) {
  try {
    // Récupérer tous les candidats
    const response = await fetch(`${API_BASE}/api/admin/candidats?key=${ADMIN_KEY}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('Erreur chargement candidats');
    }

    let candidats = data.all_candidats || [];

    // Filtrer par commune si nécessaire
    if (communeFilter) {
      candidats = candidats.filter(c => c.commune_code === communeFilter);
    }

    const tbody = document.getElementById('candidats-list-tbody');

    if (candidats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Aucun candidat</td></tr>';
      return;
    }

    tbody.innerHTML = candidats.map(c => `
      <tr>
        <td>${c.commune_nom}</td>
        <td><strong>${c.prenom || ''} ${c.nom}</strong>${c.maire_sortant ? ` ${getIcon('star', 14)} <span style="color:#f59e0b;">Sortant</span>` : ''}</td>
        <td>${c.parti || '-'}</td>
        <td>${c.liste || '-'}</td>
        <td><span class="status-badge ${c.source_type}">${c.source_type}</span></td>
        <td>${new Date(c.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');

    initLucideIcons();

  } catch (error) {
    console.error('Erreur loadCandidatsList:', error);
    document.getElementById('candidats-list-tbody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:red;">Erreur de chargement</td></tr>';
  }
}

async function loadPropositions(communeFilter) {
  try {
    // Récupérer les candidats depuis Supabase via API admin
    const response = await fetch(`${API_BASE}/api/admin/candidats?key=${ADMIN_KEY}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('Erreur chargement candidats');
    }

    let candidats = data.all_candidats || [];

    // Filtrer par commune si nécessaire
    if (communeFilter) {
      candidats = candidats.filter(c => c.commune_code === communeFilter);
    }

    const tbody = document.getElementById('propositions-tbody');

    if (candidats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Aucun candidat</td></tr>';
      return;
    }

    tbody.innerHTML = candidats.map((c, index) => {
      const candidatId = `candidat-${index}`;
      const hasMoreProps = c.propositions && c.propositions.length > 3;

      return `
        <tr>
          <td>${c.commune_nom || c.commune_code}</td>
          <td><strong>${c.prenom || ''} ${c.nom}</strong></td>
          <td>${c.parti || '-'}</td>
          <td>${c.liste || '-'}</td>
          <td>
            ${c.propositions && c.propositions.length > 0
              ? `<ul style="margin: 0; padding-left: 20px;">
                  ${c.propositions.slice(0, 3).map(p => `<li>${p}</li>`).join('')}
                  <span id="${candidatId}-more" style="display: none;">
                    ${c.propositions.slice(3).map(p => `<li>${p}</li>`).join('')}
                  </span>
                </ul>
                ${hasMoreProps
                  ? `<a href="#" onclick="togglePropositions('${candidatId}'); return false;"
                       style="font-size: 0.85em; color: #667eea; text-decoration: none;">
                       <span id="${candidatId}-toggle">▶ Voir tout (${c.propositions.length})</span>
                     </a>`
                  : ''
                }`
              : '<em style="color: #999;">Aucune proposition</em>'
            }
          </td>
          <td>${c.propositions?.length || 0}</td>
          <td><span class="badge">${c.source_type || 'unknown'}</span></td>
        </tr>
      `;
    }).join('');

    initLucideIcons();

  } catch (error) {
    console.error('Erreur loadPropositions:', error);
    document.getElementById('propositions-tbody').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:red;">Erreur de chargement</td></tr>';
  }
}

async function loadPositions(communeFilter) {
  try {
    const response = await fetch(`${API_BASE}/api/admin/candidats?key=${ADMIN_KEY}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('Erreur chargement candidats');
    }

    let candidats = data.all_candidats || [];

    if (communeFilter) {
      candidats = candidats.filter(c => c.commune_code === communeFilter);
    }

    // Filtrer seulement ceux avec des positions
    candidats = candidats.filter(c => c.positions && Object.keys(c.positions).length > 0);

    const tbody = document.getElementById('positions-tbody');

    if (candidats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aucune position définie</td></tr>';
      return;
    }

    tbody.innerHTML = candidats.map(c => {
      const positions = c.positions || {};
      const positionsStr = Object.entries(positions)
        .map(([q, pos]) => `Q${q}: ${pos}`)
        .join(', ');

      return `
        <tr>
          <td>${c.commune_nom || c.commune_code}</td>
          <td><strong>${c.prenom || ''} ${c.nom}</strong></td>
          <td>${Object.keys(positions).length}</td>
          <td style="font-family: monospace; font-size: 0.85em; max-width: 600px; word-wrap: break-word;">
            ${positionsStr || '-'}
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Erreur loadPositions:', error);
    document.getElementById('positions-tbody').innerHTML =
      '<tr><td colspan="4" style="text-align:center;color:red;">Erreur de chargement</td></tr>';
  }
}

async function loadCommunesInfo(communeFilter) {
  try {
    // Récupérer infos communes
    const response = await fetch(`${API_BASE}/api/communes`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('Erreur chargement communes');
    }

    let communesData = data.data || [];

    if (communeFilter) {
      communesData = communesData.filter(c => c.code === communeFilter);
    }

    const tbody = document.getElementById('communes-tbody');

    if (communesData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Aucune commune</td></tr>';
      return;
    }

    tbody.innerHTML = communesData.map(c => `
      <tr>
        <td><strong>${c.nom}</strong><br><small>${c.code}</small></td>
        <td>${c.population ? c.population.toLocaleString() : '-'}</td>
        <td>${c.profil_commune || '-'}</td>
        <td>
          ${c.enjeux_prioritaires && c.enjeux_prioritaires.length > 0
            ? c.enjeux_prioritaires.join(', ')
            : '-'
          }
        </td>
        <td>${c.nb_candidats || 0}</td>
        <td>${c.questions_generated ? `${getIcon('check-circle', 16)} Oui` : `${getIcon('x-circle', 16)} Non`}</td>
        <td>${c.maire_sortant ? `${c.maire_sortant.prenom} ${c.maire_sortant.nom}` : '-'}</td>
      </tr>
    `).join('');

    initLucideIcons();

  } catch (error) {
    console.error('Erreur loadCommunesInfo:', error);
    document.getElementById('communes-tbody').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:red;">Erreur de chargement</td></tr>';
  }
}

async function loadQuestions(communeFilter) {
  try {
    const tbody = document.getElementById('questions-tbody');

    // Si filtre commune, charger les questions de cette commune
    if (communeFilter) {
      const response = await fetch(`${API_BASE}/api/get-questions?code=${communeFilter}`);
      const data = await response.json();

      if (!data.success) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Erreur de chargement</td></tr>';
        return;
      }

      const questions = data.questions || [];

      if (questions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucune question pour cette commune</td></tr>';
        return;
      }

      tbody.innerHTML = questions.map(q => `
        <tr>
          <td><strong>${data.commune.nom}</strong></td>
          <td><code>${q.code}</code></td>
          <td>${q.theme}</td>
          <td>${q.question}</td>
          <td>
            <ol style="margin: 0; padding-left: 20px;">
              ${q.reponses.map(r => `<li>${r.texte}</li>`).join('')}
            </ol>
          </td>
        </tr>
      `).join('');

    } else {
      // Pas de filtre : afficher un message
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#666;">Sélectionnez une commune dans le filtre pour voir ses questions</td></tr>';
    }

  } catch (error) {
    console.error('Erreur loadQuestions:', error);
    document.getElementById('questions-tbody').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:red;">Erreur de chargement</td></tr>';
  }
}

function togglePropositions(candidatId) {
  const moreElement = document.getElementById(`${candidatId}-more`);
  const toggleElement = document.getElementById(`${candidatId}-toggle`);

  if (moreElement && toggleElement) {
    if (moreElement.style.display === 'none') {
      moreElement.style.display = 'inline';
      toggleElement.innerHTML = '▼ Réduire';
    } else {
      moreElement.style.display = 'none';
      const totalProps = moreElement.querySelectorAll('li').length + 3; // +3 pour les 3 premiers
      toggleElement.innerHTML = `▶ Voir tout (${totalProps})`;
    }
  }
}

function showLoading() {
  document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

function toggleSection(sectionId) {
  const container = document.getElementById(`section-${sectionId}`);
  const toggleIcon = document.getElementById(`toggle-${sectionId}`);

  if (container && toggleIcon) {
    if (container.style.display === 'none') {
      container.style.display = 'block';
      toggleIcon.textContent = '▼';
      localStorage.setItem(`section-${sectionId}`, 'open');
    } else {
      container.style.display = 'none';
      toggleIcon.textContent = '▶';
      localStorage.setItem(`section-${sectionId}`, 'closed');
    }
  }
}

function restoreSectionStates() {
  const sections = ['candidats-list', 'propositions', 'positions', 'communes', 'questions'];

  sections.forEach(sectionId => {
    const state = localStorage.getItem(`section-${sectionId}`);
    const container = document.getElementById(`section-${sectionId}`);
    const toggleIcon = document.getElementById(`toggle-${sectionId}`);

    // Par défaut, tout est replié sauf si explicitement ouvert
    if (state === 'open') {
      container.style.display = 'block';
      toggleIcon.textContent = '▼';
    } else {
      // Replié par défaut
      container.style.display = 'none';
      toggleIcon.textContent = '▶';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  restoreSectionStates();
});
