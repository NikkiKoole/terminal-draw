# Milestone 2 Implementation Plan
**Layer UX + Undo/Redo + Grid Operations**

## Overview
Building on Milestone 1's solid foundation, this milestone adds essential editor features that users expect: undo/redo, grid resizing, and clear operations. We'll implement a command pattern for all undoable actions.

## Step 1: Command System Foundation ✅ COMPLETE (2-3 hours)
**Goal:** Create the command pattern infrastructure for undo/redo

### Deliverables:
- `src/commands/Command.js` - Base command interface
- `src/commands/CommandHistory.js` - Undo/redo stack manager  
- `src/commands/CellCommand.js` - Command for cell modifications
- `tests/` - Comprehensive test coverage

### Command.js Interface:
```javascript
class Command {
  constructor(description) {
    this.description = description;
    this.timestamp = Date.now();
  }
  
  execute() { throw new Error('Must implement execute()'); }
  undo() { throw new Error('Must implement undo()'); }
  canMerge(other) { return false; }
  merge(other) { throw new Error('Cannot merge commands'); }
}
```

### CommandHistory Features:
- Configurable max history size (default: 50)
- Command merging for continuous brush strokes
- Clear history on major operations
- Events: `history:changed`, `history:executed`, `history:undone`

### Success Criteria:
- ✅ Command interface with execute/undo
- ✅ History stack with size limits
- ✅ Command merging for brush strokes
- ✅ StateManager integration
- ✅ 98 tests passing (Command: 25, CommandHistory: 37, CellCommand: 36)

---

## Step 2: Tool Integration with Commands ✅ COMPLETE (2 hours)
**Goal:** Make all existing tools create undoable commands

### Deliverables:
- Update `BrushTool.js` to create `CellCommand`s
- Update `EraserTool.js` to create `CellCommand`s
- Update `PickerTool.js` (no commands needed)
- Add command history to `app.js`

### Changes:
- Tools create commands instead of directly modifying layers
- Brush strokes merge into single command during continuous drag
- Commands execute immediately and get added to history
- Layer modifications emit through StateManager

### Success Criteria:
- ✅ Brush creates undoable commands
- ✅ Eraser creates undoable commands  
- ✅ Continuous brush stroke = single undo step
- ✅ All existing functionality preserved
- ✅ All existing tests passing (579 tests total)

---

## Step 3: Undo/Redo UI & Shortcuts ✅ COMPLETE (1-2 hours)
**Goal:** Add undo/redo buttons and keyboard shortcuts

### Deliverables:
- Undo/Redo buttons in toolbar
- Keyboard shortcuts: `Ctrl+Z` (undo), `Ctrl+Y`/`Ctrl+Shift+Z` (redo)
- Visual feedback (disabled states, tooltips)
- Status bar integration

### UI Changes:
- Add undo/redo buttons next to existing tool buttons
- Show command descriptions in tooltips
- Disable buttons when no commands available
- Status messages: "Undid: Paint 5 cells", "Redid: Erase 3 cells"

### Success Criteria:
- ✅ Undo/redo buttons work correctly
- ✅ Keyboard shortcuts functional
- ✅ Visual feedback appropriate
- ✅ Status messages helpful
- ✅ 20 comprehensive UI tests

### Deliverables Completed:
- ✅ Undo/Redo buttons in toolbar with proper disabled states
- ✅ Keyboard shortcuts: `Ctrl+Z` (undo), `Ctrl+Y`/`Ctrl+Shift+Z` (redo)
- ✅ Dynamic tooltips showing command descriptions
- ✅ Status bar integration with action feedback
- ✅ CSS styling for disabled buttons and toolbar separator
- ✅ Event-driven button state updates through StateManager
- ✅ Cross-platform key combination support (Ctrl/Cmd)
- ✅ Comprehensive test suite (20 tests) covering all UI scenarios

---

## Step 4: Grid Resize Infrastructure ⏳ (2-3 hours)  
**Goal:** Core grid resizing logic with content preservation options

### Deliverables:
- `src/core/GridResizer.js` - Resize logic utility
- `src/commands/ResizeCommand.js` - Undoable grid resize
- Support for pad/crop strategies
- Scene dimension updates

### GridResizer Features:
- `resizeLayer(layer, newW, newH, strategy, fillCell)`
- Strategies: `'pad'` (add empty cells), `'crop'` (truncate), `'center'` (pad/crop centered)
- Preserve existing content where possible
- Handle all three layers atomically

### ResizeCommand:
- Stores old/new dimensions and all layer data
- Large but necessary for proper undo
- Triggers full re-render on execute/undo

### Success Criteria:
- ✅ Resize layer content correctly
- ✅ Multiple resize strategies work
- ✅ Undoable resize operations
- ✅ Scene updates properly
- ✅ ~30 tests covering edge cases

---

## Step 5: Grid Resize UI ⏳ (1-2 hours)  
**Goal:** User interface for resizing the grid

### Deliverables:
- Grid size dialog/modal
- Input validation (min 1x1, max reasonable size)
- Strategy selection (pad/crop/center)
- Preview of size change impact

### UI Features:
- "Resize Grid" button in I/O panel
- Modal with current size display
- Width/height number inputs with validation
- Strategy radio buttons with descriptions
- "Apply" button creates ResizeCommand

### Input Validation:
- Min: 1×1, Max: 200×100 (reasonable limits)
- Show warnings for large sizes
- Calculate memory impact estimate

### Success Criteria:
- ✅ Resize dialog functional
- ✅ Input validation works
- ✅ All resize strategies available
- ✅ Integrates with undo system
- ✅ ~15 tests for UI logic

---

## Step 6: Clear Operations ⏳ (1 hour)
**Goal:** Clear grid and clear layer operations

### Deliverables:
- `src/commands/ClearCommand.js` - Undoable clear operations
- Clear entire grid button
- Clear active layer button  
- Confirmation dialogs for destructive actions

### Clear Operations:
- **Clear Grid**: Reset all layers to empty cells
- **Clear Layer**: Reset only active layer to empty cells
- Both operations are undoable
- Confirmation dialog: "This will clear X cells. Continue?"

### UI Integration:
- Add "Clear Grid" and "Clear Layer" to I/O panel
- Confirmation modals with cell count
- Status feedback: "Cleared 47 cells from layer 'mid'"

### Success Criteria:
- ✅ Clear grid removes all content
- ✅ Clear layer affects only active layer
- ✅ Operations are undoable
- ✅ Confirmation dialogs prevent accidents
- ✅ ~20 tests for clear operations

---

## Step 7: Integration & Polish ⏳ (1-2 hours)
**Goal:** Ensure all new features work together seamlessly

### Deliverables:
- Update all UI components for new features
- Performance testing with large undo stacks
- Memory usage validation
- Documentation updates

### Integration Testing:
- Undo/redo after grid resize
- Clear operations with proper history
- Large grid performance (100×50)
- Memory usage with 50+ commands in history

### Polish Items:
- Command descriptions for better UX
- Keyboard shortcut help
- Loading states for large operations
- Error handling and recovery

### Success Criteria:
- ✅ All features work together
- ✅ Performance acceptable on large grids
- ✅ Memory usage reasonable
- ✅ Error handling robust
- ✅ ~20 integration tests

---

## Milestone 2 Success Criteria

### Core Functionality:
- ✅ Undo/redo works for all drawing operations
- ✅ Grid can be resized with content preservation
- ✅ Clear operations are available and undoable
- ✅ All operations integrate with existing layer system

### User Experience:
- ✅ Keyboard shortcuts work (Ctrl+Z, Ctrl+Y)
- ✅ Visual feedback for available actions
- ✅ Confirmation dialogs prevent data loss
- ✅ Status messages provide clear feedback

### Technical Quality:
- ✅ Command pattern properly implemented
- ✅ Memory usage reasonable (< 50MB typical)
- ✅ Performance good on grids up to 200×100
- ✅ ~150 new tests passing (total: ~630)

## Estimated Timeline: 10-15 hours
- Step 1: 2-3 hours (Command foundation)
- Step 2: 2 hours (Tool integration) 
- Step 3: 1-2 hours (UI & shortcuts)
- Step 4: 2-3 hours (Resize infrastructure)
- Step 5: 1-2 hours (Resize UI)
- Step 6: 1 hour (Clear operations)
- Step 7: 1-2 hours (Integration & polish)

## Files to Create:
```
src/commands/
├── Command.js
├── CommandHistory.js  
├── CellCommand.js
├── ResizeCommand.js
└── ClearCommand.js

src/core/
└── GridResizer.js

tests/commands/
├── Command.test.js
├── CommandHistory.test.js
├── CellCommand.test.js  
├── ResizeCommand.test.js
└── ClearCommand.test.js

tests/core/
└── GridResizer.test.js
```

## Development Notes

### Started: 2025-01-02
### Status: Step 2 Complete
### Current Step: Step 4 - Grid Resize Infrastructure

This milestone will transform your editor from a basic drawing tool into a full-featured editor that users expect. The undo/redo system especially will make the tool much more confidence-inspiring to use!

### Key Technical Decisions:
1. **Command Pattern**: All user actions become undoable commands
2. **Command Merging**: Continuous brush strokes merge into single undo step  
3. **Memory Management**: Limit undo history to prevent memory issues
4. **Atomic Resize**: All layers resize together to maintain consistency
5. **Confirmation Dialogs**: Prevent accidental data loss on destructive operations

### Architecture Considerations:
- Commands store both before/after state for reliable undo/redo
- Grid resize is memory-intensive but necessary for proper undo
- Clear operations should be fast but still undoable
- StateManager events coordinate all component updates
- Command descriptions provide user-friendly undo/redo feedback

### Step 1 Completion Notes:
**Files Created:**
- `src/commands/Command.js` - Base command interface
- `src/commands/CommandHistory.js` - Undo/redo stack manager with merging
- `src/commands/CellCommand.js` - Command for cell modifications
- `tests/commands/Command.test.js` - 25 tests for base Command class
- `tests/commands/CommandHistory.test.js` - 37 tests for history management
- `tests/commands/CellCommand.test.js` - 36 tests for cell commands

**Key Features Implemented:**
- Complete command pattern infrastructure
- Command merging for continuous brush strokes (within 2-second window)
- Configurable history size limits (default: 50 commands)
- Event emission through StateManager integration
- Memory usage estimation and debug information
- Static factory methods for single/multiple cell commands
- Comprehensive error handling and validation

**Test Coverage:** 98 tests passing with edge cases covered including:
- Command inheritance and polymorphism
- History size enforcement and memory management
- Command merging with time windows and compatibility checks
- Event emission and StateManager integration
- Error handling for failed execute/undo operations

### Step 3 Completion Notes:
**Files Modified/Created:**
- `terminal-draw/index.html` - Added undo/redo buttons to toolbar
- `terminal-draw/styles/main.css` - Added disabled button states and toolbar separator
- `terminal-draw/src/app.js` - Added keyboard shortcuts, button handlers, and status updates
- `terminal-draw/src/commands/CommandHistory.js` - Added helper methods for UI integration
- `terminal-draw/tests/undo-redo-ui.test.js` - Comprehensive test suite for UI functionality

**Key Features Implemented:**
- Undo/Redo buttons with dynamic tooltips and disabled states
- Keyboard shortcuts: `Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z` with cross-platform support
- Status bar integration showing command execution feedback
- Event-driven UI updates through StateManager integration
- Comprehensive error handling and edge case management
- Full accessibility support with proper button states and descriptions

**Test Coverage:** 20 comprehensive tests covering:
- Button state management and visual feedback
- Click handlers and keyboard shortcuts
- Status message updates and multiple command scenarios
- Edge cases and command merging integration
- Cross-platform compatibility and error conditions

**Technical Achievements:**
- Seamless integration with existing command system
- Memory-efficient implementation using existing CommandHistory methods
- Robust error handling for missing DOM elements and null states
- Event-driven architecture maintaining loose coupling between components

### Step 2 Completion Notes:
**Files Modified:**
- `src/tools/BrushTool.js` - Updated to create CellCommands instead of direct layer modifications
- `src/tools/EraserTool.js` - Updated to create CellCommands instead of direct layer modifications
- `src/tools/PickerTool.js` - Updated for consistency (no commands needed as it doesn't modify scene)
- `src/commands/CellCommand.js` - Enhanced to emit cell:changed events and handle coordinate conversion
- `src/app.js` - Added CommandHistory initialization and tool integration
- `tests/commands/CellCommand.test.js` - Updated MockLayer to match real Layer signature
- `tests/BrushTool.test.js` - Updated to work with command system
- `tests/EraserTool.test.js` - Updated to work with command system

**Key Features Implemented:**
- All drawing operations now create undoable commands
- Commands automatically execute and get added to history
- Tools respect CommandHistory for undo/redo functionality
- cell:changed events properly emitted from commands
- Coordinate conversion between index and x,y formats
- Full integration with existing StateManager event system
- Command merging works for continuous brush/eraser strokes

**Technical Solutions:**
- Fixed index calculation bug (scene.width → scene.w)
- Added coordinate conversion in CellCommand for proper Layer.setCell calls
- Made CellCommand robust for both test and production environments
- Updated MockLayer in tests to match real Layer interface
- Maintained backward compatibility with existing event system

**Test Coverage:** All 579 tests passing including:
- 98 command system tests (Command, CommandHistory, CellCommand)
- 44 tool integration tests (BrushTool, EraserTool)
- Full integration with existing 437 tests