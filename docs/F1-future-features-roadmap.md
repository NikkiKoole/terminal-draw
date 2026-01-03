# F1: Future Features Roadmap

**Document Type:** Feature Planning Roadmap
**Created:** January 2025
**Status:** 🎯 **PLANNING**

## Overview

This document outlines potential future development directions for Terminal Draw, organized by priority and complexity. The simplified architecture achieved in M3 provides an excellent foundation for these enhancements.

## Current Status Baseline

**Completed Milestones:**
- ✅ **M1**: Core editor (tools, layers, UI, save/load)
- ✅ **M2**: Advanced editing (undo/redo, grid resize, clear operations)
- ✅ **M3**: Simplified layer architecture (templates, startup dialog, visibility/lock controls)
- ✅ **M4**: Enhanced painting tools (selective painting, smart box-drawing, spray can) - See `M4-enhanced-painting-tools-completion.md`

**Current Capabilities:**
- 3 project templates (Simple/Standard/Advanced with 1/2/3 fixed layers)
- Professional drawing tools with advanced brush capabilities:
  - Variable brush sizes (1x1, 2x2, 3x3, 5x5, 7x7)
  - 6 brush shapes (square, circle, triangle, cross, plus, minus)
  - Paint modes (all/foreground/background/glyph)
  - Smart box-drawing, spray tool, eraser, picker
- Enhanced layer controls (visibility 👁️/➖, lock 🔓/🔒)
- Advanced shape tools (line, rectangle, flood fill)
- Undo/redo system, grid resize, project save/load
- Copy/export as plain text, JSON project format
- 1120 tests passing with clean, maintainable codebase

---

## High Priority Features (M5-M6)

### 🎯 **M5: Selection & Region Operations**

**Goal:** Enable users to select, manipulate, and reposition content efficiently

#### Core Selection System
- **Rectangle Selection Tool**
  - Click-drag selection with visual feedback
  - Marching ants or dashed border outline
  - Selection coordinates display
  - Keyboard shortcuts (S for select mode)

#### Selection Operations
- **Copy/Cut/Paste Selected Region**
  - Standard Ctrl+C, Ctrl+X, Ctrl+V shortcuts
  - Paste positioning with ghost preview
  - Multi-layer selection support
  - Clipboard integration with external apps

- **Move Selected Content**
  - Drag selected regions to new positions
  - Arrow key nudging (pixel-perfect positioning)
  - Undo/redo support for all move operations
  - Collision detection and merge strategies

#### Advanced Selection Features
- **Transform Operations**
  - Flip horizontal/vertical
  - Rotate 90/180/270 degrees (if applicable for ASCII)
  - Mirror operations
- **Selection Modification**
  - Expand/contract selection
  - Select similar characters or colors
  - Invert selection

**Estimated Effort:** 8-12 hours
**Dependencies:** None
**Impact:** High - Major productivity improvement

---

### 🎯 **M6: Advanced Drawing Tools**

**Goal:** Professional shape and line drawing capabilities

#### Line Drawing System
- **Line Tool** ✅ **COMPLETED**
  - ✅ Click-and-drag line creation
  - ✅ Bresenham algorithm for lines at any angle
  - ✅ Smart line mode (single/double box-drawing with corners)
  - ✅ Normal mode (any glyph)
  - ✅ Paint mode support (fg/bg/glyph/all)
  - ✅ Keyboard shortcut [L]
  - ✅ Anchor indicator preview (shows start point)
  - ✅ Full undo/redo support

- **Polyline Tool** *(inspired by Emacs artist mode)*
  - Click to place connected line segments
  - Create complex shapes with multiple points
  - Double-click or Enter to finish polyline
  - Support for different line styles and characters
  - Auto-closing option to create polygons
  - Real-time preview of next segment

- **Bresenham Line Algorithm** ✅ **COMPLETED** (integrated into Line Tool)
  - ✅ Perfect lines at any angle using Bresenham algorithm
  - ✅ Smart mode creates staircase patterns with corners for diagonals
  - Line thickness options using different characters (future)

#### Shape Tools
- **Rectangle Tool** ✅ **COMPLETED**
  - ✅ Hollow rectangle outlines
  - ✅ Filled rectangle support with Fill toggle (Outline/Filled modes)
  - ✅ Smart line mode integration (single/double box-drawing)
  - ✅ Paint mode support (fg/bg/glyph/all)
  - ✅ Keyboard shortcut [R]
  - ✅ Click-drag interaction with anchor indicator preview
  - ✅ Tool options bar shows Fill toggle when rectangle tool is active
  - ✅ Full undo/redo support

- **Circle Tool (Bresenham Circle Algorithm)**
  - Perfect circular outlines using ASCII approximation
  - Filled circles with customizable fill characters
  - Ellipse support with width/height ratio control
  - Character selection for circle styles (○●◯⬤)

- **Flood Fill Tool** ⚠️ **IMPLEMENTED BUT UNTESTED**
  - ✅ Paint-mode-aware flood fill (respects all/fg/bg/glyph modes)
  - ✅ Breadth-first search algorithm (prevents stack overflow)
  - ✅ All mode: Fills cells matching all attributes (ch, fg, bg)
  - ✅ FG mode: Changes all cells with same foreground color
  - ✅ BG mode: Changes all cells with same background color
  - ✅ Glyph mode: Replaces all cells with same character
  - ✅ Keyboard shortcut [F]
  - ✅ Full undo/redo support
  - ✅ Integrated with paint mode and color selection system
  - ⚠️ **Requires browser testing** - implementation complete but not verified in production
  - Pattern fill with custom sequences (future enhancement)

#### Smart Connectivity (Advanced)
- **Variable Brush Sizes** ✅ **COMPLETED**
  - ✅ 1x1, 2x2, 3x3, 5x5, and 7x7 brush sizes
  - ✅ UI controls in tool options bar
  - ✅ Real-time size switching with status feedback

- **Brush Shapes** ✅ **COMPLETED**  
  - ✅ Square brush (fills entire NxN area)
  - ✅ Circle brush (fills cells within circular distance)
  - ✅ Triangle brush (proper triangle shape with wide base at bottom)
  - ✅ Cross brush (X-shaped diagonal lines)
  - ✅ Plus brush (+ shaped horizontal and vertical lines)
  - ✅ Minus brush (horizontal line only)
  - ✅ Shape selection dropdown in tool options bar
  - ✅ Boundary checking and grid edge handling
  - ✅ Proper handling of even vs odd brush sizes

- **Multi-Cell Painting** ✅ **COMPLETED**
  - ✅ Efficient group painting for larger brushes
  - ✅ Single undo/redo command for multi-cell operations
  - ✅ Paint mode support (all/fg/bg/glyph) with large brushes
  - ✅ Layer lock/visibility respect for all brush sizes
  - ✅ Comprehensive test coverage for all shapes and sizes

**Estimated Effort:** ✅ **COMPLETED** *(was 4-6 hours)*
**Dependencies:** ✅ **All dependencies satisfied**
**Impact:** High - Professional brush capabilities delivered *(variable sizes and shapes significantly enhance drawing workflow)*

**Implementation Date:** January 2025  
**Test Coverage:** 62+ comprehensive tests covering all brush sizes and 6 brush shapes with boundary conditions
**Status:** ✅ **PRODUCTION READY** - Full UI integration with complete feature set
**Impact:** High - Professional brush system with 6 distinct shapes enhances artistic capabilities significantly

---

## Medium Priority Features (M7-M8)

### 🎯 **M7: Enhanced Layer & Project Management**

#### Cross-Project Layer Operations
- **Layer Copy/Paste Between Projects**
  - Export layer as template
  - Import layer into compatible projects
  - Cross-template layer migration tools

- **Layer Export/Import**
  - Save individual layers as .layer files
  - Layer marketplace/sharing system
  - Batch layer operations

#### Project Enhancement
- **Recent Projects Menu**
  - Quick access panel with thumbnails
  - Project search and filtering
  - Favorite/starred projects

- **Auto-Save System**
  - Configurable auto-save intervals
  - Recovery from crashes
  - Version history (basic)

- **Project Templates**
  - User-defined custom templates
  - Template sharing and import
  - Template preview system

**Estimated Effort:** 6-10 hours
**Dependencies:** None
**Impact:** Medium - Quality of life improvements

---

### 🎯 **M8: Advanced Export & Formats**

#### Multiple Export Formats
- **SVG Export**
  - Vector format for infinite scalability
  - Font embedding options
  - CSS styling preservation

- **PNG Export**
  - High-quality raster output
  - Custom font rendering
  - Configurable resolution/DPI

- **ANSI Export**
  - Terminal-compatible color codes
  - Escape sequence optimization
  - Platform-specific formats (Windows/Unix)

#### Enhanced Text Export
- **Markdown Export**
  - Code block formatting
  - ASCII art preservation
  - Documentation integration

- **HTML Export**
  - Standalone web pages
  - Interactive features
  - Responsive design options

**Estimated Effort:** 8-12 hours
**Dependencies:** None
**Impact:** Medium - Professional output options

---

## Advanced Features (M9+)

### 🎯 **M9: Performance & Large Projects**

#### Optimization & Scalability
- **Large Grid Support**
  - Configurable maximum sizes (up to 200x100+)
  - Memory usage optimization
  - Progressive rendering for huge grids

- **Performance Monitoring**
  - Render time tracking
  - Memory usage display
  - Performance warnings and suggestions

#### Advanced Rendering
- **Row-Run Rendering Mode**
  - Optimize text rendering for large content
  - Ligature support per layer
  - Custom font loading system

**Estimated Effort:** 12-15 hours
**Dependencies:** Profiling and performance analysis
**Impact:** Medium - Enables complex projects

---

### 🎯 **M10: User Experience & Accessibility**

#### Keyboard & Accessibility
- **Comprehensive Keyboard Shortcuts**
  - Discoverable hotkey panel
  - Customizable key bindings
  - Accessibility compliance (WCAG)

- **Touch/Mobile Support**
  - Responsive design for tablets
  - Touch-friendly controls
  - Mobile-specific tools

#### UI/UX Enhancements
- **Dark/Light Theme Support**
  - Multiple color schemes
  - User preference persistence
  - High contrast options

- **Customizable Workspace**
  - Resizable panels
  - Dockable/floating windows
  - Workspace presets

**Estimated Effort:** 10-15 hours
**Dependencies:** UI framework considerations
**Impact:** Medium - Broader audience appeal

---

## Future Vision Features (Phase 2)

### 🌟 **Animation & Interactive Content**

Based on original design document Phase 2 plans:

#### Animation System
- **Frame-Based Animation**
  - Timeline editor
  - Keyframe support
  - Onion skinning

- **Behavior Scripts**
  - Per-cell or per-region scripts
  - Simple animation loops
  - Interactive triggers

#### Export & Sharing
- **GIF Export**
  - Animated GIF generation
  - Frame rate control
  - Optimization options

- **Interactive Exports**
  - HTML5 interactive art
  - Game integration formats
  - API for external applications

**Estimated Effort:** 20-30 hours
**Dependencies:** Major architecture expansion
**Impact:** High - Unique differentiator

---

### 🌟 **Collaboration & Cloud Features**

#### Multi-User Editing
- **Real-Time Collaboration**
  - Google Docs-style collaborative editing
  - User presence indicators
  - Conflict resolution

#### Cloud Integration
- **Cloud Storage**
  - Cross-device synchronization
  - Backup and versioning
  - Sharing and permissions

**Estimated Effort:** 25-40 hours
**Dependencies:** Backend infrastructure
**Impact:** High - Enterprise/team features

---

## Implementation Strategy

### Prioritization Criteria
1. **User Impact** - Features that significantly improve productivity
2. **Development Effort** - Complexity vs benefit analysis
3. **Architecture Fit** - How well features align with current simplified design
4. **Market Demand** - User-requested features and competitive analysis

### Recommended Development Order
1. ✅ **M4: Enhanced Painting Tools** - **COMPLETED** - See `M4-enhanced-painting-tools-completion.md`
2. **M5: Selection System** - Highest impact for productivity
3. **M6: Advanced Drawing Tools** - Natural progression for professional use
4. **M7: Enhanced Project Management** - Quality of life improvements
5. **M8: Export Formats** - Professional output requirements
6. **M9+: Performance & Advanced Features** - Scaling and specialization

### Development Approach
- **Incremental Implementation** - Build features in small, testable chunks
- **Test-Driven Development** - Maintain high test coverage (currently 911 tests)
- **User Feedback Integration** - Validate features with real users before full implementation
- **Backward Compatibility** - Preserve existing functionality and project formats

---

## Notes & Considerations

### Technical Debt
- Current simplified architecture provides excellent foundation
- Event system could benefit from centralization
- Consider performance implications for new features

### User Experience Philosophy
- Maintain simplicity and discoverability
- Progressive disclosure of advanced features
- Keyboard-first design with mouse alternatives

### Future Architecture Decisions
- Plugin system for extensibility
- API design for third-party integrations
- Cloud/offline hybrid approach

---

**Last Updated:** January 2025
**Next Review:** After M5 completion
**Maintainer:** Development Team

*This roadmap is a living document and will evolve based on user feedback, technical discoveries, and changing priorities.*
