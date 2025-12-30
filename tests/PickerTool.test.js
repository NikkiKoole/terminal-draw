/**
 * PickerTool.test.js - Tests for PickerTool
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PickerTool } from '../src/tools/PickerTool.js';
import { Scene } from '../src/core/Scene.js';
import { StateManager } from '../src/core/StateManager.js';
import { Cell } from '../src/core/Cell.js';

describe('PickerTool', () => {
  let scene;
  let stateManager;
  let picker;

  beforeEach(() => {
    scene = new Scene(10, 10);
    stateManager = new StateManager();
    picker = new PickerTool();
  });

  describe('constructor', () => {
    it('should create a picker tool with name "Picker"', () => {
      expect(picker.name).toBe('Picker');
    });
  });

  describe('onCellDown', () => {
    it('should pick cell from active layer', () => {
      const layer = scene.getActiveLayer();
      layer.setCell(3, 4, new Cell('X', 1, 2));

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDown(3, 4, scene, stateManager);

      expect(events.length).toBe(1);
      expect(events[0].x).toBe(3);
      expect(events[0].y).toBe(4);
      expect(events[0].layerId).toBe(scene.activeLayerId);
      expect(events[0].cell.ch).toBe('X');
      expect(events[0].cell.fg).toBe(1);
      expect(events[0].cell.bg).toBe(2);
    });

    it('should emit tool:picked event', () => {
      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDown(5, 6, scene, stateManager);

      expect(events.length).toBe(1);
    });

    it('should pick default cell if cell is empty', () => {
      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDown(2, 2, scene, stateManager);

      expect(events.length).toBe(1);
      expect(events[0].cell.ch).toBe(' ');
      expect(events[0].cell.fg).toBe(7);
      expect(events[0].cell.bg).toBe(-1);
    });

    it('should work on locked layer', () => {
      const layer = scene.getActiveLayer();
      layer.locked = true;
      layer.setCell(1, 1, new Cell('Z', 3, 4));

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDown(1, 1, scene, stateManager);

      // Should still pick from locked layer (picker doesn't modify)
      expect(events.length).toBe(1);
      expect(events[0].cell.ch).toBe('Z');
    });

    it('should work on invisible layer', () => {
      const layer = scene.getActiveLayer();
      layer.visible = false;
      layer.setCell(5, 5, new Cell('H', 2, 3));

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDown(5, 5, scene, stateManager);

      // Should still pick from invisible layer
      expect(events.length).toBe(1);
      expect(events[0].cell.ch).toBe('H');
    });

    it('should handle picking from non-default layer', () => {
      scene.setActiveLayer('bg');
      const bgLayer = scene.getLayer('bg');
      bgLayer.setCell(7, 8, new Cell('B', 5, 6));

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDown(7, 8, scene, stateManager);

      expect(events.length).toBe(1);
      expect(events[0].cell.ch).toBe('B');
      expect(events[0].cell.fg).toBe(5);
      expect(events[0].cell.bg).toBe(6);
      expect(events[0].layerId).toBe('bg');
    });
  });

  describe('onCellDrag', () => {
    it('should pick cell during drag', () => {
      const layer = scene.getActiveLayer();
      layer.setCell(8, 9, new Cell('D', 4, 5));

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDrag(8, 9, scene, stateManager);

      expect(events.length).toBe(1);
      expect(events[0].cell.ch).toBe('D');
    });

    it('should emit tool:picked event on drag', () => {
      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDrag(3, 3, scene, stateManager);

      expect(events.length).toBe(1);
    });

    it('should allow picking multiple cells in sequence', () => {
      const layer = scene.getActiveLayer();
      layer.setCell(0, 0, new Cell('A', 1, 0));
      layer.setCell(1, 0, new Cell('B', 2, 0));
      layer.setCell(2, 0, new Cell('C', 3, 0));

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDown(0, 0, scene, stateManager);
      picker.onCellDrag(1, 0, scene, stateManager);
      picker.onCellDrag(2, 0, scene, stateManager);

      expect(events.length).toBe(3);
      expect(events[0].cell.ch).toBe('A');
      expect(events[1].cell.ch).toBe('B');
      expect(events[2].cell.ch).toBe('C');
    });
  });

  describe('onCellUp', () => {
    it('should not throw when called', () => {
      expect(() => {
        picker.onCellUp(0, 0, scene, stateManager);
      }).not.toThrow();
    });

    it('should accept eventData parameter', () => {
      expect(() => {
        picker.onCellUp(0, 0, scene, stateManager, { button: 0 });
      }).not.toThrow();
    });
  });

  describe('getCursor', () => {
    it('should return copy cursor', () => {
      expect(picker.getCursor()).toBe('copy');
    });
  });

  describe('edge cases', () => {
    it('should handle picking at grid boundaries', () => {
      const layer = scene.getActiveLayer();
      layer.setCell(0, 0, new Cell('X', 1, 2));
      layer.setCell(9, 9, new Cell('Y', 3, 4));

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDown(0, 0, scene, stateManager);
      expect(events[0].cell.ch).toBe('X');

      picker.onCellDown(9, 9, scene, stateManager);
      expect(events[1].cell.ch).toBe('Y');
    });

    it('should handle picking cells with space character', () => {
      const layer = scene.getActiveLayer();
      layer.setCell(5, 5, new Cell(' ', 2, 1));

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDown(5, 5, scene, stateManager);

      expect(events[0].cell.ch).toBe(' ');
      expect(events[0].cell.fg).toBe(2);
      expect(events[0].cell.bg).toBe(1);
    });

    it('should handle picking cells with transparent background', () => {
      const layer = scene.getActiveLayer();
      layer.setCell(3, 3, new Cell('█', 3, -1));

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDown(3, 3, scene, stateManager);

      expect(events[0].cell.bg).toBe(-1);
    });

    it('should handle rapid picking', () => {
      const layer = scene.getActiveLayer();

      // Fill a row with different characters
      for (let i = 0; i < 10; i++) {
        layer.setCell(i, 5, new Cell(String.fromCharCode(65 + i), i % 8, 0));
      }

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      // Pick the entire row
      for (let i = 0; i < 10; i++) {
        picker.onCellDrag(i, 5, scene, stateManager);
      }

      expect(events.length).toBe(10);

      // Verify each picked cell
      for (let i = 0; i < 10; i++) {
        expect(events[i].cell.ch).toBe(String.fromCharCode(65 + i));
        expect(events[i].cell.fg).toBe(i % 8);
      }
    });
  });

  describe('integration', () => {
    it('should work with complete picker workflow', () => {
      const layer = scene.getActiveLayer();
      layer.setCell(2, 2, new Cell('█', 4, 2));

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      // Mouse down
      picker.onCellDown(2, 2, scene, stateManager);

      // Mouse up
      picker.onCellUp(2, 2, scene, stateManager);

      // Verify event was emitted
      expect(events.length).toBe(1);
      expect(events[0].cell.ch).toBe('█');
      expect(events[0].cell.fg).toBe(4);
      expect(events[0].cell.bg).toBe(2);
    });

    it('should work with layer switching', () => {
      // Set cells on different layers
      scene.getLayer('mid').setCell(5, 5, new Cell('M', 1, 0));
      scene.getLayer('bg').setCell(5, 5, new Cell('B', 2, 0));
      scene.getLayer('fg').setCell(5, 5, new Cell('F', 3, 0));

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      // Pick from mid layer (default active)
      scene.setActiveLayer('mid');
      picker.onCellDown(5, 5, scene, stateManager);
      expect(events[0].cell.ch).toBe('M');

      // Pick from bg layer
      scene.setActiveLayer('bg');
      picker.onCellDown(5, 5, scene, stateManager);
      expect(events[1].cell.ch).toBe('B');

      // Pick from fg layer
      scene.setActiveLayer('fg');
      picker.onCellDown(5, 5, scene, stateManager);
      expect(events[2].cell.ch).toBe('F');
    });

    it('should emit event data with all required fields', () => {
      const layer = scene.getActiveLayer();
      layer.setCell(4, 6, new Cell('T', 5, 3));

      const events = [];
      stateManager.on('tool:picked', (data) => events.push(data));

      picker.onCellDown(4, 6, scene, stateManager);

      const event = events[0];
      expect(event).toHaveProperty('x');
      expect(event).toHaveProperty('y');
      expect(event).toHaveProperty('layerId');
      expect(event).toHaveProperty('cell');
      expect(event.cell).toHaveProperty('ch');
      expect(event.cell).toHaveProperty('fg');
      expect(event.cell).toHaveProperty('bg');
    });
  });
});
