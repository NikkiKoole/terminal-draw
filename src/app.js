/**
 * Terminal Draw - Main Application Entry Point
 * ASCII Art Editor with cell-based rendering
 */

import palettes from "./palettes.json";

import { Scene } from "./core/Scene.js";
import { Cell } from "./core/Cell.js";
import { LayerRenderer } from "./rendering/LayerRenderer.js";
import { StateManager } from "./core/StateManager.js";
import { HitTestOverlay } from "./input/HitTestOverlay.js";
import {
  LAYER_BG,
  LAYER_MID,
  LAYER_FG,
  DEFAULT_TEMPLATE_ID,
} from "./core/constants.js";
import { BrushTool } from "./tools/BrushTool.js";
import { EraserTool } from "./tools/EraserTool.js";
import { PickerTool } from "./tools/PickerTool.js";
import { SprayTool } from "./tools/SprayTool.js";
import { RectangleTool } from "./tools/RectangleTool.js";
import { LineTool } from "./tools/LineTool.js";
import { CircleTool } from "./tools/CircleTool.js";
import { FloodFillTool } from "./tools/FloodFillTool.js";
import { TextTool } from "./tools/TextTool.js";
import { SelectionTool } from "./tools/SelectionTool.js";
import { LayerPanel } from "./ui/LayerPanel.js";
import { GlyphPicker } from "./ui/GlyphPicker.js";
import { ClipboardManager } from "./export/ClipboardManager.js";
import { ProjectManager } from "./io/ProjectManager.js";
import { CommandHistory } from "./commands/CommandHistory.js";
import { SelectionManager } from "./core/SelectionManager.js";

import { ClearCommand } from "./commands/ClearCommand.js";

import { AnimationEngine } from "./animation/AnimationEngine.js";
import {
  ParticleEngine,
  ParticleEmitter,
  createFromPreset,
  PRESETS,
} from "./particles/index.js";

import { StartupDialog } from "./ui/StartupDialog.js";
import { PROJECT_TEMPLATES, getTemplate } from "./core/ProjectTemplate.js";

import { addBorderToScene, isValidBorderStyle } from "./core/BorderUtils.js";

// =============================================================================
// Configuration & State
// =============================================================================

// Constants for magic numbers
const Z_INDEX = {
  LAYER_BASE: 100,
  PREVIEW_OVERLAY: 1000,
};

const TIMEOUTS = {
  STATUS_HIDE: 3000,
  STATUS_UPDATE: 2000,
};

const PREVIEW_COLORS = {
  CIRCLE: "rgba(100, 255, 150, 0.8)",
  CIRCLE_BG: "rgba(100, 255, 150, 0.25)",
  BRUSH: "rgba(100, 150, 255, 0.8)",
  BRUSH_BG: "rgba(100, 150, 255, 0.25)",
  RECTANGLE: "rgba(255, 200, 100, 0.8)",
  RECTANGLE_BG: "rgba(255, 200, 100, 0.25)",
};

const SCALE = {
  MIN: 10,
  MAX: 1000,
  DEFAULT: 100,
};

let GRID_WIDTH = 80;
let GRID_HEIGHT = 25;

let currentPalette = "default";
let currentScale = SCALE.DEFAULT;

// Command History
let commandHistory;

// Scene and Renderer
let scene = null;
let renderer = null;
let stateManager = null;
let hitTestOverlay = null;

// Tools
let brushTool = null;
let eraserTool = null;
let pickerTool = null;
let sprayTool = null;
let rectangleTool = null;
let lineTool = null;
let circleTool = null;
let floodFillTool = null;
let textTool = null;
let selectionTool = null;
let currentTool = null;

// Selection and clipboard management
let selectionManager = null;

// Animation engine
let animationEngine = null;

// Particle engine
let particleEngine = null;

// Platform detection for keyboard shortcuts
const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modifierKey = isMac ? "Cmd" : "Ctrl";

// Global function to update selection panel visibility
function updateSelectionPanelVisibility() {
  if (!selectionManager) return;

  const hasSelection = selectionManager.hasSelection();
  const selectionOptions = document.getElementById("selection-options");
  const isSelectionTool = currentTool === selectionTool;

  // Show/hide entire selection options panel
  if (selectionOptions) {
    selectionOptions.style.display = isSelectionTool ? "flex" : "none";
  }

  // Hide persistent selection when switching away from selection tool
  if (!isSelectionTool) {
    const overlay = document.getElementById("persistent-selection-overlay");
    if (overlay) {
      overlay.innerHTML = "";
    }
  }

  // Enable/disable transform buttons based on selection state
  const flipHorizontalBtn = document.getElementById("flip-horizontal-btn");
  const flipVerticalBtn = document.getElementById("flip-vertical-btn");

  const buttons = [flipHorizontalBtn, flipVerticalBtn];

  buttons.forEach((btn) => {
    if (btn) {
      btn.disabled = !hasSelection;
    }
  });

  // Update selection info
  const selectionInfo = document.getElementById("selection-info");
  if (selectionInfo) {
    const info = selectionManager.getSelectionInfo();
    if (info && info.hasData) {
      selectionInfo.textContent = `${info.width}×${info.height} at (${info.x}, ${info.y})`;
      selectionInfo.style.color = "var(--text-primary)";
    } else if (selectionManager.hasSelection()) {
      const sel = selectionManager.selection;
      selectionInfo.textContent = `${sel.width}×${sel.height} at (${sel.x}, ${sel.y})`;
      selectionInfo.style.color = "var(--text-muted)";
    } else {
      selectionInfo.textContent = "No selection";
      selectionInfo.style.color = "var(--text-muted)";
    }
  }
}

// Keyboard shortcut state
let keyboardShortcutsEnabled = true;

// Tool configuration - centralizes tool setup to eliminate repetitive code
const TOOL_CONFIG = [
  {
    name: "brushTool",
    class: BrushTool,
    id: "brush",
    key: "b",
    args: [{ ch: "█", fg: 7, bg: -1 }],
    hasOptions: true,
  },
  {
    name: "eraserTool",
    class: EraserTool,
    id: "eraser",
    key: "e",
    args: [],
    hasOptions: false,
  },
  {
    name: "pickerTool",
    class: PickerTool,
    id: "picker",
    key: "p",
    args: [],
    hasOptions: false,
  },
  {
    name: "sprayTool",
    class: SprayTool,
    id: "spray",
    key: "s",
    args: [{ ch: ".", fg: 7, bg: -1 }],
    hasOptions: true,
  },
  {
    name: "rectangleTool",
    class: RectangleTool,
    id: "rectangle",
    key: "r",
    args: [{ ch: "█", fg: 7, bg: -1 }],
    hasOptions: true,
  },
  {
    name: "lineTool",
    class: LineTool,
    id: "line",
    key: "l",
    args: [{ ch: "█", fg: 7, bg: -1 }],
    hasOptions: false,
  },
  {
    name: "circleTool",
    class: CircleTool,
    id: "circle",
    key: "c",
    args: [{ ch: "█", fg: 7, bg: -1 }],
    hasOptions: true,
  },
  {
    name: "floodFillTool",
    class: FloodFillTool,
    id: "floodfill",
    key: "f",
    args: [{ ch: "█", fg: 7, bg: -1 }],
    hasOptions: false,
  },
  {
    name: "textTool",
    class: TextTool,
    id: "text",
    key: "t",
    args: [{ ch: " ", fg: 7, bg: -1 }],
    hasOptions: false,
  },
  {
    name: "selectionTool",
    class: SelectionTool,
    id: "selection",
    key: "v",
    args: [],
    hasOptions: true,
  },
];

// Startup Dialog
let startupDialog = null;

// UI Components
let layerPanel = null;
let glyphPicker = null;
let clipboardManager = null;
let projectManager = null;

// Color selection state
let selectedFg = 7;
let selectedBg = -1;

// Hover indicator element
let hoverIndicator = null;
let anchorIndicator = null;

// =============================================================================
// Scene Management
// =============================================================================

/**
 * Initialize scene with test pattern
 */
function initScene() {
  // Create scene with default template (advanced 3-layer setup for compatibility)
  scene = new Scene(GRID_WIDTH, GRID_HEIGHT, currentPalette);

  // Make globally accessible for TextTool
  window.currentScene = scene;
  renderer = new LayerRenderer();

  // Create dynamic layer containers
  createLayerContainers();

  // Create test pattern in layers (flexible for any layer count)
  createTestPattern();
}

/**
 * Initialize scene from template configuration
 */
function initSceneFromTemplate(config) {
  const { template, dimensions, palette, border } = config;

  // Update global dimensions
  GRID_WIDTH = dimensions.w;
  GRID_HEIGHT = dimensions.h;
  currentPalette = palette;

  // Get template object
  const templateObj = getTemplate(template);
  if (!templateObj) {
    console.error(`Template not found: ${template}`);
    return;
  }

  // Create scene from template
  scene = Scene.fromTemplate(templateObj, dimensions.w, dimensions.h, palette);
  renderer = new LayerRenderer();

  // Add border if enabled
  if (border && border.enabled) {
    const borderStyle = isValidBorderStyle(border.style)
      ? border.style
      : "single";
    try {
      addBorderToScene(scene, borderStyle, 7, -1);
    } catch (error) {
      console.error("Failed to add border:", error);
    }
  }

  // Create dynamic layer containers
  createLayerContainers();

  // Apply palette
  applyPalette(palette);

  // Render scene to update grid dimensions and visual display
  renderScene();
}

/**
 * Create test pattern that works with any number of layers
 */
function createTestPattern() {
  if (scene.layers.length === 0) return;

  const testChars = "─│┌┐└┘┬┴├┤┼━┃╔╗╚╝░▒▓█";
  const centerY = Math.floor(GRID_HEIGHT / 2);

  // Use first layer for border (usually background)
  const firstLayer = scene.layers[0];
  if (firstLayer) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (
          y === 0 ||
          y === GRID_HEIGHT - 1 ||
          x === 0 ||
          x === GRID_WIDTH - 1
        ) {
          let ch = "│";
          if (y === 0 && x === 0) ch = "┌";
          else if (y === 0 && x === GRID_WIDTH - 1) ch = "┐";
          else if (y === GRID_HEIGHT - 1 && x === 0) ch = "└";
          else if (y === GRID_HEIGHT - 1 && x === GRID_WIDTH - 1) ch = "┘";
          else if (y === 0 || y === GRID_HEIGHT - 1) ch = "─";

          firstLayer.setCell(x, y, new Cell(ch, 7, -1));
        }
      }
    }
  }

  // Use middle layer for text (if available)
  if (scene.layers.length >= 2) {
    const middleLayer = scene.layers[Math.floor(scene.layers.length / 2)];
    const text = `TERMINAL DRAW - ${scene.layers.length} LAYERS`;
    const textX = Math.floor((GRID_WIDTH - text.length) / 2);
    for (let i = 0; i < text.length; i++) {
      middleLayer.setCell(textX + i, centerY, new Cell(text[i], 3, -1));
    }
  }

  // Use last layer for decorations (usually foreground)
  if (scene.layers.length >= 2) {
    const lastLayer = scene.layers[scene.layers.length - 1];
    for (let i = 0; i < testChars.length && i < 20; i++) {
      lastLayer.setCell(30 + i, centerY + 2, new Cell(testChars[i], 6, -1));
      lastLayer.setCell(30 + i, centerY + 3, new Cell(testChars[i], 6, -1));
    }
  }

  // Render all layers
  renderScene();
  updateStatus(
    `Ready • Grid: ${GRID_WIDTH}×${GRID_HEIGHT} • Hover over grid to test`,
  );
}

/**
 * Render the scene to DOM
 */
/**
 * Update CSS custom properties for grid dimensions
 */
function updateGridDimensions() {
  if (!scene) return;

  const root = document.documentElement;
  root.style.setProperty("--grid-w", scene.w);
  root.style.setProperty("--grid-h", scene.h);
}
// =============================================================================
// Dynamic Layer Management
// =============================================================================

/**
 * Create layer containers dynamically based on scene layers
 */
function createLayerContainers() {
  const gridStack = document.querySelector(".grid-stack");
  if (!gridStack) {
    console.error("Grid stack container not found");
    return;
  }

  if (!scene) {
    console.error("Scene not available for creating layer containers");
    return;
  }

  // Clear existing layer containers (except background and hit-test)
  const existingLayers = gridStack.querySelectorAll(".visual-layer");
  existingLayers.forEach((layer) => {
    // Force immediate removal with innerHTML clear
    layer.innerHTML = "";
    layer.remove();
  });

  // Create containers for each layer in the scene
  scene.layers.forEach((layer, index) => {
    const container = document.createElement("div");
    container.id = `layer-${layer.id}`;
    container.className = "visual-layer";
    container.setAttribute("data-layer", layer.id);
    container.style.zIndex = Z_INDEX.LAYER_BASE + index; // Ensure proper stacking order

    // Insert before the hit-test overlay (which should be on top)
    const hitTestOverlay = gridStack.querySelector(".hit-test-overlay");
    if (hitTestOverlay) {
      gridStack.insertBefore(container, hitTestOverlay);
    } else {
      gridStack.appendChild(container);
    }
  });
}

// =============================================================================
// Rendering Functions
// =============================================================================

function renderScene() {
  if (!scene || !renderer) return;

  updateGridDimensions();

  // Get all current layer containers
  const allLayerContainers = document.querySelectorAll(".visual-layer");
  const currentLayerIds = new Set(scene.layers.map((layer) => layer.id));

  // Remove orphaned layer containers (for layers that no longer exist)
  allLayerContainers.forEach((container) => {
    const layerId = container.getAttribute("data-layer");
    if (!currentLayerIds.has(layerId)) {
      console.warn(`Removing orphaned layer container: ${layerId}`);
      container.remove();
    }
  });

  // Render each layer dynamically
  scene.layers.forEach((layer) => {
    const container = document.getElementById(`layer-${layer.id}`);
    if (container) {
      renderer.render(layer, container);
      // Update layer visibility
      if (layer.visible) {
        container.classList.remove("hidden");
      } else {
        container.classList.add("hidden");
      }
    } else {
      console.warn(`Container not found for layer: ${layer.id}`);
    }
  });

  // Update overlay size to match rendered grid
  if (hitTestOverlay) {
    hitTestOverlay.updateOverlaySize();
  }
}

/**
 * Initialize hit test overlay and input handling
 */
function initInput() {
  const hitTestElement = document.getElementById("hit-test-layer");
  if (!hitTestElement) {
    console.error("❌ Hit test layer not found");
    return;
  }

  // Create state manager
  stateManager = new StateManager();

  // Make globally accessible for TextTool
  window.currentStateManager = stateManager;

  // Create hit test overlay
  hitTestOverlay = new HitTestOverlay(
    hitTestElement,
    scene,
    stateManager,
    currentScale,
  );

  // Listen to hover events for visual feedback
  stateManager.on("cell:hover", handleCellHover);

  // Listen to cell interaction events for tools
  stateManager.on("cell:down", handleCellDown);
  stateManager.on("cell:drag", handleCellDrag);
  stateManager.on("cell:up", handleCellUp);

  // Listen for rectangle tool anchor events
  stateManager.on("rectangle:anchor", (data) => {
    if (data.x !== null && data.y !== null) {
      showAnchorIndicator(data.x, data.y);
    } else {
      hideAnchorIndicator();
    }
  });

  // Listen for line tool anchor events
  stateManager.on("line:anchor", (data) => {
    if (data.x !== null && data.y !== null) {
      showAnchorIndicator(data.x, data.y);
    } else {
      hideAnchorIndicator();
    }
  });

  // Listen for circle tool anchor events
  stateManager.on("circle:anchor", (data) => {
    if (data.x !== null && data.y !== null) {
      showAnchorIndicator(data.x, data.y);
    } else {
      hideAnchorIndicator();
    }
  });

  // Listen for circle tool preview events
  stateManager.on("circle:preview", (data) => {
    if (data.centerX !== null && data.centerY !== null) {
      if (data.ellipseMode && (data.radiusX > 0 || data.radiusY > 0)) {
        showCirclePreview(
          data.centerX,
          data.centerY,
          data.radiusX,
          data.fillMode,
          true,
          data.radiusY,
        );
      } else if (!data.ellipseMode && data.radius > 0) {
        showCirclePreview(
          data.centerX,
          data.centerY,
          data.radius,
          data.fillMode,
          false,
        );
      } else {
        hideCirclePreview();
      }
    } else {
      hideCirclePreview();
    }
  });

  // Listen for text tool cursor events
  stateManager.on("text:cursor", (data) => {
    if (data.visible && data.x !== null && data.y !== null) {
      showTextCursor(data.x, data.y);
    } else {
      hideTextCursor();
    }
  });

  // Listen for text tool typing state events
  stateManager.on("text:typing", (data) => {
    if (data.active) {
      // Disable keyboard shortcuts while typing
      disableKeyboardShortcuts();
    } else {
      // Re-enable keyboard shortcuts
      enableKeyboardShortcuts();
    }
  });

  // Listen for rectangle tool preview events
  stateManager.on("rectangle:preview", (data) => {
    if (
      data.x1 !== null &&
      data.y1 !== null &&
      data.x2 !== null &&
      data.y2 !== null
    ) {
      showRectanglePreview(data.x1, data.y1, data.x2, data.y2, data.fillMode);
    } else {
      hideRectanglePreview();
    }
  });

  // Listen for selection tool preview events
  stateManager.on("tool:preview", (data) => {
    if (data.tool === "selection" && data.cells && data.cells.length > 0) {
      showSelectionPreview(data.cells);
    } else if (data.tool === "selection") {
      hideSelectionPreview();
    }
  });

  // Listen to tool:picked events from picker tool
  stateManager.on("tool:picked", handleToolPicked);

  // Listen to cell:changed events to update DOM
  stateManager.on("cell:changed", handleCellChanged);

  // Initialize hover indicator
  hoverIndicator = document.getElementById("hover-indicator");
  anchorIndicator = document.getElementById("anchor-indicator");
}

/**
 * Handle cell hover events - update status and visual feedback
 */
function handleCellHover(data) {
  if (!scene) return;

  if (
    data &&
    data.x !== undefined &&
    data.y !== undefined &&
    data.x !== null &&
    data.y !== null
  ) {
    // Update status bar with coordinates
    updateStatus(
      `Cell: (${data.x}, ${data.y}) • Grid: ${GRID_WIDTH}×${GRID_HEIGHT} • Scale: ${currentScale}%`,
    );

    // Update hover indicator position
    updateHoverIndicator(data.x, data.y);

    // Show brush preview if brush tool is active and size > 1 or shape != square
    if (
      currentTool === brushTool &&
      (brushTool.getBrushSize() > 1 || brushTool.getBrushShape() !== "square")
    ) {
      showBrushPreview(data.x, data.y);
    }
  } else {
    // Mouse left grid
    updateStatus(
      `Ready • Grid: ${GRID_WIDTH}×${GRID_HEIGHT} • Scale: ${currentScale}%`,
    );
    hideHoverIndicator();
    hideBrushPreview();
  }
}

/**
 * Handle cell:down events - call current tool
 */
function handleCellDown(data) {
  if (!currentTool || !scene || !stateManager) return;
  currentTool.onCellDown(data.x, data.y, scene, stateManager, data);
}

/**
 * Handle cell:drag events - call current tool
 */
function handleCellDrag(data) {
  if (!currentTool || !scene || !stateManager) return;
  currentTool.onCellDrag(data.x, data.y, scene, stateManager, data);
}

/**
 * Handle cell:up events - call current tool
 */
function handleCellUp(data) {
  if (!currentTool || !scene || !stateManager) return;
  currentTool.onCellUp(data.x, data.y, scene, stateManager, data);
}

/**
 * Handle tool:picked events from picker tool
 */
function handleToolPicked(data) {
  if (!brushTool) return;

  // Update brush tool with picked cell
  brushTool.setCurrentCell(data.cell);

  // Auto-switch back to brush tool
  setCurrentTool(brushTool);

  updateStatus(
    `Picked: '${data.cell.ch}' (fg:${data.cell.fg}, bg:${data.cell.bg}) • Switched to Brush`,
  );
}

/**
 * Handle cell:changed events - update DOM
 */
function handleCellChanged(data) {
  if (!renderer || !scene) return;

  const layer = scene.getLayer(data.layerId);
  if (!layer) return;

  // Get the container for this layer
  const container = document.getElementById(`layer-${data.layerId}`);
  if (!container) return;

  // Update the cell in the DOM
  renderer.updateCell(layer, container, data.x, data.y);
}

/**
 * Update hover indicator position
 */
function updateHoverIndicator(x, y) {
  if (!hoverIndicator) return;

  // Get cell dimensions from hit test overlay
  const cellDimensions = hitTestOverlay.getCellDimensions();

  // Position the hover indicator
  hoverIndicator.style.left = `${x * cellDimensions.width}px`;
  hoverIndicator.style.top = `${y * cellDimensions.height}px`;
  hoverIndicator.classList.add("visible");
}

/**
 * Hide hover indicator
 */
function hideHoverIndicator() {
  if (!hoverIndicator) return;
  hoverIndicator.classList.remove("visible");
}

/**
 * Show anchor indicator at specific cell (for rectangle start point)
 */
function showAnchorIndicator(x, y) {
  if (!anchorIndicator) return;

  // Get cell dimensions from hit test overlay
  const cellDimensions = hitTestOverlay.getCellDimensions();

  // Position the anchor indicator
  anchorIndicator.style.left = `${x * cellDimensions.width}px`;
  anchorIndicator.style.top = `${y * cellDimensions.height}px`;
  anchorIndicator.classList.add("visible");
}

/**
 * Hide anchor indicator
 */
function hideAnchorIndicator() {
  if (!anchorIndicator) return;
  anchorIndicator.classList.remove("visible");
}

/**
 * Show circle preview overlay during drag
 */
function showCirclePreview(
  centerX,
  centerY,
  radiusOrRadiusX,
  fillMode,
  ellipseMode = false,
  radiusY = null,
) {
  hideCirclePreview(); // Clear any existing preview

  if (!hitTestOverlay) return;

  const cellDimensions = hitTestOverlay.getCellDimensions();
  const container = document.querySelector(".grid-container");
  if (!container) return;

  // Create preview overlay
  const previewOverlay = getOrCreatePreviewOverlay(
    "circle-preview-overlay",
    container,
  );

  // Calculate circle preview cells using Bresenham algorithm
  const previewCells = getCirclePreviewCells(
    centerX,
    centerY,
    radiusOrRadiusX,
    fillMode,
    ellipseMode,
    radiusY,
  );

  // Create visual elements for each preview cell
  previewCells.forEach((cell) => {
    const previewCell = document.createElement("div");
    previewCell.className = "circle-preview-cell";
    previewCell.style.position = "absolute";
    previewCell.style.left = `${cell.x * cellDimensions.width}px`;
    previewCell.style.top = `${cell.y * cellDimensions.height}px`;
    previewCell.style.width = `${cellDimensions.width}px`;
    previewCell.style.height = `${cellDimensions.height}px`;
    previewCell.style.border = `1px solid ${PREVIEW_COLORS.CIRCLE}`;
    previewCell.style.backgroundColor = PREVIEW_COLORS.CIRCLE_BG;
    previewCell.style.borderRadius = "1px";
    previewCell.style.boxSizing = "border-box";
    previewOverlay.appendChild(previewCell);
  });
}

/**
 * Hide circle preview overlay
 */
function hideCirclePreview() {
  const previewOverlay = document.getElementById("circle-preview-overlay");
  if (previewOverlay) {
    previewOverlay.innerHTML = "";
  }
}

/**
 * Show text cursor at specified position
 */
function showTextCursor(x, y) {
  hideTextCursor(); // Clear any existing cursor

  if (!hitTestOverlay) return;

  const cellDimensions = hitTestOverlay.getCellDimensions();
  const container = document.querySelector(".grid-container");
  if (!container) return;

  // Create cursor overlay
  const cursorOverlay = getOrCreatePreviewOverlay(
    "text-cursor-overlay",
    container,
  );

  // Create blinking cursor element
  const cursor = document.createElement("div");
  cursor.className = "text-cursor";
  cursor.style.position = "absolute";
  cursor.style.left = `${x * cellDimensions.width}px`;
  cursor.style.top = `${y * cellDimensions.height}px`;
  cursor.style.width = "2px";
  cursor.style.height = `${cellDimensions.height}px`;
  cursor.style.backgroundColor = "#00ff00";
  cursor.style.animation = "blink 1s infinite";
  cursor.style.zIndex = "1001";

  cursorOverlay.appendChild(cursor);

  // Add CSS animation if not already present
  if (!document.getElementById("text-cursor-style")) {
    const style = document.createElement("style");
    style.id = "text-cursor-style";
    style.textContent = `
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Hide text cursor
 */
function hideTextCursor() {
  const cursorOverlay = document.getElementById("text-cursor-overlay");
  if (cursorOverlay) {
    cursorOverlay.innerHTML = "";
  }
}

/**
 * Disable keyboard shortcuts (for text tool typing mode)
 */
function disableKeyboardShortcuts() {
  keyboardShortcutsEnabled = false;
}

/**
 * Enable keyboard shortcuts
 */
function enableKeyboardShortcuts() {
  keyboardShortcutsEnabled = true;
}

/**
 * Get circle/ellipse preview cells using Bresenham algorithms
 */
function getCirclePreviewCells(
  centerX,
  centerY,
  radiusOrRadiusX,
  fillMode,
  ellipseMode = false,
  radiusY = null,
) {
  const cells = [];

  if (ellipseMode && radiusY !== null) {
    // Ellipse mode
    const radiusX = radiusOrRadiusX;

    if (radiusX === 0 && radiusY === 0) {
      cells.push({ x: centerX, y: centerY });
      return cells;
    }

    if (fillMode === "filled") {
      // Filled ellipse
      for (let y = centerY - radiusY; y <= centerY + radiusY; y++) {
        for (let x = centerX - radiusX; x <= centerX + radiusX; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const ellipseValue =
            (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
          if (ellipseValue <= 1) {
            cells.push({ x, y });
          }
        }
      }
    } else {
      // Outline ellipse - use proper Bresenham-like algorithm for preview
      const ellipsePoints = getEllipseOutlinePoints(
        centerX,
        centerY,
        radiusX,
        radiusY,
      );
      ellipsePoints.forEach((point) => cells.push(point));
    }
  } else {
    // Circle mode
    const radius = radiusOrRadiusX;

    if (radius === 0) {
      cells.push({ x: centerX, y: centerY });
      return cells;
    }

    if (fillMode === "filled") {
      // Filled circle - check each point in bounding box
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            cells.push({ x, y });
          }
        }
      }
    } else {
      // Outline circle - use Bresenham algorithm
      let x = 0;
      let y = radius;
      let d = 3 - 2 * radius;

      // Add initial points
      addCirclePoints(cells, centerX, centerY, x, y);

      while (y >= x) {
        x++;
        if (d > 0) {
          y--;
          d = d + 4 * (x - y) + 10;
        } else {
          d = d + 4 * x + 6;
        }
        addCirclePoints(cells, centerX, centerY, x, y);
      }
    }
  }

  return cells;
}

/**
 * Get ellipse outline points using Bresenham-like algorithm for preview
 */
function getEllipseOutlinePoints(centerX, centerY, radiusX, radiusY) {
  const points = [];

  if (radiusX === 0 && radiusY === 0) {
    points.push({ x: centerX, y: centerY });
    return points;
  }

  if (radiusX === 0) {
    // Vertical line
    for (let y = centerY - radiusY; y <= centerY + radiusY; y++) {
      points.push({ x: centerX, y: y });
    }
    return points;
  }

  if (radiusY === 0) {
    // Horizontal line
    for (let x = centerX - radiusX; x <= centerX + radiusX; x++) {
      points.push({ x: x, y: centerY });
    }
    return points;
  }

  let x = 0;
  let y = radiusY;
  let radiusX2 = radiusX * radiusX;
  let radiusY2 = radiusY * radiusY;
  let twoRadiusX2 = 2 * radiusX2;
  let twoRadiusY2 = 2 * radiusY2;
  let p;
  let px = 0;
  let py = twoRadiusX2 * y;

  // Add initial points
  addEllipsePoints(points, centerX, centerY, x, y);

  // Region 1
  p = Math.round(radiusY2 - radiusX2 * radiusY + 0.25 * radiusX2);

  while (px < py) {
    x++;
    px += twoRadiusY2;
    if (p < 0) {
      p += radiusY2 + px;
    } else {
      y--;
      py -= twoRadiusX2;
      p += radiusY2 + px - py;
    }
    addEllipsePoints(points, centerX, centerY, x, y);
  }

  // Region 2
  p = Math.round(
    radiusY2 * (x + 0.5) * (x + 0.5) +
      radiusX2 * (y - 1) * (y - 1) -
      radiusX2 * radiusY2,
  );

  while (y > 0) {
    y--;
    py -= twoRadiusX2;
    if (p > 0) {
      p += radiusX2 - py;
    } else {
      x++;
      px += twoRadiusY2;
      p += radiusX2 - py + px;
    }
    addEllipsePoints(points, centerX, centerY, x, y);
  }

  return points;
}

/**
 * Add 4-fold symmetric points for ellipse preview
 */
function addEllipsePoints(points, centerX, centerY, x, y) {
  points.push({ x: centerX + x, y: centerY + y });
  points.push({ x: centerX - x, y: centerY + y });
  points.push({ x: centerX + x, y: centerY - y });
  points.push({ x: centerX - x, y: centerY - y });
}

/**
 * Add 8-fold symmetric points for circle preview
 */
function addCirclePoints(points, centerX, centerY, x, y) {
  points.push({ x: centerX + x, y: centerY + y });
  points.push({ x: centerX - x, y: centerY + y });
  points.push({ x: centerX + x, y: centerY - y });
  points.push({ x: centerX - x, y: centerY - y });
  points.push({ x: centerX + y, y: centerY + x });
  points.push({ x: centerX - y, y: centerY + x });
  points.push({ x: centerX + y, y: centerY - x });
  points.push({ x: centerX - y, y: centerY - x });
}

/**
 * Show brush preview overlay during hover
 */
function showBrushPreview(x, y) {
  hideBrushPreview(); // Clear any existing preview

  if (!hitTestOverlay || !currentTool || !scene) return;

  const cellDimensions = hitTestOverlay.getCellDimensions();
  const container = document.querySelector(".grid-container");
  if (!container) return;

  // Create preview overlay
  const previewOverlay = getOrCreatePreviewOverlay(
    "brush-preview-overlay",
    container,
  );

  // Get brush preview cells
  const previewCells = brushTool.getBrushPreview(x, y, scene);

  // Create visual elements for each preview cell
  previewCells.forEach((cell) => {
    const previewCell = document.createElement("div");
    previewCell.className = "brush-preview-cell";
    previewCell.style.position = "absolute";
    previewCell.style.left = `${cell.x * cellDimensions.width}px`;
    previewCell.style.top = `${cell.y * cellDimensions.height}px`;
    previewCell.style.width = `${cellDimensions.width}px`;
    previewCell.style.height = `${cellDimensions.height}px`;
    previewCell.style.border = `1px solid ${PREVIEW_COLORS.BRUSH}`;
    previewCell.style.backgroundColor = PREVIEW_COLORS.BRUSH_BG;
    previewCell.style.borderRadius = "2px";
    previewCell.style.boxSizing = "border-box";
    previewOverlay.appendChild(previewCell);
  });
}

/**
 * Hide brush preview overlay
 */
function hideBrushPreview() {
  const previewOverlay = document.getElementById("brush-preview-overlay");
  if (previewOverlay) {
    previewOverlay.innerHTML = "";
  }
}

/**
 * Show rectangle preview overlay during drag
 */
function showRectanglePreview(x1, y1, x2, y2, fillMode) {
  hideRectanglePreview(); // Clear any existing preview

  if (!hitTestOverlay) return;

  const cellDimensions = hitTestOverlay.getCellDimensions();
  const container = document.querySelector(".grid-container");
  if (!container) return;

  // Create preview overlay
  const previewOverlay = getOrCreatePreviewOverlay(
    "rectangle-preview-overlay",
    container,
  );

  // Calculate rectangle preview cells
  const previewCells = getRectanglePreviewCells(x1, y1, x2, y2, fillMode);

  // Create visual elements for each preview cell
  previewCells.forEach((cell) => {
    const previewCell = document.createElement("div");
    previewCell.className = "rectangle-preview-cell";
    previewCell.style.position = "absolute";
    previewCell.style.left = `${cell.x * cellDimensions.width}px`;
    previewCell.style.top = `${cell.y * cellDimensions.height}px`;
    previewCell.style.width = `${cellDimensions.width}px`;
    previewCell.style.height = `${cellDimensions.height}px`;
    previewCell.style.border = `1px solid ${PREVIEW_COLORS.RECTANGLE}`;
    previewCell.style.backgroundColor = PREVIEW_COLORS.RECTANGLE_BG;
    previewCell.style.borderRadius = "1px";
    previewCell.style.boxSizing = "border-box";
    previewOverlay.appendChild(previewCell);
  });
}

/**
 * Hide rectangle preview overlay
 */
function hideRectanglePreview() {
  const previewOverlay = document.getElementById("rectangle-preview-overlay");
  if (previewOverlay) {
    previewOverlay.innerHTML = "";
  }
}

/**
 * Get rectangle preview cells
 */
function getRectanglePreviewCells(x1, y1, x2, y2, fillMode) {
  const cells = [];

  if (fillMode === "filled") {
    // Filled rectangle
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        cells.push({ x, y });
      }
    }
  } else {
    // Outline rectangle
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        // Only include outline cells
        if (y === y1 || y === y2 || x === x1 || x === x2) {
          cells.push({ x, y });
        }
      }
    }
  }

  return cells;
}

/**
 * Show selection preview overlay
 */
function showSelectionPreview(previewCells) {
  hideSelectionPreview(); // Clear any existing preview

  if (!hitTestOverlay || !scene) return;

  const cellDimensions = hitTestOverlay.getCellDimensions();
  const container = document.querySelector(".grid-container");
  if (!container) return;

  // Create preview overlay
  const previewOverlay = getOrCreatePreviewOverlay(
    "selection-preview-overlay",
    container,
  );

  // Create visual elements for each preview cell
  previewCells.forEach((cell) => {
    const previewCell = document.createElement("div");
    previewCell.className = "selection-preview-cell";
    previewCell.style.position = "absolute";
    previewCell.style.left = `${cell.x * cellDimensions.width}px`;
    previewCell.style.top = `${cell.y * cellDimensions.height}px`;
    previewCell.style.width = `${cellDimensions.width}px`;
    previewCell.style.height = `${cellDimensions.height}px`;
    previewCell.style.border = "1px dashed #0ff";
    previewCell.style.backgroundColor = "rgba(0, 255, 255, 0.1)";
    previewCell.style.boxSizing = "border-box";
    previewCell.style.pointerEvents = "none";

    previewOverlay.appendChild(previewCell);
  });
}

/**
 * Hide selection preview overlay
 */
function hideSelectionPreview() {
  const overlay = document.getElementById("selection-preview-overlay");
  if (overlay) {
    overlay.innerHTML = "";
  }
}

/**
 * Update brush preview when brush settings change
 */
function updateBrushPreview() {
  // Hide preview when switching away from brush or when brush is 1x1 square
  if (
    currentTool !== brushTool ||
    (brushTool.getBrushSize() === 1 && brushTool.getBrushShape() === "square")
  ) {
    hideBrushPreview();
  }
}

/**
 * Initialize tools
 */
function initTools() {
  // Create tool instances with command history (using configuration)
  TOOL_CONFIG.forEach((config) => {
    const tool = new config.class(...config.args, commandHistory);

    // Store tool reference in config for easy lookup
    config.tool = tool;

    // Assign to module-level variable by name
    if (config.name === "brushTool") brushTool = tool;
    else if (config.name === "eraserTool") eraserTool = tool;
    else if (config.name === "pickerTool") pickerTool = tool;
    else if (config.name === "sprayTool") sprayTool = tool;
    else if (config.name === "rectangleTool") rectangleTool = tool;
    else if (config.name === "lineTool") lineTool = tool;
    else if (config.name === "circleTool") circleTool = tool;
    else if (config.name === "floodFillTool") floodFillTool = tool;
    else if (config.name === "textTool") textTool = tool;
    else if (config.name === "selectionTool") selectionTool = tool;
  });

  // Set initial tool
  setCurrentTool(brushTool);

  // Setup tool buttons (using configuration)
  // Update tool buttons after creation
  TOOL_CONFIG.forEach((config) => {
    const button = document.getElementById(`tool-${config.id}`);
    if (button) {
      let tool;
      if (config.name === "brushTool") tool = brushTool;
      else if (config.name === "eraserTool") tool = eraserTool;
      else if (config.name === "pickerTool") tool = pickerTool;
      else if (config.name === "sprayTool") tool = sprayTool;
      else if (config.name === "rectangleTool") tool = rectangleTool;
      else if (config.name === "lineTool") tool = lineTool;
      else if (config.name === "circleTool") tool = circleTool;
      else if (config.name === "floodFillTool") tool = floodFillTool;
      else if (config.name === "textTool") tool = textTool;
      else if (config.name === "selectionTool") tool = selectionTool;

      button.addEventListener("click", () => setCurrentTool(tool));
    }
  });

  // Keyboard shortcuts
  initKeyboardShortcuts();
}

/**
 * Initialize keyboard shortcuts for tools
 */
function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Don't trigger shortcuts if user is typing in an input/textarea
    if (e.target.matches("input, textarea")) {
      return;
    }

    // Don't trigger shortcuts if they're disabled (e.g., text tool typing)
    if (!keyboardShortcutsEnabled) {
      return;
    }

    // Undo/Redo shortcuts
    if (
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      e.key.toLowerCase() === "z"
    ) {
      e.preventDefault();
      if (commandHistory && commandHistory.canUndo()) {
        commandHistory.undo();
        updateUndoRedoButtons();
      }
      return;
    }

    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key.toLowerCase() === "y" ||
        (e.shiftKey && e.key.toLowerCase() === "z"))
    ) {
      e.preventDefault();
      if (commandHistory && commandHistory.canRedo()) {
        commandHistory.redo();
        updateUndoRedoButtons();
      }
      return;
    }

    // Tool shortcuts (using configuration) - only when no modifier keys
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const key = e.key.toLowerCase();
      const toolConfig = TOOL_CONFIG.find((config) => config.key === key);
      if (toolConfig) {
        let tool;
        if (toolConfig.name === "brushTool") tool = brushTool;
        else if (toolConfig.name === "eraserTool") tool = eraserTool;
        else if (toolConfig.name === "pickerTool") tool = pickerTool;
        else if (toolConfig.name === "sprayTool") tool = sprayTool;
        else if (toolConfig.name === "rectangleTool") tool = rectangleTool;
        else if (toolConfig.name === "lineTool") tool = lineTool;
        else if (toolConfig.name === "circleTool") tool = circleTool;
        else if (toolConfig.name === "floodFillTool") tool = floodFillTool;
        else if (toolConfig.name === "textTool") tool = textTool;
        else if (toolConfig.name === "selectionTool") tool = selectionTool;

        if (tool) {
          setCurrentTool(tool);
        }
      }
    }
  });
}

/**
 * Cycle through layers (fg -> mid -> bg -> fg)
 */
function cycleLayer() {
  if (!scene) return;

  const layers = ["fg", "mid", "bg"];
  const currentIndex = layers.indexOf(scene.activeLayerId);
  const nextIndex = (currentIndex + 1) % layers.length;
  const nextLayerId = layers[nextIndex];

  scene.setActiveLayer(nextLayerId);
  stateManager.emit("layer:active", { layerId: nextLayerId });

  // Update layer panel if it exists
  if (layerPanel) {
    layerPanel.render();
  }
}

/**
 * Set the current active tool
 */
function setCurrentTool(tool) {
  // Stop typing if switching away from text tool
  if (currentTool && currentTool.name === "Text" && currentTool.isTyping) {
    currentTool.stopTyping(stateManager);
  }

  currentTool = tool;

  // Clear all previews when switching tools
  hideBrushPreview();
  hideCirclePreview();
  hideRectanglePreview();
  hideTextCursor();
  hideSelectionPreview();

  // Update cursor
  if (hitTestOverlay) {
    hitTestOverlay.setCursor(tool.getCursor());
  }

  // Clear all active states and hide all options using configuration
  TOOL_CONFIG.forEach((config) => {
    const button = document.getElementById(`tool-${config.id}`);
    if (button) button.classList.remove("active");

    if (config.hasOptions) {
      const options = document.getElementById(`${config.id}-options`);
      if (options) options.style.display = "none";
    }
  });

  // Find and activate current tool using stored tool reference
  const activeConfig = TOOL_CONFIG.find((config) => config.tool === tool);
  if (activeConfig) {
    const button = document.getElementById(`tool-${activeConfig.id}`);
    if (button) button.classList.add("active");

    if (activeConfig.hasOptions) {
      const options = document.getElementById(`${activeConfig.id}-options`);
      if (options) options.style.display = "flex";
    }
  }

  updateStatus(
    `Tool: ${tool.name} • Grid: ${GRID_WIDTH}×${GRID_HEIGHT} • Scale: ${currentScale}%`,
  );

  // Update selection panel visibility
  updateSelectionPanelVisibility();
}

/**
 * Initialize layer panel UI
 */
function initLayerPanel() {
  const container = document.getElementById("layer-panel");
  if (!container) {
    console.error("Layer panel container not found");
    return;
  }

  layerPanel = new LayerPanel(container, scene, stateManager);

  // Listen to layer active changes to update status
  stateManager.on("layer:active", (data) => {
    updateStatus(
      `Layer: ${data.layerId.toUpperCase()} • Tool: ${currentTool.name} • Scale: ${currentScale}%`,
    );
  });

  // Listen to layer structure changes to recreate containers
  stateManager.on("layers:structure_changed", () => {
    createLayerContainers();
    renderScene();
  });

  // Listen to layer removal for immediate cleanup
  stateManager.on("layer:removed", (data) => {
    // Immediate synchronous removal
    const layerElement = document.getElementById(`layer-${data.layerId}`);
    if (layerElement) {
      layerElement.innerHTML = ""; // Clear content immediately
      layerElement.remove();
    }
  });

  // Listen to layer visibility changes to update DOM
  stateManager.on("layer:visibility", (data) => {
    const layerElement = document.getElementById(`layer-${data.layerId}`);
    if (layerElement) {
      if (data.visible) {
        layerElement.classList.remove("hidden");
      } else {
        layerElement.classList.add("hidden");
      }
    }
  });

  // Listen to scene updates that might affect layers
  stateManager.on("scene:updated", (data) => {
    if (
      data.reason === "layer_added" ||
      data.reason === "layer_removed" ||
      data.reason === "layer_reordered"
    ) {
      renderScene();
    }
  });
}

/**
 * Initialize interactive palette swatches
 */
function initInteractivePalette() {
  const swatches = document.querySelectorAll(".palette-swatch");

  swatches.forEach((swatch) => {
    // Left click = foreground
    swatch.addEventListener("click", (e) => {
      e.preventDefault();
      const color = parseInt(swatch.dataset.color);
      selectFgColor(color);
    });

    // Right click = background
    swatch.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const color = parseInt(swatch.dataset.color);
      selectBgColor(color);
    });
  });

  // Listen to picker tool events
  stateManager.on("tool:picked", (data) => {
    if (data.cell) {
      selectFgColor(data.cell.fg);
      selectBgColor(data.cell.bg);
    }
  });

  // Initialize visual state
  updatePaletteSelection();
  updateColorPreview();
}

/**
 * Get or create a preview overlay element
 * @param {string} id - Unique ID for the overlay
 * @param {HTMLElement} container - Container to append overlay to
 * @returns {HTMLElement} The preview overlay element
 */
function getOrCreatePreviewOverlay(id, container) {
  let overlay = document.getElementById(id);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = id;
    overlay.style.cssText = `position: absolute; pointer-events: none; z-index: ${Z_INDEX.PREVIEW_OVERLAY};`;
    container.appendChild(overlay);
  }
  return overlay;
}

/**
 * Update all tools with a specific property
 */
function updateAllToolsProperty(property, value) {
  const tools = [
    brushTool,
    sprayTool,
    rectangleTool,
    lineTool,
    circleTool,
    floodFillTool,
  ];
  tools.forEach((tool) => {
    if (tool) {
      const currentCell = tool.getCurrentCell();
      tool.setCurrentCell({ ...currentCell, [property]: value });
    }
  });
}

/**
 * Select foreground color
 */
function selectFgColor(colorIndex) {
  // Don't allow transparent foreground
  if (colorIndex === -1) {
    return;
  }

  selectedFg = colorIndex;

  // Update all tools with new foreground color
  updateAllToolsProperty("fg", colorIndex);

  // Update UI
  updatePaletteSelection();
  updateColorPreview();

  // Emit event
  stateManager.emit("color:fg-selected", { color: colorIndex });
}

/**
 * Select background color
 */
function selectBgColor(colorIndex) {
  selectedBg = colorIndex;

  // Update all tools with new background color
  updateAllToolsProperty("bg", colorIndex);

  // Update UI
  updatePaletteSelection();
  updateColorPreview();

  // Emit event
  stateManager.emit("color:bg-selected", { color: colorIndex });
}

/**
 * Update palette swatch selection visual indicators
 */
function updatePaletteSelection() {
  const swatches = document.querySelectorAll(".palette-swatch");

  swatches.forEach((swatch) => {
    const color = parseInt(swatch.dataset.color);

    // Remove existing classes
    swatch.classList.remove("selected-fg", "selected-bg");

    // Add classes for selected colors
    if (color === selectedFg) {
      swatch.classList.add("selected-fg");
    }
    if (color === selectedBg) {
      swatch.classList.add("selected-bg");
    }
  });
}

/**
 * Update color preview cell
 */
function updateColorPreview() {
  const previewCell = document.getElementById("color-preview");
  if (!previewCell) return;

  const currentCell = brushTool.getCurrentCell();

  previewCell.textContent = currentCell.ch || "█";
  previewCell.className = "preview-cell";
  previewCell.classList.add(`fg-${currentCell.fg}`);

  if (currentCell.bg >= 0) {
    previewCell.classList.add(`bg-${currentCell.bg}`);
  } else {
    previewCell.classList.add("bg--1");
  }
}

/**
 * Initialize glyph picker
 */
function initGlyphPicker() {
  const container = document.getElementById("glyph-picker-trigger");
  if (!container) {
    console.error("Glyph picker trigger container not found");
    return;
  }

  glyphPicker = new GlyphPicker(brushTool, stateManager);

  // Add trigger button to container
  const triggerButton = glyphPicker.getTriggerButton();
  container.appendChild(triggerButton);

  // Attach click handler to open modal
  triggerButton.addEventListener("click", () => {
    glyphPicker.open();
  });

  // Listen to glyph selection events to update preview and sync tools
  stateManager.on("glyph:selected", (data) => {
    // Sync character to all tools
    if (data.char) {
      updateAllToolsProperty("ch", data.char);
    }

    updateColorPreview();
  });
}

/**
 * Initialize clipboard export functionality
 */
function initClipboard() {
  clipboardManager = new ClipboardManager(scene, stateManager);

  const exportTextBtn = document.getElementById("export-text");
  const exportAnsiBtn = document.getElementById("export-ansi");
  const exportLayerBtn = document.getElementById("export-layer");
  const exportStatus = document.getElementById("export-status");

  // Copy as plain text
  if (exportTextBtn) {
    exportTextBtn.addEventListener("click", async () => {
      const result = await clipboardManager.copyPlainText();
      showExportStatus(result, exportStatus);
    });
  }

  // Copy as ANSI
  if (exportAnsiBtn) {
    exportAnsiBtn.addEventListener("click", async () => {
      const result = await clipboardManager.copyAnsi();
      showExportStatus(result, exportStatus);
    });
  }

  // Copy current layer only
  if (exportLayerBtn) {
    exportLayerBtn.addEventListener("click", async () => {
      const layerId = scene.activeLayerId;
      const result = await clipboardManager.copyLayerText(layerId);
      showExportStatus(result, exportStatus, layerId);
    });
  }

  // Listen to export events for additional feedback
  stateManager.on("export:success", (data) => {
    // Export completed successfully
  });

  stateManager.on("export:error", (data) => {
    console.error("Export failed:", data.error);
  });
}

/**
 * Show export status message
 */
function showExportStatus(result, statusElement, layerId = null) {
  if (!statusElement) return;

  statusElement.classList.remove("hidden", "error");

  if (result.success) {
    const format = layerId ? `Layer ${layerId.toUpperCase()}` : "Artwork";
    statusElement.textContent = `✅ Copied ${format}! (${result.charCount} chars, ${result.lineCount} lines)`;
    statusElement.classList.remove("error");
  } else {
    statusElement.textContent = `❌ Error: ${result.error}`;
    statusElement.classList.add("error");
  }

  // Hide after 3 seconds
  setTimeout(() => {
    statusElement.classList.add("hidden");
  }, TIMEOUTS.STATUS_HIDE);
}

/**
 * Initialize project manager and file operations
 */
function initProject() {
  projectManager = new ProjectManager(scene, stateManager);

  const newBtn = document.getElementById("new-project");
  const saveBtn = document.getElementById("save-project");
  const loadBtn = document.getElementById("load-project");
  const fileInput = document.getElementById("file-input");
  const dropzone = document.getElementById("dropzone");
  const projectStatus = document.getElementById("project-status");

  // New project
  if (newBtn) {
    newBtn.addEventListener("click", () => {
      newProject();
    });
  }

  // Save project
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const filename = prompt("Project name:", "my-artwork");
      if (filename) {
        const result = projectManager.saveToFile(filename);
        showProjectStatus(result, projectStatus);
      }
    });
  }

  // Load project (file picker)
  if (loadBtn && fileInput) {
    loadBtn.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        await loadProjectFile(file, projectStatus);
      }
      // Reset input so same file can be loaded again
      fileInput.value = "";
    });
  }

  // Dropzone functionality
  if (dropzone) {
    // Prevent default drag behaviors
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight dropzone when dragging over it
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, () => {
        dropzone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, () => {
        dropzone.classList.remove("drag-over");
      });
    });

    // Handle dropped files
    dropzone.addEventListener("drop", async (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await loadProjectFile(files[0], projectStatus);
      }
    });

    // Also allow clicking on dropzone
    dropzone.addEventListener("click", () => {
      fileInput.click();
    });
  }

  // Listen to project events
  stateManager.on("project:saved", (data) => {
    // Project saved successfully
  });

  stateManager.on("project:loaded", (data) => {
    // Project loaded successfully
  });

  stateManager.on("project:error", (data) => {
    console.error("Project error:", data.error);
  });
}

/**
 * Prevent default drag/drop behavior
 */
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Load project from file
 */
async function loadProjectFile(file, statusElement) {
  // Confirm if user wants to lose current work
  const confirmed = confirm(
    "Loading a project will replace your current work. Continue?",
  );

  if (!confirmed) {
    return;
  }

  const result = await projectManager.loadFromFile(file);

  if (result.success) {
    // Replace current scene
    replaceScene(result.scene);
    showProjectStatus(result, statusElement);
  } else {
    showProjectStatus(result, statusElement);
  }
}

/**
 * Replace current scene with a new one
 */
function replaceScene(newScene) {
  // Update scene reference
  scene = newScene;

  // Update global reference for TextTool
  window.currentScene = scene;

  // Update all components that reference the scene
  if (projectManager) {
    projectManager.scene = scene;
  }
  if (clipboardManager) {
    clipboardManager.scene = scene;
  }

  // Clear command history when loading new scene
  if (commandHistory) {
    commandHistory.clear();
  }

  // Re-render all layers
  renderScene();

  // Update layer panel
  if (layerPanel) {
    layerPanel.scene = scene;
    layerPanel.render();
  }

  // Update hit test overlay
  if (hitTestOverlay) {
    hitTestOverlay.scene = scene;
    hitTestOverlay.updateOverlaySize();
  }

  // Apply the palette from loaded scene
  applyPalette(scene.paletteId);

  // Update particle engine with new scene
  if (particleEngine) {
    particleEngine.stop();
    particleEngine.scene = scene;
  }
}

/**
 * Update all tools with current command history reference
 */
function updateToolsCommandHistory() {
  if (brushTool && commandHistory) {
    brushTool.setCommandHistory(commandHistory);
  }
  if (eraserTool && commandHistory) {
    eraserTool.setCommandHistory(commandHistory);
  }
  if (pickerTool && commandHistory) {
    pickerTool.setCommandHistory(commandHistory);
  }
  if (sprayTool && commandHistory) {
    sprayTool.setCommandHistory(commandHistory);
  }
  if (rectangleTool && commandHistory) {
    rectangleTool.setCommandHistory(commandHistory);
  }
  if (lineTool && commandHistory) {
    lineTool.setCommandHistory(commandHistory);
  }
  if (circleTool && commandHistory) {
    circleTool.setCommandHistory(commandHistory);
  }
  if (floodFillTool && commandHistory) {
    floodFillTool.setCommandHistory(commandHistory);
  }
}

/**
 * Show project status message
 */
function showProjectStatus(result, statusElement) {
  if (!statusElement) return;

  statusElement.classList.remove("hidden", "error");

  if (result.success) {
    if (result.filename) {
      // Load success
      statusElement.textContent = `✅ Loaded: ${result.name}`;
    } else {
      // Save success
      const kb = Math.round(result.size / 1024);
      statusElement.textContent = `✅ Saved: ${result.name} (${kb} KB)`;
    }
    statusElement.classList.remove("error");
  } else {
    statusElement.textContent = `❌ Error: ${result.error}`;
    statusElement.classList.add("error");
  }

  // Hide after 3 seconds
  setTimeout(() => {
    statusElement.classList.add("hidden");
  }, TIMEOUTS.STATUS_HIDE);
}

/**
 * Initialize I/O panel toggle
 */
let ioInitialized = false;
function initIOPanel() {
  if (ioInitialized) return; // Prevent duplicate initialization

  const ioToggle = document.getElementById("io-toggle");
  const ioPanel = document.getElementById("io-panel");

  if (ioToggle && ioPanel) {
    // Toggle panel on button click
    ioToggle.addEventListener("click", () => {
      ioPanel.classList.toggle("hidden");
      ioToggle.classList.toggle("active");
    });

    // Close panel when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !ioPanel.contains(e.target) &&
        !ioToggle.contains(e.target) &&
        !ioPanel.classList.contains("hidden")
      ) {
        ioPanel.classList.add("hidden");
        ioToggle.classList.remove("active");
      }
    });

    // Close panel on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !ioPanel.classList.contains("hidden")) {
        ioPanel.classList.add("hidden");
        ioToggle.classList.remove("active");
      }
    });

    ioInitialized = true;
  }
}

/**
 * Initialize all UI controls and apply defaults
 */
function init() {
  // Initialize startup dialog first
  initStartupDialog();

  // Check if we should show startup dialog or use last project
  if (shouldShowStartupDialog()) {
    showStartupDialog();
  } else {
    // Initialize with default scene for now (will be replaced by startup dialog flow)
    initScene();
    initUIComponents();
  }
}

/**
 * Initialize selection system
 */
function initSelection() {
  selectionManager = new SelectionManager(stateManager);

  // Add keyboard shortcuts for selection operations
  document.addEventListener("keydown", (e) => {
    // Don't trigger if user is typing in an input/textarea
    if (e.target.matches("input, textarea")) return;

    // Don't trigger if shortcuts are disabled
    if (!keyboardShortcutsEnabled) return;

    // Ctrl+C / Cmd+C - Copy selection
    if ((e.ctrlKey || e.metaKey) && e.key === "c" && !e.shiftKey && !e.altKey) {
      if (selectionManager.hasSelection()) {
        e.preventDefault();
        selectionManager
          .copySelection(scene)
          .then(() => {
            updateStatus(
              `Selection copied • Switch projects and press ${modifierKey}+V to paste`,
              3000,
            );
          })
          .catch((error) => {
            updateStatus(`Copy failed: ${error.message}`, 3000);
          });
      }
      return;
    }

    // Ctrl+X / Cmd+X - Cut selection
    if ((e.ctrlKey || e.metaKey) && e.key === "x" && !e.shiftKey && !e.altKey) {
      if (selectionManager.hasSelection()) {
        e.preventDefault();
        selectionManager
          .cutSelection(scene)
          .then(() => {
            updateStatus(
              `Selection cut • Switch projects and press ${modifierKey}+V to paste`,
              3000,
            );
          })
          .catch((error) => {
            updateStatus(`Cut failed: ${error.message}`, 3000);
          });
      }
      return;
    }

    // Ctrl+V / Cmd+V - Paste from clipboard
    if ((e.ctrlKey || e.metaKey) && e.key === "v" && !e.shiftKey && !e.altKey) {
      if (selectionManager && selectionManager.hasClipboardData()) {
        e.preventDefault();
        try {
          const pasteX = selectionManager.hasSelection()
            ? selectionManager.getSelectionInfo().x
            : Math.floor(scene.w / 2);
          const pasteY = selectionManager.hasSelection()
            ? selectionManager.getSelectionInfo().y
            : Math.floor(scene.h / 2);

          selectionManager.pasteAtPosition(
            scene,
            pasteX,
            pasteY,
            scene.activeLayerId,
          );

          // Auto-switch to selection tool and select the pasted content
          if (currentTool !== selectionTool) {
            setCurrentTool(selectionTool);
            updateStatus(
              `Pasted and switched to selection tool • Use arrows to move`,
              3000,
            );
          } else {
            updateStatus(
              `Selection pasted • Use arrows to move, ${modifierKey}+C to copy again`,
              3000,
            );
          }
        } catch (error) {
          updateStatus(`Paste failed: ${error.message}`, 3000);
        }
      }
      return;
    }

    // Delete/Backspace - Clear selection
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.shiftKey
    ) {
      if (selectionManager.hasSelection()) {
        e.preventDefault();
        selectionManager.clearSelectedArea(scene);
        updateStatus("Selection cleared", 2000);
      }
      return;
    }

    // Escape - Clear selection and exit selection mode
    if (
      e.key === "Escape" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.shiftKey
    ) {
      if (currentTool === selectionTool) {
        e.preventDefault();
        if (selectionManager.hasSelection()) {
          selectionManager.clearSelection();
          updateStatus(
            "Selection cleared • Press Escape again to exit selection mode",
            2500,
          );
        } else {
          // Exit selection mode and return to brush tool
          setCurrentTool(brushTool);
          updateStatus(
            "Exited selection mode • Press [V] to return to selection",
            2000,
          );
        }
      }
      return;
    }
  });

  // Initialize transform buttons
  const flipHorizontalBtn = document.getElementById("flip-horizontal-btn");
  const flipVerticalBtn = document.getElementById("flip-vertical-btn");

  // Selection info display
  const selectionInfo = document.getElementById("selection-info");

  // Transform button event listeners
  if (flipHorizontalBtn) {
    flipHorizontalBtn.addEventListener("click", () => {
      if (selectionManager.hasSelection()) {
        selectionManager.flipHorizontal(scene);
        updateStatus("Selection flipped horizontally", 1500);
      }
    });
  }

  if (flipVerticalBtn) {
    flipVerticalBtn.addEventListener("click", () => {
      if (selectionManager.hasSelection()) {
        selectionManager.flipVertical(scene);
        updateStatus("Selection flipped vertically", 1500);
      }
    });
  }

  // Helper function to move selection
  function moveSelection(dx, dy) {
    const info = selectionManager.getSelectionInfo();
    if (!info) return;

    const newX = Math.max(0, Math.min(info.x + dx, scene.w - info.width));
    const newY = Math.max(0, Math.min(info.y + dy, scene.h - info.height));

    if (newX !== info.x || newY !== info.y) {
      // Use direct move method to avoid clipboard dependency
      const success = selectionManager.moveSelectionTo(scene, newX, newY);

      if (success) {
        updateStatus(`Moved selection to (${newX}, ${newY})`, 1500);
        updateSelectionInfo();
        showPersistentSelection();
      } else {
        updateStatus("Cannot move selection there", 1500);
      }
    }
  }

  // Function to show/hide selection options panel and update button states
  function updateTransformButtonsVisibility() {
    updateSelectionPanelVisibility();
  }

  // Function to update selection info display
  function updateSelectionInfo() {
    updateSelectionPanelVisibility();
  }

  // Listen for selection events
  stateManager.on("selectionmanager:changed", (rect) => {
    updateSelectionPanelVisibility();
    showPersistentSelection();
  });

  stateManager.on("selectionmanager:cleared", () => {
    updateSelectionPanelVisibility();
    hidePersistentSelection();
  });

  stateManager.on("selection:needsData", (rect) => {
    if (selectionManager && scene) {
      selectionManager.extractSelectedData(scene);
      updateSelectionPanelVisibility();
      showPersistentSelection();
      updateStatus(
        `Selection ready: ${rect.width}×${rect.height} • Use ${modifierKey}+C to copy, arrows to move`,
        3000,
      );
    }
  });

  stateManager.on("selection:completed", (rect) => {
    updateStatus(
      `Selected ${rect.width}×${rect.height} region • ${modifierKey}+C to copy`,
      2500,
    );
  });

  // Add arrow key support for moving selections
  document.addEventListener("keydown", (e) => {
    // Only handle when selection tool is active and we have a selection
    if (currentTool !== selectionTool || !selectionManager.hasSelection())
      return;
    if (e.target.matches("input, textarea")) return;
    if (!keyboardShortcutsEnabled) return;

    let dx = 0,
      dy = 0;

    switch (e.key) {
      case "ArrowUp":
        dy = -1;
        break;
      case "ArrowDown":
        dy = 1;
        break;
      case "ArrowLeft":
        dx = -1;
        break;
      case "ArrowRight":
        dx = 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    moveSelection(dx, dy);
  });

  // Initial state
  updateSelectionPanelVisibility();

  // Update keyboard shortcuts hint based on platform
  const shortcutsHint = document.getElementById("keyboard-shortcuts-hint");
  if (shortcutsHint) {
    shortcutsHint.textContent = `Copy: ${modifierKey}+C • Cut: ${modifierKey}+X • Paste: ${modifierKey}+V • Exit: Esc`;
  }

  // Functions for persistent selection display
  function showPersistentSelection() {
    if (!selectionManager.hasSelection()) return;

    const selection = selectionManager.selection;
    const persistentOverlay = getOrCreatePreviewOverlay(
      "persistent-selection-overlay",
      document.querySelector(".grid-container"),
    );

    // Clear existing selection
    persistentOverlay.innerHTML = "";

    if (!hitTestOverlay || !scene) return;
    const cellDimensions = hitTestOverlay.getCellDimensions();

    // Create selection border
    for (let py = selection.y; py < selection.y + selection.height; py++) {
      for (let px = selection.x; px < selection.x + selection.width; px++) {
        const isTopBorder = py === selection.y;
        const isBottomBorder = py === selection.y + selection.height - 1;
        const isLeftBorder = px === selection.x;
        const isRightBorder = px === selection.x + selection.width - 1;

        if (isTopBorder || isBottomBorder || isLeftBorder || isRightBorder) {
          const borderCell = document.createElement("div");
          borderCell.className = "persistent-selection-border";
          borderCell.style.position = "absolute";
          borderCell.style.left = `${px * cellDimensions.width}px`;
          borderCell.style.top = `${py * cellDimensions.height}px`;
          borderCell.style.width = `${cellDimensions.width}px`;
          borderCell.style.height = `${cellDimensions.height}px`;
          borderCell.style.border = "2px solid #00ffff";
          borderCell.style.backgroundColor = "rgba(0, 255, 255, 0.1)";
          borderCell.style.boxSizing = "border-box";
          borderCell.style.pointerEvents = "none";
          borderCell.style.animation = "selection-pulse 2s infinite";

          persistentOverlay.appendChild(borderCell);
        }
      }
    }
  }

  function hidePersistentSelection() {
    const overlay = document.getElementById("persistent-selection-overlay");
    if (overlay) {
      overlay.innerHTML = "";
    }
  }
}

/**
 * Initialize UI components after scene is created
 */
function initUIComponents() {
  initInput();
  initCommandHistory();
  initTools();
  initSelection();
  initLayerPanel();
  initInteractivePalette();
  initGlyphPicker();
  initPaintMode();
  initSmartDrawingMode();
  initSpraySettings();
  initRectangleSettings();
  initCircleSettings();
  initBrushSettings();
  initClipboard();
  initProject();
  initIOPanel();
  initAnimation();

  initClearOperations();
  initScaleControls();
  initPaletteSelector();
  initParticles();

  // Mark body as loaded to prevent FOUC
  document.body.classList.add("loaded");
}

/**
 * Initialize startup dialog
 */
function initStartupDialog() {
  startupDialog = new StartupDialog();
  startupDialog.setOnTemplateSelect((config) => {
    initSceneFromTemplate(config);
    initUIComponents();
  });
}

/**
 * Show startup dialog
 */
function showStartupDialog() {
  startupDialog.show();
}

/**
 * Determine if we should show startup dialog
 */
function shouldShowStartupDialog() {
  // Always show startup dialog for now - can add logic for recent projects later
  return true;
}

/**
 * Create new project (show startup dialog)
 */
function newProject() {
  if (startupDialog) {
    startupDialog.show();
  }
}

// =============================================================================
// View Controls - Scaling
// =============================================================================

/**
 * Apply scale transform to grid
 */
function applyScale(scale) {
  const container = document.querySelector(".grid-container");
  if (!container) return;

  currentScale = scale;
  container.style.transform = `scale(${scale / SCALE.DEFAULT})`;

  // Update hit test overlay scale
  if (hitTestOverlay) {
    hitTestOverlay.updateScale(scale);
  }

  // Update UI
  const scaleValue = document.getElementById("scale-value");
  const scaleSlider = document.getElementById("scale-slider");
  if (scaleValue) scaleValue.textContent = scale;
  if (scaleSlider) scaleSlider.value = scale;
}

/**
 * Calculate and apply optimal scale to fit viewport
 */
function scaleGridToFit() {
  const container = document.querySelector(".grid-container");
  const editor = document.getElementById("editor");
  const backgroundGrid = document.getElementById("background-grid");

  if (!container || !editor || !backgroundGrid) return;

  container.style.transform = "none";

  requestAnimationFrame(() => {
    const editorStyle = window.getComputedStyle(editor);
    const editorPadding = {
      left: parseFloat(editorStyle.paddingLeft),
      right: parseFloat(editorStyle.paddingRight),
      top: parseFloat(editorStyle.paddingTop),
      bottom: parseFloat(editorStyle.paddingBottom),
    };

    const gridRect = backgroundGrid.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();

    const padding = 20;
    const availableWidth =
      editorRect.width - editorPadding.left - editorPadding.right - padding;
    const availableHeight =
      editorRect.height - editorPadding.top - editorPadding.bottom - padding;

    const scaleX = availableWidth / gridRect.width;
    const scaleY = availableHeight / gridRect.height;
    const scale = Math.min(scaleX, scaleY);

    const scalePercent = Math.max(
      SCALE.MIN,
      Math.min(SCALE.MAX, Math.round(scale * SCALE.DEFAULT)),
    );
    applyScale(scalePercent);
  });
}

/**
 * Initialize scale controls and event listeners
 */
function initScaleControls() {
  const scaleToFitBtn = document.getElementById("scale-to-fit-btn");
  const scaleSlider = document.getElementById("scale-slider");

  if (scaleToFitBtn) {
    scaleToFitBtn.addEventListener("click", scaleGridToFit);
  }

  if (scaleSlider) {
    scaleSlider.addEventListener("input", (e) => {
      applyScale(parseInt(e.target.value));
    });
  }

  // Auto-fit on load
  scaleGridToFit();
}

// =============================================================================
// Palette Management
// =============================================================================

/**
 * Apply palette colors to CSS custom properties
 */
function applyPalette(paletteId) {
  const palette = palettes[paletteId];
  if (!palette) {
    console.error(`Palette "${paletteId}" not found`);
    return;
  }

  const root = document.documentElement;

  // Update foreground and background colors (same palette)
  palette.colors.forEach((color, index) => {
    root.style.setProperty(`--color-fg-${index}`, color);
    root.style.setProperty(`--color-bg-${index}`, color);
  });

  currentPalette = paletteId;

  // Update scene palette if it exists
  if (scene) {
    scene.paletteId = paletteId;
  }

  updatePaletteSwatches();
}

/**
 * Update palette swatch colors in UI
 */
function updatePaletteSwatches() {
  const swatches = document.querySelectorAll(".palette-swatch");
  swatches.forEach((swatch, index) => {
    const colorIndex = swatch.getAttribute("data-color");
    const color = getComputedStyle(document.documentElement).getPropertyValue(
      `--color-fg-${colorIndex}`,
    );
    swatch.style.backgroundColor = color;
  });
}

/**
 * Initialize palette selector and apply default
 */
function initPaletteSelector() {
  const selector = document.getElementById("palette-selector");

  if (selector) {
    // Clear existing options
    selector.innerHTML = "";

    // Populate options dynamically from palettes.json
    Object.keys(palettes).forEach((paletteId) => {
      const option = document.createElement("option");
      option.value = paletteId;
      option.textContent = palettes[paletteId].name;

      // Mark default palette as selected
      if (paletteId === currentPalette) {
        option.selected = true;
      }

      selector.appendChild(option);
    });

    selector.addEventListener("change", (e) => {
      applyPalette(e.target.value);
    });
  }

  applyPalette(currentPalette);
}

/**
 * Initialize smart drawing mode dropdown
 */
function initSmartDrawingMode() {
  const selector = document.getElementById("smart-drawing-mode");

  if (selector && brushTool) {
    selector.addEventListener("change", (e) => {
      const mode = e.target.value;
      brushTool.setDrawingMode(mode);
      if (rectangleTool) {
        rectangleTool.setDrawingMode(mode);
      }
      if (lineTool) {
        lineTool.setDrawingMode(mode);
      }
      if (circleTool) {
        circleTool.setDrawingMode(mode);
      }

      let statusMessage = `Drawing Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
      if (mode === "single") {
        statusMessage += " Line (Smart Box-Drawing)";
      } else if (mode === "double") {
        statusMessage += " Line (Smart Box-Drawing)";
      }

      updateStatus(statusMessage);
    });

    // Set initial mode
    brushTool.setDrawingMode("normal");
    if (rectangleTool) {
      rectangleTool.setDrawingMode("normal");
    }
    if (lineTool) {
      lineTool.setDrawingMode("normal");
    }
    if (circleTool) {
      circleTool.setDrawingMode("normal");
    }
  }
}

/**
 * Initialize paint mode toggle button
 */
function initPaintMode() {
  const toggleBtn = document.getElementById("paint-mode-toggle");

  if (toggleBtn && brushTool) {
    toggleBtn.addEventListener("click", () => {
      const newMode = brushTool.cyclePaintMode();
      if (rectangleTool) {
        rectangleTool.setPaintMode(newMode);
      }
      if (lineTool) {
        lineTool.setPaintMode(newMode);
      }
      if (circleTool) {
        circleTool.setPaintMode(newMode);
      }
      if (eraserTool) {
        eraserTool.setPaintMode(newMode);
      }
      if (floodFillTool) {
        floodFillTool.setPaintMode(newMode);
      }

      // Update button text based on mode
      const modeLabels = {
        all: "🎨 All",
        fg: "F FG",
        bg: "B BG",
        glyph: "G Char",
      };

      toggleBtn.textContent = modeLabels[newMode] || "🎨 All";

      // Update status message
      const modeDescriptions = {
        all: "Paint all attributes (glyph + colors)",
        fg: "Paint foreground color only",
        bg: "Paint background color only",
        glyph: "Paint glyph character only",
      };

      updateStatus(`Paint Mode: ${modeDescriptions[newMode]}`);
    });

    // Set initial mode
    brushTool.setPaintMode("all");
    if (rectangleTool) {
      rectangleTool.setPaintMode("all");
    }
    if (lineTool) {
      lineTool.setPaintMode("all");
    }
    if (circleTool) {
      circleTool.setPaintMode("all");
    }
    if (eraserTool) {
      eraserTool.setPaintMode("all");
    }
    if (floodFillTool) {
      floodFillTool.setPaintMode("all");
    }
  }
}

/**
 * Initialize brush tool settings
 */
function initBrushSettings() {
  const sizeSelect = document.getElementById("brush-size");
  const shapeSelect = document.getElementById("brush-shape");
  const animationSelect = document.getElementById("brush-animation");
  const animSpeedSelect = document.getElementById("brush-anim-speed");

  if (sizeSelect && brushTool) {
    sizeSelect.addEventListener("change", (e) => {
      const size = parseInt(e.target.value);
      brushTool.setBrushSize(size);

      let statusMessage = `Brush Size: ${size}x${size}`;
      updateStatus(statusMessage, TIMEOUTS.STATUS_UPDATE);
      updateBrushPreview();
    });

    // Set initial size
    brushTool.setBrushSize(1);
  }

  if (shapeSelect && brushTool) {
    shapeSelect.addEventListener("change", (e) => {
      const shape = e.target.value;
      brushTool.setBrushShape(shape);

      let statusMessage = `Brush Shape: ${shape.charAt(0).toUpperCase() + shape.slice(1)}`;
      updateStatus(statusMessage, TIMEOUTS.STATUS_UPDATE);
      updateBrushPreview();
    });

    // Set initial shape
    brushTool.setBrushShape("square");
  }

  // Animation settings - new 3-row UI for glyph/fg/bg

  // Helper to parse color input (0-7 normal, 8 = transparent/-1)
  function parseColorInput(value) {
    return value
      .split("")
      .map((s) => parseInt(s))
      .filter((n) => !isNaN(n) && n >= 0 && n <= 8)
      .map((n) => (n === 8 ? -1 : n)); // Convert 8 to -1 (transparent)
  }

  // Glyph animation controls
  const glyphEnabled = document.getElementById("glyph-anim-enabled");
  const glyphFrames = document.getElementById("glyph-anim-frames");
  const glyphSpeed = document.getElementById("glyph-anim-speed");
  const glyphOffset = document.getElementById("glyph-anim-offset");
  const glyphMode = document.getElementById("glyph-anim-mode");
  const glyphDetails = document.getElementById("glyph-anim-details");

  if (glyphEnabled && brushTool) {
    glyphEnabled.addEventListener("change", (e) => {
      brushTool.setGlyphAnimEnabled(e.target.checked);
      if (glyphDetails) {
        glyphDetails.style.display = e.target.checked ? "flex" : "none";
      }
    });
  }
  if (glyphFrames && brushTool) {
    glyphFrames.addEventListener("input", (e) => {
      const frames = e.target.value.split("").filter((c) => c.length > 0);
      if (frames.length > 0) brushTool.setGlyphAnimFrames(frames);
    });
  }
  if (glyphSpeed && brushTool) {
    glyphSpeed.addEventListener("change", (e) => {
      brushTool.setGlyphAnimSpeed(parseInt(e.target.value));
    });
  }
  if (glyphOffset && brushTool) {
    glyphOffset.addEventListener("change", (e) => {
      brushTool.setGlyphAnimOffsetMode(e.target.value);
    });
  }
  if (glyphMode && brushTool) {
    glyphMode.addEventListener("change", (e) => {
      brushTool.setGlyphAnimCycleMode(e.target.value);
    });
  }

  // FG animation controls
  const fgEnabled = document.getElementById("fg-anim-enabled");
  const fgColors = document.getElementById("fg-anim-colors");
  const fgSpeed = document.getElementById("fg-anim-speed");
  const fgOffset = document.getElementById("fg-anim-offset");
  const fgMode = document.getElementById("fg-anim-mode");
  const fgDetails = document.getElementById("fg-anim-details");

  if (fgEnabled && brushTool) {
    fgEnabled.addEventListener("change", (e) => {
      brushTool.setFgAnimEnabled(e.target.checked);
      if (fgDetails) {
        fgDetails.style.display = e.target.checked ? "flex" : "none";
      }
    });
  }
  if (fgColors && brushTool) {
    fgColors.addEventListener("input", (e) => {
      const colors = parseColorInput(e.target.value);
      if (colors.length > 0) brushTool.setFgAnimColors(colors);
    });
  }
  if (fgSpeed && brushTool) {
    fgSpeed.addEventListener("change", (e) => {
      brushTool.setFgAnimSpeed(parseInt(e.target.value));
    });
  }
  if (fgOffset && brushTool) {
    fgOffset.addEventListener("change", (e) => {
      brushTool.setFgAnimOffsetMode(e.target.value);
    });
  }
  if (fgMode && brushTool) {
    fgMode.addEventListener("change", (e) => {
      brushTool.setFgAnimCycleMode(e.target.value);
    });
  }

  // BG animation controls
  const bgEnabled = document.getElementById("bg-anim-enabled");
  const bgColors = document.getElementById("bg-anim-colors");
  const bgSpeed = document.getElementById("bg-anim-speed");
  const bgOffset = document.getElementById("bg-anim-offset");
  const bgMode = document.getElementById("bg-anim-mode");
  const bgDetails = document.getElementById("bg-anim-details");

  if (bgEnabled && brushTool) {
    bgEnabled.addEventListener("change", (e) => {
      brushTool.setBgAnimEnabled(e.target.checked);
      if (bgDetails) {
        bgDetails.style.display = e.target.checked ? "flex" : "none";
      }
    });
  }
  if (bgColors && brushTool) {
    bgColors.addEventListener("input", (e) => {
      const colors = parseColorInput(e.target.value);
      if (colors.length > 0) brushTool.setBgAnimColors(colors);
    });
  }
  if (bgSpeed && brushTool) {
    bgSpeed.addEventListener("change", (e) => {
      brushTool.setBgAnimSpeed(parseInt(e.target.value));
    });
  }
  if (bgOffset && brushTool) {
    bgOffset.addEventListener("change", (e) => {
      brushTool.setBgAnimOffsetMode(e.target.value);
    });
  }
  if (bgMode && brushTool) {
    bgMode.addEventListener("change", (e) => {
      brushTool.setBgAnimCycleMode(e.target.value);
    });
  }
}

/**
 * Initialize spray tool settings
 */
function initSpraySettings() {
  const presetSelect = document.getElementById("spray-preset");
  const radiusSelect = document.getElementById("spray-radius");
  const coverageSelect = document.getElementById("spray-coverage");

  if (presetSelect && sprayTool) {
    presetSelect.addEventListener("change", (e) => {
      const preset = e.target.value;
      sprayTool.setPreset(preset);

      const presetLabels = {
        artist: "Artist (. - + * % m #)",
        blocks: "Blocks (░ ▒ ▓ █)",
        dots: "Dots (· • ● ○)",
        stipple: "Stipple (, . · :)",
        heights: "Heights (▁ ▂ ▃ ▄ ▅ ▆ ▇ █)",
        widths: "Widths (▏ ▎ ▍ ▌ ▋ ▊ ▉)",
        stars: "Stars (· • ✶ ✕)",
        triangles: "Triangles (▴ ▵ ► ◄ ▲ ▼)",
        crosses: "Crosses (· ÷ + ✕ × X ╳)",
        waves: "Waves (~ ∼ ≈ ≋)",
      };

      updateStatus(`Spray Preset: ${presetLabels[preset]}`);
    });

    // Set initial preset
    sprayTool.setPreset("artist");
  }

  if (radiusSelect && sprayTool) {
    radiusSelect.addEventListener("change", (e) => {
      const radius = parseInt(e.target.value);
      sprayTool.setRadius(radius);

      const sizeLabels = {
        2: "Small",
        3: "Medium",
        5: "Large",
      };

      updateStatus(`Spray Size: ${sizeLabels[radius]}`);
    });

    // Set initial radius
    sprayTool.setRadius(3);
  }

  if (coverageSelect && sprayTool) {
    coverageSelect.addEventListener("change", (e) => {
      const coverage = parseFloat(e.target.value);
      sprayTool.setCoverage(coverage);

      const densityLabels = {
        0.025: "Light",
        0.05: "Medium",
        0.1: "Dense",
        0.5: "Heavy",
      };

      updateStatus(`Spray Density: ${densityLabels[coverage]}`);
    });

    // Set initial coverage
    sprayTool.setCoverage(0.05);
  }
}

/**
 * Initialize rectangle tool settings
 */
function initRectangleSettings() {
  const fillSelect = document.getElementById("rectangle-fill");

  if (fillSelect && rectangleTool) {
    fillSelect.addEventListener("change", (e) => {
      const fillMode = e.target.value;
      rectangleTool.setFillMode(fillMode);

      const fillLabels = {
        outline: "Outline",
        filled: "Filled",
      };

      updateStatus(`Rectangle Fill: ${fillLabels[fillMode]}`);
    });

    // Set initial fill mode
    rectangleTool.setFillMode("outline");
  }
}

/**
 * Initialize circle tool settings
 */
function initCircleSettings() {
  const fillSelect = document.getElementById("circle-fill");
  const ellipseCheckbox = document.getElementById("circle-ellipse");

  if (fillSelect && circleTool) {
    fillSelect.addEventListener("change", (e) => {
      const fillMode = e.target.value;
      circleTool.setFillMode(fillMode);

      const fillLabels = {
        outline: "Outline",
        filled: "Filled",
      };

      updateStatus(`Circle Fill: ${fillLabels[fillMode]}`);
    });

    // Set initial fill mode
    circleTool.setFillMode("outline");
  }

  if (ellipseCheckbox && circleTool) {
    ellipseCheckbox.addEventListener("change", (e) => {
      const ellipseMode = e.target.checked;
      circleTool.setEllipseMode(ellipseMode);

      const modeLabel = ellipseMode ? "Ellipse" : "Circle";
      updateStatus(`Circle Tool: ${modeLabel} Mode`);
    });

    // Set initial ellipse mode
    circleTool.setEllipseMode(false);
  }
}

/**
 * Initialize animation engine and controls
 */
function initAnimation() {
  // Create animation engine with callback to update cells in DOM
  const updateCellCallback = (layer, x, y, frame) => {
    const container = document.getElementById(`layer-${layer.id}`);
    if (!container || !renderer) return;

    // Create a temporary cell-like object for rendering
    const tempCell = { ch: frame.ch, fg: frame.fg, bg: frame.bg };
    renderer.updateCellWithData(layer, container, x, y, tempCell);
  };

  animationEngine = new AnimationEngine(
    scene,
    stateManager,
    updateCellCallback,
  );

  // Wire up play/pause button
  const playBtn = document.getElementById("anim-play-btn");
  const statusSpan = document.getElementById("anim-status");

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      const isPlaying = animationEngine.toggle();

      if (isPlaying) {
        playBtn.textContent = "⏸ Pause";
        if (statusSpan) {
          const count = animationEngine.getAnimatedCellCount();
          statusSpan.textContent = `${count} animated`;
        }
        updateStatus("Animation playing");
      } else {
        playBtn.textContent = "▶ Play";
        if (statusSpan) statusSpan.textContent = "";
        updateStatus("Animation stopped");
      }
    });
  }

  // Listen for animation events
  stateManager.on("animation:started", () => {
    if (statusSpan) {
      const count = animationEngine.getAnimatedCellCount();
      statusSpan.textContent = `${count} animated`;
    }
  });

  stateManager.on("animation:stopped", () => {
    if (statusSpan) statusSpan.textContent = "";
  });

  // Refresh animation cache when cells change
  stateManager.on("cell:changed", () => {
    if (animationEngine && animationEngine.isPlaying()) {
      // Debounce refresh to avoid excessive updates
      clearTimeout(animationEngine._refreshTimeout);
      animationEngine._refreshTimeout = setTimeout(() => {
        animationEngine.refresh();
      }, 100);
    }
  });
}

/**
 * Initialize particle system and controls
 */
function initParticles() {
  const gridContainer = document.querySelector(".grid-container");
  if (!gridContainer) {
    console.error("Grid container not found for particle engine");
    return;
  }

  // Create particle engine
  particleEngine = new ParticleEngine(scene, stateManager, gridContainer);

  // Wire up particle panel toggle
  const particleToggle = document.getElementById("particle-toggle");
  const particlePanel = document.getElementById("particle-panel");
  const particlePanelClose = document.getElementById("particle-panel-close");

  if (particleToggle && particlePanel) {
    particleToggle.addEventListener("click", () => {
      particlePanel.classList.toggle("hidden");
      particleToggle.classList.toggle("active");
    });

    // Close panel on close button
    if (particlePanelClose) {
      particlePanelClose.addEventListener("click", () => {
        particlePanel.classList.add("hidden");
        particleToggle.classList.remove("active");
      });
    }

    // Close panel when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !particlePanel.contains(e.target) &&
        !particleToggle.contains(e.target) &&
        !particlePanel.classList.contains("hidden")
      ) {
        particlePanel.classList.add("hidden");
        particleToggle.classList.remove("active");
      }
    });
  }

  // Wire up preset buttons
  const presetButtons = document.querySelectorAll(".preset-btn[data-preset]");
  const layerSelect = document.getElementById("particle-layer-select");

  // Populate layer select with actual scene layers
  if (layerSelect && scene) {
    layerSelect.innerHTML = "";
    scene.layers.forEach((layer, index) => {
      const option = document.createElement("option");
      option.value = layer.id;
      option.textContent = layer.name || layer.id;
      // Select the last (topmost) layer by default
      if (index === scene.layers.length - 1) {
        option.selected = true;
      }
      layerSelect.appendChild(option);
    });
  }

  presetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetId = btn.dataset.preset;
      const selectedLayer = layerSelect ? layerSelect.value : "fg";

      // Build overrides based on preset type to set sensible positions
      const overrides = { layerId: selectedLayer };
      const preset = PRESETS[presetId];

      if (preset) {
        switch (preset.type) {
          case "point":
            // Center of scene
            overrides.x = Math.floor(scene.w / 2);
            overrides.y = Math.floor(scene.h / 2);
            break;
          case "line":
            // Horizontal line across bottom (for fire/bubbles rising up)
            if (preset.particle?.velocity?.y < 0) {
              // Rising particles - spawn at bottom, full width
              overrides.x = 0;
              overrides.y = scene.h - 2;
              overrides.width = scene.w;
            } else {
              // Falling particles - spawn at top
              overrides.x = 0;
              overrides.y = 0;
              overrides.width = scene.w;
            }
            break;
          case "area":
            // Cover most of the scene for sparkle/stars
            overrides.x = 2;
            overrides.y = 2;
            overrides.width = scene.w - 4;
            overrides.height = scene.h - 4;
            break;
          // 'edge' type doesn't need position - uses scene dimensions
        }
      }

      // Create emitter from preset with overrides
      const emitterConfig = createFromPreset(presetId, overrides);
      const emitter = new ParticleEmitter(emitterConfig);

      // Add to scene
      scene.particles.emitters.push(emitter);

      // Refresh emitter list UI
      updateEmitterList();

      // Start particle engine if not already playing
      if (!particleEngine.isPlaying()) {
        particleEngine.start();
        updateAnimPlayButton();
      }

      updateStatus(
        `Added ${emitterConfig.name} effect on ${selectedLayer} layer`,
      );
    });
  });

  // Wire up clear emitters button
  const clearEmittersBtn = document.getElementById("clear-emitters-btn");
  if (clearEmittersBtn) {
    clearEmittersBtn.addEventListener("click", () => {
      scene.particles.emitters = [];
      particleEngine.clearParticles();
      updateEmitterList();
      updateStatus("Cleared all particle emitters");
    });
  }

  // Sync particle engine with animation play/pause
  stateManager.on("animation:started", () => {
    if (particleEngine && scene.particles.emitters.length > 0) {
      particleEngine.start();
    }
  });

  stateManager.on("animation:stopped", () => {
    if (particleEngine) {
      particleEngine.stop();
    }
  });

  // Update emitter list UI
  function updateEmitterList() {
    const emitterList = document.getElementById("emitter-list");
    if (!emitterList) return;

    const emitters = scene.particles.emitters;

    if (emitters.length === 0) {
      emitterList.innerHTML =
        '<div class="emitter-empty">No emitters. Click a preset to add one.</div>';
      return;
    }

    emitterList.innerHTML = emitters
      .map(
        (emitter, index) => `
      <div class="emitter-item" data-index="${index}">
        <div class="emitter-info">
          <span class="emitter-name">${emitter.name}</span>
          <span class="emitter-layer">${emitter.layerId}</span>
        </div>
        <div class="emitter-controls">
          <button class="emitter-toggle ${emitter.enabled ? "" : "disabled"}"
                  data-index="${index}" title="${emitter.enabled ? "Disable" : "Enable"}">
            ${emitter.enabled ? "👁" : "👁‍🗨"}
          </button>
          <button class="emitter-remove" data-index="${index}" title="Remove">×</button>
        </div>
      </div>
    `,
      )
      .join("");

    // Wire up toggle buttons
    emitterList.querySelectorAll(".emitter-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const emitter = scene.particles.emitters[idx];
        if (emitter) {
          emitter.enabled = !emitter.enabled;
          updateEmitterList();
        }
      });
    });

    // Wire up remove buttons
    emitterList.querySelectorAll(".emitter-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        scene.particles.emitters.splice(idx, 1);
        updateEmitterList();
        updateStatus("Removed particle emitter");
      });
    });
  }

  // Helper to update play button state
  function updateAnimPlayButton() {
    const playBtn = document.getElementById("anim-play-btn");
    const statusSpan = document.getElementById("anim-status");

    if (playBtn && particleEngine.isPlaying()) {
      playBtn.textContent = "⏸ Pause";
      if (statusSpan) {
        const animCount = animationEngine
          ? animationEngine.getAnimatedCellCount()
          : 0;
        const particleCount = particleEngine.getParticleCount();
        const parts = [];
        if (animCount > 0) parts.push(`${animCount} animated`);
        if (particleCount > 0) parts.push(`${particleCount} particles`);
        statusSpan.textContent = parts.join(", ");
      }
    }
  }

  // Update layer select options based on scene layers
  function updateLayerOptions() {
    if (!layerSelect) return;

    layerSelect.innerHTML = scene.layers
      .map(
        (layer) =>
          `<option value="${layer.id}" ${layer.id === "mid" ? "selected" : ""}>${layer.name}</option>`,
      )
      .join("");
  }

  // Initialize
  updateLayerOptions();
  updateEmitterList();
}

/**
 * Initialize command history system
 */
function initCommandHistory() {
  commandHistory = new CommandHistory({
    maxSize: 50,
    stateManager: stateManager,
  });

  // Update tools with command history reference
  updateToolsCommandHistory();

  // Initialize undo/redo buttons
  initUndoRedoButtons();

  // Listen for history events
  stateManager.on("history:changed", (status) => {
    updateUndoRedoButtons();
  });

  stateManager.on("history:executed", (data) => {
    updateStatus(`Executed: ${data.command.description}`);
    updateUndoRedoButtons();
    // Re-render affected areas after command execution
    renderScene();
  });

  stateManager.on("history:undone", (data) => {
    updateStatus(`Undid: ${data.command.description}`);
    updateUndoRedoButtons();
    // Re-render affected areas after undo
    renderScene();
  });

  stateManager.on("history:redone", (data) => {
    updateStatus(`Redid: ${data.command.description}`);
    updateUndoRedoButtons();
    // Re-render affected areas after redo
    renderScene();
  });

  stateManager.on("history:merged", (data) => {
    // Commands merged - could add UI feedback here if needed
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Update status bar text
 */
function updateStatus(message) {
  const status = document.getElementById("status");
  if (status) status.textContent = message;
}

function initUndoRedoButtons() {
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");

  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      if (commandHistory && commandHistory.canUndo()) {
        commandHistory.undo();
      }
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener("click", () => {
      if (commandHistory && commandHistory.canRedo()) {
        commandHistory.redo();
      }
    });
  }

  // Initial button state
  updateUndoRedoButtons();
}

/**
 * Update layer panel with command history reference
 */

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");

  if (undoBtn && commandHistory) {
    const canUndo = commandHistory.canUndo();
    undoBtn.disabled = !canUndo;

    if (canUndo) {
      const undoCommand =
        commandHistory.getUndoStack()[commandHistory.getUndoStack().length - 1];
      undoBtn.title = `Undo: ${undoCommand.description} (Ctrl+Z)`;
    } else {
      undoBtn.title = "Undo (Ctrl+Z)";
    }
  }

  if (redoBtn && commandHistory) {
    const canRedo = commandHistory.canRedo();
    redoBtn.disabled = !canRedo;

    if (canRedo) {
      const redoCommand =
        commandHistory.getRedoStack()[commandHistory.getRedoStack().length - 1];
      redoBtn.title = `Redo: ${redoCommand.description} (Ctrl+Y)`;
    } else {
      redoBtn.title = "Redo (Ctrl+Y)";
    }
  }
}

/**
 * Initialize clear operations functionality
 */
function initClearOperations() {
  const clearGridBtn = document.getElementById("clear-grid");
  const clearLayerBtn = document.getElementById("clear-layer");

  if (!clearGridBtn || !clearLayerBtn) return;

  // Clear entire grid
  clearGridBtn.addEventListener("click", () => {
    showClearConfirmation(
      "Clear Grid",
      "This will clear all layers and remove all content. This action can be undone.",
      () => {
        try {
          const clearCommand = ClearCommand.clearAll({
            scene: scene,
            stateManager: stateManager,
          });

          commandHistory.execute(clearCommand);
          showGridStatus(
            `Cleared ${clearCommand.getAffectedCellCount()} cells from all layers`,
          );
        } catch (error) {
          console.error("Failed to clear grid:", error);
          showGridStatus("Failed to clear grid: " + error.message, true);
        }
      },
    );
  });

  // Clear active layer
  clearLayerBtn.addEventListener("click", () => {
    const activeLayer = scene.getActiveLayer();
    if (!activeLayer) {
      showGridStatus("No active layer selected", true);
      return;
    }

    // Count non-empty cells for confirmation
    const stats = activeLayer.getStats();
    const nonEmptyCount = stats.nonEmptyCount;

    showClearConfirmation(
      "Clear Layer",
      `This will clear ${nonEmptyCount} cells from layer "${activeLayer.name}". This action can be undone.`,
      () => {
        try {
          const clearCommand = ClearCommand.clearLayer({
            scene: scene,
            layer: activeLayer,
            stateManager: stateManager,
          });

          commandHistory.execute(clearCommand);
          showGridStatus(
            `Cleared ${clearCommand.getAffectedCellCount()} cells from layer "${activeLayer.name}"`,
          );
        } catch (error) {
          console.error("Failed to clear layer:", error);
          showGridStatus("Failed to clear layer: " + error.message, true);
        }
      },
    );
  });
}

/**
 * Show confirmation dialog for clear operations
 */
function showClearConfirmation(title, message, onConfirm) {
  const confirmed = window.confirm(`${title}\n\n${message}\n\nContinue?`);
  if (confirmed) {
    onConfirm();
  }
}

/**
 * Show grid status message
 */
function showGridStatus(message, isError = false) {
  const status = document.getElementById("grid-status");
  if (!status) return;

  status.textContent = message;
  status.classList.remove("hidden");

  if (isError) {
    status.classList.add("error");
  } else {
    status.classList.remove("error");
  }

  // Auto-hide after 3 seconds
  setTimeout(() => {
    status.classList.add("hidden");
  }, 3000);
}

// =============================================================================
// Application Entry Point
// =============================================================================

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
