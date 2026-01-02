# Paint Mode Eraser Feature

**Feature Type:** Enhancement  
**Implemented:** January 2025  
**Status:** ✅ **COMPLETED**

## Overview

The eraser tool now respects the paint mode setting, allowing selective erasing of cell attributes. This provides much greater flexibility when editing ASCII art, enabling users to erase only specific attributes while preserving others.

## Paint Modes

The eraser supports four paint modes, matching the brush tool's modes:

### 1. **All Mode** (Default) 🎨
- Erases everything: character, foreground color, and background color
- Resets cell to default state: space character (` `), white foreground (7), transparent background (-1)
- **Traditional eraser behavior**

### 2. **Glyph/Character Mode** (G)
- Erases only the character, replacing it with a space (` `)
- Preserves both foreground and background colors
- **Use case:** Remove text/shapes while keeping the color scheme intact

### 3. **Foreground Mode** (F)
- Erases only the foreground color, resetting to white (7)
- Preserves the character and background color
- **Use case:** Reset text color while keeping the characters and background

### 4. **Background Mode** (B)
- Erases only the background color, resetting to transparent (-1)
- Preserves the character and foreground color
- **Use case:** Remove highlights or background fills while keeping content

## Usage

### Toggling Paint Mode

1. Click the paint mode toggle button in the toolbar
2. The button cycles through modes: **All → FG → BG → Glyph → All**
3. The button label updates to show current mode:
   - `🎨 All` - Erase all attributes
   - `F FG` - Erase foreground only
   - `B BG` - Erase background only
   - `G Char` - Erase character only

### Status Bar Feedback

When the paint mode changes, the status bar displays:
- "Paint Mode: Paint all attributes (glyph + colors)"
- "Paint Mode: Paint foreground color only"
- "Paint Mode: Paint background color only"
- "Paint Mode: Paint glyph character only"

## Examples

### Example 1: Selective Color Removal

**Before:**
```
Cell: { ch: "█", fg: 3 (cyan), bg: 5 (magenta) }
```

**After erasing with different modes:**
- **All mode**: `{ ch: " ", fg: 7, bg: -1 }` - completely cleared
- **Glyph mode**: `{ ch: " ", fg: 3, bg: 5 }` - character removed, colors intact
- **FG mode**: `{ ch: "█", fg: 7, bg: 5 }` - foreground reset, character and bg intact
- **BG mode**: `{ ch: "█", fg: 3, bg: -1 }` - background removed, character and fg intact

### Example 2: Text Editing Workflow

**Scenario:** You have colored text and want to change the text but keep the colors.

1. Set paint mode to **Glyph** (`G Char`)
2. Erase the old text characters
3. The colors remain in place
4. Switch to brush tool and type new text - it will use the existing colors

## Smart Box-Drawing Integration

The eraser's smart box-drawing neighbor updates are paint-mode aware:

- **All mode**: Updates neighbors (traditional behavior)
- **Glyph mode**: Updates neighbors (since the character is being erased)
- **FG mode**: Does NOT update neighbors (only color is changing)
- **BG mode**: Does NOT update neighbors (only color is changing)

### Example: Erasing a Junction

```
Before:                    After (Glyph mode):
  ─┬─                        ─ ─
   │                          │
```

The T-junction (`┬`) is erased, and the vertical line below is updated intelligently.

## Implementation Details

### Code Changes

1. **EraserTool.js**
   - Added `paintMode` property (default: "all")
   - Added `setPaintMode(mode)` method
   - Added `getPaintMode()` method
   - Modified `_eraseCell()` to respect paint mode
   - Conditional neighbor updates based on paint mode

2. **app.js**
   - Updated `initPaintMode()` to sync eraser tool with paint mode changes
   - Added initial paint mode setting for eraser tool

### Test Coverage

**41 total tests** for EraserTool, including 12 new tests for paint mode:

- Default paint mode is "all"
- Setting/getting paint modes
- Invalid mode rejection
- Selective erasing (glyph/fg/bg/all modes)
- Drag erasing with paint modes
- Smart box-drawing neighbor updates respect paint mode
- Neighbor updates only in glyph/all modes, not fg/bg modes

## Technical Notes

### Default Erase Values

- **Character**: space (` `)
- **Foreground**: 7 (white)
- **Background**: -1 (transparent)

### Paint Mode Synchronization

All drawing tools share the same paint mode state:
- Brush Tool
- Eraser Tool
- Rectangle Tool
- Line Tool

Changing the paint mode updates all tools simultaneously, ensuring consistent behavior across the application.

## Future Enhancements

Potential improvements:
- Custom erase values (erase to specific color instead of default)
- Paint mode presets/favorites
- Keyboard shortcuts for quick mode switching
- Visual indicator showing which attributes will be affected

## Related Features

- **Selective Cell Painting** (M4) - Brush tool paint modes
- **Smart Box-Drawing Brushes** (M4) - Intelligent line drawing
- **Smart Box-Drawing Eraser** (M4) - Intelligent neighbor updates
- **Rectangle Tool** (M6) - Paint mode support
- **Line Tool** (M6) - Paint mode support

## Completion Summary

- ✅ Paint mode property added to EraserTool
- ✅ Selective erasing based on paint mode (all/fg/bg/glyph)
- ✅ Smart box-drawing neighbor updates respect paint mode
- ✅ UI synchronization with paint mode toggle
- ✅ Comprehensive test coverage (12 new tests)
- ✅ All 1062 tests passing

**Total Test Count:** 1062 tests passing (up from 1050)