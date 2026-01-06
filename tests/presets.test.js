import { describe, it, expect } from "bun:test";
import {
  PRESETS,
  createFromPreset,
  getPresetIds,
  getPresetList,
} from "../src/particles/presets.js";
import { ParticleEmitter } from "../src/particles/ParticleEmitter.js";

describe("Particle Presets", () => {
  describe("PRESETS", () => {
    it("should have rain preset", () => {
      expect(PRESETS.rain).toBeDefined();
      expect(PRESETS.rain.name).toBe("Rain");
      expect(PRESETS.rain.type).toBe("edge");
      expect(PRESETS.rain.edge).toBe("top");
      expect(PRESETS.rain.particle.velocity.y).toBeGreaterThan(0);
    });

    it("should have snow preset", () => {
      expect(PRESETS.snow).toBeDefined();
      expect(PRESETS.snow.name).toBe("Snow");
      expect(PRESETS.snow.particle.velocity.y).toBeGreaterThan(0);
      expect(PRESETS.snow.particle.velocity.y).toBeLessThan(
        PRESETS.rain.particle.velocity.y,
      );
    });

    it("should have sparkle preset", () => {
      expect(PRESETS.sparkle).toBeDefined();
      expect(PRESETS.sparkle.name).toBe("Sparkle");
      expect(PRESETS.sparkle.type).toBe("area");
      expect(PRESETS.sparkle.particle.velocity.x).toBe(0);
      expect(PRESETS.sparkle.particle.velocity.y).toBe(0);
      expect(PRESETS.sparkle.particle.lifespan).toBeGreaterThan(0);
    });

    it("should have smoke preset", () => {
      expect(PRESETS.smoke).toBeDefined();
      expect(PRESETS.smoke.name).toBe("Smoke");
      expect(PRESETS.smoke.type).toBe("point");
      expect(PRESETS.smoke.particle.velocity.y).toBeLessThan(0); // Rises up
    });

    it("should have fire preset", () => {
      expect(PRESETS.fire).toBeDefined();
      expect(PRESETS.fire.name).toBe("Fire");
      expect(PRESETS.fire.type).toBe("line");
      expect(PRESETS.fire.particle.velocity.y).toBeLessThan(0); // Rises up
      expect(PRESETS.fire.particle.fg).toBe(1); // Red
    });

    it("should have bubbles preset", () => {
      expect(PRESETS.bubbles).toBeDefined();
      expect(PRESETS.bubbles.name).toBe("Bubbles");
      expect(PRESETS.bubbles.particle.velocity.y).toBeLessThan(0); // Rises up
    });

    it("should have clouds preset", () => {
      expect(PRESETS.clouds).toBeDefined();
      expect(PRESETS.clouds.name).toBe("Clouds");
      expect(PRESETS.clouds.type).toBe("area");
      expect(PRESETS.clouds.particle.velocity.x).toBeGreaterThan(0); // Moves right
      expect(PRESETS.clouds.particle.accumulateDensity).toBe(true);
    });

    it("should have stars preset", () => {
      expect(PRESETS.stars).toBeDefined();
      expect(PRESETS.stars.name).toBe("Stars");
      expect(PRESETS.stars.type).toBe("area");
      expect(PRESETS.stars.particle.lifespan).toBeGreaterThan(0);
    });

    // Dense Volumetric Effects

    it("should have smokePlume preset with density accumulation", () => {
      expect(PRESETS.smokePlume).toBeDefined();
      expect(PRESETS.smokePlume.name).toBe("Smoke Plume");
      expect(PRESETS.smokePlume.type).toBe("area");
      expect(PRESETS.smokePlume.particle.accumulateDensity).toBe(true);
      expect(PRESETS.smokePlume.particle.densityGlyphs).toBeDefined();
      expect(PRESETS.smokePlume.particle.densityColors).toBeDefined();
      expect(PRESETS.smokePlume.particle.velocity.y).toBeLessThan(0); // Rises
    });

    it("should have inferno preset with density accumulation", () => {
      expect(PRESETS.inferno).toBeDefined();
      expect(PRESETS.inferno.name).toBe("Inferno");
      expect(PRESETS.inferno.particle.accumulateDensity).toBe(true);
      expect(PRESETS.inferno.spawnRate).toBeGreaterThan(30); // High spawn rate
      expect(PRESETS.inferno.particle.velocity.y).toBeLessThan(0); // Rises
    });

    it("should have stormClouds preset with density accumulation", () => {
      expect(PRESETS.stormClouds).toBeDefined();
      expect(PRESETS.stormClouds.name).toBe("Storm Clouds");
      expect(PRESETS.stormClouds.particle.accumulateDensity).toBe(true);
      expect(PRESETS.stormClouds.particle.velocity.x).toBeGreaterThan(0); // Moves right
    });

    it("should have fog preset with density accumulation", () => {
      expect(PRESETS.fog).toBeDefined();
      expect(PRESETS.fog.name).toBe("Fog");
      expect(PRESETS.fog.particle.accumulateDensity).toBe(true);
      expect(PRESETS.fog.particle.velocity.x).toBeGreaterThan(0); // Drifts
      expect(PRESETS.fog.particle.lifespan).toBeGreaterThan(3000); // Long lived
    });

    it("should have embers preset with color cycling", () => {
      expect(PRESETS.embers).toBeDefined();
      expect(PRESETS.embers.name).toBe("Embers");
      expect(PRESETS.embers.particle.fgCycle).toBeDefined();
      expect(PRESETS.embers.particle.fgCycle.length).toBeGreaterThan(0);
      expect(PRESETS.embers.particle.velocity.y).toBeLessThan(0); // Floats up
    });

    // Radial Effects

    it("should have explosion preset with radial emission", () => {
      expect(PRESETS.explosion).toBeDefined();
      expect(PRESETS.explosion.name).toBe("Explosion");
      expect(PRESETS.explosion.particle.radial).toBe(true);
      expect(PRESETS.explosion.particle.speed).toBeGreaterThan(0);
      expect(PRESETS.explosion.particle.gravity).toBeGreaterThan(0);
      expect(PRESETS.explosion.particle.angleMin).toBe(0);
      expect(PRESETS.explosion.particle.angleMax).toBe(360);
      expect(PRESETS.explosion.particle.accumulateDensity).toBe(true);
    });

    it("should have burst preset with radial emission", () => {
      expect(PRESETS.burst).toBeDefined();
      expect(PRESETS.burst.name).toBe("Burst");
      expect(PRESETS.burst.particle.radial).toBe(true);
      expect(PRESETS.burst.particle.gravity).toBe(0); // No gravity
      expect(PRESETS.burst.particle.accumulateDensity).toBe(true);
    });

    it("should have fountain preset with upward cone angles", () => {
      expect(PRESETS.fountain).toBeDefined();
      expect(PRESETS.fountain.name).toBe("Fountain");
      expect(PRESETS.fountain.particle.radial).toBe(true);
      expect(PRESETS.fountain.particle.angleMin).toBeGreaterThan(180);
      expect(PRESETS.fountain.particle.angleMax).toBeLessThan(360);
      expect(PRESETS.fountain.particle.gravity).toBeGreaterThan(0);
    });

    it("should have firework preset with radial emission and density", () => {
      expect(PRESETS.firework).toBeDefined();
      expect(PRESETS.firework.name).toBe("Firework");
      expect(PRESETS.firework.particle.radial).toBe(true);
      expect(PRESETS.firework.particle.gravity).toBeGreaterThan(0);
      expect(PRESETS.firework.spawnRate).toBeGreaterThan(100); // Burst effect
      expect(PRESETS.firework.particle.accumulateDensity).toBe(true);
    });

    it("should have shockwave preset with fast uniform speed", () => {
      expect(PRESETS.shockwave).toBeDefined();
      expect(PRESETS.shockwave.name).toBe("Shockwave");
      expect(PRESETS.shockwave.particle.radial).toBe(true);
      expect(PRESETS.shockwave.particle.speed).toBeGreaterThan(10);
      expect(PRESETS.shockwave.particle.speedVariance).toBeLessThan(1); // Uniform
      expect(PRESETS.shockwave.particle.gravity).toBe(0);
    });

    it("should have confetti preset with upward spray", () => {
      expect(PRESETS.confetti).toBeDefined();
      expect(PRESETS.confetti.name).toBe("Confetti");
      expect(PRESETS.confetti.particle.radial).toBe(true);
      expect(PRESETS.confetti.particle.fgCycle).toBeDefined(); // Rainbow colors
      expect(PRESETS.confetti.particle.gravity).toBeGreaterThan(0);
    });

    it("should have waterfall preset with gravity", () => {
      expect(PRESETS.waterfall).toBeDefined();
      expect(PRESETS.waterfall.name).toBe("Waterfall");
      expect(PRESETS.waterfall.type).toBe("line");
      expect(PRESETS.waterfall.particle.gravity).toBeGreaterThan(0);
      expect(PRESETS.waterfall.particle.velocity.y).toBeGreaterThan(0); // Falls
    });

    it("should have leaves preset with gravity and color cycling", () => {
      expect(PRESETS.leaves).toBeDefined();
      expect(PRESETS.leaves.name).toBe("Falling Leaves");
      expect(PRESETS.leaves.type).toBe("edge");
      expect(PRESETS.leaves.edge).toBe("top");
      expect(PRESETS.leaves.particle.gravity).toBeGreaterThan(0);
      expect(PRESETS.leaves.particle.fgCycle).toBeDefined(); // Autumn colors
    });

    it("should have meteor preset with diagonal movement", () => {
      expect(PRESETS.meteor).toBeDefined();
      expect(PRESETS.meteor.name).toBe("Meteor Shower");
      expect(PRESETS.meteor.particle.velocity.x).toBeGreaterThan(0);
      expect(PRESETS.meteor.particle.velocity.y).toBeGreaterThan(0);
      expect(PRESETS.meteor.particle.gravity).toBeGreaterThan(0);
      expect(PRESETS.meteor.particle.fgCycle).toBeDefined();
      expect(PRESETS.meteor.particle.glyphCycle).toBeDefined();
    });

    it("should have magic preset with negative gravity (floats up)", () => {
      expect(PRESETS.magic).toBeDefined();
      expect(PRESETS.magic.name).toBe("Magic Dust");
      expect(PRESETS.magic.particle.radial).toBe(true);
      expect(PRESETS.magic.particle.gravity).toBeLessThan(0); // Floats up
      expect(PRESETS.magic.particle.fgCycle).toBeDefined();
    });

    it("should have steam preset with negative gravity", () => {
      expect(PRESETS.steam).toBeDefined();
      expect(PRESETS.steam.name).toBe("Steam");
      expect(PRESETS.steam.particle.gravity).toBeLessThan(0); // Accelerates up
      expect(PRESETS.steam.particle.velocity.y).toBeLessThan(0); // Rises
    });

    it("should have plasma preset with radial and cycling", () => {
      expect(PRESETS.plasma).toBeDefined();
      expect(PRESETS.plasma.name).toBe("Plasma");
      expect(PRESETS.plasma.particle.radial).toBe(true);
      expect(PRESETS.plasma.particle.fgCycle).toBeDefined();
      expect(PRESETS.plasma.particle.glyphCycle).toBeDefined();
      expect(PRESETS.plasma.particle.gravity).toBe(0);
    });

    it("all presets should have required properties", () => {
      for (const [id, preset] of Object.entries(PRESETS)) {
        expect(preset.name).toBeDefined();
        expect(preset.type).toBeDefined();
        expect(preset.spawnRate).toBeGreaterThan(0);
        expect(preset.maxParticles).toBeGreaterThan(0);
        expect(preset.particle).toBeDefined();
        expect(preset.particle.glyphs).toBeDefined();
        expect(preset.particle.glyphs.length).toBeGreaterThan(0);
        // Radial presets use speed instead of velocity
        if (preset.particle.radial) {
          expect(preset.particle.speed).toBeGreaterThan(0);
        } else {
          expect(preset.particle.velocity).toBeDefined();
        }
      }
    });
  });

  describe("createFromPreset", () => {
    it("should create config from preset", () => {
      const config = createFromPreset("rain");

      expect(config.name).toBe("Rain");
      expect(config.type).toBe("edge");
      expect(config.particle.velocity.y).toBeGreaterThan(0);
    });

    it("should allow overriding properties", () => {
      const config = createFromPreset("rain", {
        layerId: "bg",
        spawnRate: 30,
      });

      expect(config.name).toBe("Rain");
      expect(config.layerId).toBe("bg");
      expect(config.spawnRate).toBe(30);
    });

    it("should allow overriding particle properties", () => {
      const config = createFromPreset("snow", {
        particle: {
          fg: 4,
        },
      });

      expect(config.particle.fg).toBe(4);
      // Original properties should be preserved
      expect(config.particle.glyphs).toEqual(PRESETS.snow.particle.glyphs);
    });

    it("should throw for unknown preset", () => {
      expect(() => createFromPreset("unknown")).toThrow("Unknown preset");
    });

    it("should create valid ParticleEmitter config", () => {
      for (const presetId of Object.keys(PRESETS)) {
        const config = createFromPreset(presetId, { layerId: "mid" });
        const emitter = new ParticleEmitter(config);

        expect(emitter.name).toBe(PRESETS[presetId].name);
        expect(emitter.layerId).toBe("mid");
        expect(emitter.particle.glyphs.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getPresetIds", () => {
    it("should return all preset IDs", () => {
      const ids = getPresetIds();

      // Original presets
      expect(ids).toContain("rain");
      expect(ids).toContain("snow");
      expect(ids).toContain("sparkle");
      expect(ids).toContain("smoke");
      expect(ids).toContain("fire");
      expect(ids).toContain("bubbles");
      expect(ids).toContain("clouds");
      expect(ids).toContain("stars");

      // Dense volumetric effects
      expect(ids).toContain("smokePlume");
      expect(ids).toContain("inferno");
      expect(ids).toContain("stormClouds");
      expect(ids).toContain("fog");
      expect(ids).toContain("embers");

      // Radial effects
      expect(ids).toContain("explosion");
      expect(ids).toContain("burst");
      expect(ids).toContain("fountain");
      expect(ids).toContain("firework");
      expect(ids).toContain("shockwave");
      expect(ids).toContain("confetti");
      expect(ids).toContain("waterfall");
      expect(ids).toContain("leaves");
      expect(ids).toContain("meteor");
      expect(ids).toContain("magic");
      expect(ids).toContain("steam");
      expect(ids).toContain("plasma");
    });

    it("should match PRESETS keys", () => {
      const ids = getPresetIds();
      const presetKeys = Object.keys(PRESETS);

      expect(ids.sort()).toEqual(presetKeys.sort());
    });
  });

  describe("getPresetList", () => {
    it("should return preset info for UI", () => {
      const list = getPresetList();

      expect(list.length).toBe(Object.keys(PRESETS).length);

      for (const item of list) {
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
        expect(PRESETS[item.id]).toBeDefined();
        expect(PRESETS[item.id].name).toBe(item.name);
      }
    });
  });
});
