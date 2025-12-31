/**
 * LayerTemplate - Individual layer template handling and utilities
 *
 * Provides utilities for creating, validating, and managing individual layer templates
 * Used by ProjectTemplate for defining layer configurations within templates
 */

import { Layer } from './Layer.js';

/**
 * Create a layer from a layer template
 * @param {object} layerTemplate - Layer template configuration
 * @param {number} width - Layer width in cells
 * @param {number} height - Layer height in cells
 * @returns {Layer} New Layer instance
 */
export const createLayerFromTemplate = (layerTemplate, width, height) => {
  if (!validateLayerTemplate(layerTemplate)) {
    throw new Error(`Invalid layer template: ${JSON.stringify(layerTemplate)}`);
  }

  const layer = new Layer(layerTemplate.id, layerTemplate.name, width, height);

  // Apply template properties
  layer.visible = layerTemplate.visible !== undefined ? layerTemplate.visible : true;
  layer.locked = layerTemplate.locked !== undefined ? layerTemplate.locked : false;

  return layer;
};

/**
 * Validate layer template structure
 * @param {object} layerTemplate - Template to validate
 * @returns {boolean} True if template is valid
 */
export const validateLayerTemplate = (layerTemplate) => {
  if (!layerTemplate || typeof layerTemplate !== 'object') {
    return false;
  }

  // Required fields
  const requiredFields = ['id', 'name'];
  for (const field of requiredFields) {
    if (!layerTemplate.hasOwnProperty(field) || typeof layerTemplate[field] !== 'string') {
      return false;
    }
  }

  // Validate boolean fields if present
  const booleanFields = ['defaultActive', 'visible', 'locked'];
  for (const field of booleanFields) {
    if (layerTemplate.hasOwnProperty(field) && typeof layerTemplate[field] !== 'boolean') {
      return false;
    }
  }

  // Validate ID format (basic check)
  if (layerTemplate.id.length === 0 || layerTemplate.id.includes(' ')) {
    return false;
  }

  // Validate name
  if (layerTemplate.name.length === 0) {
    return false;
  }

  return true;
};

/**
 * Convert an existing Layer to a layer template
 * @param {Layer} layer - Layer to convert to template
 * @param {boolean} defaultActive - Whether this should be the default active layer
 * @returns {object} Layer template object
 */
export const layerToTemplate = (layer, defaultActive = false) => {
  if (!layer || typeof layer.id !== 'string') {
    throw new Error('Invalid layer provided');
  }

  return {
    id: layer.id,
    name: layer.name,
    defaultActive: defaultActive,
    visible: layer.visible,
    locked: layer.locked
  };
};

/**
 * Clone a layer template with optional modifications
 * @param {object} layerTemplate - Source layer template
 * @param {object} modifications - Properties to override
 * @returns {object} New layer template object
 */
export const cloneLayerTemplate = (layerTemplate, modifications = {}) => {
  if (!validateLayerTemplate(layerTemplate)) {
    throw new Error('Invalid source layer template');
  }

  return {
    ...layerTemplate,
    ...modifications
  };
};

/**
 * Merge multiple layer templates into an array
 * @param {...object} templates - Layer templates to merge
 * @returns {Array} Array of layer template objects
 */
export const mergeLayerTemplates = (...templates) => {
  const result = [];

  for (const template of templates) {
    if (Array.isArray(template)) {
      result.push(...template);
    } else if (validateLayerTemplate(template)) {
      result.push(template);
    } else {
      throw new Error(`Invalid layer template in merge: ${JSON.stringify(template)}`);
    }
  }

  return result;
};

/**
 * Create a layer template with smart defaults based on purpose
 * @param {string} purpose - Layer purpose (bg, fg, mid, detail, effect, etc.)
 * @param {string} customName - Custom name override
 * @param {object} options - Additional options
 * @returns {object} Layer template object
 */
export const createSmartLayerTemplate = (purpose, customName = null, options = {}) => {
  const purposeDefaults = {
    bg: {
      name: 'Background',
      defaultActive: false,
      visible: true,
      locked: false
    },
    mid: {
      name: 'Middle',
      defaultActive: true,
      visible: true,
      locked: false
    },
    fg: {
      name: 'Foreground',
      defaultActive: false,
      visible: true,
      locked: false
    },
    main: {
      name: 'Main',
      defaultActive: true,
      visible: true,
      locked: false
    },
    detail: {
      name: 'Detail',
      defaultActive: false,
      visible: true,
      locked: false
    },
    effect: {
      name: 'Effect',
      defaultActive: false,
      visible: true,
      locked: false
    },
    overlay: {
      name: 'Overlay',
      defaultActive: false,
      visible: true,
      locked: false
    },
    sketch: {
      name: 'Sketch',
      defaultActive: false,
      visible: true,
      locked: false
    }
  };

  const defaults = purposeDefaults[purpose] || purposeDefaults.main;
  const name = customName || defaults.name;

  // Generate unique ID
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 4);
  const id = `${purpose}_${timestamp}_${random}`;

  return {
    id,
    name,
    defaultActive: defaults.defaultActive,
    visible: defaults.visible,
    locked: defaults.locked,
    ...options
  };
};

/**
 * Get suggested layer names based on existing layers
 * @param {Array} existingLayers - Array of existing layer objects or templates
 * @param {string} purpose - Purpose for new layer
 * @returns {string} Suggested unique name
 */
export const suggestLayerName = (existingLayers, purpose = 'layer') => {
  const existingNames = existingLayers.map(layer =>
    layer.name || layer.id || 'Unknown'
  ).map(name => name.toLowerCase());

  const baseName = purpose.charAt(0).toUpperCase() + purpose.slice(1);

  if (!existingNames.includes(baseName.toLowerCase())) {
    return baseName;
  }

  // Find next available numbered name
  let counter = 2;
  while (existingNames.includes(`${baseName.toLowerCase()} ${counter}`)) {
    counter++;
  }

  return `${baseName} ${counter}`;
};

/**
 * Reorder layer templates in an array
 * @param {Array} layerTemplates - Array of layer templates
 * @param {number} fromIndex - Source index
 * @param {number} toIndex - Target index
 * @returns {Array} New array with reordered templates
 */
export const reorderLayerTemplates = (layerTemplates, fromIndex, toIndex) => {
  if (!Array.isArray(layerTemplates)) {
    throw new Error('layerTemplates must be an array');
  }

  if (fromIndex < 0 || fromIndex >= layerTemplates.length ||
      toIndex < 0 || toIndex >= layerTemplates.length) {
    throw new Error('Invalid index for reordering');
  }

  const result = [...layerTemplates];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);

  return result;
};

/**
 * Find layer template by ID in an array
 * @param {Array} layerTemplates - Array of layer templates
 * @param {string} id - Layer ID to find
 * @returns {object|null} Layer template or null if not found
 */
export const findLayerTemplateById = (layerTemplates, id) => {
  if (!Array.isArray(layerTemplates)) {
    return null;
  }

  return layerTemplates.find(template => template.id === id) || null;
};

/**
 * Remove layer template by ID from array
 * @param {Array} layerTemplates - Array of layer templates
 * @param {string} id - Layer ID to remove
 * @returns {Array} New array without the specified layer
 */
export const removeLayerTemplateById = (layerTemplates, id) => {
  if (!Array.isArray(layerTemplates)) {
    throw new Error('layerTemplates must be an array');
  }

  return layerTemplates.filter(template => template.id !== id);
};
