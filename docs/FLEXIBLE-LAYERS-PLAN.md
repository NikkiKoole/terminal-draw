# Flexible Layer Templates - Implementation Plan
**Project Templates + Dynamic Layer Management**

## Overview

Transform the rigid 3-layer system into a flexible template-based approach that starts simple and scales with user needs. Users choose a project template at startup and can modify layer count during editing.

### Goals
- **Simplicity First**: New users see minimal UI for simple drawings
- **Template-Driven**: Predefined configurations for common use cases
- **Dynamic Growth**: Add/remove layers as needed during editing
- **Better UX**: Startup dialog sets expectations and reduces cognitive load

### Non-Goals
- Backward compatibility with existing 3-layer saves (acceptable breaking change)
- Complex layer types/modes (keep layers simple)

## Current Architecture Analysis

### Tight Coupling Issues
1. **Constants**: `LAYER_BG`, `LAYER_MID`, `LAYER_FG` hardcoded everywhere
2. **Scene Constructor**: Always creates exactly 3 layers
3. **Rendering**: `app.js` assumes 3 specific DOM containers
4. **UI**: Layer panel assumes 3 layers with specific IDs
5. **Tools**: Some tools reference specific layer IDs
6. **Compositor**: Tests assume 3-layer stack
7. **Export/Save**: JSON format expects 3 layers

### Flexible Elements (Good News)
- Scene has `addLayer()` and `removeLayer()` methods
- Layers stored in array, not hardcoded references
- Compositor iterates through layers dynamically
- Layer visibility/locking works generically

## New Architecture Design

### Template System
```javascript
const PROJECT_TEMPLATES = {
  simple: {
    id: 'simple',
    name: 'Simple Drawing',
    description: 'Single layer for basic ASCII art',
    layers: [
      { id: 'main', name: 'Main', defaultActive: true }
    ],
    defaultDimensions: { w: 40, h: 20 }
  },
  standard: {
    id: 'standard', 
    name: 'Standard Artwork',
    description: 'Background and foreground layers',
    layers: [
      { id: 'bg', name: 'Background', defaultActive: false },
      { id: 'fg', name: 'Foreground', defaultActive: true }
    ],
    defaultDimensions: { w: 60, h: 25 }
  },
  advanced: {
    id: 'advanced',
    name: 'Multi-Layer Project', 
    description: 'Full 3-layer compositing',
    layers: [
      { id: 'bg', name: 'Background', defaultActive: false },
      { id: 'mid', name: 'Middle', defaultActive: true },
      { id: 'fg', name: 'Foreground', defaultActive: false }
    ],
    defaultDimensions: { w: 80, h: 25 }
  }
};
```

### Startup Dialog Design
- **Modal overlay** on app load
- **Template cards** with visual previews
- **Quick start button** for "Simple" template
- **Custom dimensions** input (with template defaults)
- **Palette selector** (current palette as default)
- **Recent templates** memory for returning users

### Dynamic Layer Management
- **Add Layer** button in layer panel
- **Remove Layer** with confirmation dialog
- **Layer templates** for quick common additions
- **Reorder layers** with drag handles
- **Convert templates** (e.g., Simple → Standard)

## Implementation Plan

### Phase 1: Core Infrastructure (4-6 hours)

#### Step 1.1: Template System Foundation ✅ COMPLETE
**Files Created:**
- `src/core/ProjectTemplate.js` - Template definitions and utilities ✅
- `src/core/LayerTemplate.js` - Individual layer template handling ✅

**Files Modified:**
- `src/core/constants.js` - Removed hardcoded layer IDs, added template constants ✅
- `src/core/Scene.js` - Added template-based constructor, layer management methods ✅

**Key Changes Completed:**
- ✅ Replaced `LAYER_BG/MID/FG` with dynamic layer ID generation
- ✅ Added `Scene.fromTemplate(template, dimensions, palette)`
- ✅ Implemented `Scene.addLayerFromTemplate()` and layer management methods
- ✅ Added layer reordering capabilities
- ✅ Maintained backward compatibility with existing code
- ✅ Added 121 new tests (882 total tests passing)

#### Step 1.2: Dynamic Rendering Infrastructure ✅ COMPLETE
**Files Modified:**
- `src/app.js` - Removed hardcoded layer containers, added dynamic DOM generation ✅
- `src/rendering/LayerRenderer.js` - Updated to handle variable layer count ✅
- `src/ui/LayerPanel.js` - Complete rewrite for dynamic layer management ✅
- `index.html` - Updated to use dynamic layer containers ✅
- `styles/ui.css` - Added styles for dynamic layer panel features ✅

**Key Changes Completed:**
- ✅ Generated layer DOM containers dynamically based on scene.layers
- ✅ Updated rendering loop to iterate through scene.layers
- ✅ Completely rewrote layer panel with dynamic UI generation
- ✅ Added layer management features (add, remove, reorder layers)
- ✅ Added layer template menu for smart layer addition
- ✅ Implemented comprehensive event handling for layer structure changes
- ✅ Added 29 new tests for dynamic rendering (911 total tests passing)

#### Step 1.3: Update Tools and Systems ✅ COMPLETE
**Files Modified:**
- All tool files (`BrushTool.js`, `EraserTool.js`, `PickerTool.js`) - Already compatible ✅
- `src/commands/ClearCommand.js` - Already handles variable layer counts ✅
- `src/commands/ResizeCommand.js` - Already resizes all layers regardless of count ✅
- `src/export/ClipboardManager.js` - Already exports from any layer count ✅
- `src/io/ProjectManager.js` - Already saves/loads flexible layer structure ✅
- `src/app.js` - Updated scene initialization for flexible layer support ✅

**Key Changes Completed:**
- ✅ Verified all tools work with dynamic layer IDs (no hardcoded references found)
- ✅ All commands already use `scene.getActiveLayer()` and dynamic layer arrays
- ✅ Export functions already handle variable layer counts
- ✅ Updated scene initialization to work with any layer configuration
- ✅ Created flexible test pattern generation for any number of layers
- ✅ Added 28 comprehensive integration tests (939 total tests passing)

### Phase 2: Startup Dialog (3-4 hours)

#### Step 2.1: Dialog UI Component
**Files to Create:**
- `src/ui/StartupDialog.js` - Main dialog component
- `src/ui/TemplateCard.js` - Individual template selection card
- `styles/startup-dialog.css` - Dialog styling

**Features:**
- Modal overlay with backdrop
- Template cards with icons and descriptions
- Dimension inputs with validation
- Palette selector dropdown
- Quick start vs custom options

#### Step 2.2: Integration and State Management
**Files to Modify:**
- `src/app.js` - Show dialog on startup, handle template selection
- `src/core/StateManager.js` - Add template-related events

**Key Changes:**
- Add `showStartupDialog()` function
- Handle template selection and scene creation
- Add "New Project" menu item for dialog recall
- Store last used template in localStorage

### Phase 3: Dynamic Layer Management UI (2-3 hours)

#### Step 3.1: Enhanced Layer Panel
**Files to Modify:**
- `src/ui/LayerPanel.js` - Add layer management controls
- `styles/ui.css` - Enhanced layer panel styling

**New Features:**
- "Add Layer" button with template options
- "Remove Layer" button with confirmation
- Layer reorder handles (drag/drop or up/down buttons)
- Template conversion options

#### Step 3.2: Layer Management Commands
**Files to Create:**
- `src/commands/AddLayerCommand.js` - Undoable layer addition
- `src/commands/RemoveLayerCommand.js` - Undoable layer removal
- `src/commands/ReorderLayersCommand.js` - Undoable layer reordering

### Phase 4: Testing and Polish (3-4 hours)

#### Step 4.1: Test Suite Updates
**Strategy:**
- Update existing tests to work with dynamic layers
- Add comprehensive template system tests
- Test layer management operations
- Test startup dialog functionality

**Files to Update:**
- All test files that reference hardcoded layer IDs
- Add `tests/ProjectTemplate.test.js`
- Add `tests/startup-dialog.test.js`
- Add `tests/dynamic-layers.test.js`

#### Step 4.2: Integration Testing
- Test all templates with various operations
- Test layer add/remove with undo/redo
- Test export/save with different layer counts
- Performance testing with many layers (5-10)

## Technical Implementation Details

### Scene Constructor Changes
```javascript
// OLD
class Scene {
  constructor(w = DEFAULT_WIDTH, h = DEFAULT_HEIGHT, paletteId = DEFAULT_PALETTE_ID) {
    // Always create 3 hardcoded layers
    this.layers = [
      new Layer(LAYER_BG, 'Background', w, h),
      new Layer(LAYER_MID, 'Middle', w, h),
      new Layer(LAYER_FG, 'Foreground', w, h)
    ];
  }
}

// NEW
class Scene {
  constructor(w = DEFAULT_WIDTH, h = DEFAULT_HEIGHT, paletteId = DEFAULT_PALETTE_ID, layers = null) {
    this.layers = layers || [];
  }
  
  static fromTemplate(template, w, h, paletteId) {
    const scene = new Scene(w, h, paletteId);
    template.layers.forEach(layerTemplate => {
      scene.addLayerFromTemplate(layerTemplate, w, h);
    });
    return scene;
  }
}
```

### Dynamic Layer ID Generation
```javascript
// Generate unique layer IDs
let layerIdCounter = 0;
export const generateLayerId = () => `layer_${++layerIdCounter}`;

// Or use semantic IDs based on purpose
export const generateLayerId = (purpose = 'layer') => 
  `${purpose}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
```

### Layer Panel Dynamic Generation
```javascript
// OLD - hardcoded 3 layers
renderLayerPanel() {
  return `
    <div class="layer-item" data-layer="bg">Background</div>
    <div class="layer-item" data-layer="mid">Middle</div>
    <div class="layer-item" data-layer="fg">Foreground</div>
  `;
}

// NEW - dynamic layer list
renderLayerPanel() {
  return this.scene.layers.map(layer => `
    <div class="layer-item" data-layer="${layer.id}">
      <span class="layer-name">${layer.name}</span>
      <button class="remove-layer" data-layer="${layer.id}">×</button>
    </div>
  `).join('');
}
```

## Migration Strategy

### Breaking Changes
- **Save Format**: New JSON structure with flexible layers
- **Layer IDs**: No more hardcoded `bg/mid/fg` references  
- **API Changes**: Scene constructor signature changes

### Transition Plan
1. **Feature Flag**: Implement behind a flag initially
2. **Data Migration**: Convert any existing saves to new format
3. **Default Template**: Set "Advanced" as default for current users
4. **Documentation**: Update all docs with new template system

## Testing Strategy

### Unit Tests
- Template system functionality
- Dynamic layer operations
- Scene creation from templates
- Layer management commands

### Integration Tests  
- Startup dialog workflow
- Template to template conversion
- Tools working with variable layers
- Export/save with different layer counts

### User Experience Tests
- Template selection usability
- Layer management discoverability
- Performance with many layers
- Error handling and edge cases

## Risk Assessment

### High Risk
- **Rendering Performance**: Many layers could slow rendering
- **Complexity Creep**: Feature might become too complex
- **User Confusion**: More options might confuse simple users

### Mitigation Strategies
- **Performance**: Limit max layers, efficient rendering updates
- **Complexity**: Hide advanced features behind progressive disclosure
- **Usability**: Strong defaults, clear template descriptions, good onboarding

### Low Risk
- **Implementation**: Architecture already somewhat flexible
- **Testing**: Existing test suite provides good regression coverage

## Success Criteria

### Functionality
- ✅ All three templates work perfectly
- ✅ Startup dialog is intuitive and fast
- ✅ Layer management is discoverable
- ✅ All existing features work with variable layers
- ✅ Export/save works with any layer count

### Performance  
- ✅ Startup dialog appears within 100ms
- ✅ Template switching is instant
- ✅ Layer add/remove is under 50ms
- ✅ Rendering performance unchanged for 1-3 layers

### User Experience
- ✅ New users can start drawing immediately
- ✅ Template purposes are clear from descriptions
- ✅ Layer management feels natural
- ✅ No feature regression from current functionality

## Timeline Estimate

**Total: 12-17 hours**
- Phase 1 (Core): 4-6 hours
- Phase 2 (Dialog): 3-4 hours  
- Phase 3 (Management): 2-3 hours
- Phase 4 (Testing): 3-4 hours

## Files Summary

### New Files (7)
- `src/core/ProjectTemplate.js`
- `src/core/LayerTemplate.js`
- `src/ui/StartupDialog.js`
- `src/ui/TemplateCard.js`
- `src/commands/AddLayerCommand.js`
- `src/commands/RemoveLayerCommand.js`  
- `src/commands/ReorderLayersCommand.js`
- `styles/startup-dialog.css`

### Modified Files (15+)
- `src/core/constants.js` - Remove hardcoded layer IDs
- `src/core/Scene.js` - Template-based constructor
- `src/app.js` - Dynamic rendering, startup dialog
- `src/rendering/LayerRenderer.js` - Variable layer handling
- `src/ui/LayerPanel.js` - Dynamic layer management
- `src/tools/*.js` - Remove hardcoded layer references
- `src/commands/ClearCommand.js` - Dynamic layer support
- `src/commands/ResizeCommand.js` - Variable layer resize
- `src/export/ClipboardManager.js` - Flexible export
- `src/io/ProjectManager.js` - New save format
- `styles/ui.css` - Enhanced layer panel
- `styles/main.css` - Dialog integration
- All test files - Update for dynamic layers

### Test Files (3+ new, 15+ modified)
- `tests/ProjectTemplate.test.js` - New
- `tests/startup-dialog.test.js` - New  
- `tests/dynamic-layers.test.js` - New
- All existing test files - Update layer references

---

## Progress Update

### ✅ Step 1.1: Template System Foundation COMPLETE
- **Completed:** 2025-01-02
- **Duration:** ~3 hours 
- **Tests Added:** 121 new tests (882 total passing)
- **Status:** All template system core infrastructure ready

**Achievements:**
- Complete project template system with 3 templates (Simple, Standard, Advanced)
- Dynamic layer management with smart defaults
- Full backward compatibility maintained
- Comprehensive test coverage for all new functionality
- Scene creation from templates working perfectly

**Files Created:**
- `src/core/ProjectTemplate.js` (267 lines) - Template system core
- `src/core/LayerTemplate.js` (281 lines) - Layer template utilities
- `tests/ProjectTemplate.test.js` (375 lines) - Template system tests
- `tests/LayerTemplate.test.js` (566 lines) - Layer utilities tests  
- `tests/SceneTemplate.test.js` (447 lines) - Scene integration tests

### ✅ Step 1.2: Dynamic Rendering Infrastructure COMPLETE
- **Completed:** 2025-01-02
- **Duration:** ~2 hours
- **Tests Added:** 29 new tests (911 total passing)
- **Status:** Complete dynamic layer rendering system operational

**Achievements:**
- Dynamic layer container generation based on scene structure
- Complete layer panel rewrite with add/remove/reorder functionality
- Layer template menu for smart layer addition
- Comprehensive event handling for layer structure changes
- Real-time layer visibility and management
- Full integration with existing rendering pipeline

**Files Modified:**
- `src/app.js` (enhanced with dynamic rendering functions)
- `src/ui/LayerPanel.js` (complete rewrite - 280+ lines)
- `index.html` (updated for dynamic containers)
- `styles/ui.css` (enhanced with layer management styles)

**Files Created:**
- `tests/dynamic-rendering.test.js` (491 lines) - Dynamic rendering tests

### ✅ Step 1.3: Update Tools and Systems COMPLETE
- **Completed:** 2025-01-02
- **Duration:** ~1 hour
- **Tests Added:** 28 new integration tests (939 total passing)
- **Status:** All tools and systems verified to work with dynamic layers

**Achievements:**
- Comprehensive audit of all tools and systems revealed excellent existing compatibility
- No hardcoded layer ID references found in tools or core systems
- Updated app.js initialization to support flexible layer configurations
- Created comprehensive integration test suite covering all system interactions
- Verified all commands, export, and project management work with any layer count
- Maintained 100% test pass rate throughout the transition

**Key Findings:**
- Tools were already designed generically (great architecture!)
- Commands already used dynamic layer iteration
- Export system already handled variable layer counts
- Only app.js needed updates for flexible initialization

**Files Modified:**
- `src/app.js` (updated scene initialization for flexibility)

**Files Created:**
- `tests/dynamic-systems-integration.test.js` (588 lines) - Comprehensive integration tests

**Next Steps**: Begin Phase 2 (Startup Dialog) - The core infrastructure is now complete!