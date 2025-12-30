/**
 * Tool.test.js - Tests for base Tool class
 */

import { describe, it, expect } from 'vitest';
import { Tool } from '../src/tools/Tool.js';

describe('Tool', () => {
  describe('constructor', () => {
    it('should create a tool with default name', () => {
      const tool = new Tool();
      expect(tool.name).toBe('Tool');
    });

    it('should create a tool with custom name', () => {
      const tool = new Tool('CustomTool');
      expect(tool.name).toBe('CustomTool');
    });
  });

  describe('onCellDown', () => {
    it('should exist as a method', () => {
      const tool = new Tool();
      expect(typeof tool.onCellDown).toBe('function');
    });

    it('should not throw when called', () => {
      const tool = new Tool();
      expect(() => {
        tool.onCellDown(0, 0, null, null);
      }).not.toThrow();
    });

    it('should accept eventData parameter', () => {
      const tool = new Tool();
      expect(() => {
        tool.onCellDown(0, 0, null, null, { button: 0 });
      }).not.toThrow();
    });
  });

  describe('onCellDrag', () => {
    it('should exist as a method', () => {
      const tool = new Tool();
      expect(typeof tool.onCellDrag).toBe('function');
    });

    it('should not throw when called', () => {
      const tool = new Tool();
      expect(() => {
        tool.onCellDrag(0, 0, null, null);
      }).not.toThrow();
    });

    it('should accept eventData parameter', () => {
      const tool = new Tool();
      expect(() => {
        tool.onCellDrag(0, 0, null, null, { button: 0 });
      }).not.toThrow();
    });
  });

  describe('onCellUp', () => {
    it('should exist as a method', () => {
      const tool = new Tool();
      expect(typeof tool.onCellUp).toBe('function');
    });

    it('should not throw when called', () => {
      const tool = new Tool();
      expect(() => {
        tool.onCellUp(0, 0, null, null);
      }).not.toThrow();
    });

    it('should accept eventData parameter', () => {
      const tool = new Tool();
      expect(() => {
        tool.onCellUp(0, 0, null, null, { button: 0 });
      }).not.toThrow();
    });
  });

  describe('getCursor', () => {
    it('should return default cursor', () => {
      const tool = new Tool();
      expect(tool.getCursor()).toBe('default');
    });
  });
});
