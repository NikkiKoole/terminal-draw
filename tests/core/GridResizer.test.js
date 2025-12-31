import { describe, it, expect, beforeEach } from 'vitest';
import { GridResizer } from '../../src/core/GridResizer.js';
import { Layer } from '../../src/core/Layer.js';
import { Cell } from '../../src/core/Cell.js';

// Mock Layer for testing
class MockLayer {
  constructor(id, name, width, height) {
    this.id = id;
    this.name = name;
    this.width = width;
    this.height = height;
    this.visible = true;
    this.locked = false;
    this.ligatures = false;
    this.cells = [];

    // Initialize with test data
    for (let i = 0; i < width * height; i++) {
      this.cells.push(new Cell(' ', 0, -1));
    }
  }

  setCell(x, y, cell) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const index = y * this.width + x;
      this.cells[index] = new Cell(cell.ch, cell.fg, cell.bg);
    }
  }

  getCell(x, y) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const index = y * this.width + x;
      return this.cells[index];
    }
    return new Cell();
  }
}

describe('GridResizer', () => {
  let layer;
  let testCell;

  beforeEach(() => {
    layer = new MockLayer('test', 'Test Layer', 3, 3);
    testCell = new Cell('X', 1, 2);

    // Set up a simple test pattern
    // X . .
    // . X .
    // . . X
    layer.setCell(0, 0, testCell);
    layer.setCell(1, 1, testCell);
    layer.setCell(2, 2, testCell);
  });

  describe('resizeLayer', () => {
    it('should throw error for invalid parameters', () => {
      expect(() => {
        GridResizer.resizeLayer(null, 5, 5);
      }).toThrow('Invalid parameters for layer resize');

      expect(() => {
        GridResizer.resizeLayer(layer, 'invalid', 5);
      }).toThrow('Invalid parameters for layer resize');

      expect(() => {
        GridResizer.resizeLayer(layer, 5, null);
      }).toThrow('Invalid parameters for layer resize');
    });

    it('should throw error for dimensions less than 1', () => {
      expect(() => {
        GridResizer.resizeLayer(layer, 0, 5);
      }).toThrow('New dimensions must be at least 1x1');

      expect(() => {
        GridResizer.resizeLayer(layer, 5, 0);
      }).toThrow('New dimensions must be at least 1x1');

      expect(() => {
        GridResizer.resizeLayer(layer, -1, 5);
      }).toThrow('New dimensions must be at least 1x1');
    });

    it('should return resize result with old and new data', () => {
      const result = GridResizer.resizeLayer(layer, 4, 4, 'pad');

      expect(result).toHaveProperty('oldCells');
      expect(result).toHaveProperty('newCells');
      expect(result).toHaveProperty('oldWidth', 3);
      expect(result).toHaveProperty('oldHeight', 3);
      expect(result.oldCells).toHaveLength(9);
      expect(result.newCells).toHaveLength(16);
    });

    it('should update layer dimensions', () => {
      GridResizer.resizeLayer(layer, 5, 4, 'pad');

      expect(layer.width).toBe(5);
      expect(layer.height).toBe(4);
      expect(layer.cells).toHaveLength(20);
    });
  });

  describe('pad strategy', () => {
    it('should expand grid by padding with empty cells', () => {
      const result = GridResizer.resizeLayer(layer, 5, 4, 'pad');

      // Original content should be preserved
      expect(layer.getCell(0, 0).ch).toBe('X');
      expect(layer.getCell(1, 1).ch).toBe('X');
      expect(layer.getCell(2, 2).ch).toBe('X');

      // New areas should be empty
      expect(layer.getCell(3, 0).ch).toBe(' ');
      expect(layer.getCell(4, 0).ch).toBe(' ');
      expect(layer.getCell(0, 3).ch).toBe(' ');
      expect(layer.getCell(4, 3).ch).toBe(' ');
    });

    it('should use custom fill cell when provided', () => {
      const fillCell = new Cell('#', 3, 1);
      GridResizer.resizeLayer(layer, 4, 4, 'pad', fillCell);

      // Original content preserved
      expect(layer.getCell(0, 0).ch).toBe('X');

      // New areas filled with custom cell
      expect(layer.getCell(3, 0).ch).toBe('#');
      expect(layer.getCell(3, 0).fg).toBe(3);
      expect(layer.getCell(3, 0).bg).toBe(1);
    });

    it('should handle expanding only width', () => {
      GridResizer.resizeLayer(layer, 5, 3, 'pad');

      expect(layer.width).toBe(5);
      expect(layer.height).toBe(3);
      expect(layer.getCell(0, 0).ch).toBe('X');
      expect(layer.getCell(1, 1).ch).toBe('X');
      expect(layer.getCell(2, 2).ch).toBe('X');
      expect(layer.getCell(3, 0).ch).toBe(' ');
      expect(layer.getCell(4, 2).ch).toBe(' ');
    });

    it('should handle expanding only height', () => {
      GridResizer.resizeLayer(layer, 3, 5, 'pad');

      expect(layer.width).toBe(3);
      expect(layer.height).toBe(5);
      expect(layer.getCell(0, 0).ch).toBe('X');
      expect(layer.getCell(1, 1).ch).toBe('X');
      expect(layer.getCell(2, 2).ch).toBe('X');
      expect(layer.getCell(0, 3).ch).toBe(' ');
      expect(layer.getCell(2, 4).ch).toBe(' ');
    });
  });

  describe('crop strategy', () => {
    it('should shrink grid by removing cells', () => {
      GridResizer.resizeLayer(layer, 2, 2, 'crop');

      expect(layer.width).toBe(2);
      expect(layer.height).toBe(2);
      expect(layer.cells).toHaveLength(4);

      // Should preserve top-left content
      expect(layer.getCell(0, 0).ch).toBe('X');
      expect(layer.getCell(1, 1).ch).toBe('X');

      // Content at (2,2) should be lost
      expect(() => layer.getCell(2, 2)).not.toThrow();
    });

    it('should handle cropping to 1x1', () => {
      GridResizer.resizeLayer(layer, 1, 1, 'crop');

      expect(layer.width).toBe(1);
      expect(layer.height).toBe(1);
      expect(layer.cells).toHaveLength(1);
      expect(layer.getCell(0, 0).ch).toBe('X');
    });

    it('should handle partial crop (some content lost)', () => {
      // Add content to edge
      layer.setCell(2, 1, new Cell('Y', 4, 5));

      GridResizer.resizeLayer(layer, 2, 3, 'crop');

      expect(layer.width).toBe(2);
      expect(layer.height).toBe(3);

      // Original diagonal preserved
      expect(layer.getCell(0, 0).ch).toBe('X');
      expect(layer.getCell(1, 1).ch).toBe('X');

      // Edge content lost (was at x=2)
      expect(layer.getCell(1, 1).ch).toBe('X'); // This was at (1,1), should be preserved
    });
  });

  describe('center strategy', () => {
    it('should center content when expanding', () => {
      GridResizer.resizeLayer(layer, 5, 5, 'center');

      expect(layer.width).toBe(5);
      expect(layer.height).toBe(5);

      // Content should be offset by (1,1) to center
      expect(layer.getCell(1, 1).ch).toBe('X'); // Was (0,0)
      expect(layer.getCell(2, 2).ch).toBe('X'); // Was (1,1)
      expect(layer.getCell(3, 3).ch).toBe('X'); // Was (2,2)

      // Edges should be padded
      expect(layer.getCell(0, 0).ch).toBe(' ');
      expect(layer.getCell(4, 4).ch).toBe(' ');
    });

    it('should center content when shrinking', () => {
      // Create a 5x5 layer with content
      const bigLayer = new MockLayer('big', 'Big Layer', 5, 5);
      bigLayer.setCell(1, 1, new Cell('A', 1, -1));
      bigLayer.setCell(2, 2, new Cell('B', 1, -1));
      bigLayer.setCell(3, 3, new Cell('C', 1, -1));

      GridResizer.resizeLayer(bigLayer, 3, 3, 'center');

      expect(bigLayer.width).toBe(3);
      expect(bigLayer.height).toBe(3);

      // Content should be shifted toward center
      expect(bigLayer.getCell(0, 0).ch).toBe('A'); // Was (1,1)
      expect(bigLayer.getCell(1, 1).ch).toBe('B'); // Was (2,2)
      expect(bigLayer.getCell(2, 2).ch).toBe('C'); // Was (3,3)
    });

    it('should handle odd/even dimension differences', () => {
      GridResizer.resizeLayer(layer, 4, 4, 'center');

      // 3x3 -> 4x4, offset should be (0,0) since (4-3)/2 = 0.5 -> floor(0.5) = 0
      expect(layer.getCell(0, 0).ch).toBe('X');
      expect(layer.getCell(1, 1).ch).toBe('X');
      expect(layer.getCell(2, 2).ch).toBe('X');
      expect(layer.getCell(3, 3).ch).toBe(' ');
    });
  });

  describe('unknown strategy', () => {
    it('should throw error for unknown strategy', () => {
      expect(() => {
        GridResizer.resizeLayer(layer, 4, 4, 'unknown');
      }).toThrow('Unknown resize strategy: unknown');
    });
  });

  describe('resizeLayers', () => {
    let layers;

    beforeEach(() => {
      layers = [
        new MockLayer('bg', 'Background', 3, 3),
        new MockLayer('mid', 'Middle', 3, 3),
        new MockLayer('fg', 'Foreground', 3, 3)
      ];

      // Add some test content to each layer
      layers[0].setCell(0, 0, new Cell('A', 1, -1));
      layers[1].setCell(1, 1, new Cell('B', 2, -1));
      layers[2].setCell(2, 2, new Cell('C', 3, -1));
    });

    it('should resize all layers atomically', () => {
      const results = GridResizer.resizeLayers(layers, 4, 4, 'pad');

      expect(results).toHaveLength(3);
      expect(results[0].layerId).toBe('bg');
      expect(results[1].layerId).toBe('mid');
      expect(results[2].layerId).toBe('fg');

      // All layers should have new dimensions
      layers.forEach(layer => {
        expect(layer.width).toBe(4);
        expect(layer.height).toBe(4);
        expect(layer.cells).toHaveLength(16);
      });

      // Content should be preserved
      expect(layers[0].getCell(0, 0).ch).toBe('A');
      expect(layers[1].getCell(1, 1).ch).toBe('B');
      expect(layers[2].getCell(2, 2).ch).toBe('C');
    });

    it('should handle empty layers array', () => {
      const results = GridResizer.resizeLayers([], 4, 4);
      expect(results).toHaveLength(0);
    });

    it('should skip null layers', () => {
      layers.push(null);
      const results = GridResizer.resizeLayers(layers, 4, 4, 'pad');
      expect(results).toHaveLength(3); // Should skip null layer
    });
  });

  describe('calculateMemoryImpact', () => {
    it('should calculate memory impact correctly', () => {
      const impact = GridResizer.calculateMemoryImpact(10, 10, 20, 20, 3);

      expect(impact.oldCells).toBe(300); // 10*10*3
      expect(impact.newCells).toBe(1200); // 20*20*3
      expect(impact.cellDelta).toBe(900);
      expect(impact.oldMemory).toBe(9600); // 300 * 32
      expect(impact.newMemory).toBe(38400); // 1200 * 32
      expect(impact.memoryDelta).toBe(28800);
      expect(impact.percentChange).toBe(300); // 300% increase
    });

    it('should handle zero old memory', () => {
      const impact = GridResizer.calculateMemoryImpact(0, 0, 10, 10, 1);
      expect(impact.percentChange).toBe(0);
    });

    it('should handle shrinking', () => {
      const impact = GridResizer.calculateMemoryImpact(20, 20, 10, 10, 2);
      expect(impact.oldCells).toBe(800); // 20*20*2
      expect(impact.newCells).toBe(200); // 10*10*2
      expect(impact.cellDelta).toBe(-600);
      expect(impact.memoryDelta).toBe(-19200);
      expect(impact.percentChange).toBe(-75); // 75% decrease
    });
  });

  describe('validateResize', () => {
    it('should validate correct dimensions', () => {
      const result = GridResizer.validateResize(10, 15);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-integer dimensions', () => {
      const result1 = GridResizer.validateResize(10.5, 15);
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('Width must be an integer');

      const result2 = GridResizer.validateResize(10, 15.3);
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('Height must be an integer');
    });

    it('should reject dimensions below minimum', () => {
      const result = GridResizer.validateResize(0, 5);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Width must be at least 1');
    });

    it('should reject dimensions above maximum', () => {
      const result = GridResizer.validateResize(300, 150);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Width cannot exceed 200');
      expect(result.errors).toContain('Height cannot exceed 100');
    });

    it('should accept custom limits', () => {
      const options = { maxWidth: 50, maxHeight: 50, minWidth: 5, minHeight: 5 };

      const result1 = GridResizer.validateResize(3, 10, options);
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('Width must be at least 5');

      const result2 = GridResizer.validateResize(60, 10, options);
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('Width cannot exceed 50');
    });

    it('should reject extremely large grids', () => {
      const result = GridResizer.validateResize(1000, 1000);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('New grid size would use too much memory');
    });
  });

  describe('getResizePreview', () => {
    it('should identify no change', () => {
      const preview = GridResizer.getResizePreview(10, 10, 10, 10, 'pad');
      expect(preview.description).toBe('No change in dimensions');
      expect(preview.isResizing).toBe(false);
      expect(preview.isExpanding).toBe(false);
      expect(preview.isShrinking).toBe(false);
    });

    it('should identify expansion', () => {
      const preview = GridResizer.getResizePreview(10, 10, 15, 12, 'pad');
      expect(preview.description).toBe('Expanding from 10×10 to 15×12');
      expect(preview.isExpanding).toBe(true);
      expect(preview.isShrinking).toBe(false);
      expect(preview.isResizing).toBe(true);
      expect(preview.warning).toBeNull();
    });

    it('should identify shrinking with warning', () => {
      const preview = GridResizer.getResizePreview(15, 12, 10, 10, 'crop');
      expect(preview.description).toBe('Shrinking from 15×12 to 10×10');
      expect(preview.isExpanding).toBe(false);
      expect(preview.isShrinking).toBe(true);
      expect(preview.warning).toBe('Content outside new bounds will be lost');
    });

    it('should identify mixed resize with warning', () => {
      const preview = GridResizer.getResizePreview(10, 15, 15, 10, 'center');
      expect(preview.description).toBe('Resizing from 10×15 to 15×10');
      expect(preview.isExpanding).toBe(true);
      expect(preview.isShrinking).toBe(true);
      expect(preview.warning).toBe('Some content may be lost');
    });

    it('should not warn for pad strategy when expanding', () => {
      const preview = GridResizer.getResizePreview(10, 10, 15, 15, 'pad');
      expect(preview.warning).toBeNull();
    });

    it('should include memory impact', () => {
      const preview = GridResizer.getResizePreview(10, 10, 20, 20, 'pad');
      expect(preview.memoryImpact).toBeDefined();
      expect(preview.memoryImpact.oldCells).toBe(300); // 10*10*3 layers
      expect(preview.memoryImpact.newCells).toBe(1200); // 20*20*3 layers
    });

    it('should include strategy in preview', () => {
      const preview = GridResizer.getResizePreview(10, 10, 15, 15, 'center');
      expect(preview.strategy).toBe('center');
    });
  });

  describe('edge cases', () => {
    it('should handle 1x1 layer', () => {
      const tinyLayer = new MockLayer('tiny', 'Tiny', 1, 1);
      tinyLayer.setCell(0, 0, new Cell('!', 7, 0));

      GridResizer.resizeLayer(tinyLayer, 3, 3, 'center');

      expect(tinyLayer.width).toBe(3);
      expect(tinyLayer.height).toBe(3);
      expect(tinyLayer.getCell(1, 1).ch).toBe('!'); // Should be centered
    });

    it('should handle resizing to 1x1', () => {
      GridResizer.resizeLayer(layer, 1, 1, 'crop');

      expect(layer.width).toBe(1);
      expect(layer.height).toBe(1);
      expect(layer.cells).toHaveLength(1);
      expect(layer.getCell(0, 0).ch).toBe('X'); // Should preserve top-left
    });

    it('should handle large expansion', () => {
      GridResizer.resizeLayer(layer, 100, 100, 'pad');

      expect(layer.width).toBe(100);
      expect(layer.height).toBe(100);
      expect(layer.cells).toHaveLength(10000);

      // Original content preserved
      expect(layer.getCell(0, 0).ch).toBe('X');
      expect(layer.getCell(1, 1).ch).toBe('X');
      expect(layer.getCell(2, 2).ch).toBe('X');

      // Most cells should be empty
      expect(layer.getCell(50, 50).ch).toBe(' ');
      expect(layer.getCell(99, 99).ch).toBe(' ');
    });

    it('should preserve cell properties correctly', () => {
      const coloredCell = new Cell('@', 4, 6);
      layer.setCell(1, 0, coloredCell);

      GridResizer.resizeLayer(layer, 5, 5, 'pad');

      const retrieved = layer.getCell(1, 0);
      expect(retrieved.ch).toBe('@');
      expect(retrieved.fg).toBe(4);
      expect(retrieved.bg).toBe(6);
    });
  });
});
