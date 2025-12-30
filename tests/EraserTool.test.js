/**
 * EraserTool.test.js - Tests for EraserTool
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EraserTool } from '../src/tools/EraserTool.js';
import { Scene } from '../src/core/Scene.js';
import { StateManager } from '../src/core/StateManager.js';
import { Cell } from '../src/core/Cell.js';

describe('EraserTool', () => {
  let scene;
  let stateManager;
  let eraser;

  beforeEach(() => {
    scene = new Scene(10, 10);
    stateManager = new StateManager();
    eraser = new EraserTool();
  });

  describe('constructor', () => {
    it('should create an eraser tool with name "Eraser"', () => {
      expect(eraser.name).toBe('Eraser');
    });
  });

  describe('onCellDown', () => {
    it('should erase cell to default state', () => {
      const layer = scene.getActiveLayer();

      // Set a non-default cell
      layer.setCell(3, 4, new Cell('X', 1, 2));

      // Erase it
      eraser.onCellDown(3, 4, scene, stateManager);

      const cell = layer.getCell(3, 4);
      expect(cell.ch).toBe(' ');
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it('should emit cell:changed event', () => {
      const events = [];
      stateManager.on('cell:changed', (data) => events.push(data));

      eraser.onCellDown(5, 6, scene, stateManager);

      expect(events.length).toBe(1);
      expect(events[0].x).toBe(5);
      expect(events[0].y).toBe(6);
      expect(events[0].layerId).toBe(scene.activeLayerId);
      expect(events[0].cell.ch).toBe(' ');
      expect(events[0].cell.fg).toBe(7);
      expect(events[0].cell.bg).toBe(-1);
    });

    it('should not erase on locked layer', () => {
      const layer = scene.getActiveLayer();
      layer.locked = true;

      // Set a cell first
      layer.locked = false;
      layer.setCell(2, 2, new Cell('Z', 3, 4));
      layer.locked = true;

      // Try to erase
      eraser.onCellDown(2, 2, scene, stateManager);

      const cell = layer.getCell(2, 2);
      // Cell should remain unchanged
      expect(cell.ch).toBe('Z');
      expect(cell.fg).toBe(3);
      expect(cell.bg).toBe(4);
    });

    it('should not emit event when layer is locked', () => {
      const events = [];
      stateManager.on('cell:changed', (data) => events.push(data));

      const layer = scene.getActiveLayer();
      layer.locked = true;

      eraser.onCellDown(1, 1, scene, stateManager);

      expect(events.length).toBe(0);
    });

    it('should handle erasing on non-default layer', () => {
      scene.setActiveLayer('bg');
      const bgLayer = scene.getLayer('bg');

      // Set a cell
      bgLayer.setCell(7, 8, new Cell('B', 5, 6));

      // Erase it
      eraser.onCellDown(7, 8, scene, stateManager);

      const cell = bgLayer.getCell(7, 8);
      expect(cell.ch).toBe(' ');
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it('should erase on invisible layer', () => {
      const layer = scene.getActiveLayer();
      layer.visible = false;

      // Set a cell
      layer.setCell(1, 2, new Cell('H', 2, 3));

      // Erase it
      eraser.onCellDown(1, 2, scene, stateManager);

      const cell = layer.getCell(1, 2);
      // Should still erase even if layer is invisible
      expect(cell.ch).toBe(' ');
    });
  });

  describe('onCellDrag', () => {
    it('should erase cell during drag', () => {
      const layer = scene.getActiveLayer();

      // Set a cell
      layer.setCell(8, 9, new Cell('D', 4, 5));

      // Erase via drag
      eraser.onCellDrag(8, 9, scene, stateManager);

      const cell = layer.getCell(8, 9);
      expect(cell.ch).toBe(' ');
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it('should emit cell:changed event on drag', () => {
      const events = [];
      stateManager.on('cell:changed', (data) => events.push(data));

      eraser.onCellDrag(3, 3, scene, stateManager);

      expect(events.length).toBe(1);
    });

    it('should respect locked layer during drag', () => {
      const layer = scene.getActiveLayer();
      layer.locked = false;
      layer.setCell(4, 5, new Cell('L', 1, 2));
      layer.locked = true;

      eraser.onCellDrag(4, 5, scene, stateManager);

      const cell = layer.getCell(4, 5);
      expect(cell.ch).toBe('L');
    });

    it('should allow erasing multiple cells in sequence', () => {
      const layer = scene.getActiveLayer();

      // Set up a row of cells
      layer.setCell(0, 0, new Cell('A', 1, 0));
      layer.setCell(1, 0, new Cell('B', 2, 0));
      layer.setCell(2, 0, new Cell('C', 3, 0));

      // Erase them
      eraser.onCellDown(0, 0, scene, stateManager);
      eraser.onCellDrag(1, 0, scene, stateManager);
      eraser.onCellDrag(2, 0, scene, stateManager);

      expect(layer.getCell(0, 0).ch).toBe(' ');
      expect(layer.getCell(1, 0).ch).toBe(' ');
      expect(layer.getCell(2, 0).ch).toBe(' ');
    });
  });

  describe('onCellUp', () => {
    it('should not throw when called', () => {
      expect(() => {
        eraser.onCellUp(0, 0, scene, stateManager);
      }).not.toThrow();
    });

    it('should accept eventData parameter', () => {
      expect(() => {
        eraser.onCellUp(0, 0, scene, stateManager, { button: 0 });
      }).not.toThrow();
    });
  });

  describe('getCursor', () => {
    it('should return not-allowed cursor', () => {
      expect(eraser.getCursor()).toBe('not-allowed');
    });
  });

  describe('edge cases', () => {
    it('should handle erasing at grid boundaries', () => {
      const layer = scene.getActiveLayer();

      // Set cells at boundaries
      layer.setCell(0, 0, new Cell('X', 1, 2));
      layer.setCell(9, 9, new Cell('Y', 3, 4));

      // Erase them
      eraser.onCellDown(0, 0, scene, stateManager);
      expect(layer.getCell(0, 0).ch).toBe(' ');

      eraser.onCellDown(9, 9, scene, stateManager);
      expect(layer.getCell(9, 9).ch).toBe(' ');
    });

    it('should handle rapid cell erasures', () => {
      const events = [];
      stateManager.on('cell:changed', (data) => events.push(data));

      const layer = scene.getActiveLayer();

      // Fill a row
      for (let i = 0; i < 10; i++) {
        layer.setCell(i, 5, new Cell('R', 1, 0));
      }

      // Erase the row
      for (let i = 0; i < 10; i++) {
        eraser.onCellDrag(i, 5, scene, stateManager);
      }

      expect(events.length).toBe(10);

      // Verify all cells are erased
      for (let i = 0; i < 10; i++) {
        expect(layer.getCell(i, 5).ch).toBe(' ');
      }
    });

    it('should handle erasing already empty cells', () => {
      const events = [];
      stateManager.on('cell:changed', (data) => events.push(data));

      // Erase a cell that's already empty
      eraser.onCellDown(5, 5, scene, stateManager);

      // Should still emit event
      expect(events.length).toBe(1);

      const cell = scene.getActiveLayer().getCell(5, 5);
      expect(cell.ch).toBe(' ');
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });
  });

  describe('integration', () => {
    it('should work with complete erase workflow', () => {
      const events = [];
      stateManager.on('cell:changed', (data) => events.push(data));

      const layer = scene.getActiveLayer();

      // Set up some cells
      layer.setCell(2, 2, new Cell('█', 4, 2));
      layer.setCell(3, 2, new Cell('█', 4, 2));
      layer.setCell(4, 2, new Cell('█', 4, 2));

      // Mouse down
      eraser.onCellDown(2, 2, scene, stateManager);

      // Drag across cells
      eraser.onCellDrag(3, 2, scene, stateManager);
      eraser.onCellDrag(4, 2, scene, stateManager);

      // Mouse up
      eraser.onCellUp(4, 2, scene, stateManager);

      // Verify cells were erased
      expect(layer.getCell(2, 2).ch).toBe(' ');
      expect(layer.getCell(3, 2).ch).toBe(' ');
      expect(layer.getCell(4, 2).ch).toBe(' ');

      // Verify events
      expect(events.length).toBe(3);
    });

    it('should work with layer switching', () => {
      // Set cells on multiple layers
      scene.setActiveLayer('mid');
      scene.getLayer('mid').setCell(5, 5, new Cell('M', 1, 0));

      scene.setActiveLayer('bg');
      scene.getLayer('bg').setCell(5, 5, new Cell('B', 2, 0));

      // Erase on bg layer
      eraser.onCellDown(5, 5, scene, stateManager);

      // Verify mid layer unchanged, bg layer erased
      expect(scene.getLayer('mid').getCell(5, 5).ch).toBe('M');
      expect(scene.getLayer('bg').getCell(5, 5).ch).toBe(' ');
    });

    it('should handle mixed brush and eraser workflow', () => {
      const layer = scene.getActiveLayer();

      // Paint some cells (simulated)
      layer.setCell(0, 0, new Cell('A', 1, 2));
      layer.setCell(1, 0, new Cell('B', 1, 2));
      layer.setCell(2, 0, new Cell('C', 1, 2));

      // Erase middle cell
      eraser.onCellDown(1, 0, scene, stateManager);

      // Verify
      expect(layer.getCell(0, 0).ch).toBe('A');
      expect(layer.getCell(1, 0).ch).toBe(' ');
      expect(layer.getCell(2, 0).ch).toBe('C');
    });
  });
});
