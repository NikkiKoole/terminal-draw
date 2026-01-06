import { DEFAULT_DENSITY_GLYPHS } from "./constants.js";

/**
 * ParticleEmitter - Defines how particles are spawned
 *
 * Stored in scene.particles.emitters, serialized with project.
 * Each emitter is associated with a specific layer for depth ordering.
 */
export class ParticleEmitter {
  /**
   * Create a new particle emitter
   * @param {Object} config - Emitter configuration
   */
  constructor(config = {}) {
    this.id = config.id ?? crypto.randomUUID();
    this.name = config.name ?? "Emitter";
    this.enabled = config.enabled ?? true;

    // Layer association - determines rendering depth
    this.layerId = config.layerId ?? "fg";

    // Emitter type and position
    this.type = config.type ?? "point"; // point | line | area | edge
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    this.width = config.width ?? 1; // For line/area
    this.height = config.height ?? 1; // For area
    this.edge = config.edge ?? "top"; // For edge type: top | bottom | left | right

    // Spawn settings
    this.spawnRate = config.spawnRate ?? 5; // Particles per second
    this.spawnVariance = config.spawnVariance ?? 0.2; // Randomness in timing
    this.maxParticles = config.maxParticles ?? 100; // Cap for this emitter

    // Particle template
    this.particle = {
      glyphs: config.particle?.glyphs ?? ["*"],
      fg: config.particle?.fg ?? 7,
      bg: config.particle?.bg ?? -1,

      // Cycling arrays (animated appearance over lifetime)
      glyphCycle: config.particle?.glyphCycle ?? null,
      fgCycle: config.particle?.fgCycle ?? null,
      bgCycle: config.particle?.bgCycle ?? null,
      cycleDuration: config.particle?.cycleDuration ?? 500,

      // Standard velocity (used when radial is false)
      velocity: config.particle?.velocity ?? { x: 0, y: 1 },
      velocityVariance: config.particle?.velocityVariance ?? { x: 0, y: 0 },

      // Radial emission (particles emit outward from center)
      radial: config.particle?.radial ?? false,
      speed: config.particle?.speed ?? 5, // cells per second (when radial)
      speedVariance: config.particle?.speedVariance ?? 0,
      angleMin: config.particle?.angleMin ?? 0, // degrees (0 = right, 90 = down, 180 = left, 270 = up)
      angleMax: config.particle?.angleMax ?? 360, // full circle by default

      // Gravity (cells per second squared, positive = down)
      gravity: config.particle?.gravity ?? 0,

      // Density accumulation - overlapping particles show denser glyphs
      accumulateDensity: config.particle?.accumulateDensity ?? false,
      densityGlyphs: config.particle?.densityGlyphs ?? DEFAULT_DENSITY_GLYPHS,
      densityColors: config.particle?.densityColors ?? null, // Optional: colors per density level

      lifespan: config.particle?.lifespan ?? null, // ms, null = edge despawn
      lifespanVariance: config.particle?.lifespanVariance ?? 0,
    };

    // Runtime state (not serialized)
    this._timeSinceSpawn = 0;
  }

  /**
   * Get a random spawn position within emitter bounds
   * @param {number} sceneWidth - Scene width (for edge type)
   * @param {number} sceneHeight - Scene height (for edge type)
   * @returns {{x: number, y: number}} Spawn position
   */
  getSpawnPosition(sceneWidth, sceneHeight) {
    switch (this.type) {
      case "point":
        return { x: this.x, y: this.y };

      case "line":
        return {
          x: this.x + Math.random() * this.width,
          y: this.y,
        };

      case "area":
        return {
          x: this.x + Math.random() * this.width + Math.random() * 0.99,
          y: this.y + Math.random() * this.height + Math.random() * 0.99,
        };

      case "edge":
        switch (this.edge) {
          case "top":
            return { x: Math.random() * sceneWidth, y: -1 };
          case "bottom":
            return { x: Math.random() * sceneWidth, y: sceneHeight };
          case "left":
            return { x: -1, y: Math.random() * sceneHeight };
          case "right":
            return { x: sceneWidth, y: Math.random() * sceneHeight };
          default:
            return { x: Math.random() * sceneWidth, y: -1 };
        }

      default:
        return { x: this.x, y: this.y };
    }
  }

  /**
   * Create a new particle from this emitter's template
   * @param {number} sceneWidth
   * @param {number} sceneHeight
   * @returns {Object} Particle config for Particle constructor
   */
  createParticleConfig(sceneWidth, sceneHeight) {
    const pos = this.getSpawnPosition(sceneWidth, sceneHeight);
    const template = this.particle;

    // Random glyph from list
    const glyph =
      template.glyphs[Math.floor(Math.random() * template.glyphs.length)];

    // Calculate velocity
    let vx, vy;

    if (template.radial) {
      // Radial emission: calculate velocity from angle and speed
      const angleDeg =
        template.angleMin +
        Math.random() * (template.angleMax - template.angleMin);
      const angleRad = (angleDeg * Math.PI) / 180;

      // Speed with variance
      const speed =
        template.speed + (Math.random() - 0.5) * 2 * template.speedVariance;

      vx = Math.cos(angleRad) * speed;
      vy = Math.sin(angleRad) * speed;
    } else {
      // Standard velocity with variance
      vx =
        template.velocity.x +
        (Math.random() - 0.5) * 2 * template.velocityVariance.x;
      vy =
        template.velocity.y +
        (Math.random() - 0.5) * 2 * template.velocityVariance.y;
    }

    // Lifespan with variance
    let lifespan = template.lifespan;
    if (lifespan !== null && template.lifespanVariance > 0) {
      lifespan *= 1 + (Math.random() - 0.5) * 2 * template.lifespanVariance;
    }

    return {
      x: pos.x,
      y: pos.y,
      vx,
      vy,
      gravity: template.gravity,
      glyph,
      fg: template.fg,
      bg: template.bg,
      glyphCycle: template.glyphCycle,
      fgCycle: template.fgCycle,
      bgCycle: template.bgCycle,
      cycleDuration: template.cycleDuration,
      accumulateDensity: template.accumulateDensity,
      densityGlyphs: template.densityGlyphs,
      densityColors: template.densityColors,
      lifespan,
      layerId: this.layerId,
      emitterId: this.id,
    };
  }

  /**
   * Serialize emitter for saving
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      enabled: this.enabled,
      layerId: this.layerId,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      edge: this.edge,
      spawnRate: this.spawnRate,
      spawnVariance: this.spawnVariance,
      maxParticles: this.maxParticles,
      particle: {
        glyphs: [...this.particle.glyphs],
        fg: this.particle.fg,
        bg: this.particle.bg,
        glyphCycle: this.particle.glyphCycle
          ? [...this.particle.glyphCycle]
          : null,
        fgCycle: this.particle.fgCycle ? [...this.particle.fgCycle] : null,
        bgCycle: this.particle.bgCycle ? [...this.particle.bgCycle] : null,
        cycleDuration: this.particle.cycleDuration,
        velocity: { ...this.particle.velocity },
        velocityVariance: { ...this.particle.velocityVariance },
        radial: this.particle.radial,
        speed: this.particle.speed,
        speedVariance: this.particle.speedVariance,
        angleMin: this.particle.angleMin,
        angleMax: this.particle.angleMax,
        gravity: this.particle.gravity,
        accumulateDensity: this.particle.accumulateDensity,
        densityGlyphs: this.particle.densityGlyphs
          ? [...this.particle.densityGlyphs]
          : null,
        densityColors: this.particle.densityColors
          ? [...this.particle.densityColors]
          : null,
        lifespan: this.particle.lifespan,
        lifespanVariance: this.particle.lifespanVariance,
      },
    };
  }

  /**
   * Create emitter from saved data
   * @param {Object} obj - Saved emitter data
   * @returns {ParticleEmitter} New emitter instance
   */
  static fromObject(obj) {
    return new ParticleEmitter(obj);
  }
}
