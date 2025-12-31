/**
 * ProjectTemplate - Defines project templates with layer configurations
 *
 * Provides predefined templates for different use cases:
 * - Simple: Single layer for basic ASCII art
 * - Standard: Background + Foreground for most artwork
 * - Advanced: Full 3-layer compositing for complex projects
 */

/**
 * Generate a unique layer ID
 * @param {string} purpose - Purpose-based prefix (e.g., 'bg', 'main', 'fg')
 * @returns {string} Unique layer ID
 */
export const generateLayerId = (purpose = 'layer') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${purpose}_${timestamp}_${random}`;
};

/**
 * Project templates definition
 */
export const PROJECT_TEMPLATES = {
  simple: {
    id: 'simple',
    name: 'Simple Drawing',
    description: 'Single layer for basic ASCII art',
    icon: '📝',
    layers: [
      {
        id: 'main',
        name: 'Main',
        defaultActive: true,
        visible: true,
        locked: false
      }
    ],
    defaultDimensions: { w: 40, h: 20 },
    recommended: 'Perfect for beginners and simple drawings'
  },

  standard: {
    id: 'standard',
    name: 'Standard Artwork',
    description: 'Background and foreground layers',
    icon: '🎨',
    layers: [
      {
        id: 'bg',
        name: 'Background',
        defaultActive: false,
        visible: true,
        locked: false
      },
      {
        id: 'fg',
        name: 'Foreground',
        defaultActive: true,
        visible: true,
        locked: false
      }
    ],
    defaultDimensions: { w: 60, h: 25 },
    recommended: 'Great for most ASCII art with depth'
  },

  advanced: {
    id: 'advanced',
    name: 'Multi-Layer Project',
    description: 'Full 3-layer compositing',
    icon: '⚡',
    layers: [
      {
        id: 'bg',
        name: 'Background',
        defaultActive: false,
        visible: true,
        locked: false
      },
      {
        id: 'mid',
        name: 'Middle',
        defaultActive: true,
        visible: true,
        locked: false
      },
      {
        id: 'fg',
        name: 'Foreground',
        defaultActive: false,
        visible: true,
        locked: false
      }
    ],
    defaultDimensions: { w: 80, h: 25 },
    recommended: 'Professional multi-layer compositing'
  }
};

/**
 * Get template by ID
 * @param {string} templateId - Template ID to retrieve
 * @returns {object|null} Template object or null if not found
 */
export const getTemplate = (templateId) => {
  return PROJECT_TEMPLATES[templateId] || null;
};

/**
 * Get all available templates as an array
 * @returns {Array} Array of template objects
 */
export const getAllTemplates = () => {
  return Object.values(PROJECT_TEMPLATES);
};

/**
 * Get the default template (simple)
 * @returns {object} Default template object
 */
export const getDefaultTemplate = () => {
  return PROJECT_TEMPLATES.simple;
};

/**
 * Validate template structure
 * @param {object} template - Template to validate
 * @returns {boolean} True if template is valid
 */
export const validateTemplate = (template) => {
  if (!template || typeof template !== 'object') return false;

  const requiredFields = ['id', 'name', 'description', 'layers', 'defaultDimensions'];
  for (const field of requiredFields) {
    if (!template.hasOwnProperty(field)) return false;
  }

  // Validate layers array
  if (!Array.isArray(template.layers) || template.layers.length === 0) {
    return false;
  }

  // Validate each layer has required fields
  for (const layer of template.layers) {
    if (!layer.id || !layer.name || typeof layer.defaultActive !== 'boolean') {
      return false;
    }
  }

  // Validate dimensions
  const { w, h } = template.defaultDimensions;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) {
    return false;
  }

  return true;
};

/**
 * Create a layer template for adding to existing scenes
 * @param {string} purpose - Layer purpose (e.g., 'detail', 'effect', 'overlay')
 * @param {string} name - Display name for the layer
 * @returns {object} Layer template object
 */
export const createLayerTemplate = (purpose, name) => {
  return {
    id: generateLayerId(purpose),
    name: name || purpose.charAt(0).toUpperCase() + purpose.slice(1),
    defaultActive: false,
    visible: true,
    locked: false
  };
};

/**
 * Common layer templates for dynamic addition
 */
export const LAYER_TEMPLATES = {
  background: () => createLayerTemplate('bg', 'Background'),
  foreground: () => createLayerTemplate('fg', 'Foreground'),
  detail: () => createLayerTemplate('detail', 'Detail'),
  effect: () => createLayerTemplate('effect', 'Effect'),
  overlay: () => createLayerTemplate('overlay', 'Overlay'),
  sketch: () => createLayerTemplate('sketch', 'Sketch')
};

/**
 * Template conversion utilities
 */
export const TEMPLATE_CONVERSIONS = {
  /**
   * Convert simple template to standard
   */
  simpleToStandard: {
    from: 'simple',
    to: 'standard',
    description: 'Add background layer for depth',
    addLayers: [
      {
        id: 'bg',
        name: 'Background',
        defaultActive: false,
        visible: true,
        locked: false,
        insertAt: 0 // Insert at beginning (bottom layer)
      }
    ]
  },

  /**
   * Convert standard template to advanced
   */
  standardToAdvanced: {
    from: 'standard',
    to: 'advanced',
    description: 'Add middle layer for complex compositing',
    addLayers: [
      {
        id: 'mid',
        name: 'Middle',
        defaultActive: true,
        visible: true,
        locked: false,
        insertAt: 1 // Insert between bg and fg
      }
    ]
  },

  /**
   * Convert simple template to advanced
   */
  simpleToAdvanced: {
    from: 'simple',
    to: 'advanced',
    description: 'Add background and middle layers',
    addLayers: [
      {
        id: 'bg',
        name: 'Background',
        defaultActive: false,
        visible: true,
        locked: false,
        insertAt: 0
      },
      {
        id: 'mid',
        name: 'Middle',
        defaultActive: true,
        visible: true,
        locked: false,
        insertAt: 1
      }
    ]
  }
};

/**
 * Get available conversions from a template
 * @param {string} fromTemplateId - Source template ID
 * @returns {Array} Array of available conversion objects
 */
export const getAvailableConversions = (fromTemplateId) => {
  return Object.values(TEMPLATE_CONVERSIONS).filter(
    conversion => conversion.from === fromTemplateId
  );
};
