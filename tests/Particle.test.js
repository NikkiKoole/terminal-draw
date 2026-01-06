import { describe, it, expect } from "bun:test";
import { Particle } from "../src/particles/Particle.js";

describe("Particle", () => {
  describe("constructor", () => {
    it("should create a particle with default values", () => {
      const particle = new Particle({});

      expect(particle.x).toBe(0);
      expect(particle.y).toBe(0);
      expect(particle.vx).toBe(0);
      expect(particle.vy).toBe(0);
      expect(particle.glyph).toBe("*");
      expect(particle.fg).toBe(7);
      expect(particle.bg).toBe(-1);
      expect(particle.age).toBe(0);
      expect(particle.lifespan).toBe(null);
      expect(particle.element).toBe(null);
    });

    it("should create a particle with custom values", () => {
      const particle = new Particle({
        x: 10.5,
        y: 20.3,
        vx: 1,
        vy: 2,
        glyph: "★",
        fg: 4,
        bg: 0,
        lifespan: 1000,
        layerId: "bg",
        emitterId: "test-emitter",
      });

      expect(particle.x).toBe(10.5);
      expect(particle.y).toBe(20.3);
      expect(particle.vx).toBe(1);
      expect(particle.vy).toBe(2);
      expect(particle.glyph).toBe("★");
      expect(particle.fg).toBe(4);
      expect(particle.bg).toBe(0);
      expect(particle.lifespan).toBe(1000);
      expect(particle.layerId).toBe("bg");
      expect(particle.emitterId).toBe("test-emitter");
    });
  });

  describe("update", () => {
    it("should update position based on velocity", () => {
      const particle = new Particle({
        x: 10,
        y: 20,
        vx: 5, // 5 cells per second
        vy: 10, // 10 cells per second
      });

      particle.update(1000); // 1 second

      expect(particle.x).toBe(15);
      expect(particle.y).toBe(30);
    });

    it("should update position for partial time", () => {
      const particle = new Particle({
        x: 0,
        y: 0,
        vx: 10,
        vy: 20,
      });

      particle.update(500); // 0.5 seconds

      expect(particle.x).toBe(5);
      expect(particle.y).toBe(10);
    });

    it("should accumulate age", () => {
      const particle = new Particle({});

      particle.update(100);
      expect(particle.age).toBe(100);

      particle.update(150);
      expect(particle.age).toBe(250);

      particle.update(50);
      expect(particle.age).toBe(300);
    });

    it("should handle negative velocity", () => {
      const particle = new Particle({
        x: 50,
        y: 50,
        vx: -5,
        vy: -10,
      });

      particle.update(1000);

      expect(particle.x).toBe(45);
      expect(particle.y).toBe(40);
    });
  });

  describe("shouldDespawn", () => {
    it("should despawn when lifespan exceeded", () => {
      const particle = new Particle({
        x: 10,
        y: 10,
        lifespan: 1000,
      });

      particle.age = 500;
      expect(particle.shouldDespawn(80, 25)).toBe(false);

      particle.age = 1000;
      expect(particle.shouldDespawn(80, 25)).toBe(true);

      particle.age = 1500;
      expect(particle.shouldDespawn(80, 25)).toBe(true);
    });

    it("should not despawn with null lifespan until out of bounds", () => {
      const particle = new Particle({
        x: 40,
        y: 12,
        lifespan: null,
      });

      particle.age = 10000;
      expect(particle.shouldDespawn(80, 25)).toBe(false);
    });

    it("should despawn when leaving left edge", () => {
      const particle = new Particle({ x: -3, y: 10 });
      expect(particle.shouldDespawn(80, 25)).toBe(true);
    });

    it("should despawn when leaving right edge", () => {
      const particle = new Particle({ x: 82, y: 10 });
      expect(particle.shouldDespawn(80, 25)).toBe(true);
    });

    it("should despawn when leaving top edge", () => {
      const particle = new Particle({ x: 40, y: -3 });
      expect(particle.shouldDespawn(80, 25)).toBe(true);
    });

    it("should despawn when leaving bottom edge", () => {
      const particle = new Particle({ x: 40, y: 27 });
      expect(particle.shouldDespawn(80, 25)).toBe(true);
    });

    it("should allow particles slightly outside bounds (margin)", () => {
      // Particles can be up to 2 cells outside before despawning
      const particle = new Particle({ x: -1, y: 10 });
      expect(particle.shouldDespawn(80, 25)).toBe(false);

      const particle2 = new Particle({ x: 80, y: 10 });
      expect(particle2.shouldDespawn(80, 25)).toBe(false);
    });
  });

  describe("getGridPosition", () => {
    it("should return floored integer position", () => {
      const particle = new Particle({ x: 10.7, y: 20.3 });
      const pos = particle.getGridPosition();

      expect(pos.x).toBe(10);
      expect(pos.y).toBe(20);
    });

    it("should handle negative positions", () => {
      const particle = new Particle({ x: -0.5, y: -1.2 });
      const pos = particle.getGridPosition();

      expect(pos.x).toBe(-1);
      expect(pos.y).toBe(-2);
    });

    it("should handle exact integer positions", () => {
      const particle = new Particle({ x: 5, y: 10 });
      const pos = particle.getGridPosition();

      expect(pos.x).toBe(5);
      expect(pos.y).toBe(10);
    });
  });

  describe("isVisible", () => {
    it("should return true for particles within bounds", () => {
      const particle = new Particle({ x: 40, y: 12 });
      expect(particle.isVisible(80, 25)).toBe(true);
    });

    it("should return false for particles outside left edge", () => {
      const particle = new Particle({ x: -1, y: 12 });
      expect(particle.isVisible(80, 25)).toBe(false);
    });

    it("should return false for particles outside right edge", () => {
      const particle = new Particle({ x: 80, y: 12 });
      expect(particle.isVisible(80, 25)).toBe(false);
    });

    it("should return false for particles outside top edge", () => {
      const particle = new Particle({ x: 40, y: -1 });
      expect(particle.isVisible(80, 25)).toBe(false);
    });

    it("should return false for particles outside bottom edge", () => {
      const particle = new Particle({ x: 40, y: 25 });
      expect(particle.isVisible(80, 25)).toBe(false);
    });

    it("should return true for particles at boundary", () => {
      const particle1 = new Particle({ x: 0, y: 0 });
      expect(particle1.isVisible(80, 25)).toBe(true);

      const particle2 = new Particle({ x: 79, y: 24 });
      expect(particle2.isVisible(80, 25)).toBe(true);
    });
  });

  describe("gravity", () => {
    it("should apply positive gravity (downward acceleration)", () => {
      const particle = new Particle({
        x: 10,
        y: 10,
        vx: 0,
        vy: 0,
        gravity: 10, // 10 cells/s²
      });

      particle.update(1000); // 1 second

      expect(particle.vy).toBe(10); // velocity increased by gravity
      expect(particle.y).toBe(20); // position changed by velocity
    });

    it("should apply negative gravity (upward acceleration)", () => {
      const particle = new Particle({
        x: 10,
        y: 10,
        vx: 0,
        vy: 0,
        gravity: -5,
      });

      particle.update(1000);

      expect(particle.vy).toBe(-5);
      expect(particle.y).toBe(5);
    });

    it("should accumulate gravity over multiple updates", () => {
      const particle = new Particle({
        x: 0,
        y: 0,
        vy: 0,
        gravity: 10,
      });

      particle.update(500); // 0.5 seconds
      expect(particle.vy).toBe(5);

      particle.update(500); // another 0.5 seconds
      expect(particle.vy).toBe(10);
    });

    it("should combine gravity with initial velocity", () => {
      const particle = new Particle({
        x: 0,
        y: 50,
        vy: -20, // shooting upward
        gravity: 10, // pulled down
      });

      particle.update(1000);

      expect(particle.vy).toBe(-10); // -20 + 10
      expect(particle.y).toBe(40); // 50 + (-10)
    });

    it("should not apply gravity when gravity is 0", () => {
      const particle = new Particle({
        vy: 5,
        gravity: 0,
      });

      particle.update(1000);

      expect(particle.vy).toBe(5); // unchanged
    });
  });

  describe("cycling", () => {
    it("should return base glyph when no cycle defined", () => {
      const particle = new Particle({ glyph: "★" });
      expect(particle.getCurrentGlyph()).toBe("★");
    });

    it("should cycle through glyphs based on age", () => {
      const particle = new Particle({
        glyph: "*",
        glyphCycle: ["a", "b", "c"],
        cycleDuration: 100,
      });

      particle.age = 0;
      expect(particle.getCurrentGlyph()).toBe("a");

      particle.age = 100;
      expect(particle.getCurrentGlyph()).toBe("b");

      particle.age = 200;
      expect(particle.getCurrentGlyph()).toBe("c");

      particle.age = 300; // wraps back
      expect(particle.getCurrentGlyph()).toBe("a");
    });

    it("should return base fg when no cycle defined", () => {
      const particle = new Particle({ fg: 4 });
      expect(particle.getCurrentFg()).toBe(4);
    });

    it("should cycle through fg colors based on age", () => {
      const particle = new Particle({
        fg: 7,
        fgCycle: [1, 3, 5],
        cycleDuration: 200,
      });

      particle.age = 0;
      expect(particle.getCurrentFg()).toBe(1);

      particle.age = 200;
      expect(particle.getCurrentFg()).toBe(3);

      particle.age = 400;
      expect(particle.getCurrentFg()).toBe(5);

      particle.age = 600;
      expect(particle.getCurrentFg()).toBe(1);
    });

    it("should return base bg when no cycle defined", () => {
      const particle = new Particle({ bg: 0 });
      expect(particle.getCurrentBg()).toBe(0);
    });

    it("should cycle through bg colors based on age", () => {
      const particle = new Particle({
        bg: -1,
        bgCycle: [0, 1, 2],
        cycleDuration: 50,
      });

      particle.age = 0;
      expect(particle.getCurrentBg()).toBe(0);

      particle.age = 50;
      expect(particle.getCurrentBg()).toBe(1);

      particle.age = 100;
      expect(particle.getCurrentBg()).toBe(2);
    });

    it("should handle empty cycle arrays", () => {
      const particle = new Particle({
        glyph: "X",
        fg: 5,
        bg: 2,
        glyphCycle: [],
        fgCycle: [],
        bgCycle: [],
      });

      expect(particle.getCurrentGlyph()).toBe("X");
      expect(particle.getCurrentFg()).toBe(5);
      expect(particle.getCurrentBg()).toBe(2);
    });

    it("should handle single-element cycle", () => {
      const particle = new Particle({
        glyphCycle: ["Z"],
        cycleDuration: 100,
      });

      particle.age = 0;
      expect(particle.getCurrentGlyph()).toBe("Z");

      particle.age = 500;
      expect(particle.getCurrentGlyph()).toBe("Z");
    });
  });

  describe("density accumulation properties", () => {
    it("should store density accumulation config", () => {
      const particle = new Particle({
        accumulateDensity: true,
        densityGlyphs: ["░", "▒", "▓"],
        densityColors: [7, 0, 0],
      });

      expect(particle.accumulateDensity).toBe(true);
      expect(particle.densityGlyphs).toEqual(["░", "▒", "▓"]);
      expect(particle.densityColors).toEqual([7, 0, 0]);
    });

    it("should default to no density accumulation", () => {
      const particle = new Particle({});

      expect(particle.accumulateDensity).toBe(false);
      expect(particle.densityGlyphs).toBe(null);
      expect(particle.densityColors).toBe(null);
    });
  });
});
