// Archived 2026-07-06: the original colorful nebula level, preserved as a
// loadable snapshot before the live environment became the Debris Field.
const colorNebula = {
  id: "brown_dwarf",
  name: "Brown Dwarf",
  description: "A solitary dim brown dwarf in deep space.",

  spawn: {
    position: [0, 0, -240],
    target: [0, 0, 0],
  },

  player: {
    speed: 12,
    boostSpeed: 42,
  },

  lighting: {
    starAmbient: 0,
  },

  sky: {
    seed: 2300,
    radius: 900,
    background: ["#02040b", "#000000"],
    starLayers: [
      { count: 1800, pointSize: 1.0, brightness: 0.42 },
      { count: 260, pointSize: 1.5, brightness: 0.62 },
      { count: 35, pointSize: 2.2, brightness: 0.8 },
    ],
  },

  nebula: {
    id: "brown_dwarf_orange_nebula",
    seed: 23017,
    position: [0, 0, 0],
    rotation: [0.08, -0.35, 0.12],
    radius: 460,
    renderScale: 0.5,
    volumeResolution: 40,
    occupancyResolution: 10,
    marchSteps: 20,
    minimumMarchSteps: 12,
    temporalBlend: 0.82,
    adaptiveQuality: true,
    density: 0.46,
    absorption: 0.68,
    emissionStrength: 1.08,
    anisotropy: 0.38,
    innerVoid: 0.16,
    outerSoftness: 0.2,
    coolColor: [0.015, 0.9, 1.08],
    violetColor: [0.62, 0.16, 1.22],
    warmColor: [1.35, 0.12, 0.52],
    hotColor: [1.55, 0.42, 0.09],
    coreColor: [2.65, 2.0, 1.45],
    dustColor: [0.004, 0.006, 0.018],
  },

  spriteTypes: {
    brownDwarf: {
      shape: "brownDwarf",
      radius: 1,
      color: [150, 72, 45],
      glow: 0.35,
      metadata: {
        massJupiter: 30,
        radiusJupiter: 1,
        estimatedTemperatureK: 950,
        spectralStyle: "cool T-type",
        atmosphere:
          "Dim near-visible glow, methane absorption, and patchy sulfide/silicate cloud bands.",
      },
    },
  },

  sprites: [
    {
      id: "central_brown_dwarf",
      type: "brownDwarf",
      position: [0, 0, 0],
      scale: 30,
      rotation: -0.08,
      lightIntensity: 1.9,
      lightRange: 650,
      tags: ["star", "brown_dwarf", "navigation_anchor"],
    },
  ],
  structureTypes: {},
  structures: [],
  signals: [],
};

export default colorNebula;
