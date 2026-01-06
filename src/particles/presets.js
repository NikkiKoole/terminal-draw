/**
 * Particle effect presets - pre-configured emitter settings
 *
 * Each preset defines a complete emitter configuration.
 * Use createFromPreset() to create an emitter with optional overrides.
 */

export const PRESETS = {
  rain: {
    name: "Rain",
    type: "edge",
    edge: "top",
    spawnRate: 15,
    spawnVariance: 0.3,
    maxParticles: 150,
    particle: {
      glyphs: ["|", ":", ".", ","],
      fg: 4, // Cyan
      bg: -1,
      velocity: { x: 0, y: 15 },
      velocityVariance: { x: 0.5, y: 3 },
      lifespan: null, // Despawn at edge
      lifespanVariance: 0,
    },
  },

  snow: {
    name: "Snow",
    type: "edge",
    edge: "top",
    spawnRate: 8,
    spawnVariance: 0.4,
    maxParticles: 100,
    particle: {
      glyphs: ["*", "\u00b7", "\u00b0", "\u2736"],
      fg: 7, // White
      bg: -1,
      velocity: { x: 0, y: 1.2 },
      velocityVariance: { x: 0.8, y: 0.4 },
      lifespan: null,
      lifespanVariance: 0,
    },
  },

  sparkle: {
    name: "Sparkle",
    type: "area",
    spawnRate: 3,
    spawnVariance: 0.5,
    maxParticles: 20,
    particle: {
      glyphs: ["\u2726", "\u2727", "*", "\u00b7"],
      fg: 6, // Yellow (base)
      bg: -1,
      // Twinkle effect: bright -> dim -> bright
      fgCycle: [7, 6, 3, 6, 7], // White, Yellow, Dark Yellow, Yellow, White
      glyphCycle: ["\u2726", "\u2727", "*", "\u2727", "\u2726"],
      cycleDuration: 150,
      velocity: { x: 0, y: 0 },
      velocityVariance: { x: 0, y: 0 },
      lifespan: 800,
      lifespanVariance: 0.5,
    },
  },

  smoke: {
    name: "Smoke",
    type: "point",
    spawnRate: 5,
    spawnVariance: 0.3,
    maxParticles: 30,
    particle: {
      glyphs: ["\u2591", "\u2592", "\u2593"],
      fg: 7, // White/gray
      bg: -1,
      velocity: { x: 0, y: -2 },
      velocityVariance: { x: 1, y: 0.5 },
      lifespan: 2000,
      lifespanVariance: 0.3,
    },
  },

  fire: {
    name: "Fire",
    type: "line",
    spawnRate: 12,
    spawnVariance: 0.2,
    maxParticles: 40,
    particle: {
      glyphs: ["\u2593", "\u2592", "\u2591"],
      fg: 1, // Red (base, overridden by cycle)
      bg: -1,
      // Color cycle: yellow -> orange -> red -> dark red as fire rises
      fgCycle: [3, 3, 1, 1, 0], // Yellow, Yellow, Red, Red, Black (burned out)
      glyphCycle: ["\u2588", "\u2593", "\u2592", "\u2591", "."],
      cycleDuration: 120,
      velocity: { x: 0, y: -4 },
      velocityVariance: { x: 1.5, y: 1 },
      lifespan: 600,
      lifespanVariance: 0.4,
    },
  },

  bubbles: {
    name: "Bubbles",
    type: "line",
    spawnRate: 4,
    spawnVariance: 0.3,
    maxParticles: 25,
    particle: {
      glyphs: ["\u25cb", "\u25e6", "\u00b0", "o"],
      fg: 4, // Cyan
      bg: -1,
      velocity: { x: 0, y: -3 },
      velocityVariance: { x: 0.8, y: 0.5 },
      lifespan: null,
      lifespanVariance: 0,
    },
  },

  clouds: {
    name: "Clouds",
    type: "area",
    spawnRate: 30,
    spawnVariance: 0.3,
    maxParticles: 150,
    particle: {
      glyphs: ["\u2591"],
      fg: 7, // White
      bg: -1,
      velocity: { x: 1.5, y: 0 },
      velocityVariance: { x: 0.5, y: 0.2 },
      lifespan: 4000,
      lifespanVariance: 0.3,
      // Density accumulation for fluffy clouds
      accumulateDensity: true,
      densityGlyphs: ["\u2591", "\u2592", "\u2593", "\u2588"], // ░▒▓█
      densityColors: [7, 7, 7, 7], // Stay white
    },
  },

  stars: {
    name: "Stars",
    type: "area",
    spawnRate: 2,
    spawnVariance: 0.8,
    maxParticles: 30,
    particle: {
      glyphs: ["\u2605", "\u2606", "*", "+", "\u00b7"],
      fg: 6, // Yellow (base)
      bg: -1,
      // Slow twinkle for stars
      fgCycle: [7, 7, 6, 6, 7], // White, White, Yellow, Yellow, White
      cycleDuration: 300,
      velocity: { x: 0, y: 0 },
      velocityVariance: { x: 0, y: 0 },
      lifespan: 1500,
      lifespanVariance: 0.6,
    },
  },

  // ============================================
  // Dense Volumetric Effects
  // ============================================

  smokePlume: {
    name: "Smoke Plume",
    type: "area",
    spawnRate: 35,
    spawnVariance: 0.2,
    maxParticles: 150,
    particle: {
      glyphs: ["\u2591"],
      fg: 7, // Light gray
      bg: -1,
      velocity: { x: 0, y: -1.5 },
      velocityVariance: { x: 1.2, y: 0.5 },
      lifespan: 2500,
      lifespanVariance: 0.3,
      // Density accumulation - overlapping particles show denser glyphs
      accumulateDensity: true,
      densityGlyphs: ["\u2591", "\u2592", "\u2593", "\u2588"], // ░▒▓█
      densityColors: [7, 7, 0, 0], // Light at sparse edges, dark at dense core
    },
  },

  inferno: {
    name: "Inferno",
    type: "area",
    spawnRate: 50,
    spawnVariance: 0.15,
    maxParticles: 200,
    particle: {
      glyphs: ["\u2591"],
      fg: 3, // Yellow (base)
      bg: -1,
      velocity: { x: 0, y: -2 },
      velocityVariance: { x: 1.5, y: 1 },
      lifespan: 700,
      lifespanVariance: 0.4,
      // Density accumulation for intense fire core
      accumulateDensity: true,
      densityGlyphs: ["\u2591", "\u2592", "\u2593", "\u2588"], // ░▒▓█
      densityColors: [1, 3, 3, 7], // Red edges -> Yellow -> White hot core
    },
  },

  stormClouds: {
    name: "Storm Clouds",
    type: "area",
    spawnRate: 40,
    spawnVariance: 0.3,
    maxParticles: 180,
    particle: {
      glyphs: ["\u2591"],
      fg: 0, // Dark
      bg: -1,
      velocity: { x: 2, y: 0 },
      velocityVariance: { x: 0.8, y: 0.3 },
      lifespan: 3000,
      lifespanVariance: 0.4,
      // Density accumulation for ominous dark clouds
      accumulateDensity: true,
      densityGlyphs: ["\u2591", "\u2592", "\u2593", "\u2588"], // ░▒▓█
      densityColors: [7, 0, 0, 0], // Light at edges, dark in middle
    },
  },

  fog: {
    name: "Fog",
    type: "area",
    spawnRate: 25,
    spawnVariance: 0.5,
    maxParticles: 120,
    particle: {
      glyphs: ["\u2591"],
      fg: 7, // White/gray
      bg: -1,
      velocity: { x: 0.3, y: 0 },
      velocityVariance: { x: 0.2, y: 0.1 },
      lifespan: 4000,
      lifespanVariance: 0.5,
      // Density accumulation for wispy fog
      accumulateDensity: true,
      densityGlyphs: ["\u2591", "\u2591", "\u2592", "\u2592"], // Stay light/wispy
      densityColors: [0, 7, 7, 7], // Fade in effect
    },
  },

  embers: {
    name: "Embers",
    type: "area",
    spawnRate: 12,
    spawnVariance: 0.3,
    maxParticles: 60,
    particle: {
      glyphs: ["\u2022", "\u00b7", "*", "."],
      fg: 1, // Red
      bg: -1,
      // Glowing embers that flicker
      fgCycle: [1, 3, 1, 3, 0], // Red, Yellow, Red, Yellow, Black
      cycleDuration: 200,
      velocity: { x: 0, y: -0.8 },
      velocityVariance: { x: 0.5, y: 0.3 },
      lifespan: 1500,
      lifespanVariance: 0.5,
    },
  },

  // ============================================
  // Radial Effects
  // ============================================

  explosion: {
    name: "Explosion",
    type: "point",
    spawnRate: 200, // Burst spawn
    spawnVariance: 0,
    maxParticles: 80,
    particle: {
      glyphs: ["*"],
      fg: 3, // Yellow
      bg: -1,
      radial: true,
      speed: 12,
      speedVariance: 4,
      angleMin: 0,
      angleMax: 360,
      gravity: 8,
      lifespan: 500,
      lifespanVariance: 0.3,
      // Density accumulation for fiery core
      accumulateDensity: true,
      densityGlyphs: ["\u00b7", "*", "\u2022", "\u2588"], // ·*•█
      densityColors: [1, 3, 7, 7], // Red -> Yellow -> White at core
    },
  },

  burst: {
    name: "Burst",
    type: "point",
    spawnRate: 150,
    spawnVariance: 0,
    maxParticles: 50,
    particle: {
      glyphs: ["*"],
      fg: 6, // Yellow
      bg: -1,
      radial: true,
      speed: 8,
      speedVariance: 3,
      angleMin: 0,
      angleMax: 360,
      gravity: 0,
      lifespan: 600,
      lifespanVariance: 0.4,
      // Density accumulation for sparkle burst
      accumulateDensity: true,
      densityGlyphs: ["+", "*", "\u2726", "\u2727"], // +*✦✧
      densityColors: [6, 3, 7, 7], // Yellow -> White at core
    },
  },

  fountain: {
    name: "Fountain",
    type: "point",
    spawnRate: 20,
    spawnVariance: 0.2,
    maxParticles: 100,
    particle: {
      glyphs: ["\u2022", "o", "\u00b0", "\u00b7"],
      fg: 4, // Cyan (water)
      bg: -1,
      fgCycle: [7, 4, 4, 6], // White splash -> Cyan
      cycleDuration: 150,
      radial: true,
      speed: 10,
      speedVariance: 2,
      angleMin: 250, // Upward cone
      angleMax: 290,
      gravity: 15,
      lifespan: 1500,
      lifespanVariance: 0.2,
    },
  },

  firework: {
    name: "Firework",
    type: "point",
    spawnRate: 300,
    spawnVariance: 0,
    maxParticles: 60,
    particle: {
      glyphs: ["*"],
      fg: 1,
      bg: -1,
      radial: true,
      speed: 6,
      speedVariance: 2,
      angleMin: 0,
      angleMax: 360,
      gravity: 3,
      lifespan: 800,
      lifespanVariance: 0.3,
      // Density accumulation for colorful firework
      accumulateDensity: true,
      densityGlyphs: ["\u00b7", "*", "\u2022", "\u2588"], // ·*•█
      densityColors: [1, 3, 5, 7], // Red -> Yellow -> Magenta -> White
    },
  },

  shockwave: {
    name: "Shockwave",
    type: "point",
    spawnRate: 400,
    spawnVariance: 0,
    maxParticles: 100,
    particle: {
      glyphs: ["\u2500", "\u2502", "/", "\\", "\u2571", "\u2572"],
      fg: 7, // White
      bg: -1,
      fgCycle: [7, 7, 0], // White -> fade
      cycleDuration: 100,
      radial: true,
      speed: 15,
      speedVariance: 0.5, // Uniform speed for ring effect
      angleMin: 0,
      angleMax: 360,
      gravity: 0,
      lifespan: 300,
      lifespanVariance: 0.1,
    },
  },

  confetti: {
    name: "Confetti",
    type: "point",
    spawnRate: 80,
    spawnVariance: 0.3,
    maxParticles: 100,
    particle: {
      glyphs: ["\u25a0", "\u25cf", "\u2665", "\u2666", "\u2660", "\u2663"],
      fg: 1, // Will vary
      bg: -1,
      fgCycle: [1, 2, 3, 4, 5, 6], // Rainbow colors
      cycleDuration: 200,
      radial: true,
      speed: 8,
      speedVariance: 3,
      angleMin: 200, // Upward spray
      angleMax: 340,
      gravity: 6,
      lifespan: 2000,
      lifespanVariance: 0.3,
    },
  },

  waterfall: {
    name: "Waterfall",
    type: "line",
    spawnRate: 30,
    spawnVariance: 0.2,
    maxParticles: 150,
    particle: {
      glyphs: ["|", "\u2502", ":", "\u00b7"],
      fg: 4, // Cyan
      bg: -1,
      fgCycle: [7, 4, 4, 6],
      cycleDuration: 100,
      velocity: { x: 0, y: 2 },
      velocityVariance: { x: 0.5, y: 1 },
      gravity: 8,
      lifespan: null,
      lifespanVariance: 0,
    },
  },

  leaves: {
    name: "Falling Leaves",
    type: "edge",
    edge: "top",
    spawnRate: 5,
    spawnVariance: 0.5,
    maxParticles: 40,
    particle: {
      glyphs: ["\u2618", "\u273f", "\u2740", "*", "\u00a7"],
      fg: 2, // Green
      bg: -1,
      fgCycle: [2, 3, 6, 1], // Green -> Yellow -> Brown -> Red
      cycleDuration: 500,
      velocity: { x: 1, y: 1 },
      velocityVariance: { x: 1.5, y: 0.5 },
      gravity: 0.5,
      lifespan: null,
      lifespanVariance: 0,
    },
  },

  meteor: {
    name: "Meteor Shower",
    type: "edge",
    edge: "top",
    spawnRate: 3,
    spawnVariance: 0.8,
    maxParticles: 15,
    particle: {
      glyphs: ["\u2605", "*", "\u00b7", "."],
      fg: 3, // Yellow
      bg: -1,
      fgCycle: [7, 3, 1, 0], // White -> Yellow -> Red -> Gone
      glyphCycle: ["\u2605", "*", "\u00b7", "."],
      cycleDuration: 150,
      velocity: { x: 3, y: 4 },
      velocityVariance: { x: 1, y: 1 },
      gravity: 2,
      lifespan: 1000,
      lifespanVariance: 0.4,
    },
  },

  magic: {
    name: "Magic Dust",
    type: "point",
    spawnRate: 15,
    spawnVariance: 0.3,
    maxParticles: 60,
    particle: {
      glyphs: ["\u2726", "\u2727", "\u2728", "+", "*"],
      fg: 5, // Magenta
      bg: -1,
      fgCycle: [5, 4, 6, 7, 5], // Magenta, Cyan, Brown, White cycle
      cycleDuration: 150,
      radial: true,
      speed: 3,
      speedVariance: 2,
      angleMin: 0,
      angleMax: 360,
      gravity: -1, // Float upward
      lifespan: 1200,
      lifespanVariance: 0.5,
    },
  },

  steam: {
    name: "Steam",
    type: "line",
    spawnRate: 15,
    spawnVariance: 0.3,
    maxParticles: 80,
    particle: {
      glyphs: ["\u2591", "\u2592", "(", ")", "~"],
      fg: 7, // White
      bg: -1,
      fgCycle: [7, 7, 0, 0], // White -> fade
      cycleDuration: 400,
      velocity: { x: 0, y: -2 },
      velocityVariance: { x: 1, y: 0.5 },
      gravity: -0.5, // Rise faster over time
      lifespan: 1500,
      lifespanVariance: 0.4,
    },
  },

  plasma: {
    name: "Plasma",
    type: "point",
    spawnRate: 25,
    spawnVariance: 0.2,
    maxParticles: 80,
    particle: {
      glyphs: ["\u2588", "\u2593", "\u2592", "\u2591"],
      fg: 5, // Magenta
      bg: -1,
      fgCycle: [5, 4, 6, 4, 5], // Magenta, Cyan, Yellow cycle
      glyphCycle: ["\u2588", "\u2593", "\u2592", "\u2593", "\u2588"],
      cycleDuration: 80,
      radial: true,
      speed: 5,
      speedVariance: 2,
      angleMin: 0,
      angleMax: 360,
      gravity: 0,
      lifespan: 600,
      lifespanVariance: 0.3,
    },
  },
};

/**
 * Create an emitter configuration from a preset
 * @param {string} presetId - Preset ID (rain, snow, etc.)
 * @param {Object} overrides - Optional property overrides
 * @returns {Object} Emitter config for ParticleEmitter constructor
 */
export function createFromPreset(presetId, overrides = {}) {
  const preset = PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}`);
  }

  return {
    ...preset,
    ...overrides,
    particle: {
      ...preset.particle,
      ...(overrides.particle ?? {}),
    },
  };
}

/**
 * Get list of available preset IDs
 * @returns {string[]} Array of preset IDs
 */
export function getPresetIds() {
  return Object.keys(PRESETS);
}

/**
 * Get preset info for UI display
 * @returns {Array<{id: string, name: string}>} Array of preset info
 */
export function getPresetList() {
  return Object.entries(PRESETS).map(([id, preset]) => ({
    id,
    name: preset.name,
  }));
}
