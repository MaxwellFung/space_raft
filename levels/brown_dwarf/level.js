const brownDwarf = {
  id: "brown_dwarf",
  name: "Brown Dwarf",
  description:
    "A cold, shattered rogue-planet debris field orbiting a dim brown dwarf.",

  spawn: {
    position: [0, 0, -140],
    target: [0, 0, 0],
  },

  player: {
    speed: 12,
    boostSpeed: 42,
  },

  lighting: {
    starAmbient: 0.006,
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
    earthSizedPlanet: {
      shape: "habitablePlanet",
      radius: 1,
      metadata: {
        radiusEarth: 1,
        orbitDistanceAu: 0.0027,
        orbitDistanceJupiterRadii: 5.7,
        note:
          "Earth-sized body placed in the tight infrared temperate shell of the brown dwarf.",
      },
    },
    debrisSwarms: {
      shape: "debrisSwarms",
      metadata: {
        origin:
          "Fresh planet wreckage and disrupted ring material gathered into sparse drifting patches.",
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
    {
      id: "goldilocks_planet",
      type: "earthSizedPlanet",
      position: [86, 8, 147],
      scale: 2.7,
      tags: ["planet", "earth_sized", "goldilocks_zone"],
    },
    {
      id: "orbital_debris_swarms",
      type: "debrisSwarms",
      position: [0, 0, 0],
      seed: 8128,
      swarmCount: 16,
      lanesPerSwarm: 4,
      rocksPerSwarm: 38,
      orbitRadiusMin: 130,
      orbitRadiusMax: 360,
      arcLengthMin: 0.45,
      arcLengthMax: 1.35,
      laneThickness: 0.18,
      laneWidth: 7,
      nearRenderDistance: 85,
      farRenderDistance: 780,
      minRockScale: 0.025,
      maxRockScale: 0.22,
      tags: ["asteroids", "dust", "debris_swarms", "raft_like_patches"],
    },
  ],
  structureTypes: {},
  structures: [],
  signals: [],
};

export default brownDwarf;
