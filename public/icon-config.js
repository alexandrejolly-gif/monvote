// MonVote - Icon Configuration System
// Système permettant de basculer entre emojis et Lucide Icons

// ======================
// Configuration globale
// ======================

const CONFIG = {
  useEmojis: false, // true = emojis, false = Lucide
};

// ======================
// Fonction utilitaire getIcon()
// ======================

/**
 * Génère le HTML pour une icône (emoji ou Lucide)
 * @param {string} name - Nom de l'icône (ex: 'map-pin', 'vote', etc.)
 * @param {number} size - Taille en pixels (défaut: 20)
 * @param {object} options - Options supplémentaires (class, style, etc.)
 * @returns {string} HTML de l'icône
 */
function getIcon(name, size = 20, options = {}) {
  const icons = {
    // Navigation
    'map-pin': { emoji: '📍', lucide: 'map-pin' },
    'vote': { emoji: '🗳️', lucide: 'vote' },
    'home': { emoji: '🏠', lucide: 'home' },
    'arrow-left': { emoji: '←', lucide: 'arrow-left' },
    'arrow-right': { emoji: '→', lucide: 'arrow-right' },

    // Actions
    'send': { emoji: '📤', lucide: 'send' },
    'upload': { emoji: '📷', lucide: 'upload' },
    'download': { emoji: '💾', lucide: 'download' },
    'refresh': { emoji: '🔄', lucide: 'refresh-cw' },
    'plus': { emoji: '➕', lucide: 'plus' },
    'minus': { emoji: '➖', lucide: 'minus' },
    'check': { emoji: '✓', lucide: 'check' },
    'x': { emoji: '✕', lucide: 'x' },
    'x-circle': { emoji: '❌', lucide: 'x-circle' },
    'check-circle': { emoji: '✅', lucide: 'check-circle' },
    'search': { emoji: '🔍', lucide: 'search' },
    'eye': { emoji: '👁️', lucide: 'eye' },

    // Statuts
    'hourglass': { emoji: '⏳', lucide: 'hourglass' },
    'clock': { emoji: '⏱️', lucide: 'clock' },
    'alert-triangle': { emoji: '⚠️', lucide: 'alert-triangle' },
    'info': { emoji: 'ℹ️', lucide: 'info' },

    // Personnes & Politique
    'users': { emoji: '👥', lucide: 'users' },
    'user': { emoji: '👤', lucide: 'user' },
    'necktie': { emoji: '👔', lucide: 'briefcase' }, // Pas d'équivalent exact
    'building': { emoji: '🏛️', lucide: 'building-2' },
    'houses': { emoji: '🏘️', lucide: 'home' },
    'star': { emoji: '★', lucide: 'star' },

    // Documents & Fichiers
    'file': { emoji: '📄', lucide: 'file-text' },
    'file-check': { emoji: '📋', lucide: 'file-check' },
    'clipboard': { emoji: '📋', lucide: 'clipboard' },
    'edit': { emoji: '📝', lucide: 'edit-3' },

    // Interface
    'lightbulb': { emoji: '💡', lucide: 'lightbulb' },
    'target': { emoji: '🎯', lucide: 'target' },
    'chart': { emoji: '📊', lucide: 'bar-chart-2' },
    'lock': { emoji: '🔒', lucide: 'lock' },
    'key': { emoji: '🔐', lucide: 'key' },
    'lightning': { emoji: '⚡', lucide: 'zap' },
    'question': { emoji: '❓', lucide: 'help-circle' },
    'sun': { emoji: '☀️', lucide: 'sun' },
    'moon': { emoji: '🌙', lucide: 'moon' },
    'money': { emoji: '💰', lucide: 'dollar-sign' },

    // Fallback
    'default': { emoji: '•', lucide: 'circle' }
  };

  const icon = icons[name] || icons['default'];
  const customClass = options.class || '';
  const customStyle = options.style || '';

  if (CONFIG.useEmojis) {
    // Mode emoji
    return `<span class="icon-emoji ${customClass}" style="font-size: ${size}px; ${customStyle}">${icon.emoji}</span>`;
  } else {
    // Mode Lucide
    return `<i data-lucide="${icon.lucide}" class="icon-lucide ${customClass}" style="width: ${size}px; height: ${size}px; ${customStyle}"></i>`;
  }
}

// ======================
// Helper: Initialiser les icônes Lucide
// ======================

/**
 * Initialise ou réinitialise toutes les icônes Lucide sur la page
 * À appeler après chaque modification du DOM
 */
function initLucideIcons() {
  if (!CONFIG.useEmojis && typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// ======================
// Helper: Basculer entre emojis et Lucide
// ======================

/**
 * Bascule entre mode emoji et mode Lucide
 * @param {boolean} useEmojis - true pour emojis, false pour Lucide
 */
function toggleIconMode(useEmojis) {
  CONFIG.useEmojis = useEmojis;
  localStorage.setItem('iconMode', useEmojis ? 'emoji' : 'lucide');

  // Recharger la page pour appliquer le changement
  window.location.reload();
}

/**
 * Charger la préférence sauvegardée au démarrage
 */
function loadIconPreference() {
  const savedMode = localStorage.getItem('iconMode');
  if (savedMode) {
    CONFIG.useEmojis = savedMode === 'emoji';
  }
}

// Charger la préférence au chargement du script
loadIconPreference();

// ======================
// Export pour modules
// ======================

// Si utilisé comme module ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG,
    getIcon,
    initLucideIcons,
    toggleIconMode,
    loadIconPreference
  };
}
