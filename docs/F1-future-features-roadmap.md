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

**Current Capabilities:**
- 3 project templates (Simple/Standard/Advanced with 1/2/3 fixed layers)
- Professional drawing tools (brush, eraser, picker)
- Enhanced layer controls (visibility 👁️/➖, lock 🔓/🔒)
- Undo/redo system, grid resize, project save/load
- Copy/export as plain text, JSON project format
- 1091 tests passing with clean, maintainable codebase (flood fill tool not yet fully tested)

---

## High Priority Features (M4-M6)

### 🎯 **M4: Enhanced Painting Tools** ✅ **FULLY COMPLETED**

**Goal:** Improve fundamental drawing capabilities with selective and intelligent painting

#### Selective Cell Painting ✅ **COMPLETED**
- **Targeted Attribute Painting** ✅ **COMPLETED**
  - ✅ Paint only foreground color (preserve glyph and background)
  - ✅ Paint only background color (preserve glyph and foreground)  
  - ✅ Paint only glyph character (preserve colors)
  - ✅ Single toggle button that cycles through paint modes (all/fg/bg/glyph)
  - ✅ Status bar updates showing current paint mode



#### Intelligent Brush System
- **Smart Box-Drawing Brushes** ✅ **COMPLETED**
  - ✅ Single line style: ─│┌┐└┘├┤┬┴┼
  - ✅ Double line style: ═║╔╗╚╝╠╣╦╩╬
  - ✅ Context-aware glyph placement based on neighbors
  - ✅ Auto-connects to existing lines with proper junctions
  - ✅ UI dropdown for Normal/Smart Single Line/Smart Double Line modes
  - ✅ Mixed single/double intersections (╫ ╪ ╞ ╡ ╟ ╢ ╤ ╥ ╧ ╨) - fully working with bitwise tileset algorithm

- **Smart Box-Drawing Eraser** ✅ **COMPLETED**
  - ✅ Intelligent neighbor updates when erasing box-drawing characters
  - ✅ Junctions and corners automatically simplify when connections are removed
  - ✅ Simple lines (─ │) remain unchanged when neighbors are erased
  - ✅ Color preservation during neighbor updates
  - ✅ Full undo/redo support for eraser and neighbor updates
  - ✅ Works with both single-line and double-line box-drawing characters
  - ✅ Drag erasing smoothly handles multiple connected junctions
  - ✅ Paint mode support (erase all/fg/bg/glyph selectively)

- **Variety Brushes** ✅ **COMPLETED**
  - ✅ 10 character set presets integrated into Spray Can tool
  - ✅ Artist preset: `. - + * % m #` (progressive density, default)
  - ✅ Blocks preset: `░ ▒ ▓ █`
  - ✅ Dots preset: `· • ○ ●`
  - ✅ Stipple preset: `, . · :`
  - ✅ Heights preset: `▁ ▂ ▃ ▄ ▅ ▆ ▇ █`
  - ✅ Widths preset: `▏ ▎ ▍ ▌ ▋ ▊ ▉`
  - ✅ Stars preset: `· • ✶ ✕`
  - ✅ Triangles preset: `▴ ▵ ► ◄ ▲ ▼`
  - ✅ Crosses preset: `· ÷ + ✕ × X ╳`
  - ✅ Waves preset: `~ ∼ ≈ ≋`
  - ✅ Configurable spray radius: Small (2), Medium (3), Large (5)
  - ✅ Configurable spray density: Light (2.5%), Medium (5%), Heavy (50%)
  - ✅ Dedicated tool options bar in header (appears when spray tool active)
  - ✅ Clean UI with contextual controls

- **Spray Can Tool** *(inspired by Emacs artist mode)* ✅ **COMPLETED**
  - ✅ Random character distribution in circular area around cursor
  - ✅ Character progression system with 10 artistic presets
  - ✅ Configurable spray radius: Small (2), Medium (3), Large (5)
  - ✅ Configurable spray density: Light (2.5%), Medium (5%), Heavy (50%)
  - ✅ Perfect for creating organic textures, clouds, stippled effects, waves
  - ✅ Integrated with tool system, undo/redo, and layer management
  - ✅ Keyboard shortcut `[S]` and comprehensive test coverage
  - ✅ Settings shown in dedicated tool options bar (second row in header)
  - ✅ Preset, Size, and Density controls all in one convenient location

**Estimated Effort:** ~~6-8 hours~~ ✅ **COMPLETED**  
**Dependencies:** None  
**Impact:** High - Fundamental improvement to core drawing experience  
**Status:** ✅ **M4 FULLY COMPLETED - All painting tools and variety brushes implemented**

**Completion Notes:** 
- **Spray Can Tool**: Implemented January 2025 with density progression system, random spray patterns, and full integration with existing tool architecture. 30 tests passing.
- **Selective Cell Painting**: Implemented January 2025 with paint mode cycling (all/fg/bg/glyph), single toggle button UI, and complete undo/redo support. 9 new tests, 975 total tests passing.
- **Rectangle Tool (M6)**: Implemented January 2025 with smart box-drawing support (normal/single/double line modes), paint mode integration, and anchor indicator preview (shows start point). 21 new tests, 996 total tests passing.
- **Line Tool (M6)**: Implemented January 2025 with Bresenham algorithm, smart box-drawing for corners/edges, paint mode integration, and anchor indicator preview. 26 new tests, 1022 total tests passing.
- **Smart Box-Drawing Eraser**: Implemented January 2025 with intelligent neighbor updates when erasing junctions/corners. Automatically simplifies box-drawing characters when connections are removed while preserving isolated lines. 9 new tests, 1031 total tests passing.
- **Paint Mode Eraser**: Implemented January 2025 with selective erasing support (all/fg/bg/glyph modes). Eraser now respects paint mode toggle for flexible attribute removal. Smart box-drawing neighbor updates only trigger in glyph/all modes. 12 new tests, 1062 total tests passing.
- **Variety Brushes via Spray Can**: Implemented January 2025 with 10 character set presets (Artist, Blocks, Dots, Stipple, Heights, Widths, Stars, Triangles, Crosses, Waves), configurable radius (Small/Medium/Large), and density control (Light/Medium/Heavy). Dedicated tool options bar in header shows contextual settings. Renamed "Density" preset to "Artist" to avoid confusion with density control. 19 new tests, 1084 total tests passing.
- **Filled Rectangle Support**: Implemented January 2025 with Fill toggle in tool options bar (Outline/Filled modes). Filled mode fills entire rectangle area with current glyph, works with all paint modes and smart box-drawing modes. Settings shown when rectangle tool is active. 6 new tests, 1091 total tests passing.
- **Flood Fill Tool**: Implemented January 2025 with paint-mode-aware filling using breadth-first search algorithm. Respects paint mode (all/fg/bg/glyph) for flexible filling behavior. All mode fills cells matching all attributes, fg/bg modes fill by color, glyph mode replaces characters. Keyboard shortcut [F]. Full undo/redo support. ⚠️ **NOT FULLY TESTED** - implementation complete but requires browser testing to verify all edge cases and interactions. No automated tests added yet.

**Smart Box-Drawing Completion Notes:** Implemented January 2025 with intelligent neighbor detection, automatic junction creation, and comprehensive test coverage (26 tests passing). Features dropdown UI integration and works with existing brush tool. **Mixed single/double intersections completed with correct character mappings** using elegant bitwise tileset algorithm - all 10 mixed junction characters working perfectly (╫ ╪ ╞ ╡ ╟ ╢ ╤ ╥ ╧ ╨). Smart eraser completes the intelligent box-drawing system by handling cleanup automatically.

---

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
- **Advanced Smart Connectivity**
  - Building on M4's smart brushes for complex shapes
  - Multi-line intelligent routing
  - Junction optimization algorithms

- **Box-Drawing Junction Resolution**
  - Automatic corner detection and replacement
  - Toggle on/off per drawing operation
  - Smart character selection (├ ┤ ┬ ┴ ┼)
  - Junction preview before committing

#### Professional Brush System
- **Brush Shapes**
  - Variable brush sizes (1x1, 3x3, 5x5)
  - Custom brush patterns
  - Pressure sensitivity (if supported)

**Estimated Effort:** 12-18 hours  
**Dependencies:** M4 smart painting tools, M5 selection system helpful but not required
**Impact:** High - Professional algorithmic drawing capabilities with classic computer graphics tools

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
1. **M4: Enhanced Painting Tools** - ✅ **Spray Can + Smart Box-Drawing completed** - Continue with Smart Glyph Management
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
**Next Review:** After M4 completion  
**Maintainer:** Development Team

*This roadmap is a living document and will evolve based on user feedback, technical discoveries, and changing priorities.*
