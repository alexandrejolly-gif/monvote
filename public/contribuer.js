// MonVote - Page de contribution

const API_BASE = window.location.origin;

// État
const state = {
  communes: [],
  selectedFile: null,
  fileData: null
};

// Éléments DOM
const elements = {
  communeSelect: document.getElementById('commune-select'),
  uploadZone: document.getElementById('upload-zone'),
  fileInput: document.getElementById('file-input'),
  previewZone: document.getElementById('preview-zone'),
  previewImage: document.getElementById('preview-image'),
  btnRemove: document.getElementById('btn-remove'),
  emailInput: document.getElementById('email-input'),
  consentCheckbox: document.getElementById('consent-checkbox'),
  submitBtn: document.getElementById('submit-btn'),
  uploadSection: document.getElementById('upload-section'),
  resultCard: document.getElementById('result-card'),
  resultIcon: document.getElementById('result-icon'),
  resultTitle: document.getElementById('result-title'),
  resultMessage: document.getElementById('result-message'),
  extractedData: document.getElementById('extracted-data'),
  extractedContent: document.getElementById('extracted-content'),
  btnReset: document.getElementById('btn-reset')
};

// ======================
// Initialisation
// ======================

async function init() {
  try {
    await loadCommunes();
    setupEventListeners();
    initializeIcons();
  } catch (error) {
    console.error('Erreur initialisation:', error);
    alert('Erreur lors du chargement');
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

// ======================
// API
// ======================

async function loadCommunes() {
  const response = await fetch(`${API_BASE}/api/communes`);
  const data = await response.json();

  if (data.success) {
    state.communes = data.data;
    populateCommuneSelect();
  }
}

async function uploadTract() {
  if (!state.fileData || !elements.communeSelect.value) {
    alert('Veuillez sélectionner une image et une commune');
    return;
  }

  if (!elements.consentCheckbox.checked) {
    alert('Veuillez accepter les conditions');
    return;
  }

  elements.submitBtn.disabled = true;
  elements.submitBtn.innerHTML = `${getIcon('hourglass')} Analyse en cours...`;
  initLucideIcons();

  try {
    const response = await fetch(`${API_BASE}/api/upload-tract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: state.fileData,
        commune_code: elements.communeSelect.value,
        email: elements.emailInput.value || null
      })
    });

    const data = await response.json();

    if (data.success) {
      showSuccess(data);
    } else {
      showError(data.error);
    }
  } catch (error) {
    console.error('Erreur upload:', error);
    showError('Erreur lors de l\'envoi. Veuillez réessayer.');
  } finally {
    elements.submitBtn.disabled = false;
    elements.submitBtn.innerHTML = `${getIcon('send')} Envoyer`;
    initLucideIcons();
  }
}

// ======================
// UI Functions
// ======================

function populateCommuneSelect() {
  elements.communeSelect.innerHTML = '<option value="">Sélectionner...</option>';

  state.communes
    .sort((a, b) => a.nom.localeCompare(b.nom))
    .forEach(commune => {
      const option = document.createElement('option');
      option.value = commune.code;
      option.textContent = commune.nom;
      elements.communeSelect.appendChild(option);
    });
}

function handleFileSelect(file) {
  if (!file) return;

  // Vérifier le type
  if (!file.type.startsWith('image/')) {
    alert('Veuillez sélectionner une image');
    return;
  }

  // Vérifier la taille (10 MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('L\'image doit faire moins de 10 MB');
    return;
  }

  state.selectedFile = file;

  // Lire le fichier
  const reader = new FileReader();
  reader.onload = (e) => {
    state.fileData = e.target.result;
    elements.previewImage.src = e.target.result;
    elements.uploadZone.style.display = 'none';
    elements.previewZone.style.display = 'block';
    checkFormValidity();
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  state.selectedFile = null;
  state.fileData = null;
  elements.uploadZone.style.display = 'block';
  elements.previewZone.style.display = 'none';
  elements.fileInput.value = '';
  checkFormValidity();
}

function checkFormValidity() {
  elements.submitBtn.disabled = !(
    state.fileData &&
    elements.communeSelect.value &&
    elements.consentCheckbox.checked
  );
}

function showSuccess(data) {
  elements.uploadSection.style.display = 'none';
  elements.resultCard.style.display = 'block';

  elements.resultIcon.innerHTML = data.status === 'auto_approved' ? getIcon('check-circle', 48) : getIcon('hourglass', 48);
  elements.resultTitle.textContent = data.status === 'auto_approved' ? 'Validé automatiquement !' : 'En attente de validation';
  elements.resultMessage.textContent = data.status_message;
  initLucideIcons();

  // Afficher les données extraites
  if (data.extracted_data) {
    elements.extractedData.style.display = 'block';

    let html = '';

    // Gérer le nouveau format (candidats pluriel) et l'ancien (candidat singulier)
    const candidats = data.extracted_data.candidats || (data.extracted_data.candidat ? [data.extracted_data.candidat] : []);
    const nombreCandidats = data.extracted_data.nombre_candidats || candidats.length;

    if (candidats.length > 0) {
      html += '<div class="extracted-item">';
      if (nombreCandidats > 1) {
        html += `<strong>${nombreCandidats} candidats extraits</strong><br>`;
        html += `<strong>Tête de liste :</strong> ${candidats[0].prenom || ''} ${candidats[0].nom}`;
      } else {
        html += `<strong>Candidat :</strong> ${candidats[0].prenom || ''} ${candidats[0].nom}`;
      }
      if (candidats[0].parti) {
        html += ` (${candidats[0].parti})`;
      }
      html += '</div>';
    }

    if (data.extracted_data.propositions && data.extracted_data.propositions.length > 0) {
      html += '<div class="extracted-item"><strong>Propositions :</strong><ul>';
      data.extracted_data.propositions.forEach(prop => {
        html += `<li>${prop}</li>`;
      });
      html += '</ul></div>';
    }

    html += `<div class="extracted-item"><strong>Score de confiance :</strong> ${Math.round(data.confidence_score * 100)}%</div>`;

    elements.extractedContent.innerHTML = html;
  }
}

function showError(errorMessage) {
  elements.uploadSection.style.display = 'none';
  elements.resultCard.style.display = 'block';

  elements.resultIcon.innerHTML = getIcon('x-circle', 48);
  elements.resultTitle.textContent = 'Erreur';
  elements.resultMessage.textContent = errorMessage;
  elements.extractedData.style.display = 'none';
  initLucideIcons();
}

function resetForm() {
  removeImage();
  elements.communeSelect.value = '';
  elements.emailInput.value = '';
  elements.consentCheckbox.checked = false;
  elements.uploadSection.style.display = 'block';
  elements.resultCard.style.display = 'none';
  checkFormValidity();
}

// ======================
// Event Listeners
// ======================

function setupEventListeners() {
  // Upload zone click
  elements.uploadZone.addEventListener('click', () => {
    elements.fileInput.click();
  });

  // File input change
  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // Drag & drop
  elements.uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.uploadZone.classList.add('drag-over');
  });

  elements.uploadZone.addEventListener('dragleave', () => {
    elements.uploadZone.classList.remove('drag-over');
  });

  elements.uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadZone.classList.remove('drag-over');

    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  // Remove button
  elements.btnRemove.addEventListener('click', removeImage);

  // Form fields
  elements.communeSelect.addEventListener('change', checkFormValidity);
  elements.consentCheckbox.addEventListener('change', checkFormValidity);

  // Submit
  elements.submitBtn.addEventListener('click', uploadTract);

  // Reset
  elements.btnReset.addEventListener('click', resetForm);
}

// ======================
// Init
// ======================

document.addEventListener('DOMContentLoaded', init);
