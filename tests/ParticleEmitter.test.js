import { describe, it, expect } from "bun:test";
import { ParticleEmitter } from "../src/particles/ParticleEmitter.js";

describe("ParticleEmitter", () => {
  describe("constructor", () => {
    it("should create an emitter with default values", () => {
      const emitter = new ParticleEmitter();

      expect(emitter.name).toBe("Emitter");
      expect(emitter.enabled).toBe(true);
      expect(emitter.layerId).toBe("fg");
      expect(emitter.type).toBe("point");
      expect(emitter.x).toBe(0);
      expect(emitter.y).toBe(0);
      expect(emitter.spawnRate).toBe(5);
      expect(emitter.maxParticles).toBe(100);
      expect(emitter.particle.glyphs).toEqual(["*"]);
      expect(emitter.particle.fg).toBe(7);
      expect(emitter.particle.bg).toBe(-1);
    });

    it("should create an emitter with custom values", () => {
      const emitter = new ParticleEmitter({
        name: "Rain",
        layerId: "bg",
        type: "edge",
        edge: "top",
        spawnRate: 15,
        maxParticles: 150,
        particle: {
          glyphs: ["|", ":", "."],
          fg: 4,
          velocity: { x: 0, y: 10 },
        },
      });

      expect(emitter.name).toBe("Rain");
      expect(emitter.layerId).toBe("bg");
      expect(emitter.type).toBe("edge");
      expect(emitter.edge).toBe("top");
      expect(emitter.spawnRate).toBe(15);
      expect(emitter.maxParticles).toBe(150);
      expect(emitter.particle.glyphs).toEqual(["|", ":", "."]);
      expect(emitter.particle.fg).toBe(4);
      expect(emitter.particle.velocity).toEqual({ x: 0, y: 10 });
    });

    it("should generate unique ID", () => {
      const emitter1 = new ParticleEmitter();
      const emitter2 = new ParticleEmitter();

      expect(emitter1.id).toBeDefined();
      expect(emitter2.id).toBeDefined();
      expect(emitter1.id).not.toBe(emitter2.id);
    });
  });

  describe("getSpawnPosition", () => {
    it("should return fixed position for point emitter", () => {
      const emitter = new ParticleEmitter({
        type: "point",
        x: 40,
        y: 12,
      });

      const pos = emitter.getSpawnPosition(80, 25);
      expect(pos.x).toBe(40);
      expect(pos.y).toBe(12);
    });

    it("should return random X along line for line emitter", () => {
      const emitter = new ParticleEmitter({
        type: "line",
        x: 10,
        y: 5,
        width: 20,
      });

      // Test multiple times to verify randomness stays within bounds
      for (let i = 0; i < 50; i++) {
        const pos = emitter.getSpawnPosition(80, 25);
        expect(pos.x).toBeGreaterThanOrEqual(10);
        expect(pos.x).toBeLessThan(30);
        expect(pos.y).toBe(5);
      }
    });

    it("should return random position within area for area emitter", () => {
      const emitter = new ParticleEmitter({
        type: "area",
        x: 10,
        y: 5,
        width: 20,
        height: 10,
      });

      for (let i = 0; i < 50; i++) {
        const pos = emitter.getSpawnPosition(80, 25);
        expect(pos.x).toBeGreaterThanOrEqual(10);
        // Area emitter adds extra randomness for sub-cell positioning
        expect(pos.x).toBeLessThan(31);
        expect(pos.y).toBeGreaterThanOrEqual(5);
        expect(pos.y).toBeLessThan(16);
      }
    });

    it("should spawn from top edge", () => {
      const emitter = new ParticleEmitter({
        type: "edge",
        edge: "top",
      });

      for (let i = 0; i < 20; i++) {
        const pos = emitter.getSpawnPosition(80, 25);
        expect(pos.y).toBe(-1);
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThan(80);
      }
    });

    it("should spawn from bottom edge", () => {
      const emitter = new ParticleEmitter({
        type: "edge",
        edge: "bottom",
      });

      for (let i = 0; i < 20; i++) {
        const pos = emitter.getSpawnPosition(80, 25);
        expect(pos.y).toBe(25);
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThan(80);
      }
    });

    it("should spawn from left edge", () => {
      const emitter = new ParticleEmitter({
        type: "edge",
        edge: "left",
      });

      for (let i = 0; i < 20; i++) {
        const pos = emitter.getSpawnPosition(80, 25);
        expect(pos.x).toBe(-1);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThan(25);
      }
    });

    it("should spawn from right edge", () => {
      const emitter = new ParticleEmitter({
        type: "edge",
        edge: "right",
      });

      for (let i = 0; i < 20; i++) {
        const pos = emitter.getSpawnPosition(80, 25);
        expect(pos.x).toBe(80);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThan(25);
      }
    });
  });

  describe("createParticleConfig", () => {
    it("should create valid particle config", () => {
      const emitter = new ParticleEmitter({
        id: "test-emitter",
        layerId: "mid",
        type: "point",
        x: 40,
        y: 12,
        particle: {
          glyphs: ["*"],
          fg: 6,
          bg: -1,
          velocity: { x: 0, y: 5 },
          velocityVariance: { x: 0, y: 0 },
          lifespan: 1000,
          lifespanVariance: 0,
        },
      });

      const config = emitter.createParticleConfig(80, 25);

      expect(config.x).toBe(40);
      expect(config.y).toBe(12);
      expect(config.vx).toBe(0);
      expect(config.vy).toBe(5);
      expect(config.glyph).toBe("*");
      expect(config.fg).toBe(6);
      expect(config.bg).toBe(-1);
      expect(config.lifespan).toBe(1000);
      expect(config.layerId).toBe("mid");
      expect(config.emitterId).toBe("test-emitter");
    });

    it("should select random glyph from list", () => {
      const emitter = new ParticleEmitter({
        particle: {
          glyphs: ["a", "b", "c"],
        },
      });

      const glyphs = new Set();
      for (let i = 0; i < 100; i++) {
        const config = emitter.createParticleConfig(80, 25);
        glyphs.add(config.glyph);
      }

      // Should have seen all glyphs
      expect(glyphs.has("a")).toBe(true);
      expect(glyphs.has("b")).toBe(true);
      expect(glyphs.has("c")).toBe(true);
    });

    it("should apply velocity variance", () => {
      const emitter = new ParticleEmitter({
        particle: {
          velocity: { x: 0, y: 10 },
          velocityVariance: { x: 2, y: 2 },
        },
      });

      const velocities = [];
      for (let i = 0; i < 50; i++) {
        const config = emitter.createParticleConfig(80, 25);
        velocities.push({ vx: config.vx, vy: config.vy });
      }

      // Check that we have some variance (not all the same)
      const uniqueVx = new Set(velocities.map((v) => v.vx));
      const uniqueVy = new Set(velocities.map((v) => v.vy));
      expect(uniqueVx.size).toBeGreaterThan(1);
      expect(uniqueVy.size).toBeGreaterThan(1);

      // Check velocities are within expected range
      for (const v of velocities) {
        expect(v.vx).toBeGreaterThanOrEqual(-2);
        expect(v.vx).toBeLessThanOrEqual(2);
        expect(v.vy).toBeGreaterThanOrEqual(8);
        expect(v.vy).toBeLessThanOrEqual(12);
      }
    });

    it("should apply lifespan variance", () => {
      const emitter = new ParticleEmitter({
        particle: {
          lifespan: 1000,
          lifespanVariance: 0.5, // 50% variance
        },
      });

      const lifespans = [];
      for (let i = 0; i < 50; i++) {
        const config = emitter.createParticleConfig(80, 25);
        lifespans.push(config.lifespan);
      }

      // Check that we have variance
      const uniqueLifespans = new Set(lifespans);
      expect(uniqueLifespans.size).toBeGreaterThan(1);

      // Check lifespans are within expected range (500 to 1500)
      for (const lifespan of lifespans) {
        expect(lifespan).toBeGreaterThanOrEqual(500);
        expect(lifespan).toBeLessThanOrEqual(1500);
      }
    });

    it("should not apply variance to null lifespan", () => {
      const emitter = new ParticleEmitter({
        particle: {
          lifespan: null,
          lifespanVariance: 0.5,
        },
      });

      const config = emitter.createParticleConfig(80, 25);
      expect(config.lifespan).toBe(null);
    });

    describe("radial emission", () => {
      it("should calculate velocity from angle and speed when radial is true", () => {
        const emitter = new ParticleEmitter({
          particle: {
            radial: true,
            speed: 10,
            speedVariance: 0,
            angleMin: 0,
            angleMax: 0, // Fixed angle: 0 degrees = right
          },
        });

        const config = emitter.createParticleConfig(80, 25);

        // At 0 degrees, cos=1, sin=0 -> vx=speed, vy=0
        expect(config.vx).toBeCloseTo(10, 5);
        expect(config.vy).toBeCloseTo(0, 5);
      });

      it("should emit downward at 90 degrees", () => {
        const emitter = new ParticleEmitter({
          particle: {
            radial: true,
            speed: 10,
            speedVariance: 0,
            angleMin: 90,
            angleMax: 90,
          },
        });

        const config = emitter.createParticleConfig(80, 25);

        // At 90 degrees, cos=0, sin=1 -> vx=0, vy=speed
        expect(config.vx).toBeCloseTo(0, 5);
        expect(config.vy).toBeCloseTo(10, 5);
      });

      it("should emit leftward at 180 degrees", () => {
        const emitter = new ParticleEmitter({
          particle: {
            radial: true,
            speed: 10,
            speedVariance: 0,
            angleMin: 180,
            angleMax: 180,
          },
        });

        const config = emitter.createParticleConfig(80, 25);

        // At 180 degrees, cos=-1, sin=0 -> vx=-speed, vy=0
        expect(config.vx).toBeCloseTo(-10, 5);
        expect(config.vy).toBeCloseTo(0, 5);
      });

      it("should emit upward at 270 degrees", () => {
        const emitter = new ParticleEmitter({
          particle: {
            radial: true,
            speed: 10,
            speedVariance: 0,
            angleMin: 270,
            angleMax: 270,
          },
        });

        const config = emitter.createParticleConfig(80, 25);

        // At 270 degrees, cos=0, sin=-1 -> vx=0, vy=-speed
        expect(config.vx).toBeCloseTo(0, 5);
        expect(config.vy).toBeCloseTo(-10, 5);
      });

      it("should generate angles within specified range", () => {
        const emitter = new ParticleEmitter({
          particle: {
            radial: true,
            speed: 10,
            speedVariance: 0,
            angleMin: 45,
            angleMax: 135,
          },
        });

        // Collect velocities to verify angle distribution
        const angles = [];
        for (let i = 0; i < 100; i++) {
          const config = emitter.createParticleConfig(80, 25);
          // Calculate angle from velocity (atan2 returns radians)
          const angleDeg = (Math.atan2(config.vy, config.vx) * 180) / Math.PI;
          angles.push(angleDeg);
        }

        // All angles should be between 45 and 135 degrees
        for (const angle of angles) {
          expect(angle).toBeGreaterThanOrEqual(44.9); // Small tolerance
          expect(angle).toBeLessThanOrEqual(135.1);
        }

        // Should have variety (not all the same angle)
        const uniqueAngles = new Set(angles.map((a) => Math.round(a)));
        expect(uniqueAngles.size).toBeGreaterThan(1);
      });

      it("should apply speed variance", () => {
        const emitter = new ParticleEmitter({
          particle: {
            radial: true,
            speed: 10,
            speedVariance: 5, // ±5 variance
            angleMin: 0,
            angleMax: 0, // Fixed angle for easy speed calculation
          },
        });

        const speeds = [];
        for (let i = 0; i < 50; i++) {
          const config = emitter.createParticleConfig(80, 25);
          // At angle 0, speed = vx
          speeds.push(config.vx);
        }

        // Should have speed variance
        const uniqueSpeeds = new Set(speeds.map((s) => Math.round(s)));
        expect(uniqueSpeeds.size).toBeGreaterThan(1);

        // Speeds should be within range [5, 15] (10 ± 5)
        for (const speed of speeds) {
          expect(speed).toBeGreaterThanOrEqual(5);
          expect(speed).toBeLessThanOrEqual(15);
        }
      });

      it("should ignore standard velocity when radial is true", () => {
        const emitter = new ParticleEmitter({
          particle: {
            radial: true,
            speed: 10,
            speedVariance: 0,
            angleMin: 0,
            angleMax: 0,
            velocity: { x: 100, y: 100 }, // Should be ignored
            velocityVariance: { x: 50, y: 50 }, // Should be ignored
          },
        });

        const config = emitter.createParticleConfig(80, 25);

        // Should use radial velocity, not standard velocity
        expect(config.vx).toBeCloseTo(10, 5);
        expect(config.vy).toBeCloseTo(0, 5);
      });

      it("should default to full circle (0-360 degrees)", () => {
        const emitter = new ParticleEmitter({
          particle: {
            radial: true,
            speed: 10,
            speedVariance: 0,
            // Using default angleMin=0, angleMax=360
          },
        });

        // Collect angles from many particles
        const angles = [];
        for (let i = 0; i < 200; i++) {
          const config = emitter.createParticleConfig(80, 25);
          const angleDeg = (Math.atan2(config.vy, config.vx) * 180) / Math.PI;
          // Convert to 0-360 range
          angles.push(angleDeg < 0 ? angleDeg + 360 : angleDeg);
        }

        // Should cover most quadrants
        const hasQ1 = angles.some((a) => a >= 0 && a < 90);
        const hasQ2 = angles.some((a) => a >= 90 && a < 180);
        const hasQ3 = angles.some((a) => a >= 180 && a < 270);
        const hasQ4 = angles.some((a) => a >= 270 && a <= 360);

        expect(hasQ1).toBe(true);
        expect(hasQ2).toBe(true);
        expect(hasQ3).toBe(true);
        expect(hasQ4).toBe(true);
      });
    });

    describe("gravity", () => {
      it("should pass gravity to particle config", () => {
        const emitter = new ParticleEmitter({
          particle: {
            gravity: 9.8,
          },
        });

        const config = emitter.createParticleConfig(80, 25);
        expect(config.gravity).toBe(9.8);
      });

      it("should default to zero gravity", () => {
        const emitter = new ParticleEmitter({});

        const config = emitter.createParticleConfig(80, 25);
        expect(config.gravity).toBe(0);
      });
    });

    describe("density accumulation", () => {
      it("should pass density settings to particle config", () => {
        const emitter = new ParticleEmitter({
          particle: {
            accumulateDensity: true,
            densityGlyphs: [".", "o", "O", "@"],
            densityColors: [0, 7, 15, 9],
          },
        });

        const config = emitter.createParticleConfig(80, 25);
        expect(config.accumulateDensity).toBe(true);
        expect(config.densityGlyphs).toEqual([".", "o", "O", "@"]);
        expect(config.densityColors).toEqual([0, 7, 15, 9]);
      });

      it("should use default density glyphs when not specified", () => {
        const emitter = new ParticleEmitter({
          particle: {
            accumulateDensity: true,
          },
        });

        const config = emitter.createParticleConfig(80, 25);
        expect(config.accumulateDensity).toBe(true);
        expect(config.densityGlyphs).toEqual(["░", "▒", "▓", "█"]);
      });
    });

    describe("cycling properties", () => {
      it("should pass cycle arrays to particle config", () => {
        const emitter = new ParticleEmitter({
          particle: {
            glyphCycle: ["a", "b", "c"],
            fgCycle: [1, 2, 3],
            bgCycle: [4, 5, 6],
            cycleDuration: 250,
          },
        });

        const config = emitter.createParticleConfig(80, 25);
        expect(config.glyphCycle).toEqual(["a", "b", "c"]);
        expect(config.fgCycle).toEqual([1, 2, 3]);
        expect(config.bgCycle).toEqual([4, 5, 6]);
        expect(config.cycleDuration).toBe(250);
      });

      it("should default cycle arrays to null", () => {
        const emitter = new ParticleEmitter({});

        const config = emitter.createParticleConfig(80, 25);
        expect(config.glyphCycle).toBe(null);
        expect(config.fgCycle).toBe(null);
        expect(config.bgCycle).toBe(null);
      });
    });
  });

  describe("serialization", () => {
    it("should serialize to object", () => {
      const emitter = new ParticleEmitter({
        id: "test-id",
        name: "Test Emitter",
        enabled: false,
        layerId: "bg",
        type: "line",
        x: 10,
        y: 5,
        width: 60,
        spawnRate: 10,
        maxParticles: 50,
        particle: {
          glyphs: ["|", ":"],
          fg: 4,
          bg: -1,
          velocity: { x: 0, y: 8 },
          velocityVariance: { x: 1, y: 2 },
          lifespan: 2000,
          lifespanVariance: 0.3,
        },
      });

      const obj = emitter.toObject();

      expect(obj.id).toBe("test-id");
      expect(obj.name).toBe("Test Emitter");
      expect(obj.enabled).toBe(false);
      expect(obj.layerId).toBe("bg");
      expect(obj.type).toBe("line");
      expect(obj.x).toBe(10);
      expect(obj.y).toBe(5);
      expect(obj.width).toBe(60);
      expect(obj.spawnRate).toBe(10);
      expect(obj.maxParticles).toBe(50);
      expect(obj.particle.glyphs).toEqual(["|", ":"]);
      expect(obj.particle.fg).toBe(4);
    });

    it("should deserialize from object", () => {
      const obj = {
        id: "restored-id",
        name: "Restored Emitter",
        enabled: true,
        layerId: "mid",
        type: "edge",
        edge: "top",
        spawnRate: 15,
        particle: {
          glyphs: ["*", "·"],
          fg: 7,
          velocity: { x: 0, y: 3 },
        },
      };

      const emitter = ParticleEmitter.fromObject(obj);

      expect(emitter.id).toBe("restored-id");
      expect(emitter.name).toBe("Restored Emitter");
      expect(emitter.enabled).toBe(true);
      expect(emitter.layerId).toBe("mid");
      expect(emitter.type).toBe("edge");
      expect(emitter.edge).toBe("top");
      expect(emitter.spawnRate).toBe(15);
      expect(emitter.particle.glyphs).toEqual(["*", "·"]);
    });

    it("should round-trip serialize/deserialize", () => {
      const original = new ParticleEmitter({
        name: "Round Trip",
        type: "area",
        x: 20,
        y: 10,
        width: 40,
        height: 15,
        layerId: "fg",
        spawnRate: 8,
        particle: {
          glyphs: ["★", "✦", "·"],
          fg: 6,
          velocity: { x: 0, y: 0 },
          lifespan: 800,
        },
      });

      const obj = original.toObject();
      const restored = ParticleEmitter.fromObject(obj);

      expect(restored.name).toBe(original.name);
      expect(restored.type).toBe(original.type);
      expect(restored.x).toBe(original.x);
      expect(restored.y).toBe(original.y);
      expect(restored.width).toBe(original.width);
      expect(restored.height).toBe(original.height);
      expect(restored.layerId).toBe(original.layerId);
      expect(restored.particle.glyphs).toEqual(original.particle.glyphs);
      expect(restored.particle.lifespan).toBe(original.particle.lifespan);
    });
  });
});
