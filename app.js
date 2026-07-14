import baseBrownDwarfLevel from "./levels/brown_dwarf/level.js";
import { createGlbModelPortrait } from "./src/model-preview.js";
import { buildLevel } from "./src/level-system.js";
import { createItemPortrait } from "./src/item-portraits.js";
import { applySaveToLevel, loadSaveFile } from "./src/save-system.js";
import {
  addPolySurfaceHolograms,
  isPolySurfaceHologram,
} from "./src/poly-surface-hologram.js";

const B = window.BABYLON;
const DEFAULT_SAVE_PATH = "./saves/brown-dwarf-default.json";
const canvas = document.querySelector("#sandbox");
const metrics = document.querySelector(".metrics");
const hud = document.querySelector(".hud");
const vitals = document.querySelector(".vitals");
const menuError = document.querySelector("#menu-error");
const loadingScreen = document.querySelector("#loading-screen");
const loadingStatus = document.querySelector("#loading-status");
const savePathInput = document.querySelector("#save-path-input");
const saveFileInput = document.querySelector("#save-file-input");
const hotbar = document.querySelector("#hotbar");
const inventoryModal = document.querySelector("#inventory-modal");
const notebookModal = document.querySelector("#notebook-modal");
const fabricatorModal = document.querySelector("#fabricator-modal");
const oxygenGeneratorModal = document.querySelector("#oxygen-generator-modal");
const batteryModal = document.querySelector("#battery-modal");
const batteryEnergyValue = document.querySelector("#battery-energy-value");
const batteryEnergyFill = document.querySelector("#battery-energy-fill");
const hatchWarningModal = document.querySelector("#hatch-warning-modal");
const hatchWarningActions = document.querySelector("#hatch-warning-actions");
const deathScreen = document.querySelector("#death-screen");
const nearDeathPulse = document.querySelector("#near-death-pulse");
const fabricatorDisassembleButton = document.querySelector(
  "#fabricator-disassemble-button",
);
const fabricatorModeDisassemblyButton = document.querySelector(
  "#fabricator-mode-disassembly",
);
const fabricatorModeFabricationButton = document.querySelector(
  "#fabricator-mode-fabrication",
);
const fabricatorAnalysisStatus = document.querySelector(
  "#fabricator-analysis-status",
);
const fabricatorEnergyValue = document.querySelector(
  "#fabricator-energy-value",
);
const fabricatorEnergyBar = document.querySelector("#fabricator-energy-bar");
const fabricatorRecipesPanel = document.querySelector("#fabricator-recipes");
const fabricatorWorkbench = document.querySelector(".fabricator-workbench");
const fabricatorCategoriesPanel = document.querySelector(
  "#fabricator-categories",
);
const fabricatorCraftItemsPanel = document.querySelector(
  ".fabricator-craft-items-panel",
);
const fabricatorSelectedIcon = document.querySelector(
  "#fabricator-selected-icon",
);
const fabricatorSelectedName = document.querySelector(
  "#fabricator-selected-name",
);
const fabricatorSelectedDescription = document.querySelector(
  "#fabricator-selected-description",
);
const fabricatorRequirementsPanel = document.querySelector(
  "#fabricator-requirements",
);
const fabricatorOutputPanel = document.querySelector(
  "#fabricator-output-panel",
);
const fabricatorOutputList = document.querySelector("#fabricator-output-list");
const oxygenGeneratorWaterValue = document.querySelector(
  "#oxygen-generator-water-value",
);
const oxygenGeneratorWaterBar = document.querySelector(
  "#oxygen-generator-water-bar",
);
const oxygenGeneratorHydrogenValue = document.querySelector(
  "#oxygen-generator-hydrogen-value",
);
const oxygenGeneratorHydrogenBar = document.querySelector(
  "#oxygen-generator-hydrogen-bar",
);
const oxygenGeneratorOxygenValue = document.querySelector(
  "#oxygen-generator-oxygen-value",
);
const oxygenGeneratorOxygenBar = document.querySelector(
  "#oxygen-generator-oxygen-bar",
);
const oxygenGeneratorPressureValue = document.querySelector(
  "#oxygen-generator-pressure-value",
);
const oxygenGeneratorPressureBar = document.querySelector(
  "#oxygen-generator-pressure-bar",
);
const oxygenGeneratorEnergyValue = document.querySelector(
  "#oxygen-generator-energy-value",
);
const oxygenGeneratorEnergyBar = document.querySelector(
  "#oxygen-generator-energy-bar",
);
const oxygenGeneratorStatus = document.querySelector("#oxygen-generator-status");
const oxygenGeneratorRequirements = document.querySelector(
  "#oxygen-generator-requirements",
);
const oxygenGeneratorOutputList = document.querySelector(
  "#oxygen-generator-output-list",
);
const inventoryGrid = document.querySelector(".inventory-grid");
const modalHotbar = document.querySelector(".modal-hotbar");
const clothingGrid = document.querySelector(".clothing-grid");
const notebookTabs = document.querySelector(".notebook-tabs");
const notebookCopy = document.querySelector(".notebook-copy");
const interactionPrompt = document.querySelector("#interaction-prompt");
const inventoryToastLayer = document.querySelector("#inventory-toast-layer");
const backgroundMusic = createBackgroundMusic("./background.mp3");
const BASE_MOUSE_SENSIBILITY = 2600;
const GLB_PICKUP_PROMPT_RANGE = 1.8;
const INTERACTION_UPDATE_SECONDS = 0.08;
const PLACEMENT_UPDATE_SECONDS = 0;
const MENU_STAR_DOME_RADIUS = 900;
const PLACEMENT_RANGE = 3.2;
const PLACEMENT_PADDING = 0.035;
const ASTEROID_PICKUP_RANGE = 2.8;
const ASTEROID_PHYSICS_ACTIVATION_RANGE = 7.5;
const ASTEROID_PHYSICS_ACTIVATION_LIMIT = 12;
const ASTEROID_PHYSICS_ACTIVATION_SECONDS = 0.2;
const FABRICATOR_ASTEROID_MAX_RADIUS = 0.22;
const FABRICATOR_ASTEROID_BOTTOM_CLEARANCE = 0.1;
const FABRICATOR_ASTEROID_FORWARD_OFFSET = 0.06;
const FABRICATOR_ASTEROID_RIGHT_OFFSET = -0.0;
const FABRICATOR_DISASSEMBLE_SECONDS = 10;
const FABRICATOR_CRAFT_SECONDS = FABRICATOR_DISASSEMBLE_SECONDS;
const FABRICATOR_CRAFT_PREVIEW_MAX_SIZE = 0.14;
const FABRICATOR_CRAFT_PREVIEW_MIN_SIZE = 0.055;
const FABRICATOR_LASER_RADIUS = 0.0012;
const FABRICATOR_LASER_CORE_RADIUS = 0.0011;
const FABRICATOR_LASER_GLOW_RADIUS = 0.0048;
const FABRICATOR_LASER_NUB_Y_OFFSET = 0.012;
const FABRICATOR_PRINT_LAYER_COUNT = 48;
const FABRICATOR_PRINT_LINES_PER_LAYER = 18;
const FABRICATOR_TRACE_RING_POINTS = 80;
const FABRICATOR_CRAFT_CONTOUR_UPDATE_SECONDS = 1 / 12;
const FABRICATOR_DISASSEMBLY_ENERGY_COST = 12;
const FABRICATOR_RESOURCE_STACK_LIMIT = 16;
const BATTERY_DEFAULT_ENERGY = 240;
const BATTERY_MAX_ENERGY = 240;
const WIRE_SPOOL_METERS = 10;
const WIRE_METERS_PER_WORLD_UNIT = 1;
const OXYGEN_GENERATOR_WATER_CAPACITY_LITERS = 100;
const OXYGEN_GENERATOR_HYDROGEN_CAPACITY_LITERS = 100;
const OXYGEN_GENERATOR_OXYGEN_CAPACITY_LITERS = 100;
const OXYGEN_GENERATOR_ICE_WATER_LITERS = 25;
const OXYGEN_GENERATOR_WATER_LITERS_PER_SECOND = 0.625;
const OXYGEN_GENERATOR_HYDROGEN_LITERS_PER_SECOND = 0.7;
const OXYGEN_GENERATOR_PRESSURE_KPA_PER_SECOND = 1.25;
const OXYGEN_GENERATOR_ENERGY_PER_SECOND = 0.08;
const OXYGEN_GENERATOR_PRESSURIZED_MULTIPLIER = 0.1;
const OXYGEN_GENERATOR_UPDATE_SECONDS = 0.2;
const SOLAR_PANEL_ENERGY_PER_SECOND = 0.22;
const SOLAR_PANEL_MIN_LIGHT_DOT = 0.05;
const SOLAR_PANEL_OCCLUSION_OFFSET = 0.035;
const ASTEROID_THROW_SPEED = 0.85;
const ASTEROID_BOUNCE_RESTITUTION = 0.68;
const ASTEROID_COLLISION_DAMPING = 0.985;
const ASTEROID_FIELD_STREAM_MIN_SPEED = 0.22;
const ASTEROID_MAX_SPEED = 5.6;
const ASTEROID_CONTACT_SKIN = 0.004;
const ASTEROID_PLAYER_PUSH_FRACTION = 0.42;
const FABRICATOR_BATTERY_WIRE_RADIUS = 0.0048;
const POWER_WIRE_PREVIEW_RADIUS = 0.0062;
const HELD_ASTEROID_DISTANCE = 1.35;
const HELD_ASTEROID_OFFSET = new B.Vector3(0, -0.18, HELD_ASTEROID_DISTANCE);
const TETHER_ATTACH_OFFSET = new B.Vector3(0, -0.36, 0);
const TETHER_SEGMENT_COUNT = 24;
const TETHER_SOLVER_ITERATIONS = 7;
const TETHER_DAMPING = 0.982;
const TETHER_GRAVITY = new B.Vector3(0, -5.6, 0);
const TETHER_SLACK_RESERVE = 0.28;
const TETHER_INITIAL_DEPLOYED_LENGTH = 0.12;
const TETHER_DEPLOY_SPEED = 1.45;
const TETHER_RENDER_SMOOTHING_STEPS = 5;
const TETHER_TAUT_EPSILON = 0.025;
const TETHER_PLATFORM_PULL_CORRECTION_TRANSFER = 0.45;
const TETHER_PLATFORM_PULL_VELOCITY_TRANSFER = 0.16;
const TETHER_PLATFORM_PULL_MAX_ACCELERATION = 1.8;
const FABRICATOR_REFLECTION_PROBE_SIZE = 128;
const ZERO_G_THRUST_ACCELERATION = 1.55;
const ZERO_G_THRUST_BOOST_MULTIPLIER = 1.55;
const ZERO_G_MAX_SPEED = 4.6;
const ZERO_G_THRUSTER_EMIT_RATE = 85;
const ZERO_G_THRUSTER_EMITTER_OFFSET = 0.34;
const HATCH_DECOMPRESSION_INITIAL_IMPULSE = 2.1;
const HATCH_DECOMPRESSION_ACCELERATION = 4.2;
const HATCH_DECOMPRESSION_DURATION = 2.2;
const HATCH_DECOMPRESSION_MAX_SPEED = 4.25;
const HATCH_DECOMPRESSION_EXIT_LEAD = 1.25;
const HATCH_WIND_PARTICLE_SECONDS = 1.15;
const CABIN_PRESSURE_INITIAL_ATM = 0.3;
const CABIN_PRESSURE_VACUUM_ATM = 0;
const HELMET_OXYGEN_MAX_LITERS = 100;
const HELMET_OXYGEN_SECONDS_TO_EMPTY = 600;
const HELMET_OXYGEN_LITERS_PER_SECOND =
  HELMET_OXYGEN_MAX_LITERS / HELMET_OXYGEN_SECONDS_TO_EMPTY;
const PRESSURE_STANDARD_KPA = 100;
const HELMET_REMOVAL_MIN_PRESSURE_KPA = PRESSURE_STANDARD_KPA;
const PRESSURE_DAMAGE_THRESHOLD_KPA = 25;
const PRESSURE_YELLOW_THRESHOLD_KPA = 50;
const PRESSURE_DAMAGE_PER_SECOND = 12;
const PLAYER_HEALTH_MAX = 100;
const PLAYER_FOOD_MAX = 100;
const PLAYER_THIRST_MAX = 100;
const PLAYER_RESTROOM_MAX = 100;
const PLAYER_COMFORT_MAX = 100;
const PLAYER_FOOD_WARNING_PERCENT = 45;
const PLAYER_THIRST_WARNING_PERCENT = 45;
const PLAYER_RESTROOM_WARNING_PERCENT = 45;
const PLAYER_COMFORT_WARNING_PERCENT = 40;
const PLAYER_FOOD_SECONDS_TO_WARNING = 30 * 60;
const PLAYER_THIRST_SECONDS_TO_WARNING = 30 * 60;
const PLAYER_RESTROOM_SECONDS_TO_WARNING = 45 * 60;
const PLAYER_COMFORT_SECONDS_TO_WARNING = 60 * 60;
const PLAYER_TEMPERATURE_SECONDS_TO_HOT = 60 * 60;
const PLAYER_TEMPERATURE_IDEAL_C = 21;
const PLAYER_TEMPERATURE_WARN_DELTA_C = 9;
const PLAYER_TEMPERATURE_CRITICAL_DELTA_C = 16;
const PLAYER_FOOD_DRAIN_PER_SECOND =
  (PLAYER_FOOD_MAX - PLAYER_FOOD_WARNING_PERCENT) /
  PLAYER_FOOD_SECONDS_TO_WARNING;
const PLAYER_THIRST_DRAIN_PER_SECOND =
  (PLAYER_THIRST_MAX - PLAYER_THIRST_WARNING_PERCENT) /
  PLAYER_THIRST_SECONDS_TO_WARNING;
const PLAYER_RESTROOM_DRAIN_PER_SECOND =
  (PLAYER_RESTROOM_MAX - PLAYER_RESTROOM_WARNING_PERCENT) /
  PLAYER_RESTROOM_SECONDS_TO_WARNING;
const PLAYER_COMFORT_DRAIN_PER_SECOND =
  (PLAYER_COMFORT_MAX - PLAYER_COMFORT_WARNING_PERCENT) /
  PLAYER_COMFORT_SECONDS_TO_WARNING;
const PLAYER_TEMPERATURE_HEAT_C_PER_SECOND =
  PLAYER_TEMPERATURE_WARN_DELTA_C / PLAYER_TEMPERATURE_SECONDS_TO_HOT;
const VITAL_STATUS_ORDERS = Object.freeze({
  temperature: 1,
  comfort: 2,
  restroom: 3,
  thirst: 4,
  food: 5,
  oxygen: 6,
});
const VITAL_STATUS_WARN_ORDER_OFFSET = 20;
const VITAL_STATUS_CRITICAL_ORDER_OFFSET = 30;
const NEAR_DEATH_HEALTH_THRESHOLD = 35;
const CROUCH_EYE_HEIGHT_SCALE = 0.76;
const CROUCH_TRANSITION_SPEED = 8;
const CROUCH_SPEED_SCALE = 0.45;
const PLAYER_COLLISION_SKIN = 0.012;
const PLAYER_MAX_LOOK_PITCH = Math.PI / 2 - 0.01;
const THIRD_PERSON_DISTANCE = 0.82;
const THIRD_PERSON_HEIGHT = 0.22;
let gameStarted = false;
let gameBooting = false;
let playerDead = false;

addEventListener("error", (event) =>
  showRuntimeError(event.error ?? event.message),
);
addEventListener("unhandledrejection", (event) =>
  showRuntimeError(event.reason),
);

const keys = new Set();
const movementKeys = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
]);

addEventListener("keydown", (event) => {
  if (!gameStarted) return;
  if (event.code === "F6") {
    event.preventDefault();
    toggleObjectBounds();
    return;
  }
  if (event.code === "F3") {
    event.preventDefault();
    toggleToolTipsVisibility();
    return;
  }
  if (event.code === "F8") {
    event.preventDefault();
    toggleCollisionDebug();
    return;
  }
  if (event.code === "Tab") {
    event.preventDefault();
    toggleInventory();
    return;
  }
  if (event.code === "KeyT") {
    event.preventDefault();
    toggleNotebook();
    return;
  }
  if (event.code === "KeyK") {
    event.preventDefault();
    toggleZeroGravityMode();
    keys.delete("KeyK");
    return;
  }
  if (event.code === "KeyF" && activeInteraction?.type === "fabricator") {
    event.preventDefault();
    openFabricatorModal(activeInteraction.root);
    keys.delete("KeyF");
    return;
  }
  if (event.code === "KeyF" && activeInteraction?.type === "oxygen-generator") {
    event.preventDefault();
    openOxygenGeneratorModal(activeInteraction.root);
    keys.delete("KeyF");
    return;
  }
  if (event.code === "KeyF" && activeInteraction?.type === "battery") {
    event.preventDefault();
    showBatteryEnergy(activeInteraction);
    keys.delete("KeyF");
    return;
  }
  if (event.code === "KeyG" && activeInteraction?.type === "oxygen-generator") {
    event.preventDefault();
    loadSelectedIceIntoOxygenGenerator(activeInteraction.root);
    keys.delete("KeyG");
    return;
  }
  if (event.code === "Escape" && isUiModalOpen()) {
    event.preventDefault();
    closePlayerModals();
    return;
  }
  if (/^Digit[1-9]$/.test(event.code) || event.code === "Digit0") {
    event.preventDefault();
    selectedHotbarIndex =
      event.code === "Digit0" ? 9 : Number(event.code.replace("Digit", "")) - 1;
    renderHotbars();
    refreshPlacementPreview();
    return;
  }
  if (isUiModalOpen()) {
    if (movementKeys.has(event.code)) event.preventDefault();
    return;
  }
  if (event.code === "KeyY") {
    event.preventDefault();
    handlePowerWireKey(activeInteraction);
    keys.delete("KeyY");
    return;
  }
  if (event.code === "KeyR" && getSelectedPlaceableItem()) {
    event.preventDefault();
    rotateSelectedFloorPlacement();
    keys.delete("KeyR");
    return;
  }
  if (event.code === "KeyQ") {
    event.preventDefault();
    if (
      activeInteraction?.type === "helmet-hook" &&
      activeInteraction.mountedRoot
    ) {
      equipHelmet();
    } else if (!toggleTetherFromActiveHook()) {
      equipHelmet();
    }
    keys.delete("KeyQ");
    return;
  }
  if (event.code === "KeyO") {
    event.preventDefault();
    toggleHelmetVisor();
    keys.delete("KeyO");
    return;
  }
  if (event.code === "KeyE" && heldAsteroid) {
    event.preventDefault();
    if (activeInteraction?.type === "fabricator") {
      if (activeInteraction.acceptsHeldAsteroid) {
        placeHeldAsteroidOnFabricator(activeInteraction);
      } else {
        updateInteractionPrompt({ prompt: activeInteraction.prompt });
      }
    } else {
      dropHeldAsteroid();
    }
    keys.delete("KeyE");
    return;
  }
  if (event.code === "KeyE" && activeInteraction) {
    event.preventDefault();
    let interactionHandled = true;
    const openingShipDoor =
      activeInteraction.type === "ship-door" && !activeInteraction.isOpen;
    if (openingShipDoor) {
      openHatchWarningModal(activeInteraction);
      keys.delete("KeyE");
      return;
    }
    if (
      activeInteraction.type === "pickup" ||
      activeInteraction.type === "battery"
    ) {
      interactionHandled = collectPickupInteraction(activeInteraction);
    } else if (activeInteraction.type === "helmet-hook") {
      interactionHandled = activateHelmetHook(activeInteraction);
    } else if (activeInteraction.type === "fabricator") {
      interactionHandled = collectFabricatorInteraction(activeInteraction);
    } else if (activeInteraction.type === "oxygen-generator") {
      interactionHandled = collectOxygenGeneratorInteraction(activeInteraction);
    } else {
      const result = activeInteraction.activate?.();
      interactionHandled = result !== false;
    }
    keys.delete("KeyE");
    if (interactionHandled) updateInteractionPrompt(null);
    return;
  }
  if (movementKeys.has(event.code)) event.preventDefault();
  keys.add(event.code);
});
addEventListener("keyup", (event) => {
  if (gameStarted) keys.delete(event.code);
});

const timeSpeeds = [0, 0.25, 1, 4, 16, 64];
let timeSpeedIndex = 2;
let flyMode = false;
let zeroGravityMode = true;
let toolTipsVisible = false;
let selectedHotbarIndex = 0;
let selectedNotebookPage = "objectives";
let brownDwarfLevel = null;
let currentSaveFile = null;
let menuEngine = null;
let menuScene = null;
let menuCamera = null;
let engine = null;
let scene = null;
let performanceMonitor = null;
let camera = null;
let thirdPersonCamera = null;
let thirdPersonMode = false;
let level = null;
let playerPhysics = null;
let zeroGravityVelocity = B.Vector3.Zero();
let zeroGravityThrusterEffect = null;
let zeroGravityThrusterActive = false;
let hatchDecompression = null;
let timeButton = null;
let flyButton = null;
let cameraButton = null;
let visorButton = null;
let saveStartButton = null;
let playerHealth = PLAYER_HEALTH_MAX;
let playerFood = PLAYER_FOOD_MAX;
let playerThirst = PLAYER_THIRST_MAX;
let playerRestroom = PLAYER_RESTROOM_MAX;
let playerComfort = PLAYER_COMFORT_MAX;
let playerTemperatureC = PLAYER_TEMPERATURE_IDEAL_C;
let mainIssueRoot = null;
let mainIssueText = null;
let oxygenStatusRoot = null;
let oxygenPressureText = null;
let oxygenStatusText = null;
let healthMeterRoot = null;
let healthMeter = null;
let healthMeterFill = null;
let foodStatusRoot = null;
let foodStatusText = null;
let thirstStatusRoot = null;
let thirstStatusText = null;
let restroomStatusRoot = null;
let restroomStatusText = null;
let comfortStatusRoot = null;
let comfortStatusText = null;
let temperatureStatusRoot = null;
let temperatureStatusText = null;
let mouseSensitivitySlider = null;
let mouseSensitivityValue = null;
let activeInteraction = null;
let transientPromptUntil = 0;
let objectBoundsVisible = false;
let collisionDebugVisible = false;
let draggedInventorySlot = null;
let placementPreview = null;
let placementPreviewKey = "";
let placementPreviewLoadId = 0;
let placementState = null;
let placementInProgress = false;
let floorPlacementYaw = 0;
let interactionUpdateElapsed = Number.POSITIVE_INFINITY;
let placementUpdateElapsed = Number.POSITIVE_INFINITY;
let asteroidPhysicsActivationElapsed = Number.POSITIVE_INFINITY;
let oxygenGeneratorUpdateElapsed = Number.POSITIVE_INFINITY;
let mountedHooksInitialized = false;
let equippedHelmet = null;
let helmetEquipInProgress = false;
let playerTether = null;
let playerPlaceholderRig = null;
let heldAsteroid = null;
let pendingPowerWire = null;
let activeFabricatorRoot = null;
let activeOxygenGeneratorRoot = null;
let fabricatorAnalysisStaticKey = "";
let pendingHatchInteraction = null;
let cabinPressureAtm = CABIN_PRESSURE_INITIAL_ATM;
let helmetOxygenLiters = HELMET_OXYGEN_MAX_LITERS;
let helmetOxygenMeter = null;
let helmetOxygenFill = null;
let helmetOxygenText = null;
const asteroidBodies = new Set();
const powerConnectionWires = new Set();
const fabricatorDisassemblyJobs = new Set();
const fabricatorCraftJobs = new Set();

const fabricatorResourceItems = {
  iron: {
    id: "iron",
    name: "Iron Ingot",
    icon: "Fe",
    swatch: "#a7adb1",
    portraitModelUrl: "./assets/raw_materials/iron_ingot.glb",
    portraitRotation: [0.34, 1.56, -0.32],
  },
  copper: {
    id: "copper",
    name: "Copper Ingot",
    icon: "Cu",
    swatch: "#c8753e",
    portraitModelUrl: "./assets/raw_materials/copper_ingot.glb",
    portraitRotation: [0.34, 1.56, -0.32],
  },
  water: {
    id: "water",
    name: "Ice",
    icon: "H2O",
    swatch: "#58b9e8",
    portraitModelUrl: "./assets/raw_materials/ice.glb",
    portraitRotation: [0.12, -0.62, 0],
  },
  silicon: {
    id: "silicon",
    name: "Silicon",
    icon: "Si",
    swatch: "#b8c7c4",
    portraitModelUrl: "./assets/raw_materials/silicon.glb",
    portraitRotation: [0.18, 0.74, -0.08],
  },
};

const FABRICATOR_DISASSEMBLY_ENTRY = {
  id: "disassemble-asteroid",
  name: "Disassemble Asteroid",
  description: "Break the loaded asteroid into raw materials.",
  type: "disassembly",
  icon: "refine",
};

const fabricatorCategories = [
  {
    id: "vitals",
    name: "Vitals",
    icon: "vitals",
    description: "Life support and cabin survival systems.",
  },
  {
    id: "electricity",
    name: "Electricity",
    icon: "electricity",
    description: "Power storage and generation equipment.",
  },
  {
    id: "mining",
    name: "Mining",
    icon: "mining",
    description: "Extraction, refining, and field tools.",
  },
];

const fabricatorRecipes = [
  createFabricatorRecipe("airlock", "Airlock", 5, 3, 42, {
    category: "vitals",
    craftIcon: "airlock",
    description: "Seals a doorway so pressure can be managed safely.",
    silicon: 3,
  }),
  createFabricatorRecipe("oxygen-generator", "Oxygen Generator", 3, 2, 36, {
    category: "vitals",
    craftIcon: "oxygen-generator",
    description: "Splits stored water into breathable oxygen reserves.",
    modelUrl: "./assets/oxygen_generator.glb",
    portraitModelUrl: "./assets/oxygen_generator.glb",
    maxSize: 0.32,
    placementSurface: "floor",
    stackLimit: 1,
  }),
  createFabricatorRecipe("battery", "Battery", 3, 3, 30, {
    category: "electricity",
    craftIcon: "battery",
    description: "Stores energy for fabricators and powered systems.",
    modelUrl: "./assets/battery.glb",
    maxSize: 0.22,
    energyStored: BATTERY_DEFAULT_ENERGY,
    maxEnergy: BATTERY_MAX_ENERGY,
  }),
  createFabricatorRecipe("wire-spool", "Wire Spool", 0, 2, 12, {
    category: "electricity",
    craftIcon: "wire",
    description: "Carries ten meters of insulated wire for power links.",
    silicon: 1,
    icon: "W",
    swatch: "#b85042",
    wireMeters: WIRE_SPOOL_METERS,
    maxWireMeters: WIRE_SPOOL_METERS,
    stackLimit: 1,
  }),
  createFabricatorRecipe("solar-panel", "Solar Panel", 0, 3, 48, {
    category: "electricity",
    craftIcon: "solar-panel",
    description: "Generates charge when it can see stellar light.",
    silicon: 3,
    modelUrl: "./assets/solar_panel.glb",
    portraitModelUrl: "./assets/solar_panel.glb",
    maxSize: 0.56,
    placementSurface: "exterior",
    stackLimit: 1,
    solarEnergyPerSecond: SOLAR_PANEL_ENERGY_PER_SECOND,
  }),
  createFabricatorRecipe("drill", "Drill", 2, 1, 18, {
    category: "mining",
    craftIcon: "drill",
    description: "Cuts dense fragments loose for processing.",
  }),
  createFabricatorRecipe("build-tool", "Build Tool", 2, 3, 28, {
    category: "mining",
    craftIcon: "build-tool",
    description: "Places and adjusts constructed modules.",
  }),
  createFabricatorRecipe("research-machine", "Research Machine", 4, 5, 54, {
    category: "mining",
    craftIcon: "research-machine",
    description: "Analyzes samples and unlocks fabrication notes.",
  }),
];

const inventoryItems = Array.from({ length: 20 }, () => null);
const hotbarItems = Array.from({ length: 10 }, () => null);

const notebookPages = [
  {
    id: "objectives",
    title: "Objectives",
    copy: [
      "Maintain suit reserves while mapping the shattered-planet debris stream.",
      "Catalog dense fragment veins and keep the ship's forward glass intact.",
    ],
  },
  {
    id: "ship",
    title: "Ship Notes",
    copy: [
      "Interior light discipline is active. Brown-dwarf light through the windows is the primary illumination source.",
      "Hull contact alarms should be treated as urgent while crossing dense fields.",
    ],
  },
  {
    id: "dwarf",
    title: "Brown Dwarf",
    copy: [
      "The primary is cool, massive, and visibly turbulent in near-visible bands.",
      "Thermal cells recharge slowly when the canopy has a direct line of sight.",
    ],
  },
  {
    id: "materials",
    title: "Materials",
    copy: [
      "Alloy fragments are common near basalt clusters. Thermal crystals appear in brighter reentry scars.",
      "Sealant coils and circuit wafers are limited; keep reserves visible before long exterior walks.",
    ],
  },
  {
    id: "signals",
    title: "Signals",
    copy: [
      "No stable distress signal yet. The debris cloud is noisy with reflected thermal pulses.",
      "Beacon drops will be indexed here once navigation tools are active.",
    ],
  },
];

installMainMenu();
installPlayerUi();
startMenuBackground();

function installMainMenu() {
  const querySave = new URLSearchParams(location.search).get("save");
  if (querySave) savePathInput.value = querySave;

  document
    .querySelector("#new-game-button")
    .addEventListener("click", () => startGameFromPath(DEFAULT_SAVE_PATH));
  document
    .querySelector("#load-save-button")
    .addEventListener("click", () => startGameFromPath(savePathInput.value));
  document
    .querySelector("#browse-save-button")
    .addEventListener("click", () => saveFileInput.click());
  saveFileInput.addEventListener("change", () => {
    const [file] = saveFileInput.files;
    if (file) startGameFromFile(file);
  });
}

function installPlayerUi() {
  inventoryModal.addEventListener("click", (event) => {
    if (event.target === inventoryModal) closePlayerModals();
  });
  notebookModal.addEventListener("click", (event) => {
    if (event.target === notebookModal) closePlayerModals();
  });
  fabricatorModal?.addEventListener("click", (event) => {
    if (event.target === fabricatorModal) closePlayerModals();
  });
  oxygenGeneratorModal?.addEventListener("click", (event) => {
    if (event.target === oxygenGeneratorModal) closePlayerModals();
  });
  batteryModal?.addEventListener("click", (event) => {
    if (event.target === batteryModal) closePlayerModals();
  });
  hatchWarningModal?.addEventListener("click", (event) => {
    if (event.target === hatchWarningModal) closePlayerModals();
  });
  fabricatorDisassembleButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    activateFabricatorPrimaryButton();
  });
  fabricatorModeDisassemblyButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    setFabricatorMode(activeFabricatorRoot, "disassembly");
  });
  fabricatorModeFabricationButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    setFabricatorMode(activeFabricatorRoot, "fabrication");
  });
  renderHotbars();
  renderInventoryGrid();
  renderClothingGrid();
  renderNotebook();
  updateQuickAccessButtons();
}

function renderHotbars() {
  hotbar.replaceChildren(
    ...hotbarItems.map((entry, index) =>
      createItemSlot(entry, index, {
        items: hotbarItems,
        selected: index === selectedHotbarIndex,
        key: index === 9 ? "0" : String(index + 1),
        onClick: () => {
          selectedHotbarIndex = index;
          renderHotbars();
          refreshPlacementPreview();
        },
      }),
    ),
  );
  modalHotbar.replaceChildren(
    ...hotbarItems.map((entry, index) =>
      createItemSlot(entry, index, {
        items: hotbarItems,
        selected: index === selectedHotbarIndex,
        key: index === 9 ? "0" : String(index + 1),
        onClick: () => {
          selectedHotbarIndex = index;
          renderHotbars();
          refreshPlacementPreview();
        },
      }),
    ),
  );
}

function renderInventoryGrid() {
  const slots = Array.from({ length: 20 }, (_, index) =>
    createItemSlot(inventoryItems[index] ?? null, index, {
      items: inventoryItems,
    }),
  );
  inventoryGrid.replaceChildren(...slots);
  renderClothingGrid();
}

function renderClothingGrid() {
  if (!clothingGrid) return;

  const slots = [
    createClothingSlot({
      label: "Helmet",
      entry: equippedHelmet?.item ?? null,
      accepts: isHelmetItem,
      onDrop: (slot) => equipHelmetFromInventory(slot),
      dragState: {
        type: "equipped-helmet",
        getEntry: () => equippedHelmet?.item ?? null,
      },
    }),
    createClothingSlot({ label: "Suit" }),
    createClothingSlot({ label: "Gloves" }),
    createClothingSlot({ label: "Boots" }),
  ];
  clothingGrid.replaceChildren(...slots);
}

function createClothingSlot({
  label,
  entry = null,
  accepts = null,
  onDrop = null,
  dragState = null,
}) {
  const wrapper = document.createElement("div");
  wrapper.className = "clothing-slot";

  const slot = createItemSlot(entry, 0, {
    locked: true,
    placeholder: label.slice(0, 1),
  });
  slot.classList.add("clothing-item-slot");
  slot.title = entry
    ? createInventoryItemTooltip(entry)
    : `${label} clothing slot`;

  if (accepts && onDrop) {
    installClothingSlotDropHandlers(slot, accepts, onDrop);
  }
  if (entry && dragState) {
    installEquippedClothingDragHandlers(slot, dragState);
  }

  const name = document.createElement("span");
  name.className = "clothing-slot-label";
  name.textContent = label;
  wrapper.append(slot, name);
  return wrapper;
}

function renderNotebook() {
  notebookTabs.replaceChildren(
    ...notebookPages.map((page) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `notebook-tab${
        page.id === selectedNotebookPage ? " active" : ""
      }`;
      button.textContent = page.title;
      button.addEventListener("click", () => {
        selectedNotebookPage = page.id;
        renderNotebook();
      });
      return button;
    }),
  );

  const page =
    notebookPages.find((candidate) => candidate.id === selectedNotebookPage) ??
    notebookPages[0];
  notebookCopy.replaceChildren(
    ...page.copy.map((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      return paragraph;
    }),
  );
}

function createItemSlot(entry, index, options = {}) {
  const slot = document.createElement("div");
  slot.className = `item-slot${options.selected ? " selected" : ""}`;
  slot.role = options.onClick ? "button" : "img";
  slot.tabIndex = options.onClick ? 0 : -1;
  if (options.items && !options.locked) {
    installSlotDragHandlers(slot, entry, {
      items: options.items,
      index,
    });
  }
  if (options.onClick) {
    slot.addEventListener("click", options.onClick);
    slot.addEventListener("keydown", (event) => {
      if (event.code === "Enter" || event.code === "Space") {
        event.preventDefault();
        options.onClick();
      }
    });
  }

  const key = document.createElement("span");
  key.className = "slot-key";
  key.textContent = options.key ?? "";

  if (entry) {
    const { count = 1, icon = "", name = "", portrait = "" } = entry;
    slot.title = createInventoryItemTooltip(entry);
    if (portrait) {
      const image = document.createElement("img");
      image.className = "slot-portrait";
      image.alt = "";
      image.src = portrait;
      slot.append(image);
    } else if (isFabricatorResourceItem(entry)) {
      hydrateInventoryPortrait(entry, entry);
      const preview = document.createElement("span");
      preview.className = "slot-portrait slot-portrait-loading";
      slot.append(preview);
    } else if (entry.modelUrl) {
      hydrateInventoryPortrait(entry, entry);
      const preview = document.createElement("span");
      preview.className = "slot-portrait slot-portrait-loading";
      slot.append(preview);
    } else {
      const iconLabel = document.createElement("span");
      iconLabel.textContent = icon;
      slot.append(iconLabel);
    }
    if (count > 1) {
      const countLabel = document.createElement("span");
      countLabel.className = "slot-count";
      countLabel.textContent = String(count);
      slot.append(countLabel);
    }
  } else if (options.placeholder) {
    const placeholder = document.createElement("span");
    placeholder.className = "slot-placeholder";
    placeholder.textContent = options.placeholder;
    slot.append(placeholder);
  }
  slot.append(key);
  return slot;
}

function createInventoryItemTooltip(item) {
  if (!item) return "";

  const lines = [item.name ?? item.label ?? item.id ?? "Item"];
  const count = item.count ?? 1;
  if (item.id) lines.push(`ID: ${item.id}`);
  if (count > 1) lines.push(`Count: ${count}`);

  const stackLimit = getItemStackLimit(item);
  if (Number.isFinite(stackLimit)) {
    lines.push(`Stack: ${count}/${stackLimit}`);
  }
  if (isWireItem(item)) {
    lines.push(
      `Wire: ${formatWireMeters(getWireMetersOnSpool(item))}/${formatWireMeters(
        getWireSpoolMaxMeters(item),
      )}`,
    );
  }
  if (isBatteryItem(item)) {
    const stored = Number(item.energyStored ?? item.energy);
    const max = Number(item.maxEnergy ?? BATTERY_MAX_ENERGY);
    if (Number.isFinite(stored) || Number.isFinite(max)) {
      lines.push(
        `Energy: ${Math.round(Number.isFinite(stored) ? stored : 0)}/${Math.round(
          Number.isFinite(max) ? max : BATTERY_MAX_ENERGY,
        )} E`,
      );
    }
  }
  if (item.placementSurface) {
    lines.push(`Placement: ${formatMetadataValue(item.placementSurface)}`);
  }
  if (item.modelUrl) {
    lines.push(`Model: ${getMetadataFileName(item.modelUrl)}`);
  }

  const excluded = new Set([
    "id",
    "name",
    "label",
    "count",
    "icon",
    "swatch",
    "portrait",
    "modelUrl",
    "portraitModelUrl",
    "modelPortraitLoaded",
    "modelPortraitLoading",
    "modelPortraitFailed",
    "placementSurface",
    "wireMeters",
    "maxWireMeters",
    "energy",
    "energyStored",
    "maxEnergy",
    "stackLimit",
    "visor",
    "animationGroups",
    "importedAnimationGroups",
  ]);
  for (const [key, value] of Object.entries(item)) {
    if (excluded.has(key) || value === undefined || value === null) continue;
    if (!isTooltipMetadataValue(value)) continue;
    lines.push(`${formatMetadataKey(key)}: ${formatMetadataValue(value)}`);
  }

  return lines.join("\n");
}

function isTooltipMetadataValue(value) {
  if (["string", "number", "boolean"].includes(typeof value)) return true;
  if (Array.isArray(value)) {
    return value.every((entry) =>
      ["string", "number", "boolean"].includes(typeof entry),
    );
  }
  return false;
}

function formatMetadataKey(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMetadataValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => formatMetadataValue(entry)).join(", ");
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function getMetadataFileName(path) {
  return String(path).split(/[\\/]/).filter(Boolean).pop() ?? String(path);
}

function installClothingSlotDropHandlers(slot, accepts, onDrop) {
  slot.addEventListener("dragover", (event) => {
    const sourceSlot = draggedInventorySlot;
    if (sourceSlot?.type === "equipped-helmet") return;
    const entry = getDraggedSlotEntry(sourceSlot);
    if (!entry || !accepts(entry)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    slot.classList.add("drag-over");
  });
  slot.addEventListener("dragleave", () => {
    slot.classList.remove("drag-over");
  });
  slot.addEventListener("drop", (event) => {
    const sourceSlot = draggedInventorySlot;
    if (sourceSlot?.type === "equipped-helmet") return;
    const entry = getDraggedSlotEntry(sourceSlot);
    event.preventDefault();
    slot.classList.remove("drag-over");
    draggedInventorySlot = null;
    if (!entry || !accepts(entry)) {
      updateInteractionPrompt({ prompt: "Wrong clothing slot" });
      return;
    }
    onDrop(sourceSlot);
  });
}

function installEquippedClothingDragHandlers(slot, slotState) {
  slot.draggable = true;
  slot.addEventListener("dragstart", (event) => {
    const entry = getDraggedSlotEntry(slotState);
    if (!entry) {
      event.preventDefault();
      return;
    }
    draggedInventorySlot = slotState;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", entry.id ?? "item");
    slot.classList.add("dragging");
  });
  slot.addEventListener("dragend", () => {
    draggedInventorySlot = null;
    slot.classList.remove("dragging");
    slot.classList.remove("drag-over");
  });
}

function installSlotDragHandlers(slot, entry, slotState) {
  slot.draggable = Boolean(entry);
  slot.addEventListener("dragstart", (event) => {
    if (!entry) {
      event.preventDefault();
      return;
    }
    draggedInventorySlot = slotState;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", entry.id ?? "item");
    slot.classList.add("dragging");
  });
  slot.addEventListener("dragend", () => {
    draggedInventorySlot = null;
    slot.classList.remove("dragging");
    slot.classList.remove("drag-over");
  });
  slot.addEventListener("dragover", (event) => {
    if (!draggedInventorySlot) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    slot.classList.add("drag-over");
  });
  slot.addEventListener("dragleave", () => {
    slot.classList.remove("drag-over");
  });
  slot.addEventListener("drop", (event) => {
    event.preventDefault();
    slot.classList.remove("drag-over");
    moveInventorySlot(slotState);
  });
}

function moveInventorySlot(targetSlot) {
  const sourceSlot = draggedInventorySlot;
  draggedInventorySlot = null;
  if (!sourceSlot) return;
  if (sourceSlot.type === "equipped-helmet") {
    moveEquippedHelmetToSlot(targetSlot);
    return;
  }
  if (
    sourceSlot.items === targetSlot.items &&
    sourceSlot.index === targetSlot.index
  ) {
    return;
  }

  const sourceEntry = sourceSlot.items[sourceSlot.index];
  if (!sourceEntry) return;

  const targetEntry = targetSlot.items[targetSlot.index];
  if (targetEntry?.id && targetEntry.id === sourceEntry.id) {
    const stackLimit = getItemStackLimit(targetEntry);
    const targetCount = targetEntry.count ?? 1;
    const sourceCount = sourceEntry.count ?? 1;
    const room = Number.isFinite(stackLimit)
      ? Math.max(0, stackLimit - targetCount)
      : sourceCount;
    const moved = Math.min(room, sourceCount);
    if (moved > 0) {
      targetEntry.count = targetCount + moved;
      sourceEntry.count = sourceCount - moved;
    }
    if ((sourceEntry.count ?? 0) <= 0) {
      sourceSlot.items[sourceSlot.index] = null;
    }
  } else {
    sourceSlot.items[sourceSlot.index] = targetEntry ?? null;
    targetSlot.items[targetSlot.index] = sourceEntry;
  }

  renderHotbars();
  renderInventoryGrid();
  refreshPlacementPreview();
}

function getDraggedSlotEntry(slotState) {
  if (!slotState) return null;
  if (typeof slotState.getEntry === "function") {
    return slotState.getEntry();
  }
  return slotState.items?.[slotState.index] ?? null;
}

function moveEquippedHelmetToSlot(targetSlot) {
  if (!equippedHelmet) return false;

  const item = equippedHelmet.item;
  if (!canMoveItemToTargetSlot(item, targetSlot)) {
    updateInteractionPrompt({ prompt: "Choose an empty slot" });
    return false;
  }

  return takeOffHelmet(targetSlot);
}

function canMoveItemToTargetSlot(item, targetSlot) {
  if (!item || !targetSlot?.items) return false;

  const targetEntry = targetSlot.items[targetSlot.index];
  if (!targetEntry) return true;
  if (targetEntry.id !== item.id) return false;

  const stackLimit = getItemStackLimit(targetEntry);
  if (!Number.isFinite(stackLimit)) return true;
  return (targetEntry.count ?? 1) < stackLimit;
}

function addItemToTargetSlot(item, targetSlot) {
  if (!canMoveItemToTargetSlot(item, targetSlot)) return false;

  const targetEntry = targetSlot.items[targetSlot.index];
  if (!targetEntry) {
    targetSlot.items[targetSlot.index] = item;
    return true;
  }

  targetEntry.count = (targetEntry.count ?? 1) + (item.count ?? 1);
  return true;
}

function collectPickupInteraction(interaction) {
  const item = interaction.item ?? {};
  if (!addInventoryItemCount(item, 1)) {
    updateInteractionPrompt({ prompt: "Inventory full" });
    return false;
  }

  interaction.activate?.();
  renderHotbars();
  renderInventoryGrid();
  refreshPlacementPreview();
  if (isBatteryItem(item) || isFabricatorItem(item)) {
    queuePowerConnectionWireRefresh();
  }
  return true;
}

function mergeItemMetadata(entry, item) {
  for (const key of [
    "modelUrl",
    "rotation",
    "maxSize",
    "floorOffset",
    "swatch",
    "placementSurface",
    "placement",
    "wallGap",
    "wallRotation",
    "wallRotationDegrees",
    "portraitModelUrl",
    "portraitRotation",
    "stackLimit",
    "oxygenGenerator",
  ]) {
    if (item[key] !== undefined) entry[key] = item[key];
  }
}

function findInventoryEntry(id) {
  return [...hotbarItems, ...inventoryItems].find((entry) => entry?.id === id);
}

function findEmptyInventorySlot() {
  const hotbarIndex = hotbarItems.findIndex((entry) => !entry);
  if (hotbarIndex !== -1) {
    return { items: hotbarItems, index: hotbarIndex };
  }

  const inventoryIndex = inventoryItems.findIndex((entry) => !entry);
  if (inventoryIndex !== -1) {
    return { items: inventoryItems, index: inventoryIndex };
  }

  return null;
}

function hydrateInventoryPortrait(entry, item) {
  if (
    entry.portrait ||
    entry.modelPortraitLoading
  ) {
    return;
  }
  if (entry.modelPortraitFailed) {
    applyInventoryFallbackPortrait(entry, item);
    return;
  }
  entry.modelPortraitLoading = true;

  const portraitModelUrl = getInventoryPortraitModelUrl(item);
  if (!portraitModelUrl) {
    entry.modelPortraitLoading = false;
    return;
  }

  createInventoryPortraitDataUrl(item)
    .then((portrait) => {
      entry.modelPortraitLoading = false;
      if (!portrait) {
        applyInventoryFallbackPortrait(entry, item);
        return;
      }
      entry.portrait = portrait;
      entry.modelPortraitLoaded = true;
      renderHotbars();
      renderInventoryGrid();
    })
    .catch(() => {
      entry.modelPortraitLoading = false;
      applyInventoryFallbackPortrait(entry, item);
    });
}

function applyInventoryFallbackPortrait(entry, item) {
  entry.modelPortraitLoading = false;
  entry.modelPortraitFailed = true;
  entry.portrait = createItemPortrait(item);
  renderHotbars();
  renderInventoryGrid();
}

function getInventoryPortraitModelUrl(item) {
  const resource = fabricatorResourceItems[item?.id];
  return (
    item?.portraitModelUrl ?? resource?.portraitModelUrl ?? item?.modelUrl ?? ""
  );
}

function getInventoryPortraitRotation(item) {
  const resource = fabricatorResourceItems[item?.id];
  return (
    item?.portraitRotation ??
    resource?.portraitRotation ??
    item?.rotation ??
    item?.rotationDegrees
  );
}

function createInventoryPortraitDataUrl(item) {
  const portraitModelUrl = getInventoryPortraitModelUrl(item);
  if (!portraitModelUrl) return Promise.resolve(null);
  return createGlbModelPortrait(portraitModelUrl, {
    rotation: getInventoryPortraitRotation(item),
  });
}

function isFabricatorResourceItem(item) {
  return Boolean(item?.id && fabricatorResourceItems[item.id]);
}

function getSelectedPlaceableItem() {
  const entry = hotbarItems[selectedHotbarIndex];
  if (!entry?.modelUrl) return null;
  return entry;
}

function handleCanvasPointerDown(event) {
  if (!gameStarted || event.button !== 0) return;
  if (isUiModalOpen()) return;

  const item = getSelectedPlaceableItem();
  if (item && placementState?.valid && !placementInProgress) {
    event.preventDefault();
    placeSelectedItem();
    return;
  }

  canvas.requestPointerLock?.();
}

function refreshPlacementPreview() {
  if (!scene || !level?.platform) return;

  const item = getSelectedPlaceableItem();
  const key = item ? `${item.id}:${item.modelUrl}` : "";
  if (key === placementPreviewKey) return;

  placementPreviewKey = key;
  placementPreviewLoadId += 1;
  placementState = null;
  disposePlacementPreview();

  if (!item) return;
  loadPlacementPreview(item, placementPreviewLoadId);
}

async function loadPlacementPreview(item, loadId) {
  try {
    const root = await loadItemModelRoot(item, {
      name: `${item.id ?? "item"}-placement-preview`,
      pickable: false,
      hologram: true,
    });
    if (loadId !== placementPreviewLoadId || !getSelectedPlaceableItem()) {
      root.dispose(false, true);
      return;
    }

    root.setEnabled(false);
    placementPreview = {
      root,
      validMaterial: createPlacementMaterial("placement-valid", true),
      invalidMaterial: createPlacementMaterial("placement-invalid", false),
    };
    applyPlacementPreviewMaterial(placementPreview, false);
  } catch (error) {
    console.error("Failed to load placement preview.", error);
  }
}

function disposePlacementPreview() {
  placementPreview?.root?.dispose(false, true);
  placementPreview?.validMaterial?.dispose();
  placementPreview?.invalidMaterial?.dispose();
  placementPreview = null;
}

async function placeSelectedItem() {
  const item = getSelectedPlaceableItem();
  const state = placementState;
  if (!item || !state?.valid || placementInProgress) return;

  placementInProgress = true;
  try {
    const root = await loadItemModelRoot(item, {
      name: `${item.id ?? "item"}-placed`,
      pickable: true,
    });
    applyPlacementStateToRoot(root, item, state);
    refreshFabricatorReflectionProbe(root, item);
    installPlacedItemMetadata(root, item);
    refreshPowerConnectionWires();

    consumeSelectedHotbarItem();
    renderHotbars();
    renderInventoryGrid();
    refreshPlacementPreview();
  } finally {
    placementInProgress = false;
  }
}

function consumeSelectedHotbarItem() {
  const entry = hotbarItems[selectedHotbarIndex];
  if (!entry) return;

  const count = entry.count ?? 1;
  if (count > 1) {
    entry.count = count - 1;
  } else {
    hotbarItems[selectedHotbarIndex] = null;
  }
}

function activateHelmetHook(interaction) {
  if (interaction.mountedRoot) {
    return takeHelmetFromHook(interaction);
  }

  const slot = findHelmetInventorySlot();
  if (!slot) {
    updateInteractionPrompt({ prompt: "Helmet required" });
    return false;
  }

  mountHelmetOnHook(interaction, slot);
  return true;
}

function toggleTetherFromActiveHook() {
  if (activeInteraction?.type !== "helmet-hook") return false;

  if (playerTether?.interaction === activeInteraction) {
    detachPlayerTether("Tether detached");
    return true;
  }

  attachPlayerTether(activeInteraction);
  return true;
}

function triggerHatchDecompression(interaction) {
  if (!interaction) return;

  const pressureScale = getCabinPressureScale();
  if (pressureScale <= 0.001) {
    cabinPressureAtm = CABIN_PRESSURE_VACUUM_ATM;
    return;
  }

  const outflowDirection = getHatchOutflowDirection(interaction);
  const suctionDirection = getHatchSuctionDirection(interaction);
  hatchDecompression = {
    interaction,
    outflowDirection,
    startPressureAtm: cabinPressureAtm,
    pressureScale,
    elapsed: 0,
    duration: HATCH_DECOMPRESSION_DURATION,
  };
  zeroGravityMode = true;
  zeroGravityVelocity.addInPlace(
    suctionDirection.scale(HATCH_DECOMPRESSION_INITIAL_IMPULSE * pressureScale),
  );
  clampVectorLengthInPlace(zeroGravityVelocity, HATCH_DECOMPRESSION_MAX_SPEED);
  if (playerPhysics) {
    playerPhysics.grounded = false;
    playerPhysics.verticalVelocity = zeroGravityVelocity.y;
  }
  createHatchWindBurst(interaction, outflowDirection, pressureScale);
  updateQuickAccessButtons();
  updateLifeSupportHud();
}

function updateHatchDecompression(seconds) {
  if (!hatchDecompression) return;

  const progress = hatchDecompression.elapsed / hatchDecompression.duration;
  const pressureProgress = smoothstep(0, 1, progress);
  cabinPressureAtm = Math.max(
    CABIN_PRESSURE_VACUUM_ATM,
    hatchDecompression.startPressureAtm * (1 - pressureProgress),
  );
  const remaining = Math.max(0, 1 - progress);
  const falloff = 0.28 + remaining * remaining * 0.72;
  const pressureScale = hatchDecompression.pressureScale ?? 1;
  const direction = getHatchSuctionDirection(
    hatchDecompression.interaction,
    hatchDecompression.outflowDirection,
  );
  const distanceBoost = getHatchSuctionDistanceBoost(
    hatchDecompression.interaction,
  );
  zeroGravityVelocity.addInPlace(
    direction.scale(
      HATCH_DECOMPRESSION_ACCELERATION *
        pressureScale *
        falloff *
        distanceBoost *
        seconds,
    ),
  );
  clampVectorLengthInPlace(zeroGravityVelocity, HATCH_DECOMPRESSION_MAX_SPEED);
  if (playerPhysics) {
    playerPhysics.grounded = false;
    playerPhysics.verticalVelocity = zeroGravityVelocity.y;
  }

  hatchDecompression.elapsed += seconds;
  if (hatchDecompression.elapsed >= hatchDecompression.duration) {
    cabinPressureAtm = CABIN_PRESSURE_VACUUM_ATM;
    hatchDecompression = null;
  }
}

function updateOpenCabinPressureLeak() {
  if (hatchDecompression || getCabinPressureScale() <= 0.001) return;

  const openHatch = getOpenCabinHatchInteraction();
  if (openHatch) triggerHatchDecompression(openHatch);
}

function isCabinSealed() {
  return !getOpenCabinHatchInteraction();
}

function getOpenCabinHatchInteraction() {
  return (level?.platform?.interactions ?? []).find(
    (interaction) => interaction.type === "ship-door" && interaction.isOpen,
  ) ?? null;
}

function updateLifeSupport(seconds) {
  updatePlayerNeeds(seconds);

  const pressureKpa = getCabinPressureKpa();
  if (equippedHelmet && !equippedHelmet.visorOpen && helmetOxygenLiters > 0) {
    helmetOxygenLiters = Math.max(
      0,
      helmetOxygenLiters - HELMET_OXYGEN_LITERS_PER_SECOND * seconds,
    );
  }

  if (pressureKpa < PRESSURE_DAMAGE_THRESHOLD_KPA && !isHelmetProtecting()) {
    applyPressureDamage(seconds);
  }
  updateLifeSupportHud();
}

function updatePlayerNeeds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  playerFood = Math.max(0, playerFood - PLAYER_FOOD_DRAIN_PER_SECOND * seconds);
  playerThirst = Math.max(
    0,
    playerThirst - PLAYER_THIRST_DRAIN_PER_SECOND * seconds,
  );
  playerRestroom = Math.max(
    0,
    playerRestroom - PLAYER_RESTROOM_DRAIN_PER_SECOND * seconds,
  );
  playerComfort = Math.max(
    0,
    playerComfort - PLAYER_COMFORT_DRAIN_PER_SECOND * seconds,
  );
  playerTemperatureC = Math.min(
    PLAYER_TEMPERATURE_IDEAL_C + PLAYER_TEMPERATURE_CRITICAL_DELTA_C,
    playerTemperatureC + PLAYER_TEMPERATURE_HEAT_C_PER_SECOND * seconds,
  );
}

function isHelmetProtecting() {
  return Boolean(
    equippedHelmet && !equippedHelmet.visorOpen && helmetOxygenLiters > 0,
  );
}

function applyPressureDamage(seconds) {
  if (playerDead || playerHealth <= 0) return;
  playerHealth = Math.max(
    0,
    playerHealth - PRESSURE_DAMAGE_PER_SECOND * seconds,
  );
  if (playerHealth <= 0) showDeathScreen();
}

function showDeathScreen() {
  if (playerDead) return;
  playerDead = true;
  keys.clear();
  zeroGravityVelocity.copyFromFloats(0, 0, 0);
  if (scene?.metadata) scene.metadata.timeScale = 0;
  document.body.classList.add("player-dead");
  deathScreen?.setAttribute("aria-hidden", "false");
  exitPointerLock();
  updateLifeSupportHud();
}

function updateLifeSupportHud() {
  updateOxygenStatusBox();
  updateFoodStatusTile();
  updateThirstStatusTile();
  updateRestroomStatusTile();
  updateComfortStatusTile();
  updateTemperatureStatusTile();
  updateHelmetOxygenMeter();
  updateMainIssueTile();
  setVitalMeterValue(
    healthMeter,
    healthMeterFill,
    playerHealth / PLAYER_HEALTH_MAX,
  );
  updateNearDeathPulse();
}

function setVitalMeterValue(meter, fill, value) {
  const percent = Math.max(0, Math.min(Number(value) || 0, 1)) * 100;
  const percentText = `${percent.toFixed(1)}%`;
  setStylePropertyIfChanged(meter, "--meter-value", percentText);
  setStyleValueIfChanged(fill, "width", percentText);
}

function updateOxygenStatusBox() {
  const pressureKpa = getCabinPressureKpa();
  if (!oxygenStatusRoot || !oxygenStatusText || !oxygenPressureText) return;

  const helmetProtected = isHelmetProtecting();
  const status = getOxygenStatusLevel(pressureKpa, helmetProtected);
  setStatusTileState(oxygenStatusRoot, status.tone, status.order);
  setTextIfChanged(oxygenStatusText, status.label);
  setTextIfChanged(
    oxygenPressureText,
    `Outer Pressure: ${Math.round(pressureKpa)} kPa` +
      (equippedHelmet ? " (helmet)" : ""),
  );
}

function updateHelmetOxygenMeter() {
  if (!helmetOxygenMeter || !helmetOxygenFill || !helmetOxygenText) return;
  const liters = clamp(helmetOxygenLiters, 0, HELMET_OXYGEN_MAX_LITERS);
  const percent = (liters / HELMET_OXYGEN_MAX_LITERS) * 100;
  const percentText = `${percent.toFixed(1)}%`;
  setHiddenIfChanged(helmetOxygenMeter, !equippedHelmet);
  setStylePropertyIfChanged(
    helmetOxygenMeter,
    "--helmet-oxygen-fill",
    percentText,
  );
  setStyleValueIfChanged(helmetOxygenFill, "height", percentText);
  setTextIfChanged(
    helmetOxygenText,
    `${Math.ceil(liters)}/${HELMET_OXYGEN_MAX_LITERS} L`,
  );
}

function updateFoodStatusTile() {
  if (!foodStatusRoot || !foodStatusText) return;
  const percent = clamp(playerFood / PLAYER_FOOD_MAX, 0, 1) * 100;
  const baseOrder = VITAL_STATUS_ORDERS.food;
  let status = { label: "Full", tone: "good", order: baseOrder };
  if (percent < 20) {
    status = {
      label: "Starving",
      tone: "critical",
      order: baseOrder + VITAL_STATUS_CRITICAL_ORDER_OFFSET,
    };
  } else if (percent < PLAYER_FOOD_WARNING_PERCENT) {
    status = {
      label: "Hungry",
      tone: "warn",
      order: baseOrder + VITAL_STATUS_WARN_ORDER_OFFSET,
    };
  } else if (percent < 80) {
    status = { label: "Okay", tone: "good", order: baseOrder + 10 };
  }
  setStatusTileState(foodStatusRoot, status.tone, status.order);
  setTextIfChanged(foodStatusText, status.label);
}

function updateThirstStatusTile() {
  if (!thirstStatusRoot || !thirstStatusText) return;
  const percent = clamp(playerThirst / PLAYER_THIRST_MAX, 0, 1) * 100;
  const baseOrder = VITAL_STATUS_ORDERS.thirst;
  let status = { label: "Hydrated", tone: "good", order: baseOrder };
  if (percent < 20) {
    status = {
      label: "Dehydrated",
      tone: "critical",
      order: baseOrder + VITAL_STATUS_CRITICAL_ORDER_OFFSET,
    };
  } else if (percent < PLAYER_THIRST_WARNING_PERCENT) {
    status = {
      label: "Thirsty",
      tone: "warn",
      order: baseOrder + VITAL_STATUS_WARN_ORDER_OFFSET,
    };
  } else if (percent < 80) {
    status = { label: "Okay", tone: "good", order: baseOrder + 10 };
  }
  setStatusTileState(thirstStatusRoot, status.tone, status.order);
  setTextIfChanged(thirstStatusText, status.label);
}

function updateRestroomStatusTile() {
  if (!restroomStatusRoot || !restroomStatusText) return;
  const percent = clamp(playerRestroom / PLAYER_RESTROOM_MAX, 0, 1) * 100;
  const baseOrder = VITAL_STATUS_ORDERS.restroom;
  let status = { label: "Good", tone: "good", order: baseOrder };
  if (percent < 20) {
    status = {
      label: "Dire",
      tone: "critical",
      order: baseOrder + VITAL_STATUS_CRITICAL_ORDER_OFFSET,
    };
  } else if (percent < PLAYER_RESTROOM_WARNING_PERCENT) {
    status = {
      label: "Issue",
      tone: "warn",
      order: baseOrder + VITAL_STATUS_WARN_ORDER_OFFSET,
    };
  } else if (percent < 80) {
    status = { label: "Okay", tone: "good", order: baseOrder + 10 };
  }
  setStatusTileState(restroomStatusRoot, status.tone, status.order);
  setTextIfChanged(restroomStatusText, status.label);
}

function updateComfortStatusTile() {
  if (!comfortStatusRoot || !comfortStatusText) return;
  const percent = clamp(playerComfort / PLAYER_COMFORT_MAX, 0, 1) * 100;
  const baseOrder = VITAL_STATUS_ORDERS.comfort;
  let status = { label: "High", tone: "good", order: baseOrder };
  if (percent < 20) {
    status = {
      label: "Low",
      tone: "critical",
      order: baseOrder + VITAL_STATUS_CRITICAL_ORDER_OFFSET,
    };
  } else if (percent < PLAYER_COMFORT_WARNING_PERCENT) {
    status = {
      label: "Medium",
      tone: "warn",
      order: baseOrder + VITAL_STATUS_WARN_ORDER_OFFSET,
    };
  } else if (percent < 80) {
    status = { label: "Okay", tone: "good", order: baseOrder + 10 };
  }
  setStatusTileState(comfortStatusRoot, status.tone, status.order);
  setTextIfChanged(comfortStatusText, status.label);
}

function updateTemperatureStatusTile() {
  if (!temperatureStatusRoot || !temperatureStatusText) return;
  const delta = playerTemperatureC - PLAYER_TEMPERATURE_IDEAL_C;
  const absDelta = Math.abs(delta);
  const baseOrder = VITAL_STATUS_ORDERS.temperature;
  let status = { label: "Comfortable", tone: "good", order: baseOrder };
  if (absDelta >= PLAYER_TEMPERATURE_CRITICAL_DELTA_C) {
    status = {
      label: delta > 0 ? "Overheated" : "Freezing",
      tone: "critical",
      order: baseOrder + VITAL_STATUS_CRITICAL_ORDER_OFFSET,
    };
  } else if (absDelta >= PLAYER_TEMPERATURE_WARN_DELTA_C) {
    status = {
      label: delta > 0 ? "Hot" : "Cold",
      tone: "warn",
      order: baseOrder + VITAL_STATUS_WARN_ORDER_OFFSET,
    };
  }
  setStatusTileState(temperatureStatusRoot, status.tone, status.order);
  setTextIfChanged(temperatureStatusText, status.label);
}

function updateMainIssueTile() {
  if (!mainIssueRoot || !mainIssueText) return;
  const issue = getMainIssueStatus();
  setStatusTileState(mainIssueRoot, issue.tone, 98);
  setTextIfChanged(mainIssueText, issue.label);
}

function getMainIssueStatus() {
  const pressureKpa = getCabinPressureKpa();
  if (pressureKpa < PRESSURE_DAMAGE_THRESHOLD_KPA && !isHelmetProtecting()) {
    return { label: "Can't Breathe", tone: "critical" };
  }

  if (
    (playerRestroom / PLAYER_RESTROOM_MAX) * 100 <
    PLAYER_RESTROOM_WARNING_PERCENT
  ) {
    return { label: "Restroom Dire", tone: "critical" };
  }

  if (playerThirst / PLAYER_THIRST_MAX < 0.2) {
    return { label: "Dehydrated", tone: "critical" };
  }

  const temperatureDelta = playerTemperatureC - PLAYER_TEMPERATURE_IDEAL_C;
  if (Math.abs(temperatureDelta) >= PLAYER_TEMPERATURE_CRITICAL_DELTA_C) {
    return {
      label: temperatureDelta > 0 ? "Overheated" : "Freezing",
      tone: "critical",
    };
  }

  if ((playerFood / PLAYER_FOOD_MAX) * 100 < PLAYER_FOOD_WARNING_PERCENT) {
    return { label: "Hungry", tone: "warn" };
  }

  if ((playerThirst / PLAYER_THIRST_MAX) * 100 < PLAYER_THIRST_WARNING_PERCENT) {
    return { label: "Thirsty", tone: "warn" };
  }

  if (Math.abs(temperatureDelta) >= PLAYER_TEMPERATURE_WARN_DELTA_C) {
    return {
      label: temperatureDelta > 0 ? "Hot" : "Cold",
      tone: "warn",
    };
  }

  if (
    (playerComfort / PLAYER_COMFORT_MAX) * 100 <
    PLAYER_COMFORT_WARNING_PERCENT
  ) {
    return { label: "Uncomfortable", tone: "warn" };
  }

  return { label: "None", tone: "good" };
}

function getOxygenStatusLevel(pressureKpa, helmetProtected) {
  const baseOrder = VITAL_STATUS_ORDERS.oxygen;
  if (helmetProtected || pressureKpa > PRESSURE_YELLOW_THRESHOLD_KPA) {
    return { label: "Good", tone: "good", order: baseOrder };
  }
  if (pressureKpa >= PRESSURE_DAMAGE_THRESHOLD_KPA) {
    return {
      label: "Bad",
      tone: "warn",
      order: baseOrder + VITAL_STATUS_WARN_ORDER_OFFSET,
    };
  }
  return {
    label: "Critical",
    tone: "critical",
    order: baseOrder + VITAL_STATUS_CRITICAL_ORDER_OFFSET,
  };
}

function setStatusTileState(root, tone, order) {
  if (!root) return;
  const orderText = String(order);
  if (root.dataset.vitalTone === tone && root.dataset.vitalOrder === orderText) {
    return;
  }
  root.dataset.vitalTone = tone;
  root.dataset.vitalOrder = orderText;
  root.classList.toggle("good", tone === "good");
  root.classList.toggle("warn", tone === "warn");
  root.classList.toggle("critical", tone === "critical");
  setStyleValueIfChanged(root, "order", orderText);
}

function updateNearDeathPulse() {
  if (!nearDeathPulse) return;
  const health = clamp(playerHealth, 0, PLAYER_HEALTH_MAX);
  const danger =
    health < NEAR_DEATH_HEALTH_THRESHOLD
      ? 1 - health / NEAR_DEATH_HEALTH_THRESHOLD
      : 0;
  const intensity = playerDead ? 0 : 0.08 + danger * 0.42;
  setStylePropertyIfChanged(
    nearDeathPulse,
    "--near-death-intensity",
    danger > 0 ? intensity.toFixed(3) : "0",
  );
}

function setTextIfChanged(element, text) {
  if (!element) return;
  const next = String(text ?? "");
  if (element.textContent !== next) element.textContent = next;
}

function setHiddenIfChanged(element, hidden) {
  if (!element) return;
  const next = Boolean(hidden);
  if (element.hidden !== next) element.hidden = next;
}

function setStylePropertyIfChanged(element, property, value) {
  if (!element) return;
  const next = String(value);
  if (element.style.getPropertyValue(property) !== next) {
    element.style.setProperty(property, next);
  }
}

function setStyleValueIfChanged(element, property, value) {
  if (!element) return;
  const next = String(value);
  if (element.style[property] !== next) element.style[property] = next;
}

function getCabinPressureKpa() {
  const pressureRatio =
    CABIN_PRESSURE_INITIAL_ATM > 0
      ? cabinPressureAtm / CABIN_PRESSURE_INITIAL_ATM
      : 0;
  return Math.max(0, pressureRatio * PRESSURE_STANDARD_KPA);
}

function getCabinPressureScale() {
  return clamp(getCabinPressureKpa() / PRESSURE_STANDARD_KPA, 0, 1);
}

function getOxygenPressureStatus(kpa) {
  const pressure = Number(kpa) || 0;
  if (pressure > PRESSURE_YELLOW_THRESHOLD_KPA) return "green";
  if (pressure >= PRESSURE_DAMAGE_THRESHOLD_KPA) return "yellow";
  return "red";
}

function getHatchOutflowDirection(interaction) {
  const normal = interaction?.passage?.normal?.clone?.() ?? B.Axis.Z.clone();
  if (normal.lengthSquared() <= 0.000001) return B.Axis.Z.clone();
  normal.normalize();

  const passageCenter = interaction?.passage?.center;
  const platform = level?.platform?.physics;
  if (passageCenter && platform) {
    return getHatchHullOutflowDirection(passageCenter, platform, normal);
  }

  return normal;
}

function getHatchHullOutflowDirection(passageCenter, platform, fallback) {
  const floorY = platform.floorY ?? passageCenter.y;
  const ceilingY = platform.ceilingY ?? passageCenter.y;
  const height = Math.max(ceilingY - floorY, 0.001);
  const verticalFraction = clamp((passageCenter.y - floorY) / height, 0, 1);

  if (verticalFraction >= 0.38) return B.Axis.Y.clone();
  if (verticalFraction <= 0.08) return B.Axis.Y.scale(-1);

  const minX = platform.minX ?? passageCenter.x;
  const maxX = platform.maxX ?? passageCenter.x;
  const minZ = platform.minZ ?? passageCenter.z;
  const maxZ = platform.maxZ ?? passageCenter.z;
  const candidates = [
    {
      distance: Math.abs(ceilingY - passageCenter.y),
      direction: B.Axis.Y.clone(),
    },
    {
      distance: Math.abs(passageCenter.y - floorY),
      direction: B.Axis.Y.scale(-1),
    },
    {
      distance: Math.abs(passageCenter.x - minX),
      direction: B.Axis.X.scale(-1),
    },
    {
      distance: Math.abs(maxX - passageCenter.x),
      direction: B.Axis.X.clone(),
    },
    {
      distance: Math.abs(passageCenter.z - minZ),
      direction: B.Axis.Z.scale(-1),
    },
    {
      distance: Math.abs(maxZ - passageCenter.z),
      direction: B.Axis.Z.clone(),
    },
  ].filter(({ distance }) => Number.isFinite(distance));

  candidates.sort((a, b) => a.distance - b.distance);
  const nearest = candidates[0]?.direction?.clone?.();
  if (nearest && nearest.lengthSquared() > 0.000001) {
    return nearest.normalize();
  }

  const platformCenter = new B.Vector3(
    ((platform.minX ?? passageCenter.x) + (platform.maxX ?? passageCenter.x)) *
      0.5,
    ((platform.floorY ?? passageCenter.y) +
      (platform.ceilingY ?? passageCenter.y)) *
      0.5,
    ((platform.minZ ?? passageCenter.z) + (platform.maxZ ?? passageCenter.z)) *
      0.5,
  );
  if (B.Vector3.Dot(fallback, passageCenter.subtract(platformCenter)) < 0) {
    return fallback.scale(-1).normalize();
  }
  return fallback.normalize();
}

function getHatchSuctionDirection(interaction, fallbackDirection = null) {
  const outflow =
    fallbackDirection?.clone?.() ?? getHatchOutflowDirection(interaction);
  if (outflow.lengthSquared() <= 0.000001) return B.Axis.Z.clone();
  outflow.normalize();

  const passage = interaction?.passage;
  const playerPosition = getPlayerPlatformPosition();
  if (!passage?.center || !playerPosition) return outflow;

  const exitLead =
    passage.outwardDepth ??
    Math.max(HATCH_DECOMPRESSION_EXIT_LEAD, passage.inwardDepth ?? 0);
  const exitPoint = passage.center.add(
    outflow.scale(Math.max(exitLead, HATCH_DECOMPRESSION_EXIT_LEAD)),
  );
  const toExit = exitPoint.subtract(playerPosition);
  if (B.Vector3.Dot(toExit, outflow) <= 0) return outflow;
  if (toExit.lengthSquared() <= 0.000001) return outflow;
  return toExit.normalize();
}

function getHatchSuctionDistanceBoost(interaction) {
  const passage = interaction?.passage;
  const playerPosition = getPlayerPlatformPosition();
  if (!passage?.center || !playerPosition) return 1;

  const distance = playerPosition.subtract(passage.center).length();
  const platform = level?.platform?.physics;
  const roomSpan = Math.max(
    (platform?.maxX ?? 0) - (platform?.minX ?? 0),
    (platform?.ceilingY ?? 0) - (platform?.floorY ?? 0),
    (platform?.maxZ ?? 0) - (platform?.minZ ?? 0),
    1,
  );
  return clamp(1 + distance / Math.max(roomSpan * 0.55, 0.001), 1, 1.85);
}

function getPlayerPlatformPosition() {
  if (!camera) return null;
  if (camera.parent === level?.platform?.root || !camera.parent) {
    return camera.position.clone();
  }

  camera.computeWorldMatrix(true);
  return worldPointToPlatformLocal(camera.globalPosition ?? camera.position);
}

function createHatchWindBurst(interaction, direction, pressureScale = 1) {
  if (!scene || !level?.platform?.root) return;

  const intensity = clamp(pressureScale, 0.08, 1);
  const passage = interaction?.passage;
  const localEmitter = passage?.center?.clone?.() ?? camera.position.clone();
  const localRight = passage?.right?.clone?.() ?? B.Axis.X.clone();
  const localUp = passage?.up?.clone?.() ?? B.Axis.Y.clone();
  const emitter = platformLocalPointToWorld(
    localEmitter.add(direction.scale(-0.08)),
  );
  const outflow = platformLocalDirectionToWorld(direction);
  const right = platformLocalDirectionToWorld(localRight);
  const up = platformLocalDirectionToWorld(localUp);
  const texture = createHatchWindTexture();
  const system = new B.ParticleSystem(
    "hatch-decompression-wind",
    Math.round(520 * intensity),
    scene,
  );

  system.particleTexture = texture;
  system.emitter = emitter;
  system.minEmitBox = B.Vector3.Zero();
  system.maxEmitBox = B.Vector3.Zero();
  system.direction1 = outflow.add(right.scale(-0.42)).add(up.scale(-0.24));
  system.direction2 = outflow.add(right.scale(0.42)).add(up.scale(0.24));
  system.minEmitPower = 2.4 * intensity;
  system.maxEmitPower = 7.5 * intensity;
  system.emitRate = 720 * intensity;
  system.minLifeTime = 0.16;
  system.maxLifeTime = 0.48;
  system.minSize = 0.018;
  system.maxSize = 0.072;
  system.updateSpeed = 0.012;
  system.blendMode = B.ParticleSystem.BLENDMODE_ADD;
  system.gravity = B.Vector3.Zero();
  system.color1 = new B.Color4(0.82, 0.93, 1, 0.32);
  system.color2 = new B.Color4(1, 1, 1, 0.22);
  system.colorDead = new B.Color4(0.72, 0.86, 1, 0);
  system.start();
  stopParticleSystemAfter(system, texture, HATCH_WIND_PARTICLE_SECONDS);
}

function createHatchWindTexture() {
  const texture = new B.DynamicTexture(
    "hatch-decompression-wind-texture",
    { width: 64, height: 64 },
    scene,
    false,
  );
  const context = texture.getContext();
  const gradient = context.createLinearGradient(6, 32, 58, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.22, "rgba(210,235,255,0.2)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.78, "rgba(210,235,255,0.2)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.clearRect(0, 0, 64, 64);
  context.strokeStyle = gradient;
  context.lineWidth = 4;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(8, 32);
  context.lineTo(56, 32);
  context.stroke();
  texture.update(false);
  return texture;
}

function stopParticleSystemAfter(system, texture, secondsTotal) {
  let elapsed = 0;
  const observer = scene.onBeforeRenderObservable.add(() => {
    elapsed += Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    if (elapsed < secondsTotal) return;

    system.stop();
    scene.onBeforeRenderObservable.remove(observer);
    setTimeout(() => {
      system.dispose();
      texture.dispose();
    }, 800);
  });
}

function platformLocalPointToWorld(point) {
  const root = level?.platform?.root;
  if (!root) return point.clone();
  root.computeWorldMatrix(true);
  return B.Vector3.TransformCoordinates(point, root.getWorldMatrix());
}

function platformLocalDirectionToWorld(direction) {
  const root = level?.platform?.root;
  if (!root) return direction.clone();
  root.computeWorldMatrix(true);
  const world = B.Vector3.TransformNormal(direction, root.getWorldMatrix());
  if (world.lengthSquared() <= 0.000001) return direction.clone();
  return world.normalize();
}

function worldPointToPlatformLocal(point) {
  const root = level?.platform?.root;
  if (!root) return point.clone();
  root.computeWorldMatrix(true);
  return B.Vector3.TransformCoordinates(
    point,
    root.getWorldMatrix().clone().invert(),
  );
}

function worldDirectionToPlatformLocal(direction) {
  const root = level?.platform?.root;
  if (!root) return direction.clone();
  root.computeWorldMatrix(true);
  const local = B.Vector3.TransformNormal(
    direction,
    root.getWorldMatrix().clone().invert(),
  );
  if (local.lengthSquared() <= 0.000001) return direction.clone();
  return local.normalize();
}

function worldVectorToPlatformLocal(vector) {
  const root = level?.platform?.root;
  if (!root) return vector.clone();
  root.computeWorldMatrix(true);
  return B.Vector3.TransformNormal(
    vector,
    root.getWorldMatrix().clone().invert(),
  );
}

function attachPlayerTether(interaction) {
  if (!interaction?.tetherAnchor || !level?.platform?.root) {
    updateInteractionPrompt({ prompt: "No tether anchor" });
    return false;
  }

  detachPlayerTether();
  const material = createPlayerTetherMaterial();
  const anchor = interaction.tetherAnchor.position.clone();
  const maxLength = interaction.tetherLength ?? 4.7;
  const deployedLength = Math.min(maxLength, TETHER_INITIAL_DEPLOYED_LENGTH);
  const activeLength = getTetherDesiredLength(
    anchor,
    getPlayerTetherAttachPoint(),
    maxLength,
    deployedLength,
  );
  const particles = createTetherParticles(
    anchor,
    getPlayerTetherAttachPoint(),
    activeLength,
  );
  const path = getTetherRenderPath(particles);
  const mesh = createPlayerTetherMesh(path, material);

  playerTether = {
    interaction,
    anchor,
    maxLength,
    deployedLength,
    activeLength,
    segmentLength: activeLength / TETHER_SEGMENT_COUNT,
    particles,
    mesh,
    material,
  };
  updatePlayerTether(0);
  updateInteractionPrompt({ prompt: "Tether attached" });
  return true;
}

function detachPlayerTether(prompt) {
  if (!playerTether) return false;
  playerTether.mesh?.dispose();
  playerTether.material?.albedoTexture?.dispose?.();
  playerTether.material?.dispose?.();
  playerTether = null;
  if (prompt) updateInteractionPrompt({ prompt });
  return true;
}

function updatePlayerTether(seconds) {
  if (!playerTether || !camera) return;

  simulatePlayerTether(getTetherStepSeconds(seconds));
  const path = getTetherRenderPath(playerTether.particles);
  playerTether.mesh?.dispose();
  playerTether.mesh = createPlayerTetherMesh(path, playerTether.material);
}

function createPlayerTetherMesh(path, material) {
  const mesh = B.MeshBuilder.CreateTube(
    "player-safety-tether",
    {
      path,
      radius: 0.0095,
      tessellation: 10,
      cap: B.Mesh.CAP_ALL,
    },
    scene,
  );
  mesh.parent = level.platform.root;
  mesh.material = material;
  mesh.isPickable = false;
  mesh.receiveShadows = true;
  mesh.checkCollisions = false;
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    excludeFromBounds: true,
    excludeFromCollision: true,
  };
  return mesh;
}

function getPlayerTetherAttachPoint() {
  return camera.position.add(TETHER_ATTACH_OFFSET);
}

function createTetherParticles(start, end, maxLength) {
  const particles = [];
  const directDistance = B.Vector3.Distance(start, end);
  const slack = Math.max(maxLength - directDistance, 0);
  for (let index = 0; index <= TETHER_SEGMENT_COUNT; index += 1) {
    const t = index / TETHER_SEGMENT_COUNT;
    const position = B.Vector3.Lerp(start, end, t);
    position.y -= Math.sin(t * Math.PI) * Math.min(slack * 0.22, 0.22);
    particles.push({
      position,
      previous: position.clone(),
    });
  }
  return particles;
}

function simulatePlayerTether(seconds) {
  const particles = playerTether.particles;
  const lastIndex = particles.length - 1;
  const platform = level.platform?.physics;
  const constrainParticlesToPlatform = isPositionInsidePlatformPhysicsVolume(
    camera.position,
    platform,
  );
  playerTether.deployedLength = getTetherDeployedLength(
    playerTether.deployedLength,
    playerTether.maxLength,
    seconds,
  );
  playerTether.activeLength = getTetherDesiredLength(
    playerTether.anchor,
    getPlayerTetherAttachPoint(),
    playerTether.maxLength,
    playerTether.deployedLength,
  );
  playerTether.segmentLength = playerTether.activeLength / TETHER_SEGMENT_COUNT;

  particles[0].position.copyFrom(playerTether.anchor);
  particles[0].previous.copyFrom(playerTether.anchor);
  particles[lastIndex].position.copyFrom(getPlayerTetherAttachPoint());

  const acceleration = TETHER_GRAVITY.scale(seconds * seconds);
  for (let index = 1; index < lastIndex; index += 1) {
    const particle = particles[index];
    const velocity = particle.position
      .subtract(particle.previous)
      .scale(TETHER_DAMPING);
    particle.previous.copyFrom(particle.position);
    particle.position.addInPlace(velocity).addInPlace(acceleration);
    if (constrainParticlesToPlatform) {
      constrainTetherParticleToPlatform(particle.position, platform);
    }
  }

  for (
    let iteration = 0;
    iteration < TETHER_SOLVER_ITERATIONS;
    iteration += 1
  ) {
    particles[0].position.copyFrom(playerTether.anchor);
    for (let index = 0; index < lastIndex; index += 1) {
      solveTetherSegment(
        particles[index],
        particles[index + 1],
        getTetherParticleInvMass(index, lastIndex),
        getTetherParticleInvMass(index + 1, lastIndex),
        playerTether.segmentLength,
      );
    }
    for (let index = 1; index < lastIndex; index += 1) {
      if (constrainParticlesToPlatform) {
        constrainTetherParticleToPlatform(particles[index].position, platform);
      }
    }
  }

  particles[lastIndex].position.copyFrom(getPlayerTetherAttachPoint());
  particles[lastIndex].previous.copyFrom(particles[lastIndex].position);

  if (!isPlayerTetherFullyExtendedAndTaut()) return;

  constrainTetherEndToMaxLength(particles[lastIndex].position);
  const before = camera.position.clone();
  camera.position.copyFrom(
    particles[lastIndex].position.subtract(TETHER_ATTACH_OFFSET),
  );
  particles[lastIndex].position.copyFrom(getPlayerTetherAttachPoint());
  particles[lastIndex].previous.copyFrom(particles[lastIndex].position);
  const correction = camera.position.subtract(before);
  if (correction.lengthSquared() > 0.000001) {
    applyTetherPullToPlatform(correction, seconds);
    dampenPlayerVelocityFromTetherCorrection(correction);
  }
}

function applyTetherPullToPlatform(correction, seconds) {
  if (!level?.platform?.applyExternalImpulse || seconds <= 0) return;

  const pull = correction.scale(-1);
  const pullDistance = pull.length();
  if (pullDistance <= 0.000001) return;

  const pullDirection = pull.scale(1 / pullDistance);
  const correctionSpeed = pullDistance / seconds;
  const playerOutwardSpeed =
    zeroGravityMode && zeroGravityVelocity.lengthSquared() > 0.000001
      ? Math.max(0, B.Vector3.Dot(zeroGravityVelocity, pullDirection))
      : 0;
  const pullAcceleration = Math.min(
    TETHER_PLATFORM_PULL_MAX_ACCELERATION,
    correctionSpeed * TETHER_PLATFORM_PULL_CORRECTION_TRANSFER +
      playerOutwardSpeed * TETHER_PLATFORM_PULL_VELOCITY_TRANSFER,
  );

  level.platform.applyExternalImpulse(
    pullDirection,
    pullAcceleration * seconds,
  );
}

function isPlayerTetherFullyExtendedAndTaut() {
  if (!playerTether) return false;
  const deployed =
    playerTether.deployedLength >= playerTether.maxLength - TETHER_TAUT_EPSILON;
  if (!deployed) return false;

  const distance = B.Vector3.Distance(
    playerTether.anchor,
    getPlayerTetherAttachPoint(),
  );
  return distance >= playerTether.maxLength - TETHER_TAUT_EPSILON;
}

function dampenPlayerVelocityFromTetherCorrection(correction) {
  if (!playerPhysics) return;
  playerPhysics.verticalVelocity *= 0.35;

  if (!zeroGravityMode || zeroGravityVelocity.lengthSquared() <= 0.000001) {
    return;
  }

  const pullDirection = correction.normalize();
  const outwardSpeed = B.Vector3.Dot(zeroGravityVelocity, pullDirection);
  if (outwardSpeed < 0) {
    zeroGravityVelocity.subtractInPlace(pullDirection.scale(outwardSpeed));
  }
}

function constrainTetherEndToMaxLength(endPosition) {
  const delta = endPosition.subtract(playerTether.anchor);
  const distance = delta.length();
  if (distance <= playerTether.activeLength || distance <= 0.000001) return;
  endPosition.copyFrom(
    playerTether.anchor.add(delta.scale(playerTether.activeLength / distance)),
  );
}

function getTetherDesiredLength(
  anchor,
  attachPoint,
  maxLength,
  minimumLength = 0,
) {
  const distance = B.Vector3.Distance(anchor, attachPoint);
  const desired = Math.min(maxLength, distance + TETHER_SLACK_RESERVE);
  return Math.max(minimumLength, desired, 0.2);
}

function getTetherDeployedLength(currentLength = 0, maxLength, seconds) {
  const nextLength = currentLength + TETHER_DEPLOY_SPEED * seconds;
  return Math.min(
    maxLength,
    Math.max(nextLength, TETHER_INITIAL_DEPLOYED_LENGTH),
  );
}

function solveTetherSegment(a, b, invMassA, invMassB, length) {
  const delta = b.position.subtract(a.position);
  const distance = delta.length();
  const totalInvMass = invMassA + invMassB;
  if (distance <= 0.000001 || totalInvMass <= 0) return;

  const correction = delta.scale((distance - length) / distance / totalInvMass);
  if (invMassA > 0) a.position.addInPlace(correction.scale(invMassA));
  if (invMassB > 0) b.position.subtractInPlace(correction.scale(invMassB));
}

function getTetherParticleInvMass(index, lastIndex) {
  if (index === 0 || index === lastIndex) return 0;
  return 1;
}

function constrainTetherParticleToPlatform(position, platform) {
  if (!platform) return;
  const floorY = platform.floorY ?? 0;
  const padding = 0.025;
  position.y = Math.max(position.y, floorY + padding);
  if (platform.minX !== undefined) {
    position.x = Math.max(position.x, platform.minX + padding);
  }
  if (platform.maxX !== undefined) {
    position.x = Math.min(position.x, platform.maxX - padding);
  }
  if (platform.minZ !== undefined) {
    position.z = Math.max(position.z, platform.minZ + padding);
  }
  if (platform.maxZ !== undefined) {
    position.z = Math.min(position.z, platform.maxZ - padding);
  }
}

function getTetherStepSeconds(seconds) {
  if (seconds === 0) return 0;
  return Math.min(seconds || 1 / 60, 1 / 30);
}

function getTetherRenderPath(particles) {
  const path = particles.map((particle) => particle.position.clone());
  return smoothTetherRenderPath(path);
}

function smoothTetherRenderPath(path) {
  const points = dedupeTetherPathPoints(path);
  if (points.length < 3 || TETHER_RENDER_SMOOTHING_STEPS <= 1) {
    return points;
  }

  const smoothPath = [points[0].clone()];
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(index - 1, 0)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(index + 2, points.length - 1)];
    for (let step = 1; step <= TETHER_RENDER_SMOOTHING_STEPS; step += 1) {
      smoothPath.push(
        catmullRomPoint(p0, p1, p2, p3, step / TETHER_RENDER_SMOOTHING_STEPS),
      );
    }
  }
  return smoothPath;
}

function dedupeTetherPathPoints(path) {
  const points = [];
  for (const point of path) {
    const previous = points[points.length - 1];
    if (previous && B.Vector3.DistanceSquared(previous, point) < 0.0000001) {
      continue;
    }
    points.push(point.clone());
  }
  return points;
}

function catmullRomPoint(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return new B.Vector3(
    catmullRomValue(p0.x, p1.x, p2.x, p3.x, t, t2, t3),
    catmullRomValue(p0.y, p1.y, p2.y, p3.y, t, t2, t3),
    catmullRomValue(p0.z, p1.z, p2.z, p3.z, t, t2, t3),
  );
}

function catmullRomValue(v0, v1, v2, v3, t, t2, t3) {
  return (
    0.5 *
    (2 * v1 +
      (-v0 + v2) * t +
      (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 +
      (-v0 + 3 * v1 - 3 * v2 + v3) * t3)
  );
}

function createPlayerTetherMaterial() {
  const material = new B.PBRMaterial("player-yellow-tether-material", scene);
  material.albedoColor = new B.Color3(1.0, 0.73, 0.12);
  material.albedoTexture = createPlayerTetherTexture();
  material.metallic = 0;
  material.roughness = 0.9;
  material.environmentIntensity = 0.48;
  material.directIntensity = 0.82;
  material.backFaceCulling = true;
  return material;
}

function createPlayerTetherTexture() {
  const texture = new B.DynamicTexture(
    "player-yellow-tether-weave",
    { width: 128, height: 32 },
    scene,
    false,
  );
  const context = texture.getContext();
  context.fillStyle = "#f2b51d";
  context.fillRect(0, 0, 128, 32);
  for (let y = 0; y < 32; y += 2) {
    context.fillStyle = y % 4 === 0 ? "#ffd45c" : "#d99510";
    context.globalAlpha = 0.26;
    context.fillRect(0, y, 128, 1);
  }
  context.globalAlpha = 1;
  context.strokeStyle = "rgba(255, 244, 154, 0.45)";
  context.lineWidth = 1;
  for (let x = -24; x < 152; x += 10) {
    context.beginPath();
    context.moveTo(x, 32);
    context.lineTo(x + 44, 0);
    context.stroke();
  }
  context.fillStyle = "rgba(53, 35, 6, 0.62)";
  context.fillRect(0, 4, 128, 2);
  context.fillRect(0, 26, 128, 2);
  texture.update(false);
  texture.uScale = 5;
  texture.vScale = 1;
  texture.wrapU = B.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = B.Texture.WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 4;
  return texture;
}

async function mountHelmetOnHook(interaction, slot) {
  if (interaction.mounting) return;

  const item = { ...slot.items[slot.index] };
  consumeInventorySlot(slot);
  renderHotbars();
  renderInventoryGrid();
  refreshPlacementPreview();

  const mounted = await mountHelmetItemOnHook(interaction, item);
  if (!mounted) {
    addInventoryItem(item);
    renderHotbars();
    renderInventoryGrid();
    refreshPlacementPreview();
  }
}

async function mountHelmetItemOnHook(interaction, item) {
  if (interaction.mounting || interaction.mountedRoot) return false;
  interaction.mounting = true;

  try {
    const root = await loadItemModelRoot(item, {
      name: "mounted-astronaut-helmet",
      pickable: false,
    });
    root.position.copyFrom(interaction.mountPoint.position);
    root.rotation.copyFrom(interaction.mountPoint.rotation);
    root.rotate(B.Axis.Y, Math.PI, B.Space.LOCAL);
    root.rotate(B.Axis.X, -0.18, B.Space.LOCAL);
    hangMountedHelmet(root);
    interaction.mountedRoot = root;
    interaction.mountedItem = item;
    updateInteractionPrompt(null);
    return true;
  } catch (error) {
    console.error("Failed to mount helmet.", error);
    return false;
  } finally {
    interaction.mounting = false;
  }
}

function equipHelmet() {
  if (equippedHelmet) {
    return takeOffHelmet();
  }

  if (helmetEquipInProgress) {
    updateInteractionPrompt({ prompt: "Helmet equip in progress" });
    return false;
  }

  if (
    activeInteraction?.type === "helmet-hook" &&
    activeInteraction.mountedRoot
  ) {
    equipHelmetFromHook(activeInteraction);
    return true;
  }

  if (
    activeInteraction?.type === "pickup" &&
    isHelmetItem(activeInteraction.item)
  ) {
    equipHelmetFromPickup(activeInteraction);
    return true;
  }

  const slot = findHelmetInventorySlot();
  if (!slot) {
    updateInteractionPrompt({ prompt: "Helmet required" });
    return false;
  }

  equipHelmetFromInventory(slot);
  return true;
}

async function equipHelmetFromHook(interaction) {
  const item = interaction.mountedItem;
  if (!item) return;

  const mountedRoot = interaction.mountedRoot;
  interaction.mountedRoot = null;
  interaction.mountedItem = null;
  mountedRoot?.dispose(false, true);

  const equipped = await equipHelmetItem(item);
  if (!equipped) {
    mountHelmetItemOnHook(interaction, item);
  }
}

async function equipHelmetFromPickup(interaction) {
  const item = interaction.item;
  const equipped = await equipHelmetItem(item);
  if (equipped) {
    interaction.activate?.();
    updateInteractionPrompt(null);
  }
}

async function equipHelmetFromInventory(slot) {
  const item = { ...slot.items[slot.index] };
  consumeInventorySlot(slot);
  renderHotbars();
  renderInventoryGrid();
  refreshPlacementPreview();

  const equipped = await equipHelmetItem(item);
  if (!equipped) {
    addInventoryItem(item);
    renderHotbars();
    renderInventoryGrid();
    refreshPlacementPreview();
  }
}

async function equipHelmetItem(item) {
  if (helmetEquipInProgress || equippedHelmet) return false;
  helmetEquipInProgress = true;

  try {
    const root = await loadItemModelRoot(item, {
      name: "equipped-astronaut-helmet",
      pickable: false,
      parent: camera,
      animationFrame: 0,
      rotation: [0, 0, 0],
    });
    root.position.set(0, -0.15, 0.06);
    root.scaling.scaleInPlace(0.9);
    root.computeWorldMatrix(true);

    for (const mesh of getRootRenderableMeshes(root)) {
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      if (mesh.material) {
        mesh.material.backFaceCulling = !isHelmetGlassMesh(mesh);
      }
    }

    equippedHelmet = {
      root,
      item,
      visorOpen: false,
      animationGroups: root.metadata?.importedAnimationGroups ?? [],
      visor: createHelmetVisorController(root),
    };
    helmetOxygenLiters = HELMET_OXYGEN_MAX_LITERS;
    setHelmetVisorOpen(false, true);
    updateHudButtons();
    renderClothingGrid();
    updateInteractionPrompt({ prompt: "Helmet equipped" });
    return true;
  } catch (error) {
    console.error("Failed to equip helmet.", error);
    updateInteractionPrompt({ prompt: "Could not equip helmet" });
    return false;
  } finally {
    helmetEquipInProgress = false;
  }
}

function takeOffHelmet(targetSlot = null) {
  if (!equippedHelmet) {
    updateInteractionPrompt({ prompt: "Helmet not equipped" });
    return false;
  }

  if (!canTakeOffHelmet()) {
    updateInteractionPrompt({
      prompt: "Warning: can't take helmet off. There's no air outside.",
      durationMs: 3600,
    });
    return false;
  }

  const helmet = equippedHelmet;
  if (targetSlot) {
    if (!addItemToTargetSlot(helmet.item, targetSlot)) {
      updateInteractionPrompt({ prompt: "Choose an empty slot" });
      return false;
    }
  } else if (!addInventoryItem(helmet.item)) {
    updateInteractionPrompt({ prompt: "Inventory full" });
    return false;
  }

  if (helmet.visorObserver) {
    scene.onBeforeRenderObservable.remove(helmet.visorObserver);
  }
  helmet.root?.dispose(false, true);
  equippedHelmet = null;
  renderHotbars();
  renderInventoryGrid();
  refreshPlacementPreview();
  updateHudButtons();
  updateInteractionPrompt({ prompt: "Helmet removed" });
  return true;
}

function canTakeOffHelmet() {
  return Math.round(getCabinPressureKpa()) >= HELMET_REMOVAL_MIN_PRESSURE_KPA;
}

function toggleHelmetVisor() {
  if (!equippedHelmet) {
    updateInteractionPrompt({ prompt: "Helmet not equipped" });
    return false;
  }

  setHelmetVisorOpen(!equippedHelmet.visorOpen);
  updateHudButtons();
  updateInteractionPrompt({
    prompt: equippedHelmet.visorOpen ? "Visor open" : "Visor closed",
  });
  return true;
}

function setHelmetVisorOpen(open, instant = false) {
  const visor = equippedHelmet?.visor;
  const group = equippedHelmet?.animationGroups?.[0];
  if (equippedHelmet.visorObserver) {
    scene.onBeforeRenderObservable.remove(equippedHelmet.visorObserver);
    equippedHelmet.visorObserver = null;
  }

  group?.stop();
  if (instant) {
    applyHelmetVisorPose(open ? 1 : 0);
  } else {
    const duration = 0.28;
    let elapsed = 0;
    const start = equippedHelmet.visorOpen ? 1 : 0;
    const end = open ? 1 : 0;
    equippedHelmet.visorObserver = scene.onBeforeRenderObservable.add(() => {
      elapsed += Math.min(engine.getDeltaTime() / 1000, 0.05);
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      applyHelmetVisorPose(start + (end - start) * eased);
      if (progress >= 1) {
        group?.stop();
        scene.onBeforeRenderObservable.remove(equippedHelmet.visorObserver);
        equippedHelmet.visorObserver = null;
      }
    });
  }
  equippedHelmet.visorOpen = open;

  function applyHelmetVisorPose(progress) {
    if (visor?.node && visor.closed && visor.open) {
      visor.node.rotationQuaternion = B.Quaternion.Slerp(
        visor.closed,
        visor.open,
        progress,
      );
      visor.node.rotation.set(0, 0, 0);
      visor.node.computeWorldMatrix(true);
      return;
    }

    if (!group) return;
    const range = getAnimationGroupFrameRange(group);
    group.goToFrame(range.from + (range.to - range.from) * progress);
  }
}

function createHelmetVisorController(root) {
  const visorNode = findDescendantNode(root, "Black-one");
  if (!visorNode) return null;

  const closed =
    visorNode.rotationQuaternion?.clone() ??
    B.Quaternion.RotationYawPitchRoll(
      visorNode.rotation?.y ?? 0,
      visorNode.rotation?.x ?? 0,
      visorNode.rotation?.z ?? 0,
    );
  visorNode.rotationQuaternion = closed.clone();
  visorNode.rotation.set(0, 0, 0);
  return {
    node: visorNode,
    closed,
    open: B.Quaternion.Identity(),
  };
}

function findDescendantNode(root, name) {
  const queue = [...root.getChildren()];
  while (queue.length) {
    const node = queue.shift();
    if (node.name === name) return node;
    queue.push(...(node.getChildren?.() ?? []));
  }
  return null;
}

function getAnimationGroupFrameRange(group) {
  let from = Number.isFinite(group.from) ? group.from : Infinity;
  let to = Number.isFinite(group.to) ? group.to : -Infinity;

  for (const targetAnimation of group.targetedAnimations ?? []) {
    const keys = targetAnimation.animation?.getKeys?.() ?? [];
    if (!keys.length) continue;
    from = Math.min(from, keys[0].frame);
    to = Math.max(to, keys[keys.length - 1].frame);
  }

  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return { from: 0, to: 1 };
  }
  return { from, to };
}

async function initializeMountedHooks() {
  const interactions = level.platform?.interactions ?? [];
  const mounts = [];
  for (const interaction of interactions) {
    if (
      interaction.type !== "helmet-hook" ||
      !interaction.initialMountedItem ||
      interaction.initialMountResolved
    ) {
      continue;
    }

    interaction.initialMountResolved = true;
    mounts.push(
      mountHelmetItemOnHook(interaction, { ...interaction.initialMountedItem }),
    );
  }
  await Promise.all(mounts);
}

function hangMountedHelmet(root) {
  root.computeWorldMatrix(true);
  const bounds = getRootBoundsInPlatform(root);
  if (!bounds) return;

  const height = bounds.max.y - bounds.min.y;
  root.position.y -= height * 0.62;
  root.computeWorldMatrix(true);
}

function takeHelmetFromHook(interaction) {
  const item = interaction.mountedItem;
  if (!item || !addInventoryItem(item)) {
    updateInteractionPrompt({ prompt: "Inventory full" });
    return false;
  }

  interaction.mountedRoot?.dispose(false, true);
  interaction.mountedRoot = null;
  interaction.mountedItem = null;
  renderHotbars();
  renderInventoryGrid();
  refreshPlacementPreview();
  return true;
}

function addInventoryItem(item) {
  return addInventoryItemCount(item, 1);
}

function addInventoryItemCount(item, count = 1) {
  const amount = Math.max(0, Math.floor(Number(count) || 0));
  if (amount <= 0) return true;

  const id = item.id ?? "item";
  const stackLimit = getItemStackLimit(item);
  if (!canAddInventoryItemCount(item, amount)) return false;

  let remaining = amount;
  for (const entry of getInventoryEntriesById(id)) {
    if (remaining <= 0) break;
    const current = entry.count ?? 1;
    const room = Number.isFinite(stackLimit)
      ? Math.max(0, stackLimit - current)
      : remaining;
    if (room <= 0) continue;
    const added = Math.min(room, remaining);
    entry.count = current + added;
    remaining -= added;
    mergeItemMetadata(entry, item);
    hydrateInventoryPortrait(entry, item);
  }

  while (remaining > 0) {
    const slot = findEmptyInventorySlot();
    if (!slot) return false;
    const stackCount = Number.isFinite(stackLimit)
      ? Math.min(remaining, stackLimit)
      : remaining;
    const entry = {
      ...item,
      id,
      name: item.name ?? item.label ?? "Item",
      count: stackCount,
      portrait: item.portrait ?? null,
    };
    slot.items[slot.index] = entry;
    hydrateInventoryPortrait(entry, item);
    remaining -= stackCount;
  }

  return true;
}

function canAddInventoryItemCount(item, count = 1) {
  const amount = Math.max(0, Math.floor(Number(count) || 0));
  if (amount <= 0) return true;

  const id = item.id ?? "item";
  const stackLimit = getItemStackLimit(item);
  if (!Number.isFinite(stackLimit)) {
    return Boolean(findInventoryEntry(id) || findEmptyInventorySlot());
  }

  const existingRoom = getInventoryEntriesById(id).reduce(
    (sum, entry) => sum + Math.max(0, stackLimit - (entry.count ?? 1)),
    0,
  );
  const emptySlots = [...hotbarItems, ...inventoryItems].filter(
    (entry) => !entry,
  ).length;
  return existingRoom + emptySlots * stackLimit >= amount;
}

function getItemStackLimit(item) {
  const configuredLimit = Number(item?.stackLimit);
  if (Number.isFinite(configuredLimit) && configuredLimit > 0) {
    return Math.max(1, Math.floor(configuredLimit));
  }
  return isFabricatorResourceItem(item)
    ? FABRICATOR_RESOURCE_STACK_LIMIT
    : Infinity;
}

function getInventoryEntriesById(id) {
  return [...hotbarItems, ...inventoryItems].filter(
    (entry) => entry?.id === id,
  );
}

function getInventoryItemCount(id) {
  return [...hotbarItems, ...inventoryItems].reduce(
    (sum, entry) => sum + (entry?.id === id ? (entry.count ?? 1) : 0),
    0,
  );
}

function consumeInventoryItemCount(id, count) {
  let remaining = Math.max(0, Math.floor(Number(count) || 0));
  if (remaining <= 0) return true;
  if (getInventoryItemCount(id) < remaining) return false;

  for (const items of [hotbarItems, inventoryItems]) {
    for (let index = 0; index < items.length && remaining > 0; index += 1) {
      const entry = items[index];
      if (entry?.id !== id) continue;

      const amount = entry.count ?? 1;
      if (amount > remaining) {
        entry.count = amount - remaining;
        remaining = 0;
      } else {
        items[index] = null;
        remaining -= amount;
      }
    }
  }
  renderHotbars();
  renderInventoryGrid();
  return true;
}

function canAddInventoryItemCounts(items) {
  const planned = new Map();
  for (const { item, count } of items) {
    if (!item?.id || count <= 0) continue;
    planned.set(item.id, {
      item,
      count: (planned.get(item.id)?.count ?? 0) + count,
    });
  }

  let emptySlots = [...hotbarItems, ...inventoryItems].filter(
    (entry) => !entry,
  ).length;
  for (const { item, count } of planned.values()) {
    const stackLimit = getItemStackLimit(item);
    if (!Number.isFinite(stackLimit)) {
      if (!findInventoryEntry(item.id)) emptySlots -= 1;
      continue;
    }

    const existingRoom = getInventoryEntriesById(item.id).reduce(
      (sum, entry) => sum + Math.max(0, stackLimit - (entry.count ?? 1)),
      0,
    );
    const remaining = Math.max(0, count - existingRoom);
    emptySlots -= Math.ceil(remaining / stackLimit);
  }
  return emptySlots >= 0;
}

function getAvailableWireMeters() {
  return [...hotbarItems, ...inventoryItems].reduce(
    (total, entry) => total + getWireMetersOnSpool(entry),
    0,
  );
}

function consumeWireMeters(meters) {
  let remaining = Math.max(0, Number(meters) || 0);
  if (remaining <= 0) return true;
  if (getAvailableWireMeters() + 0.0001 < remaining) return false;

  for (const items of [hotbarItems, inventoryItems]) {
    for (let index = 0; index < items.length && remaining > 0; index += 1) {
      const entry = items[index];
      if (!isWireItem(entry)) continue;

      const available = getWireMetersOnSpool(entry);
      const used = Math.min(available, remaining);
      const nextMeters = Math.max(0, available - used);
      remaining -= used;
      if (nextMeters <= 0.001) {
        items[index] = null;
      } else {
        entry.maxWireMeters = getWireSpoolMaxMeters(entry);
        entry.wireMeters = Number(nextMeters.toFixed(2));
      }
    }
  }

  renderHotbars();
  renderInventoryGrid();
  return remaining <= 0.001;
}

function addWireMeters(meters) {
  let remaining = Math.max(0, Number(meters) || 0);
  if (remaining <= 0) return 0;

  for (const entry of [...hotbarItems, ...inventoryItems]) {
    if (remaining <= 0) break;
    if (!isWireItem(entry)) continue;
    const maxMeters = getWireSpoolMaxMeters(entry);
    const current = getWireMetersOnSpool(entry);
    const room = Math.max(0, maxMeters - current);
    if (room <= 0.001) continue;
    const added = Math.min(room, remaining);
    entry.maxWireMeters = maxMeters;
    entry.wireMeters = Number((current + added).toFixed(2));
    remaining -= added;
  }

  while (remaining > 0.001) {
    const slot = findEmptyInventorySlot();
    if (!slot) break;
    const metersForSpool = Math.min(WIRE_SPOOL_METERS, remaining);
    slot.items[slot.index] = createWireSpoolInventoryItem(metersForSpool);
    remaining -= metersForSpool;
  }

  renderHotbars();
  renderInventoryGrid();
  return Math.max(0, Number(remaining.toFixed(4)));
}

function getWireMeterStorageRoom() {
  const spoolRoom = [...hotbarItems, ...inventoryItems].reduce(
    (total, entry) =>
      isWireItem(entry)
        ? total +
          Math.max(0, getWireSpoolMaxMeters(entry) - getWireMetersOnSpool(entry))
        : total,
    0,
  );
  const emptySlotRoom = [...hotbarItems, ...inventoryItems].filter(
    (entry) => !entry,
  ).length * WIRE_SPOOL_METERS;
  return spoolRoom + emptySlotRoom;
}

function canAddWireMeters(meters) {
  return getWireMeterStorageRoom() + 0.0001 >= Math.max(0, Number(meters) || 0);
}

function createWireSpoolInventoryItem(meters = WIRE_SPOOL_METERS) {
  return {
    id: "wire-spool",
    name: "Wire Spool",
    count: 1,
    icon: "W",
    swatch: "#b85042",
    wireMeters: Number(
      clamp(Number(meters) || 0, 0, WIRE_SPOOL_METERS).toFixed(2),
    ),
    maxWireMeters: WIRE_SPOOL_METERS,
    stackLimit: 1,
  };
}

function getWireMetersOnSpool(item) {
  if (!isWireItem(item)) return 0;
  const meters = Number(item.wireMeters ?? item.maxWireMeters);
  return clamp(
    Number.isFinite(meters) ? meters : WIRE_SPOOL_METERS,
    0,
    getWireSpoolMaxMeters(item),
  );
}

function getWireSpoolMaxMeters(item) {
  const maxMeters = Number(item?.maxWireMeters);
  return Number.isFinite(maxMeters) && maxMeters > 0
    ? maxMeters
    : WIRE_SPOOL_METERS;
}

function formatWireMeters(meters) {
  const value = Math.max(0, Number(meters) || 0);
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} m`;
}

function findHelmetInventorySlot() {
  const hotbarSlot = findHelmetSlot(hotbarItems);
  if (hotbarSlot !== -1) return { items: hotbarItems, index: hotbarSlot };

  const inventorySlot = findHelmetSlot(inventoryItems);
  if (inventorySlot !== -1) {
    return { items: inventoryItems, index: inventorySlot };
  }

  return null;
}

function findHelmetSlot(items) {
  return items.findIndex((entry) => isHelmetItem(entry));
}

function isHelmetItem(entry) {
  const id = entry?.id?.toLowerCase?.() ?? "";
  const name = entry?.name?.toLowerCase?.() ?? "";
  const modelUrl = entry?.modelUrl?.toLowerCase?.() ?? "";
  return (
    id.includes("helmet") ||
    name.includes("helmet") ||
    modelUrl.includes("helmet")
  );
}

function isFabricatorItem(entry) {
  const id = entry?.id?.toLowerCase?.() ?? "";
  const name = entry?.name?.toLowerCase?.() ?? "";
  const modelUrl = entry?.modelUrl?.toLowerCase?.() ?? "";
  if (id.includes("bucket") || name.includes("bucket")) return false;
  return (
    id.includes("fabricator") ||
    name.includes("fabricator") ||
    modelUrl.includes("fabricator")
  );
}

function isOxygenGeneratorItem(entry) {
  const id = entry?.id?.toLowerCase?.() ?? "";
  const name = entry?.name?.toLowerCase?.() ?? "";
  const modelUrl = entry?.modelUrl?.toLowerCase?.() ?? "";
  return (
    id.includes("oxygen-generator") ||
    name.includes("oxygen generator") ||
    modelUrl.includes("oxygen_generator")
  );
}

function isBatteryItem(entry) {
  const id = entry?.id?.toLowerCase?.() ?? "";
  const name = entry?.name?.toLowerCase?.() ?? "";
  const modelUrl = entry?.modelUrl?.toLowerCase?.() ?? "";
  if (id.includes("bucket") || name.includes("bucket")) return false;
  return (
    id.includes("battery") ||
    name.includes("battery") ||
    modelUrl.includes("battery")
  );
}

function isSolarPanelItem(entry) {
  const id = entry?.id?.toLowerCase?.() ?? "";
  const name = entry?.name?.toLowerCase?.() ?? "";
  const modelUrl = entry?.modelUrl?.toLowerCase?.() ?? "";
  return (
    id.includes("solar-panel") ||
    name.includes("solar panel") ||
    modelUrl.includes("solar_panel")
  );
}

function isWireItem(entry) {
  const id = entry?.id?.toLowerCase?.() ?? "";
  const name = entry?.name?.toLowerCase?.() ?? "";
  return (
    id.includes("wire") ||
    name.includes("wire") ||
    Number.isFinite(Number(entry?.wireMeters)) ||
    Number.isFinite(Number(entry?.maxWireMeters))
  );
}

function consumeInventorySlot(slot) {
  const entry = slot.items[slot.index];
  if (!entry) return;

  const count = entry.count ?? 1;
  if (count > 1) {
    entry.count = count - 1;
  } else {
    slot.items[slot.index] = null;
  }
}

async function loadItemModelRoot(item, options = {}) {
  const result = await B.SceneLoader.ImportMeshAsync(
    "",
    "",
    item.modelUrl,
    scene,
  );
  const root = new B.TransformNode(options.name ?? "placeable-item", scene);
  root.parent = options.parent ?? level.platform.root;
  root.metadata = {
    ...(root.metadata ?? {}),
    importedAnimationGroups: result.animationGroups ?? [],
  };
  freezeImportedItemAnimations(result, options.animationFrame ?? 0);

  const importedNodes = [...result.meshes, ...result.transformNodes];
  for (const node of importedNodes) {
    if (!node.parent) node.parent = root;
  }

  normalizeItemModel(root, item.maxSize ?? 0.5);
  root.rotation = B.Vector3.FromArray(
    options.rotation ?? resolveItemRotation(item),
  );
  root.computeWorldMatrix(true);
  enhanceImportedItemMaterials(root, item);
  enhanceHelmetGlassMeshes(root, item);

  const excludeFromBounds = options.hologram || options.parent === camera;
  for (const mesh of getRootRenderableMeshes(root)) {
    const collisionMesh = isItemCollisionMesh(mesh);
    mesh.isPickable = Boolean(options.pickable) && !collisionMesh;
    mesh.checkCollisions = false;
    mesh.receiveShadows = !options.hologram && !collisionMesh;
    if (collisionMesh) {
      mesh.isVisible = false;
      mesh.visibility = 0;
      mesh.showBoundingBox = false;
    }
    mesh.metadata = {
      ...(mesh.metadata ?? {}),
      itemCollisionMesh: collisionMesh,
      excludeFromBounds: excludeFromBounds || collisionMesh,
      excludeFromCollision: true,
    };
    mesh.showBoundingBox =
      !collisionMesh &&
      !excludeFromBounds &&
      Boolean(scene.metadata?.objectBoundsVisible);
  }
  if (!excludeFromBounds) {
    addPolySurfaceHolograms(root, scene);
  }

  return root;
}

function freezeImportedItemAnimations(result, frame) {
  for (const group of result.animationGroups ?? []) {
    group.stop();
    group.reset();
    if (Number.isFinite(frame)) {
      group.goToFrame(frame);
    }
    group.stop();
  }
}

function configureImportedMaterialLighting(targetScene) {
  if (!targetScene || targetScene.metadata?.importedMaterialLightingReady) {
    return;
  }
  targetScene.metadata = {
    ...(targetScene.metadata ?? {}),
    importedMaterialLightingReady: true,
  };

  const fill = new B.HemisphericLight(
    "imported-material-fill-light",
    new B.Vector3(0, 1, 0),
    targetScene,
  );
  fill.intensity = 0;
  fill.diffuse = new B.Color3(0.48, 0.58, 0.68);
  fill.groundColor = new B.Color3(0.11, 0.085, 0.055);
  fill.specular = new B.Color3(0.42, 0.48, 0.56);

  const rim = new B.DirectionalLight(
    "imported-material-rim-light",
    new B.Vector3(0.45, -0.32, 0.72),
    targetScene,
  );
  rim.intensity = 0;
  rim.diffuse = new B.Color3(0.52, 0.68, 1.0);
  rim.specular = new B.Color3(0.9, 0.96, 1.0);

  targetScene.metadata.importedMaterialLighting = {
    fill,
    fillIntensity: 0.18,
    rim,
    rimIntensity: 0.28,
  };
}

function enhanceImportedItemMaterials(root, item) {
  if (!root || !isFabricatorItem(item)) return;
}

function enhanceHelmetGlassMeshes(root, item) {
  if (!root || !isHelmetItem(item)) return;
  const material = getHelmetGlassMaterial();
  for (const mesh of getRootRenderableMeshes(root)) {
    if (!isHelmetGlassMesh(mesh)) continue;
    mesh.material = material;
    mesh.visibility = 1;
    mesh.hasVertexAlpha = false;
    mesh.renderingGroupId = 0;
    mesh.disableEdgesRendering?.();
  }
}

function isHelmetGlassMesh(mesh) {
  const names = [];
  let node = mesh;
  while (node) {
    names.push(node.name ?? "", node.id ?? "");
    node = node.parent;
  }
  names.push(mesh?.material?.name ?? "");
  return /helmet[_ -]?glass/i.test(names.join(" "));
}

function getHelmetGlassMaterial() {
  const materialName = "helmet-smoked-glass-material";
  const existing = scene.getMaterialByName?.(materialName);
  if (existing) return existing;

  const material = new B.PBRMaterial(materialName, scene);
  material.albedoColor = new B.Color3(0.08, 0.16, 0.2);
  material.emissiveColor = new B.Color3(0.005, 0.018, 0.028);
  material.reflectivityColor = new B.Color3(0.5, 0.82, 1.0);
  material.alpha = 0.42;
  material.metallic = 0;
  material.roughness = 0.045;
  material.microSurface = 0.94;
  material.indexOfRefraction = 1.5;
  material.environmentIntensity = 1.2;
  material.directIntensity = 1.0;
  material.specularIntensity = 1.05;
  material.backFaceCulling = false;
  material.twoSidedLighting = true;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  material.alphaMode = B.Engine.ALPHA_COMBINE;
  material.needDepthPrePass = true;
  material.separateCullingPass = false;
  return material;
}

function includeImportedMaterialLightingMeshes(meshes) {
  const lighting = scene?.metadata?.importedMaterialLighting;
  if (!lighting || !Array.isArray(meshes) || !meshes.length) return;

  const included = new Set(lighting.fill.includedOnlyMeshes ?? []);
  for (const mesh of meshes) {
    included.add(mesh);
  }
  const includedMeshes = [...included].filter((mesh) => !mesh.isDisposed?.());
  lighting.fill.includedOnlyMeshes = includedMeshes;
  lighting.rim.includedOnlyMeshes = includedMeshes;
  lighting.fill.intensity = lighting.fillIntensity;
  lighting.rim.intensity = lighting.rimIntensity;
}

function refreshFabricatorReflectionProbe(root, item) {
  if (!root || !isFabricatorItem(item)) return;
}

function getFabricatorReflectionProbe(root) {
  if (!B.ReflectionProbe || !scene) return null;

  let probe = scene.metadata?.fabricatorReflectionProbe;
  if (!probe || probe.isDisposed?.()) {
    probe = new B.ReflectionProbe(
      "fabricator-reflection-probe",
      FABRICATOR_REFLECTION_PROBE_SIZE,
      scene,
      true,
    );
    probe.refreshRate = 12;
    scene.metadata = {
      ...(scene.metadata ?? {}),
      fabricatorReflectionProbe: probe,
    };
  }

  root.computeWorldMatrix?.(true);
  probe.position.copyFrom(root.getAbsolutePosition?.() ?? root.position);
  probe.renderList = scene.meshes.filter(
    (mesh) =>
      mesh.isVisible !== false &&
      mesh.visibility !== 0 &&
      !mesh.metadata?.excludeFromBounds &&
      !mesh.metadata?.fabricatorDisassemblyEffect,
  );
  return probe;
}

function enhanceFabricatorMeshMaterial(mesh, reflectionTexture) {
  const material = mesh?.material;
  if (!material || material.metadata?.fabricatorMaterialEnhanced) return;

  if (material.subMaterials?.length) {
    for (const subMaterial of material.subMaterials) {
      enhanceFabricatorMaterial(subMaterial, reflectionTexture);
    }
    material.metadata = {
      ...(material.metadata ?? {}),
      fabricatorMaterialEnhanced: true,
    };
    return;
  }

  enhanceFabricatorMaterial(material, reflectionTexture);
}

function enhanceFabricatorMaterial(material, reflectionTexture) {
  if (!material || material.metadata?.fabricatorMaterialEnhanced) return;

  const mirrorLike = isMirrorLikeFabricatorMaterial(material);
  material.metadata = {
    ...(material.metadata ?? {}),
    fabricatorMaterialEnhanced: true,
  };
  material.backFaceCulling = false;
  material.twoSidedLighting = true;
  material.maxSimultaneousLights = Math.max(
    material.maxSimultaneousLights ?? 4,
    6,
  );

  if (material.getClassName?.() === "PBRMaterial" || "metallic" in material) {
    enhanceFabricatorPbrMaterial(material, reflectionTexture, mirrorLike);
    return;
  }

  if (mirrorLike && "reflectionTexture" in material) {
    material.reflectionTexture = null;
  }
  material.specularColor =
    material.specularColor?.clone?.() ?? new B.Color3(0.62, 0.54, 0.42);
  if (mirrorLike) {
    material.diffuseColor = new B.Color3(0.11, 0.082, 0.058);
    material.ambientColor = new B.Color3(0.018, 0.013, 0.009);
    material.emissiveColor = B.Color3.Black();
    material.specularColor.copyFromFloats(0.12, 0.095, 0.07);
    material.specularPower = Math.min(material.specularPower ?? 34, 42);
    return;
  }
  material.specularColor.r = Math.min(
    Math.max(material.specularColor.r, 0.28),
    0.42,
  );
  material.specularColor.g = Math.min(
    Math.max(material.specularColor.g, 0.24),
    0.36,
  );
  material.specularColor.b = Math.min(
    Math.max(material.specularColor.b, 0.2),
    0.32,
  );
  material.specularPower = Math.min(
    Math.max(material.specularPower ?? 32, 42),
    58,
  );
  if (reflectionTexture && "reflectionTexture" in material) {
    material.reflectionTexture = reflectionTexture;
  }
}

function isMirrorLikeFabricatorMaterial(material) {
  return `${material?.name ?? ""}`.toLowerCase().includes("mirror");
}

function enhanceFabricatorPbrMaterial(
  material,
  reflectionTexture,
  mirrorLike = false,
) {
  const name = `${material.name ?? ""}`.toLowerCase();
  const metalLike =
    mirrorLike ||
    name.includes("metal") ||
    name.includes("panel") ||
    name.includes("gold");

  if (mirrorLike) {
    if ("reflectionTexture" in material) material.reflectionTexture = null;
    material.environmentIntensity = 0.02;
    material.directIntensity = Math.min(
      Math.max(material.directIntensity ?? 0.86, 0.74),
      0.95,
    );
    material.specularIntensity = 0.34;
    material.metallic = 0;
    material.roughness = Math.max(material.roughness ?? 0.52, 0.5);
    material.microSurface = Math.min(material.microSurface ?? 0.48, 0.52);
    if (material.albedoColor) {
      material.albedoColor.copyFromFloats(0.11, 0.082, 0.058);
    }
    if (material.emissiveColor) {
      material.emissiveColor.copyFromFloats(0, 0, 0);
    }
    if (material.reflectivityColor) {
      material.reflectivityColor.copyFromFloats(0.055, 0.044, 0.033);
    }
    return;
  }

  if (reflectionTexture) {
    material.reflectionTexture = reflectionTexture;
  }
  material.environmentIntensity = Math.min(
    Math.max(material.environmentIntensity ?? 0.82, 0.68),
    0.95,
  );
  material.directIntensity = Math.min(
    Math.max(material.directIntensity ?? 0.9, 0.72),
    1.0,
  );
  material.specularIntensity = Math.min(
    Math.max(material.specularIntensity ?? 0.85, 0.55),
    0.9,
  );

  if (metalLike) {
    material.metallic = Math.min(
      material.metallic ?? (mirrorLike ? 0.62 : 0.46),
      mirrorLike ? 0.72 : 0.56,
    );
    material.roughness = Math.max(
      material.roughness ?? (mirrorLike ? 0.34 : 0.52),
      mirrorLike ? 0.28 : 0.48,
    );
    material.microSurface = Math.min(
      material.microSurface ?? (mirrorLike ? 0.68 : 0.5),
      mirrorLike ? 0.72 : 0.56,
    );
    if (material.reflectivityColor) {
      material.reflectivityColor.r = Math.min(
        Math.max(material.reflectivityColor.r, 0.2),
        0.32,
      );
      material.reflectivityColor.g = Math.min(
        Math.max(material.reflectivityColor.g, 0.17),
        0.28,
      );
      material.reflectivityColor.b = Math.min(
        Math.max(material.reflectivityColor.b, 0.13),
        0.24,
      );
    }
  } else {
    material.roughness = Math.max(material.roughness ?? 0.62, 0.58);
    material.microSurface = Math.min(material.microSurface ?? 0.38, 0.42);
  }
}

function resolveItemRotation(item) {
  if (item.rotation) return item.rotation;
  if (item.rotationDegrees) {
    return item.rotationDegrees.map((degrees) => (degrees * Math.PI) / 180);
  }
  return [0, 0, 0];
}

function installPlacedItemMetadata(root, item) {
  root.metadata = {
    ...(root.metadata ?? {}),
    placedItem: sanitizeItemForSave(item),
    glbPickupLabel: item.name ?? item.label ?? item.id ?? "Item",
    glbPickupRange: GLB_PICKUP_PROMPT_RANGE,
    glbPickupRoot: root,
    glbPickupItem: { ...item },
  };
  if (isBatteryItem(item)) {
    initializeBatteryEnergy(root);
  }
  if (isOxygenGeneratorItem(item)) {
    initializeOxygenGeneratorState(root);
  }
  unregisterPlacedItemCollisionMeshes(root);
  for (const mesh of getRootRenderableMeshes(root)) {
    const collisionMesh = isItemCollisionMesh(mesh);
    mesh.isPickable = !collisionMesh;
    mesh.checkCollisions = false;
    if (collisionMesh) {
      mesh.isVisible = false;
      mesh.visibility = 0;
      mesh.showBoundingBox = false;
    }
    mesh.metadata = {
      ...(mesh.metadata ?? {}),
      itemCollisionMesh: collisionMesh,
      authoredCollisionMesh: collisionMesh,
      excludeFromBounds: collisionMesh,
      excludeFromCollision: !collisionMesh,
      originalMaterial: mesh.material ?? null,
      renderingGroupId: mesh.renderingGroupId ?? 0,
      ...(collisionMesh
        ? {}
        : {
            glbPickupLabel: item.name ?? item.label ?? item.id ?? "Item",
            glbPickupRange: GLB_PICKUP_PROMPT_RANGE,
            glbPickupRoot: root,
            glbPickupItem: { ...item },
          }),
    };
    mesh.showBoundingBox =
      !collisionMesh && Boolean(scene.metadata?.objectBoundsVisible);
  }
  registerPlacedItemCollisionMeshes(root);
}

function isItemCollisionMesh(mesh) {
  if (!mesh) return false;
  const names = [];
  let node = mesh;
  while (node) {
    for (const name of [node.name, node.id]) {
      const normalized = name?.toLowerCase?.();
      if (normalized) names.push(normalized);
    }
    node = node.parent;
  }
  return names.some(
    (name) =>
      /^(col|ucx|ubx|ucp|usp)[_.-]/i.test(name) ||
      name === "collision" ||
      name === "collisions",
  );
}

function registerPlacedItemCollisionMeshes(root) {
  const colliders = getPlacedItemCollisionMeshes(root);
  if (!colliders.length || !level?.platform) return;

  const authored = new Set(level.platform.authoredCollisionMeshes ?? []);
  for (const mesh of colliders) {
    preparePlacedItemCollisionMesh(mesh);
    authored.add(mesh);
  }
  level.platform.authoredCollisionMeshes = [...authored];
}

function preparePlacedItemCollisionMesh(mesh) {
  mesh.setEnabled(true);
  mesh.isVisible = false;
  mesh.visibility = 0;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.showBoundingBox = false;
  mesh.refreshBoundingInfo?.();
  mesh.computeWorldMatrix(true);
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    itemCollisionMesh: true,
    authoredCollisionMesh: true,
    excludeFromBounds: true,
    excludeFromCollision: false,
    originalMaterial: mesh.metadata?.originalMaterial ?? mesh.material ?? null,
    renderingGroupId:
      mesh.metadata?.renderingGroupId ?? mesh.renderingGroupId ?? 0,
  };
}

function unregisterPlacedItemCollisionMeshes(root) {
  if (!level?.platform?.authoredCollisionMeshes?.length) return;

  const colliders = new Set(getPlacedItemCollisionMeshes(root));
  if (!colliders.size) return;
  level.platform.authoredCollisionMeshes =
    level.platform.authoredCollisionMeshes.filter(
      (mesh) => !colliders.has(mesh),
    );
}

function getPlacedItemCollisionMeshes(root) {
  return getRootRenderableMeshes(root).filter((mesh) =>
    isItemCollisionMesh(mesh),
  );
}

function updatePlacementPreview() {
  refreshPlacementPreview();
  if (!placementPreview) return;

  if (isUiModalOpen()) {
    placementState = null;
    placementPreview.root.setEnabled(false);
    return;
  }

  const item = getSelectedPlaceableItem();
  const state = item ? getPlacementState(item, placementPreview.root) : null;
  placementState = state;

  if (!state) {
    placementPreview.root.setEnabled(false);
    return;
  }

  applyPlacementStateToRoot(placementPreview.root, item, state);
  placementPreview.root.setEnabled(true);
  applyPlacementPreviewMaterial(placementPreview, state.valid);
}

function applyPlacementStateToRoot(root, item, state) {
  root.position.copyFrom(state.localPosition);
  if (state.localRotation) {
    root.rotation.copyFrom(state.localRotation);
  } else {
    root.rotation = B.Vector3.FromArray(resolveItemRotation(item));
  }
  root.computeWorldMatrix(true);
}

function getPlacementState(item, root) {
  const platform = level.platform?.physics;
  if (!platform || !root) return null;

  if (getItemPlacementSurface(item) === "exterior") {
    return getExteriorPlacementState(item, root, platform);
  }
  if (getItemPlacementSurface(item) === "wall") {
    return getWallPlacementState(item, root, platform);
  }
  return getFloorPlacementState(item, root, platform);
}

function getItemPlacementSurface(item) {
  return item.placementSurface ?? item.placement ?? "floor";
}

function getFloorPlacementState(item, root, platform) {
  const localPoint = getFloorPlacementPoint(platform);
  if (!localPoint) return null;

  root.rotation = getFloorPlacementRotation(item);
  root.position.copyFrom(localPoint);
  settleItemRootOnFloor(root, item);
  const bounds = getRootBoundsInPlatform(root);
  if (!bounds) return null;

  const inside = isPlacementInsidePlatform(bounds, platform);
  return {
    localPosition: root.position.clone(),
    localRotation: root.rotation.clone(),
    bounds,
    valid: inside,
    surface: "floor",
  };
}

function getWallPlacementState(item, root, platform) {
  const hit = getWallPlacementHit(platform);
  if (!hit) return null;

  root.position.copyFrom(hit.point);
  root.rotation.copyFrom(getWallPlacementRotation(item, hit.wall));
  root.computeWorldMatrix(true);
  centerWallPlacementRootOnHit(root, hit.point, hit.wall);
  alignWallPlacementRootToSurface(
    root,
    hit.point,
    hit.outward,
    item.wallGap ?? 0.006,
  );
  nudgeWallPlacementInside(
    root,
    platform,
    hit.wall,
    item.wallInsidePadding ?? PLACEMENT_PADDING,
  );

  const bounds = getRootBoundsInPlatform(root);
  if (!bounds) return null;

  return {
    localPosition: root.position.clone(),
    localRotation: root.rotation.clone(),
    bounds,
    valid: isWallPlacementInsidePlatform(bounds, platform, hit.wall),
    surface: "wall",
    wall: hit.wall,
  };
}

function getExteriorPlacementState(item, root, platform) {
  const hit = getExteriorPlacementHit(platform);
  if (!hit) return null;

  root.position.copyFrom(hit.point.add(hit.normal.scale(item.exteriorGap ?? 0.006)));
  root.rotation.copyFrom(getSurfacePlacementRotation(hit.normal));
  root.computeWorldMatrix(true);

  const bounds = getRootBoundsInPlatform(root);
  if (!bounds) return null;

  return {
    localPosition: root.position.clone(),
    localRotation: root.rotation.clone(),
    bounds,
    valid: true,
    surface: "exterior",
    normal: hit.normal.clone(),
  };
}

function getExteriorPlacementHit(platform) {
  if (!scene || !level?.platform?.root) return null;

  const ray = createCameraLookRay(PLACEMENT_RANGE);
  const hits = scene.multiPickWithRay?.(ray, isExteriorPlacementMesh) ?? [];
  if (!hits.length) return null;

  const platformRoot = level.platform.root;
  const inversePlatform = platformRoot.getWorldMatrix().clone().invert();
  const modelBounds = platform.bounds ?? platform.interiorBounds;
  const center = modelBounds
    ? modelBounds.min.add(modelBounds.max).scale(0.5)
    : B.Vector3.Zero();

  for (const hit of hits.sort((a, b) => a.distance - b.distance)) {
    if (!hit?.hit || !hit.pickedPoint || hit.distance > PLACEMENT_RANGE) {
      continue;
    }

    const localNormal = getLocalPickNormal(hit, inversePlatform);
    if (!localNormal || localNormal.lengthSquared() <= 0.000001) continue;

    const point = B.Vector3.TransformCoordinates(
      hit.pickedPoint,
      inversePlatform,
    );
    const fromCenter = point.subtract(center);
    if (fromCenter.lengthSquared() <= 0.000001) continue;
    fromCenter.normalize();
    if (B.Vector3.Dot(localNormal, fromCenter) < 0.18) continue;

    return {
      point,
      normal: localNormal,
      distance: hit.distance,
    };
  }

  return null;
}

function isExteriorPlacementMesh(mesh) {
  if (!mesh || mesh.isEnabled?.() === false || mesh.isVisible === false) {
    return false;
  }
  if (mesh.visibility !== undefined && mesh.visibility <= 0) return false;
  if (mesh.getTotalVertices?.() <= 0) return false;
  if (mesh.metadata?.excludeFromBounds) return false;
  if (mesh.metadata?.glbPickupRoot || mesh.metadata?.glbPickupLabel) {
    return false;
  }
  if (isPolySurfaceHologram(mesh)) return false;
  return isNodeDescendantOf(mesh, level?.platform?.deck);
}

function getSurfacePlacementRotation(normal) {
  const yAxis = normal.clone();
  if (yAxis.lengthSquared() <= 0.000001) return B.Vector3.Zero();
  yAxis.normalize();

  const cameraForward = camera?.getDirection?.(B.Axis.Z) ?? B.Axis.Z.clone();
  const localForward = worldDirectionToPlatformLocal(cameraForward);
  const zAxis = localForward.subtract(yAxis.scale(B.Vector3.Dot(localForward, yAxis)));
  if (zAxis.lengthSquared() <= 0.000001) {
    zAxis.copyFrom(Math.abs(yAxis.y) < 0.85 ? B.Axis.Y : B.Axis.Z);
    zAxis.subtractInPlace(yAxis.scale(B.Vector3.Dot(zAxis, yAxis)));
  }
  zAxis.normalize();

  const xAxis = B.Vector3.Cross(yAxis, zAxis);
  if (xAxis.lengthSquared() <= 0.000001) return B.Vector3.Zero();
  xAxis.normalize();
  B.Vector3.CrossToRef(xAxis, yAxis, zAxis);
  zAxis.normalize();

  return B.Vector3.RotationFromAxis(xAxis, yAxis, zAxis);
}

function getFloorPlacementPoint(platform) {
  const ray = createCameraLookRayInPlatform(PLACEMENT_RANGE);
  const floorY = platform.floorY ?? 0;
  if (Math.abs(ray.direction.y) < 0.0001) return null;

  const distance = (floorY - ray.origin.y) / ray.direction.y;
  if (distance <= 0 || distance > PLACEMENT_RANGE) return null;

  return ray.origin.add(ray.direction.scale(distance));
}

function getWallPlacementHit(platform) {
  const meshHit = getWallPlacementMeshHit(platform);
  if (meshHit) return meshHit;

  const ray = createCameraLookRayInPlatform(PLACEMENT_RANGE);
  if (!wallFromDirection(ray.direction)) return null;

  const minX = platform.minX ?? -platform.width * 0.5;
  const maxX = platform.maxX ?? platform.width * 0.5;
  const minZ = platform.minZ ?? -platform.depth * 0.5;
  const maxZ = platform.maxZ ?? platform.depth * 0.5;
  const floorY = platform.floorY ?? 0;
  const ceilingY = platform.ceilingY ?? floorY + (platform.playerHeight ?? 1);
  const hits = [];

  addWallPlacementHit(hits, ray, "leftWall", "x", minX, {
    minY: floorY,
    maxY: ceilingY,
    minOther: minZ,
    maxOther: maxZ,
  });
  addWallPlacementHit(hits, ray, "rightWall", "x", maxX, {
    minY: floorY,
    maxY: ceilingY,
    minOther: minZ,
    maxOther: maxZ,
  });
  addWallPlacementHit(hits, ray, "backWall", "z", minZ, {
    minY: floorY,
    maxY: ceilingY,
    minOther: minX,
    maxOther: maxX,
  });
  addWallPlacementHit(hits, ray, "frontWall", "z", maxZ, {
    minY: floorY,
    maxY: ceilingY,
    minOther: minX,
    maxOther: maxX,
  });

  hits.sort((a, b) => a.distance - b.distance);
  return hits[0] ?? null;
}

function addWallPlacementHit(hits, ray, wall, axis, planeValue, bounds) {
  const directionComponent = axis === "x" ? ray.direction.x : ray.direction.z;
  if (Math.abs(directionComponent) < 0.0001) return;

  const originComponent = axis === "x" ? ray.origin.x : ray.origin.z;
  const distance = (planeValue - originComponent) / directionComponent;
  if (distance <= 0 || distance > PLACEMENT_RANGE) return;

  const point = ray.origin.add(ray.direction.scale(distance));
  point.y = clamp(
    point.y,
    bounds.minY + PLACEMENT_PADDING,
    bounds.maxY - PLACEMENT_PADDING,
  );
  if (axis === "x") {
    point.z = clamp(
      point.z,
      bounds.minOther + PLACEMENT_PADDING,
      bounds.maxOther - PLACEMENT_PADDING,
    );
  } else {
    point.x = clamp(
      point.x,
      bounds.minOther + PLACEMENT_PADDING,
      bounds.maxOther - PLACEMENT_PADDING,
    );
  }

  hits.push({
    wall,
    point,
    distance,
    outward: wallOutwardDirection(wall),
  });
}

function createCameraLookRayInPlatform(distance) {
  const direction = camera.getDirection(B.Axis.Z).normalize();
  if (!camera.parent) {
    return new B.Ray(camera.position.clone(), direction, distance);
  }

  const inverseParent = camera.parent.getWorldMatrix().clone().invert();
  const localDirection = B.Vector3.TransformNormal(direction, inverseParent);
  localDirection.normalize();
  return new B.Ray(camera.position.clone(), localDirection, distance);
}

function getWallPlacementMeshHit(platform) {
  if (!scene || !level?.platform?.root) return null;

  const ray = createCameraLookRay(PLACEMENT_RANGE);
  const hits = scene.multiPickWithRay?.(ray, isWallPlacementMesh) ?? [];
  if (!hits.length) return null;

  const platformRoot = level.platform.root;
  const inversePlatform = platformRoot.getWorldMatrix().clone().invert();
  const localRay = createCameraLookRayInPlatform(PLACEMENT_RANGE);
  const wall = wallFromDirection(localRay.direction);
  if (!wall) return null;
  const outward = wallOutwardDirection(wall);

  for (const hit of hits.sort((a, b) => a.distance - b.distance)) {
    if (!hit?.hit || !hit.pickedPoint || hit.distance > PLACEMENT_RANGE) {
      continue;
    }

    const localNormal = getLocalPickNormal(hit, inversePlatform);
    if (localNormal && Math.abs(localNormal.y) > 0.65) continue;

    const point = B.Vector3.TransformCoordinates(
      hit.pickedPoint,
      inversePlatform,
    );
    if (!isWallMountPointInPlatform(point, platform, wall)) continue;

    return {
      wall,
      point: clampWallMountPoint(point, platform, wall),
      distance: hit.distance,
      outward,
    };
  }

  return null;
}

function isWallPlacementMesh(mesh) {
  if (!mesh || mesh.isEnabled?.() === false || mesh.isVisible === false) {
    return false;
  }
  if (mesh.visibility !== undefined && mesh.visibility <= 0) return false;
  if (mesh.getTotalVertices?.() <= 0) return false;
  if (mesh.metadata?.excludeFromBounds) return false;
  if (mesh.metadata?.glbPickupRoot || mesh.metadata?.glbPickupLabel) {
    return false;
  }
  if (isPolySurfaceHologram(mesh)) return false;
  return isNodeDescendantOf(mesh, level?.platform?.deck);
}

function isNodeDescendantOf(node, ancestor) {
  for (let current = node; current; current = current.parent) {
    if (current === ancestor) return true;
  }
  return false;
}

function getLocalPickNormal(hit, inversePlatform) {
  const worldNormal = hit.getNormal?.(true, true);
  if (!worldNormal || worldNormal.lengthSquared?.() <= 0.000001) return null;

  const localNormal = B.Vector3.TransformNormal(worldNormal, inversePlatform);
  if (localNormal.lengthSquared() <= 0.000001) return null;
  return localNormal.normalize();
}

function wallFromDirection(direction) {
  const absX = Math.abs(direction.x);
  const absZ = Math.abs(direction.z);
  if (Math.max(absX, absZ) <= Math.abs(direction.y)) return null;
  if (absX >= absZ) return direction.x < 0 ? "leftWall" : "rightWall";
  return direction.z < 0 ? "backWall" : "frontWall";
}

function isWallMountPointInPlatform(point, platform, wall) {
  const minX = platform.minX ?? -platform.width * 0.5;
  const maxX = platform.maxX ?? platform.width * 0.5;
  const minZ = platform.minZ ?? -platform.depth * 0.5;
  const maxZ = platform.maxZ ?? platform.depth * 0.5;
  const minY = platform.floorY ?? point.y;
  const maxY = platform.ceilingY ?? point.y;
  const tolerance = PLACEMENT_PADDING * 2;

  if (point.y < minY - tolerance || point.y > maxY + tolerance) return false;
  if (wall === "leftWall" || wall === "rightWall") {
    return point.z >= minZ - tolerance && point.z <= maxZ + tolerance;
  }
  return point.x >= minX - tolerance && point.x <= maxX + tolerance;
}

function clampWallMountPoint(point, platform, wall) {
  const minX = platform.minX ?? -platform.width * 0.5;
  const maxX = platform.maxX ?? platform.width * 0.5;
  const minZ = platform.minZ ?? -platform.depth * 0.5;
  const maxZ = platform.maxZ ?? platform.depth * 0.5;
  const minY = platform.floorY ?? point.y;
  const maxY = platform.ceilingY ?? point.y;
  const clamped = point.clone();
  clamped.y = clamp(
    clamped.y,
    minY + PLACEMENT_PADDING,
    maxY - PLACEMENT_PADDING,
  );
  if (wall === "leftWall" || wall === "rightWall") {
    clamped.z = clamp(
      clamped.z,
      minZ + PLACEMENT_PADDING,
      maxZ - PLACEMENT_PADDING,
    );
  } else {
    clamped.x = clamp(
      clamped.x,
      minX + PLACEMENT_PADDING,
      maxX - PLACEMENT_PADDING,
    );
  }
  return clamped;
}

function getWallPlacementRotation(item, wall) {
  const rotation = B.Vector3.FromArray(
    item.wallRotation ??
      (item.wallRotationDegrees
        ? vectorDegreesToRadians(item.wallRotationDegrees)
        : resolveItemRotation(item)),
  );
  return new B.Vector3(rotation.x, wallYaw(wall) + rotation.y, rotation.z);
}

function getFloorPlacementRotation(item) {
  const rotation = B.Vector3.FromArray(resolveItemRotation(item));
  rotation.y += floorPlacementYaw;
  return rotation;
}

function rotateSelectedFloorPlacement() {
  const item = getSelectedPlaceableItem();
  if (!item || getItemPlacementSurface(item) !== "floor") return false;

  floorPlacementYaw = normalizeRadians(
    floorPlacementYaw + Math.PI / 8,
  );
  placementUpdateElapsed = Number.POSITIVE_INFINITY;
  updatePlacementPreview();
  updateInteractionPrompt({ prompt: "Rotated placement" });
  return true;
}

function centerWallPlacementRootOnHit(root, hitPoint, wall) {
  const bounds = getRootBoundsInPlatform(root);
  if (!bounds) return;

  const center = bounds.min.add(bounds.max).scale(0.5);
  root.position.y += hitPoint.y - center.y;
  if (wall === "leftWall" || wall === "rightWall") {
    root.position.z += hitPoint.z - center.z;
  } else {
    root.position.x += hitPoint.x - center.x;
  }
  root.computeWorldMatrix(true);
}

function alignWallPlacementRootToSurface(root, surfacePoint, outward, gap) {
  const bounds = getRootBoundsInPlatform(root);
  if (!bounds) return;

  const target = B.Vector3.Dot(surfacePoint, outward) - Math.max(gap, 0);
  const current = getMaxBoundsProjection(bounds, outward);
  root.position.addInPlace(outward.scale(target - current));
  root.computeWorldMatrix(true);
}

function nudgeWallPlacementInside(root, platform, wall, padding) {
  const bounds = getRootBoundsInPlatform(root);
  if (!bounds) return;

  const minY = (platform.floorY ?? bounds.min.y) + padding;
  const maxY = (platform.ceilingY ?? bounds.max.y) - padding;
  let offsetX = 0;
  let offsetY = 0;
  let offsetZ = 0;

  if (bounds.min.y < minY) offsetY = minY - bounds.min.y;
  if (bounds.max.y > maxY) offsetY = maxY - bounds.max.y;

  if (wall === "leftWall" || wall === "rightWall") {
    const minZ = (platform.minZ ?? bounds.min.z) + padding;
    const maxZ = (platform.maxZ ?? bounds.max.z) - padding;
    if (bounds.min.z < minZ) offsetZ = minZ - bounds.min.z;
    if (bounds.max.z > maxZ) offsetZ = maxZ - bounds.max.z;
  } else {
    const minX = (platform.minX ?? bounds.min.x) + padding;
    const maxX = (platform.maxX ?? bounds.max.x) - padding;
    if (bounds.min.x < minX) offsetX = minX - bounds.min.x;
    if (bounds.max.x > maxX) offsetX = maxX - bounds.max.x;
  }

  root.position.addInPlace(new B.Vector3(offsetX, offsetY, offsetZ));
  root.computeWorldMatrix(true);
}

function getMaxBoundsProjection(bounds, direction) {
  const corners = [
    new B.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
    new B.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
    new B.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
    new B.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
    new B.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
    new B.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
    new B.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
    new B.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
  ];
  return corners.reduce(
    (max, corner) => Math.max(max, B.Vector3.Dot(corner, direction)),
    -Infinity,
  );
}

function wallOutwardDirection(wall) {
  if (wall === "backWall") return new B.Vector3(0, 0, -1);
  if (wall === "leftWall") return new B.Vector3(-1, 0, 0);
  if (wall === "rightWall") return new B.Vector3(1, 0, 0);
  return new B.Vector3(0, 0, 1);
}

function wallYaw(wall) {
  if (wall === "backWall") return Math.PI;
  if (wall === "leftWall") return -Math.PI / 2;
  if (wall === "rightWall") return Math.PI / 2;
  return 0;
}

function isPlacementInsidePlatform(bounds, platform) {
  const minX = platform.minX ?? -platform.width * 0.5;
  const maxX = platform.maxX ?? platform.width * 0.5;
  const minZ = platform.minZ ?? -platform.depth * 0.5;
  const maxZ = platform.maxZ ?? platform.depth * 0.5;
  return (
    bounds.min.x >= minX + PLACEMENT_PADDING &&
    bounds.max.x <= maxX - PLACEMENT_PADDING &&
    bounds.min.z >= minZ + PLACEMENT_PADDING &&
    bounds.max.z <= maxZ - PLACEMENT_PADDING
  );
}

function isWallPlacementInsidePlatform(bounds, platform, wall) {
  const minX = platform.minX ?? -platform.width * 0.5;
  const maxX = platform.maxX ?? platform.width * 0.5;
  const minZ = platform.minZ ?? -platform.depth * 0.5;
  const maxZ = platform.maxZ ?? platform.depth * 0.5;
  const minY = (platform.floorY ?? bounds.min.y) + PLACEMENT_PADDING;
  const maxY = (platform.ceilingY ?? bounds.max.y) - PLACEMENT_PADDING;
  const epsilon = 0.002;

  if (bounds.min.y < minY || bounds.max.y > maxY) return false;
  if (wall === "rightWall") {
    return (
      bounds.min.x >= minX + PLACEMENT_PADDING &&
      bounds.max.x <= maxX + epsilon &&
      bounds.min.z >= minZ + PLACEMENT_PADDING &&
      bounds.max.z <= maxZ - PLACEMENT_PADDING
    );
  }
  if (wall === "leftWall") {
    return (
      bounds.min.x >= minX - epsilon &&
      bounds.max.x <= maxX - PLACEMENT_PADDING &&
      bounds.min.z >= minZ + PLACEMENT_PADDING &&
      bounds.max.z <= maxZ - PLACEMENT_PADDING
    );
  }
  if (wall === "backWall") {
    return (
      bounds.min.z >= minZ - epsilon &&
      bounds.max.z <= maxZ - PLACEMENT_PADDING &&
      bounds.min.x >= minX + PLACEMENT_PADDING &&
      bounds.max.x <= maxX - PLACEMENT_PADDING
    );
  }
  return (
    bounds.min.z >= minZ + PLACEMENT_PADDING &&
    bounds.max.z <= maxZ + epsilon &&
    bounds.min.x >= minX + PLACEMENT_PADDING &&
    bounds.max.x <= maxX - PLACEMENT_PADDING
  );
}

function applyPlacementPreviewMaterial(preview, valid) {
  const material = valid ? preview.validMaterial : preview.invalidMaterial;
  for (const mesh of getRootRenderableMeshes(preview.root)) {
    mesh.material = material;
  }
}

function createPlacementMaterial(name, valid) {
  const material = new B.StandardMaterial(name, scene);
  const color = valid
    ? new B.Color3(0.2, 0.95, 1)
    : new B.Color3(1, 0.22, 0.18);
  material.diffuseColor = color.scale(0.35);
  material.emissiveColor = color;
  material.alpha = valid ? 0.34 : 0.24;
  material.backFaceCulling = false;
  material.disableLighting = true;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  material.alphaMode = B.Engine.ALPHA_ADD;
  material.disableDepthWrite = true;
  return material;
}

function settleItemRootOnFloor(root, item) {
  root.computeWorldMatrix(true);
  const bounds = getRootBoundsInPlatform(root);
  const floorY = level.platform?.physics?.floorY ?? 0;
  if (!bounds) return;
  root.position.y += floorY - bounds.min.y + (item.floorOffset ?? 0);
  root.computeWorldMatrix(true);
}

function normalizeItemModel(root, maxDimension) {
  const meshes = getRootRenderableMeshes(root);
  if (!meshes.length) return;

  const bounds = getRootLocalBounds(root);
  if (!bounds) return;

  const center = new B.Vector3(
    (bounds.min.x + bounds.max.x) * 0.5,
    bounds.min.y,
    (bounds.min.z + bounds.max.z) * 0.5,
  );
  const size = bounds.max.subtract(bounds.min);
  const scale = maxDimension / Math.max(size.x, size.y, size.z, 0.0001);
  root.scaling.setAll(scale);
  recenterChildrenAroundAnchor(root, center);
  root.computeWorldMatrix(true);
}

function recenterChildrenAroundAnchor(root, center) {
  for (const node of root.getChildren()) {
    if (node.position) {
      node.position.subtractInPlace(center);
    }
  }
}

function getRootRenderableMeshes(root) {
  return root
    .getChildMeshes(false)
    .filter(
      (mesh) => mesh.getTotalVertices?.() > 0 && !isPolySurfaceHologram(mesh),
    );
}

function getRootLocalBounds(root) {
  const meshes = getRootRenderableMeshes(root);
  if (!meshes.length) return null;

  const inverseRoot = root.getWorldMatrix().clone().invert();
  return getMeshesBoundsInMatrix(meshes, inverseRoot);
}

function getRootBoundsInPlatform(root) {
  const meshes = getRootRenderableMeshes(root);
  const platformRoot = level.platform?.root;
  if (!meshes.length || !platformRoot) return null;

  const inversePlatform = platformRoot.getWorldMatrix().clone().invert();
  return getMeshesBoundsInMatrix(meshes, inversePlatform);
}

function getMeshesBoundsInMatrix(meshes, matrix) {
  const min = new B.Vector3(Infinity, Infinity, Infinity);
  const max = new B.Vector3(-Infinity, -Infinity, -Infinity);
  let found = false;

  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    const corners = mesh.getBoundingInfo().boundingBox.vectorsWorld;
    for (const corner of corners) {
      const point = B.Vector3.TransformCoordinates(corner, matrix);
      min.minimizeInPlace(point);
      max.maximizeInPlace(point);
      found = true;
    }
  }

  return found ? { min, max } : null;
}

function toggleInventory() {
  const willOpen = inventoryModal.hidden;
  closePlayerModals();
  inventoryModal.hidden = !willOpen;
  document.body.classList.toggle("ui-modal-open", willOpen);
  if (willOpen) exitPointerLock();
}

function toggleNotebook() {
  const willOpen = notebookModal.hidden;
  closePlayerModals();
  notebookModal.hidden = !willOpen;
  document.body.classList.toggle("ui-modal-open", willOpen);
  if (willOpen) exitPointerLock();
}

function openFabricatorModal(root = activeInteraction?.root) {
  if (!fabricatorModal) return;

  closePlayerModals();
  activeFabricatorRoot = root ?? null;
  fabricatorAnalysisStaticKey = "";
  renderFabricatorAnalysis();
  fabricatorModal.hidden = false;
  document.body.classList.add("ui-modal-open");
  exitPointerLock();
}

function activateFabricatorPrimaryButton() {
  const mode = getFabricatorMode(activeFabricatorRoot);
  const entry = getSelectedFabricatorEntry(activeFabricatorRoot);
  if (mode === "disassembly") {
    startFabricatorDisassembly(activeFabricatorRoot);
    return;
  }
  if (entry?.type === "recipe") {
    fabricateSelectedRecipe(activeFabricatorRoot);
    return;
  }
}

function renderFabricatorAnalysis() {
  const mode = getFabricatorMode(activeFabricatorRoot);
  const mounted = activeFabricatorRoot?.metadata?.fabricatorMountedAsteroid;
  const yieldValues = getAsteroidYield(mounted?.composition);
  const hasYield = Boolean(yieldValues);
  const disassembly = activeFabricatorRoot?.metadata?.fabricatorDisassembly;
  const crafting = activeFabricatorRoot?.metadata?.fabricatorCrafting;
  const processing = Boolean(disassembly || crafting);
  const battery = getFabricatorBatteryRoot(activeFabricatorRoot);
  const energy = getBatteryEnergyState(battery);
  const selectedEntry = getSelectedFabricatorEntry(activeFabricatorRoot);
  const selectedRecipe =
    selectedEntry?.type === "recipe" ? selectedEntry.recipe : null;
  const actionCost = getFabricatorEntryEnergyCost(selectedEntry);
  const canUseEnergy = energy.stored >= actionCost;
  const canAct = canActivateFabricatorEntry(selectedEntry, {
    battery,
    canUseEnergy,
    hasYield,
    processing,
  });

  if (fabricatorAnalysisStatus) {
    let statusText = "";
    if (!battery) {
      statusText = "No battery connected";
    } else if (processing) {
      statusText = disassembly
        ? `Disassembling ${Math.ceil(disassembly.remaining)}s`
        : `Fabricating ${crafting.recipe?.name ?? "item"} ${Math.ceil(
            crafting.remaining ?? 0,
          )}s`;
    } else if (selectedEntry?.type === "disassembly" && !hasYield) {
      statusText = "Load an asteroid to preview yield";
    } else if (!canUseEnergy) {
      statusText = "Not enough battery";
    }
    fabricatorAnalysisStatus.textContent = statusText;
  }
  if (fabricatorEnergyValue) {
    fabricatorEnergyValue.textContent = battery
      ? `${energy.stored}/${energy.max}`
      : "No battery";
  }
  if (fabricatorEnergyBar) {
    const fill =
      battery && energy.max > 0 ? (energy.stored / energy.max) * 100 : 0;
    fabricatorEnergyBar.style.setProperty(
      "--energy-fill",
      `${clamp(fill, 0, 100).toFixed(1)}%`,
    );
  }
  const staticKey = createFabricatorAnalysisStaticKey({
    mode,
    selectedEntry,
    processing,
    battery,
    energy,
    hasYield,
    yieldValues,
    canAct,
  });
  if (staticKey !== fabricatorAnalysisStaticKey) {
    fabricatorAnalysisStaticKey = staticKey;
    renderFabricatorCategories();
    renderFabricatorRecipes(selectedEntry);
    renderFabricatorDetail(selectedEntry, {
      battery,
      canUseEnergy,
      hasYield,
      yieldValues,
    });
    renderFabricatorModeControls(mode);
    renderFabricatorActionButton({
      canAct,
      processing,
      selectedRecipe,
    });
  }
}

function createFabricatorAnalysisStaticKey({
  mode,
  selectedEntry,
  processing,
  battery,
  energy,
  hasYield,
  yieldValues,
  canAct,
}) {
  return [
    mode,
    getFabricatorCategory(activeFabricatorRoot),
    selectedEntry?.id ?? "",
    processing ? "working" : "idle",
    battery ? "battery" : "no-battery",
    energy.stored,
    energy.max,
    getInventoryItemCount("iron"),
    getInventoryItemCount("copper"),
    getInventoryItemCount("silicon"),
    hasYield ? yieldValues.iron : "-",
    hasYield ? yieldValues.copper : "-",
    hasYield ? yieldValues.water : "-",
    hasYield ? yieldValues.silicon : "-",
    canAct ? "can-act" : "blocked",
  ].join("|");
}

function renderFabricatorActionButton({
  canAct,
  processing,
  selectedRecipe,
}) {
  if (!fabricatorDisassembleButton) return;
  const actionLabel = processing
    ? "Working"
    : selectedRecipe
      ? "Craft"
      : "Disassemble";
  const label = document.createElement("span");
  label.className = "fabricator-action-label";
  label.textContent = actionLabel;
  fabricatorDisassembleButton.disabled = !canAct;
  fabricatorDisassembleButton.setAttribute(
    "aria-label",
    selectedRecipe
      ? `Craft ${selectedRecipe.name}`
      : "Disassemble loaded asteroid",
  );
  fabricatorDisassembleButton.replaceChildren(
    createFabricatorIcon(selectedRecipe ? "craft" : "refine"),
    label,
  );
}

function renderFabricatorModeControls(mode = getFabricatorMode(activeFabricatorRoot)) {
  fabricatorModeDisassemblyButton?.classList.toggle(
    "active",
    mode === "disassembly",
  );
  fabricatorModeFabricationButton?.classList.toggle(
    "active",
    mode === "fabrication",
  );
  fabricatorWorkbench?.classList.toggle(
    "disassembly-mode",
    mode === "disassembly",
  );
  fabricatorWorkbench?.classList.toggle("craft-mode", mode === "fabrication");
}

function renderFabricatorCategories() {
  if (!fabricatorCategoriesPanel) return;
  const mode = getFabricatorMode(activeFabricatorRoot);
  fabricatorCategoriesPanel.hidden = mode !== "fabrication";
  if (mode !== "fabrication") {
    fabricatorCategoriesPanel.replaceChildren();
    return;
  }
  const selectedCategory = getFabricatorCategory(activeFabricatorRoot);
  fabricatorCategoriesPanel.replaceChildren(
    ...fabricatorCategories.map((category) => {
      const button = document.createElement("button");
      button.className = "fabricator-category-button";
      button.classList.toggle("active", category.id === selectedCategory);
      button.type = "button";
      button.title = category.description;
      button.setAttribute("aria-label", category.name);
      const label = document.createElement("span");
      label.className = "fabricator-category-label";
      label.textContent = category.name;
      button.append(createFabricatorIcon(category.icon), label);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setFabricatorCategory(activeFabricatorRoot, category.id);
      });
      return button;
    }),
  );
}

function renderFabricatorRecipes(selectedEntry) {
  if (!fabricatorRecipesPanel) return;
  const mode = getFabricatorMode(activeFabricatorRoot);
  if (fabricatorCraftItemsPanel) {
    fabricatorCraftItemsPanel.hidden = mode !== "fabrication";
  }
  if (mode !== "fabrication") {
    fabricatorRecipesPanel.replaceChildren();
    return;
  }
  const entries = getFabricatorEntriesForCategory(
    getFabricatorCategory(activeFabricatorRoot),
  );
  fabricatorRecipesPanel.replaceChildren(
    ...entries.map((entry) => {
      const button = document.createElement("button");
      button.className = "fabricator-craft-button";
      button.classList.toggle("active", entry.id === selectedEntry?.id);
      button.type = "button";
      button.title = entry.description;
      button.setAttribute("aria-label", entry.name);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelectedFabricatorEntry(activeFabricatorRoot, entry.id);
      });
      const copy = document.createElement("span");
      copy.className = "fabricator-craft-copy";
      const name = document.createElement("span");
      name.className = "fabricator-craft-name";
      name.textContent = entry.name;
      const description = document.createElement("span");
      description.className = "fabricator-craft-description";
      description.textContent = entry.description;
      copy.append(name, description);
      button.append(createCraftEntryIcon(entry), copy);
      return button;
    }),
  );
}

function renderFabricatorDetail(entry, context) {
  if (!entry) return;
  fabricatorSelectedIcon?.replaceChildren(createCraftEntryIcon(entry, true));
  if (fabricatorSelectedName) fabricatorSelectedName.textContent = entry.name;
  if (fabricatorSelectedDescription) {
    fabricatorSelectedDescription.textContent = entry.description;
  }
  if (!fabricatorRequirementsPanel) return;
  const requirements = getFabricatorEntryRequirements(entry, context);
  fabricatorRequirementsPanel.replaceChildren(
    ...requirements.map((requirement) =>
      createFabricatorRequirementRow(requirement),
    ),
  );
  renderFabricatorOutputs(entry, context);
}

function renderFabricatorOutputs(entry, context = {}) {
  if (!fabricatorOutputPanel || !fabricatorOutputList) return;
  const outputVisible = entry?.type === "disassembly";
  fabricatorOutputPanel.hidden = !outputVisible;
  if (!outputVisible) {
    fabricatorOutputList.replaceChildren();
    return;
  }
  const outputs = getFabricatorEntryOutputs(entry, context);
  if (!outputs.length) {
    const empty = document.createElement("div");
    empty.className = "fabricator-output-empty";
    empty.textContent = "No asteroid loaded";
    fabricatorOutputList.replaceChildren(empty);
    return;
  }
  fabricatorOutputList.replaceChildren(
    ...outputs.map((output) => createFabricatorOutputRow(output)),
  );
}

function setFabricatorMode(root, mode) {
  if (!root) return;
  const fabricatorMode = mode === "disassembly" ? "disassembly" : "fabrication";
  const category = getFabricatorCategory(root);
  const entries = getFabricatorEntriesForCategory(category);
  const selectedCraftEntry =
    entries.find(({ id }) => id === root.metadata?.fabricatorSelectedEntryId) ??
    entries[0];
  root.metadata = {
    ...(root.metadata ?? {}),
    fabricatorMode,
    fabricatorSelectedEntryId:
      fabricatorMode === "fabrication"
        ? selectedCraftEntry?.id
        : FABRICATOR_DISASSEMBLY_ENTRY.id,
    fabricatorSelectedRecipeId:
      fabricatorMode === "fabrication" ? selectedCraftEntry?.id : null,
  };
  renderFabricatorAnalysis();
}

function setFabricatorCategory(root, categoryId) {
  if (!root) return;
  const category = fabricatorCategories.some(({ id }) => id === categoryId)
    ? categoryId
    : fabricatorCategories[0].id;
  const entries = getFabricatorEntriesForCategory(category);
  root.metadata = {
    ...(root.metadata ?? {}),
    fabricatorMode: "fabrication",
    fabricatorCategoryId: category,
    fabricatorSelectedEntryId: entries[0]?.id,
    fabricatorSelectedRecipeId: entries[0]?.id,
  };
  renderFabricatorAnalysis();
}

function getFabricatorMode(root) {
  return root?.metadata?.fabricatorMode === "fabrication"
    ? "fabrication"
    : "disassembly";
}

function getFabricatorCategory(root) {
  const categoryId = root?.metadata?.fabricatorCategoryId;
  return fabricatorCategories.some(({ id }) => id === categoryId)
    ? categoryId
    : fabricatorCategories[0].id;
}

function setSelectedFabricatorEntry(root, entryId) {
  if (!root) return;
  const entries = getFabricatorEntriesForCategory(getFabricatorCategory(root));
  const entry = entries.find(({ id }) => id === entryId) ?? entries[0];
  root.metadata = {
    ...(root.metadata ?? {}),
    fabricatorSelectedEntryId: entry?.id,
    fabricatorSelectedRecipeId: entry?.type === "recipe" ? entry.id : null,
  };
  renderFabricatorAnalysis();
}

function getSelectedFabricatorEntry(root) {
  if (getFabricatorMode(root) === "disassembly") {
    return FABRICATOR_DISASSEMBLY_ENTRY;
  }
  const entries = getFabricatorEntriesForCategory(getFabricatorCategory(root));
  if (!entries.length) return null;
  const selectedId =
    root?.metadata?.fabricatorSelectedEntryId ??
    root?.metadata?.fabricatorSelectedRecipeId;
  return entries.find(({ id }) => id === selectedId) ?? entries[0];
}

function getSelectedFabricatorRecipe(root) {
  const entry = getSelectedFabricatorEntry(root);
  return entry?.type === "recipe" ? entry.recipe : null;
}

function getFabricatorEntries() {
  return fabricatorRecipes
    .map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      type: "recipe",
      icon: recipe.craftIcon,
      recipe,
    }));
}

function getFabricatorEntriesForCategory(category) {
  return getFabricatorEntries().filter(
    ({ recipe }) => recipe.category === category,
  );
}

function getFabricatorEntryEnergyCost(entry) {
  return entry?.type === "recipe"
    ? entry.recipe.energyCost
    : FABRICATOR_DISASSEMBLY_ENERGY_COST;
}

function getFabricatorEntryRequirements(entry, context = {}) {
  if (!entry) return [];
  const requirements = [];
  if (entry.type === "recipe") {
    const { recipe } = entry;
    requirements.push(...createRecipeIngredientRequirements(recipe));
  } else {
    requirements.push({
      id: "asteroid",
      icon: "asteroid",
      owned: context.hasYield ? 1 : 0,
      needed: 1,
      met: Boolean(context.hasYield),
    });
  }
  requirements.push({
    id: "energy",
    icon: "electricity",
    owned: getBatteryEnergyState(getFabricatorBatteryRoot(activeFabricatorRoot))
      .stored,
    needed: getFabricatorEntryEnergyCost(entry),
    met:
      getBatteryEnergyState(getFabricatorBatteryRoot(activeFabricatorRoot))
        .stored >= getFabricatorEntryEnergyCost(entry),
  });
  return requirements;
}

function getFabricatorEntryOutputs(entry, context = {}) {
  if (entry?.type !== "disassembly") return [];
  return Object.entries(context.yieldValues ?? {})
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({
      id,
      item: fabricatorResourceItems[id],
      count,
    }))
    .filter(({ item }) => Boolean(item));
}

function createItemRequirement(item, needed) {
  const owned = getInventoryItemCount(item.id);
  return {
    id: item.id,
    item,
    owned,
    needed,
    met: owned >= needed,
  };
}

function createRecipeIngredientRequirements(recipe) {
  return getRecipeIngredientEntries(recipe)
    .map(([id, needed]) => createItemRequirement(fabricatorResourceItems[id], needed))
    .filter((requirement) => Boolean(requirement.item));
}

function canActivateFabricatorEntry(entry, context = {}) {
  if (!entry || !context.battery || !context.canUseEnergy || context.processing) {
    return false;
  }
  if (entry.type === "recipe") return canFabricateRecipe(entry.recipe);
  return Boolean(context.hasYield);
}

function createFabricatorRequirementRow(requirement) {
  const row = document.createElement("div");
  row.className = "fabricator-requirement";
  row.classList.toggle("missing", !requirement.met);
  row.classList.toggle("output", Boolean(requirement.output));

  const icon = document.createElement("span");
  icon.className = "fabricator-requirement-icon";
  if (requirement.item) {
    icon.append(createInventoryPortraitImage(requirement.item));
  } else {
    icon.append(createFabricatorIcon(requirement.icon));
  }
  if (requirement.rate) {
    const rate = document.createElement("span");
    rate.className = "fabricator-requirement-rate";
    rate.textContent = requirement.rate;
    icon.append(rate);
  }

  const count = document.createElement("span");
  count.className = "fabricator-requirement-count";
  count.textContent = requirement.output
    ? `+${requirement.owned}`
    : `${requirement.owned}/${requirement.needed}`;

  const state = document.createElement("span");
  state.className = "fabricator-requirement-status";
  state.textContent = requirement.met ? "" : "!";

  row.append(icon, count, state);
  return row;
}

function createFabricatorOutputRow(output) {
  const row = document.createElement("div");
  row.className = "fabricator-output-row";

  const icon = document.createElement("span");
  icon.className = "fabricator-output-icon";
  icon.append(createInventoryPortraitImage(output.item));

  const name = document.createElement("span");
  name.className = "fabricator-output-name";
  name.textContent = output.item.name;

  const count = document.createElement("span");
  count.className = "fabricator-output-count";
  count.textContent = `+${output.count}`;

  row.append(icon, name, count);
  return row;
}

function createCraftEntryIcon(entry, large = false) {
  if (entry?.recipe?.item?.modelUrl || entry?.recipe?.item?.portraitModelUrl) {
    const image = createInventoryPortraitImage(entry.recipe.item);
    image.classList.add("fabricator-craft-icon");
    return image;
  }
  const wrapper = document.createElement("span");
  wrapper.className = large ? "fabricator-selected-svg" : "fabricator-craft-svg";
  wrapper.append(createFabricatorIcon(entry?.icon ?? "craft"));
  return wrapper;
}

function createInventoryPortraitImage(item) {
  const image = document.createElement("img");
  image.alt = "";
  image.className = "fabricator-craft-icon";
  createInventoryPortraitDataUrl(item)
    .then((portrait) => {
      image.src = portrait || createItemPortrait(item);
    })
    .catch(() => {
      image.src = createItemPortrait(item);
    });
  return image;
}

function createFabricatorIcon(type) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "fabricator-icon");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("aria-hidden", "true");
  const addPath = (d, fill = "none") => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", fill);
    svg.append(path);
  };
  const addCircle = (cx, cy, r, fill = "none") => {
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", String(r));
    circle.setAttribute("fill", fill);
    svg.append(circle);
  };

  if (type === "vitals") {
    addPath("M8 36h11l5-16 8 30 7-22 5 8h12");
  } else if (type === "electricity") {
    addPath("M36 4 14 35h16l-3 25 23-34H34l2-22Z", "currentColor");
  } else if (type === "mining") {
    addPath("M14 50 39 25");
    addPath("M28 14c9-7 20-6 28 2-12-1-20 3-28 13l-8-8Z", "currentColor");
  } else if (type === "airlock") {
    addPath("M17 8h30v48H17Z");
    addPath("M25 16h14v40");
    addCircle(35, 33, 2, "currentColor");
  } else if (type === "electrolizer") {
    addPath("M32 6c10 14 17 23 17 34a17 17 0 0 1-34 0c0-11 7-20 17-34Z");
    addPath("M36 20 25 37h9l-4 13 12-19h-9l3-11Z", "currentColor");
  } else if (type === "oxygen-generator") {
    addPath("M17 13h30v38H17Z");
    addPath("M24 21h16M24 31h16M24 41h8");
    addPath("M44 18c6 7 9 12 9 19a9 9 0 0 1-18 0c0-7 3-12 9-19Z", "currentColor");
  } else if (type === "hydrogen") {
    addPath("M14 12v40M50 12v40M14 32h36");
    addCircle(32, 32, 6, "currentColor");
  } else if (type === "battery") {
    addPath("M11 20h37v27H11Z");
    addPath("M48 28h5v11h-5");
    addPath("M29 25 22 36h7l-2 8 10-14h-7l-1-5Z", "currentColor");
  } else if (type === "wire") {
    addPath("M23 17a13 13 0 0 0-8 12c0 8 6 13 14 13h6");
    addPath("M41 47a13 13 0 0 0 8-12c0-8-6-13-14-13h-6");
    addPath("M24 32h16c8 0 14 4 14 10s-6 10-14 10H29");
  } else if (type === "solar-panel") {
    addPath("M12 17h40v25H12Z");
    addPath("M22 17v25M32 17v25M42 17v25M12 29h40");
    addPath("M32 42v11M22 53h20");
  } else if (type === "drill") {
    addPath("M10 39 34 15l15 15-24 24Z");
    addPath("m39 10 15 15M17 46l-7 7");
  } else if (type === "build-tool") {
    addPath("M12 45 37 20");
    addPath("m28 12 24 24-8 8-24-24Z");
  } else if (type === "research-machine") {
    addPath("M28 9v18L15 49a8 8 0 0 0 7 12h20a8 8 0 0 0 7-12L36 27V9");
    addPath("M24 9h16M21 45h22");
  } else if (type === "refine") {
    addPath("M17 12h30l7 16-22 26L10 28Z");
    addPath("M22 28h20M27 38h10");
  } else if (type === "asteroid") {
    addPath("M22 9 45 13 57 31 45 53 20 56 7 37 10 19Z", "currentColor");
  } else {
    addPath("M14 14h36v36H14Z");
    addPath("M22 32h20M32 22v20");
  }
  return svg;
}

function createFabricatorRecipe(
  id,
  name,
  iron,
  copper,
  energyCost,
  itemOverrides = {},
) {
  const { silicon = 0, ...itemMetadata } = itemOverrides;
  return {
    id,
    name,
    description: itemMetadata.description ?? "Fabricated utility component.",
    category: itemMetadata.category ?? "mining",
    craftIcon: itemMetadata.craftIcon ?? id,
    ingredients: {
      iron,
      copper,
      silicon,
    },
    energyCost,
    item: {
      id,
      name,
      count: 1,
      icon: name
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 3),
      swatch: "#7ea0a8",
      ...itemMetadata,
    },
  };
}

function formatRecipeCost(recipe) {
  if (!recipe) return "-";
  const ingredientText = getRecipeIngredientEntries(recipe)
    .map(([id, count]) => `${count} ${fabricatorResourceItems[id]?.icon ?? id}`)
    .join(" · ");
  return `${ingredientText} · ${recipe.energyCost} E`;
}

function canFabricateRecipe(recipe) {
  if (!recipe) return false;
  return getRecipeIngredientEntries(recipe).every(
    ([id, count]) => getInventoryItemCount(id) >= count,
  );
}

function getRecipeIngredientEntries(recipe) {
  return Object.entries(recipe?.ingredients ?? {}).filter(([, count]) => count > 0);
}

function consumeRecipeIngredients(recipe) {
  if (!canFabricateRecipe(recipe)) return false;
  for (const [id, count] of getRecipeIngredientEntries(recipe)) {
    if (!consumeInventoryItemCount(id, count)) return false;
  }
  return true;
}

function startFabricatorDisassembly(root) {
  if (
    !root ||
    root.metadata?.fabricatorDisassembly ||
    root.metadata?.fabricatorCrafting
  ) {
    return false;
  }

  const mounted = root.metadata?.fabricatorMountedAsteroid;
  const yieldValues = getAsteroidYield(mounted?.composition);
  if (!mounted?.mesh || !yieldValues) {
    updateInteractionPrompt({ prompt: "No asteroid loaded" });
    renderFabricatorAnalysis();
    return false;
  }

  if (!consumeFabricatorEnergy(root, FABRICATOR_DISASSEMBLY_ENERGY_COST)) {
    updateInteractionPrompt({ prompt: "Not enough battery energy" });
    renderFabricatorAnalysis();
    return false;
  }

  const rewards = createFabricatorRewards(yieldValues);
  if (!canAddInventoryItemCounts(rewards)) {
    updateInteractionPrompt({ prompt: "Inventory full" });
    refundFabricatorEnergy(root, FABRICATOR_DISASSEMBLY_ENERGY_COST);
    return false;
  }

  const meshData = createFabricatorDisassemblyMeshData(mounted.mesh);
  const job = {
    root,
    mounted,
    mesh: mounted.mesh,
    rewards,
    elapsed: 0,
    remaining: FABRICATOR_DISASSEMBLE_SECONDS,
    duration: FABRICATOR_DISASSEMBLE_SECONDS,
    originalScaling: mounted.mesh.scaling.clone(),
    originalPosition: getNodePositionInPlatform(mounted.mesh),
    meshData,
    effects: createFabricatorDisassemblyEffects(root, mounted.mesh, meshData),
  };
  root.metadata = {
    ...(root.metadata ?? {}),
    fabricatorDisassembly: job,
  };
  fabricatorDisassemblyJobs.add(job);
  if (fabricatorDisassembleButton) {
    fabricatorDisassembleButton.classList.remove("activated");
    void fabricatorDisassembleButton.offsetWidth;
    fabricatorDisassembleButton.classList.add("activated");
  }
  renderFabricatorAnalysis();
  updateInteractionPrompt({ prompt: "Disassembly started" });
  return true;
}

async function fabricateSelectedRecipe(root) {
  if (
    !root ||
    root.metadata?.fabricatorDisassembly ||
    root.metadata?.fabricatorCrafting
  ) {
    return false;
  }

  const recipe = getSelectedFabricatorRecipe(root);
  if (!recipe) {
    updateInteractionPrompt({ prompt: "No recipe selected" });
    return false;
  }
  if (!canFabricateRecipe(recipe)) {
    updateInteractionPrompt({ prompt: "Missing materials" });
    renderFabricatorAnalysis();
    return false;
  }
  if (!canAddInventoryItemCounts([{ item: recipe.item, count: 1 }])) {
    updateInteractionPrompt({ prompt: "Inventory full" });
    return false;
  }
  if (!consumeFabricatorEnergy(root, recipe.energyCost)) {
    updateInteractionPrompt({ prompt: "Not enough battery energy" });
    renderFabricatorAnalysis();
    return false;
  }

  if (!consumeRecipeIngredients(recipe)) {
    refundFabricatorEnergy(root, recipe.energyCost);
    updateInteractionPrompt({ prompt: "Missing materials" });
    renderFabricatorAnalysis();
    return false;
  }

  closePlayerModals();
  if (!recipe.item?.modelUrl) {
    addInventoryItemCount(recipe.item, 1);
    renderHotbars();
    renderInventoryGrid();
    showInventoryRewardToast(recipe.item, 1);
    updateInteractionPrompt({ prompt: `Fabricated ${recipe.name}` });
    return true;
  }

  try {
    await startFabricatorCraftJob(root, recipe);
    updateInteractionPrompt({ prompt: `Fabricating ${recipe.name}` });
    return true;
  } catch (error) {
    console.error("Failed to start fabricator craft job.", error);
    refundFabricatorEnergy(root, recipe.energyCost);
    refundRecipeIngredients(recipe);
    if (root.metadata?.fabricatorCrafting?.recipe === recipe) {
      delete root.metadata.fabricatorCrafting;
    }
    updateInteractionPrompt({ prompt: `Could not fabricate ${recipe.name}` });
    return false;
  }
}

function refundRecipeIngredients(recipe) {
  for (const [id, count] of getRecipeIngredientEntries(recipe)) {
    const item = fabricatorResourceItems[id];
    if (item && count > 0) addInventoryItemCount(item, count);
  }
  renderHotbars();
  renderInventoryGrid();
}

function createFabricatorRewards(yieldValues) {
  return [
    { item: fabricatorResourceItems.iron, count: yieldValues.iron },
    { item: fabricatorResourceItems.water, count: yieldValues.water },
    { item: fabricatorResourceItems.copper, count: yieldValues.copper },
    { item: fabricatorResourceItems.silicon, count: yieldValues.silicon },
  ].filter(({ count }) => count > 0);
}

function openOxygenGeneratorModal(root = activeInteraction?.root) {
  if (!oxygenGeneratorModal) return;

  closePlayerModals();
  activeOxygenGeneratorRoot = root ?? null;
  initializeOxygenGeneratorState(activeOxygenGeneratorRoot);
  renderOxygenGeneratorPanel();
  oxygenGeneratorModal.hidden = false;
  document.body.classList.add("ui-modal-open");
  exitPointerLock();
}

function initializeOxygenGeneratorState(root) {
  if (!root || !isOxygenGeneratorItem(root.metadata?.placedItem)) return null;

  const item = root.metadata.placedItem;
  const saved = item.oxygenGenerator ?? {};
  const state = root.metadata.oxygenGenerator ?? {};
  state.waterLiters = clamp(
    Number(state.waterLiters ?? saved.waterLiters ?? item.waterLiters ?? 0) || 0,
    0,
    OXYGEN_GENERATOR_WATER_CAPACITY_LITERS,
  );
  state.hydrogenLiters = clamp(
    Number(
      state.hydrogenLiters ??
        saved.hydrogenLiters ??
        item.hydrogenLiters ??
        0,
    ) || 0,
    0,
    OXYGEN_GENERATOR_HYDROGEN_CAPACITY_LITERS,
  );
  state.oxygenProducedLiters = clamp(
    Number(
      state.oxygenProducedLiters ??
        saved.oxygenProducedLiters ??
        saved.oxygenLiters ??
        item.oxygenProducedLiters ??
        item.oxygenLiters ??
        0,
    ) || 0,
    0,
    OXYGEN_GENERATOR_OXYGEN_CAPACITY_LITERS,
  );
  state.status = state.status ?? "empty";
  root.metadata.oxygenGenerator = state;
  syncOxygenGeneratorItemState(root);
  return state;
}

function syncOxygenGeneratorItemState(root) {
  const state = root?.metadata?.oxygenGenerator;
  const item = root?.metadata?.placedItem;
  if (!state || !item) return;
  item.oxygenGenerator = createOxygenGeneratorSaveState(state);
}

function createOxygenGeneratorSaveState(state) {
  return {
    waterLiters: Number((state.waterLiters ?? 0).toFixed(2)),
    hydrogenLiters: Number((state.hydrogenLiters ?? 0).toFixed(2)),
    oxygenProducedLiters: Number((state.oxygenProducedLiters ?? 0).toFixed(2)),
    oxygenLiters: Number((state.oxygenProducedLiters ?? 0).toFixed(2)),
  };
}

function loadSelectedIceIntoOxygenGenerator(root) {
  const state = initializeOxygenGeneratorState(root);
  if (!state) return false;

  const selected = hotbarItems[selectedHotbarIndex];
  if (!isIceItem(selected)) {
    updateInteractionPrompt({ prompt: "Select Ice to load water" });
    renderOxygenGeneratorPanel();
    return false;
  }
  if (state.waterLiters >= OXYGEN_GENERATOR_WATER_CAPACITY_LITERS - 0.001) {
    updateInteractionPrompt({ prompt: "Water tank full" });
    renderOxygenGeneratorPanel();
    return false;
  }

  const loaded = Math.min(
    OXYGEN_GENERATOR_ICE_WATER_LITERS,
    OXYGEN_GENERATOR_WATER_CAPACITY_LITERS - state.waterLiters,
  );
  state.waterLiters += loaded;
  state.status = "Water loaded";
  consumeSelectedHotbarItem();
  syncOxygenGeneratorItemState(root);
  renderHotbars();
  renderInventoryGrid();
  refreshPlacementPreview();
  renderOxygenGeneratorPanel();
  updateInteractionPrompt({
    prompt: `Loaded ${loaded.toFixed(0)} L water into oxygen generator`,
  });
  return true;
}

function isIceItem(item) {
  const id = item?.id?.toLowerCase?.() ?? "";
  const name = item?.name?.toLowerCase?.() ?? "";
  return id === "water" || id === "ice" || name.includes("ice");
}

function updateOxygenGenerators(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const generators = getPlacedItemRoots((item) => isOxygenGeneratorItem(item));
  for (const root of generators) {
    updateOxygenGenerator(root, seconds);
  }
}

function updateSolarPanels(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const panels = getPlacedItemRoots((item) => isSolarPanelItem(item));
  for (const root of panels) {
    updateSolarPanel(root, seconds);
  }
}

function updateSolarPanel(root, seconds) {
  const battery = getConnectedBatteryRoot(root);
  const exposure = getSolarPanelLightExposure(root);
  root.metadata = {
    ...(root.metadata ?? {}),
    solarPanelExposure: exposure,
  };
  if (!battery || exposure <= 0) return;

  const item = root.metadata?.placedItem ?? {};
  const rate = Math.max(
    0,
    Number(item.solarEnergyPerSecond ?? SOLAR_PANEL_ENERGY_PER_SECOND) ||
      SOLAR_PANEL_ENERGY_PER_SECOND,
  );
  addBatteryEnergy(battery, rate * exposure * seconds);
}

function getSolarPanelLightExposure(root) {
  if (!root || !level?.primaryMesh) return 0;

  const panelPosition = getSolarPanelWorldPosition(root);
  const lightPosition =
    level.primaryMesh.getAbsolutePosition?.() ?? level.primaryMesh.position;
  if (!panelPosition || !lightPosition) return 0;

  const toLight = lightPosition.subtract(panelPosition);
  const lightDistance = toLight.length();
  if (lightDistance <= 0.0001) return 0;
  toLight.scaleInPlace(1 / lightDistance);

  const normal = getSolarPanelWorldNormal(root);
  const facing = B.Vector3.Dot(normal, toLight);
  const exposure = clamp(
    (facing - SOLAR_PANEL_MIN_LIGHT_DOT) /
      Math.max(1 - SOLAR_PANEL_MIN_LIGHT_DOT, 0.0001),
    0,
    1,
  );
  if (exposure <= 0) return 0;
  if (isSolarPanelLightOccluded(root, panelPosition, normal, toLight, lightDistance)) {
    return 0;
  }
  return exposure;
}

function getSolarPanelWorldPosition(root) {
  const localPoint = getWireAnchorPoint(root, "solar-panel");
  return platformLocalPointToWorld(localPoint);
}

function getSolarPanelWorldNormal(root) {
  root.computeWorldMatrix?.(true);
  const normal = B.Vector3.TransformNormal(B.Axis.Y, root.getWorldMatrix());
  if (normal.lengthSquared() <= 0.000001) return B.Axis.Y.clone();
  return normal.normalize();
}

function isSolarPanelLightOccluded(root, position, normal, direction, distance) {
  if (!scene || distance <= SOLAR_PANEL_OCCLUSION_OFFSET * 2) return false;
  const origin = position.add(normal.scale(SOLAR_PANEL_OCCLUSION_OFFSET));
  const ray = new B.Ray(
    origin,
    direction,
    Math.max(0, distance - SOLAR_PANEL_OCCLUSION_OFFSET * 2),
  );
  const hit = scene.pickWithRay(ray, (mesh) => {
    if (!mesh || mesh.isEnabled?.() === false || mesh.isVisible === false) {
      return false;
    }
    if (mesh.visibility !== undefined && mesh.visibility <= 0) return false;
    if (mesh.metadata?.excludeFromBounds) return false;
    if (isNodeDescendantOf(mesh, root)) return false;
    if (isPolySurfaceHologram(mesh)) return false;
    return isNodeDescendantOf(mesh, level?.platform?.deck);
  });
  return Boolean(hit?.hit);
}

function updateOxygenGenerator(root, seconds) {
  const state = initializeOxygenGeneratorState(root);
  if (!state) return;

  const battery = getOxygenGeneratorBatteryRoot(root);
  const pressureKpa = getCabinPressureKpa();
  const sealed = isCabinSealed();
  const pressureFull = pressureKpa >= PRESSURE_STANDARD_KPA - 0.001;
  const multiplier = pressureFull ? OXYGEN_GENERATOR_PRESSURIZED_MULTIPLIER : 1;
  const waterUse = OXYGEN_GENERATOR_WATER_LITERS_PER_SECOND * multiplier * seconds;
  const energyUse = OXYGEN_GENERATOR_ENERGY_PER_SECOND * multiplier * seconds;

  if (!sealed) {
    state.status = "Cabin not sealed - close hatch";
    syncOxygenGeneratorItemState(root);
    if (activeOxygenGeneratorRoot === root) renderOxygenGeneratorPanel();
    return;
  }
  if (!battery) {
    state.status = "No battery connected";
    syncOxygenGeneratorItemState(root);
    if (activeOxygenGeneratorRoot === root) renderOxygenGeneratorPanel();
    return;
  }
  if (state.waterLiters <= 0.001) {
    state.status = "Water tank empty";
    syncOxygenGeneratorItemState(root);
    if (activeOxygenGeneratorRoot === root) renderOxygenGeneratorPanel();
    return;
  }
  if (
    pressureFull &&
    state.oxygenProducedLiters >= OXYGEN_GENERATOR_OXYGEN_CAPACITY_LITERS - 0.001
  ) {
    state.status = "Oxygen reserve full - idle";
    syncOxygenGeneratorItemState(root);
    if (activeOxygenGeneratorRoot === root) renderOxygenGeneratorPanel();
    return;
  }
  if (!consumeBatteryEnergy(battery, energyUse)) {
    state.status = "Battery depleted";
    syncOxygenGeneratorItemState(root);
    if (activeOxygenGeneratorRoot === root) renderOxygenGeneratorPanel();
    return;
  }

  const waterConsumed = Math.min(state.waterLiters, waterUse);
  state.waterLiters -= waterConsumed;
  state.hydrogenLiters = Math.min(
    OXYGEN_GENERATOR_HYDROGEN_CAPACITY_LITERS,
    state.hydrogenLiters +
      OXYGEN_GENERATOR_HYDROGEN_LITERS_PER_SECOND * multiplier * seconds,
  );
  if (!pressureFull) {
    cabinPressureAtm = Math.min(
      CABIN_PRESSURE_INITIAL_ATM,
      cabinPressureAtm +
        (OXYGEN_GENERATOR_PRESSURE_KPA_PER_SECOND * seconds /
          PRESSURE_STANDARD_KPA) *
          CABIN_PRESSURE_INITIAL_ATM,
    );
  } else {
    state.oxygenProducedLiters = Math.min(
      OXYGEN_GENERATOR_OXYGEN_CAPACITY_LITERS,
      state.oxygenProducedLiters + waterConsumed * 2,
    );
  }
  state.status = pressureFull
    ? "Cabin pressurized - storing oxygen"
    : "Producing oxygen";
  syncOxygenGeneratorItemState(root);
  if (activeOxygenGeneratorRoot === root) renderOxygenGeneratorPanel();
}

function consumeBatteryEnergy(battery, amount) {
  const cost = Math.max(0, Number(amount) || 0);
  if (cost <= 0) return true;
  if (!battery) return false;
  initializeBatteryEnergy(battery);
  if ((battery.metadata.energyStored ?? 0) < cost) return false;
  battery.metadata.energyStored -= cost;
  battery.metadata.placedItem.energyStored = battery.metadata.energyStored;
  return true;
}

function addBatteryEnergy(battery, amount) {
  const gain = Math.max(0, Number(amount) || 0);
  if (gain <= 0 || !battery) return 0;
  initializeBatteryEnergy(battery);
  const max = Math.max(0, Number(battery.metadata.maxEnergy) || 0);
  const before = clamp(Number(battery.metadata.energyStored) || 0, 0, max);
  const after = clamp(before + gain, 0, max);
  battery.metadata.energyStored = after;
  battery.metadata.placedItem.energyStored = after;
  battery.metadata.placedItem.maxEnergy = max;
  return after - before;
}

function getOxygenGeneratorBatteryRoot(root) {
  return getConnectedBatteryRoot(root);
}

function renderOxygenGeneratorPanel() {
  if (!activeOxygenGeneratorRoot) return;
  const state = initializeOxygenGeneratorState(activeOxygenGeneratorRoot);
  if (!state) return;

  const battery = getOxygenGeneratorBatteryRoot(activeOxygenGeneratorRoot);
  const energy = getBatteryEnergyState(battery);
  const pressureKpa = getCabinPressureKpa();
  const sealed = isCabinSealed();
  const pressureFull = pressureKpa >= PRESSURE_STANDARD_KPA - 0.001;
  const multiplier = pressureFull ? OXYGEN_GENERATOR_PRESSURIZED_MULTIPLIER : 1;
  const running =
    Boolean(battery) &&
    energy.stored > 0 &&
    state.waterLiters > 0.001 &&
    sealed;
  const status = state.status ?? (state.waterLiters > 0 ? "Ready" : "Empty");

  setTextIfChanged(
    oxygenGeneratorWaterValue,
    `${formatTankValue(state.waterLiters)}/${OXYGEN_GENERATOR_WATER_CAPACITY_LITERS} L`,
  );
  setMeterFill(oxygenGeneratorWaterBar, state.waterLiters, OXYGEN_GENERATOR_WATER_CAPACITY_LITERS);
  setTextIfChanged(
    oxygenGeneratorHydrogenValue,
    `${formatTankValue(state.hydrogenLiters)}/${OXYGEN_GENERATOR_HYDROGEN_CAPACITY_LITERS} L`,
  );
  setMeterFill(
    oxygenGeneratorHydrogenBar,
    state.hydrogenLiters,
    OXYGEN_GENERATOR_HYDROGEN_CAPACITY_LITERS,
  );
  setTextIfChanged(
    oxygenGeneratorOxygenValue,
    `${formatTankValue(state.oxygenProducedLiters)}/${OXYGEN_GENERATOR_OXYGEN_CAPACITY_LITERS} L`,
  );
  setMeterFill(
    oxygenGeneratorOxygenBar,
    state.oxygenProducedLiters,
    OXYGEN_GENERATOR_OXYGEN_CAPACITY_LITERS,
  );
  setTextIfChanged(
    oxygenGeneratorPressureValue,
    `${Math.round(pressureKpa)}/${PRESSURE_STANDARD_KPA} kPa`,
  );
  setMeterFill(oxygenGeneratorPressureBar, pressureKpa, PRESSURE_STANDARD_KPA);
  setTextIfChanged(
    oxygenGeneratorEnergyValue,
    battery ? `${energy.stored}/${energy.max}` : "No battery",
  );
  setMeterFill(oxygenGeneratorEnergyBar, energy.stored, energy.max);
  setTextIfChanged(oxygenGeneratorStatus, status);

  oxygenGeneratorRequirements?.replaceChildren(
    createFabricatorRequirementRow({
      id: "seal",
      icon: "airlock",
      owned: sealed ? 1 : 0,
      needed: 1,
      met: sealed,
    }),
    createFabricatorRequirementRow({
      id: "energy",
      icon: "electricity",
      owned: energy.stored,
      needed: 1,
      met: Boolean(battery) && energy.stored > 0,
      rate: running
        ? formatResourceBurnRate(
            OXYGEN_GENERATOR_ENERGY_PER_SECOND * multiplier,
            "E/s",
          )
        : "",
    }),
    createFabricatorRequirementRow({
      id: "water",
      item: fabricatorResourceItems.water,
      owned: Math.floor(state.waterLiters),
      needed: 1,
      met: state.waterLiters > 0.001,
      rate: running
        ? formatResourceBurnRate(
            OXYGEN_GENERATOR_WATER_LITERS_PER_SECOND * multiplier,
            "L/s",
          )
        : "",
    }),
  );
  oxygenGeneratorOutputList?.replaceChildren(
    createOxygenGeneratorOutputRow(
      "Oxygen",
      running
        ? "Venting to cabin"
        : sealed
          ? "Idle"
          : "Blocked - cabin open",
    ),
    createOxygenGeneratorOutputRow(
      "Hydrogen Tank",
      `${formatTankValue(state.hydrogenLiters)} L`,
    ),
    createOxygenGeneratorOutputRow(
      "Oxygen Store",
      `${formatTankValue(state.oxygenProducedLiters)} L`,
    ),
  );
}

function setMeterFill(element, value, max) {
  const fill = max > 0 ? (Math.max(0, Number(value) || 0) / max) * 100 : 0;
  setStylePropertyIfChanged(
    element,
    "--energy-fill",
    `${clamp(fill, 0, 100).toFixed(1)}%`,
  );
}

function createOxygenGeneratorOutputRow(label, value) {
  const row = document.createElement("div");
  row.className = "fabricator-output-row";
  const icon = document.createElement("span");
  icon.className = "fabricator-output-icon";
  icon.append(
    createFabricatorIcon(label.includes("Oxygen") ? "vitals" : "hydrogen"),
  );
  const name = document.createElement("span");
  name.className = "fabricator-output-name";
  name.textContent = label;
  const count = document.createElement("span");
  count.className = "fabricator-output-count oxygen-generator-output-value";
  count.textContent = value;
  row.append(icon, name, count);
  return row;
}

function formatTankValue(value) {
  const amount = Math.max(0, Number(value) || 0);
  return amount >= 10 ? amount.toFixed(0) : amount.toFixed(1);
}

function formatResourceBurnRate(value, unit) {
  const amount = Math.max(0, Number(value) || 0);
  const text =
    amount >= 1
      ? amount.toFixed(2)
      : amount >= 0.1
        ? amount.toFixed(3)
        : amount.toFixed(4);
  return `-${text} ${unit}`;
}

function getFabricatorBatteryRoot(root) {
  return getConnectedBatteryRoot(root);
}

function getBatteryEnergyState(root) {
  if (!root) return { stored: 0, max: BATTERY_MAX_ENERGY };
  initializeBatteryEnergy(root);
  return {
    stored: Math.round(root.metadata.energyStored ?? 0),
    max: Math.round(root.metadata.maxEnergy ?? BATTERY_MAX_ENERGY),
  };
}

function initializeBatteryEnergy(root) {
  if (!root || !isBatteryItem(root.metadata?.placedItem)) return;

  const item = root.metadata.placedItem;
  const maxEnergy = Number(item.maxEnergy ?? BATTERY_MAX_ENERGY);
  const stored = Number(
    item.energyStored ?? item.energy ?? BATTERY_DEFAULT_ENERGY,
  );
  root.metadata.maxEnergy = Number.isFinite(maxEnergy)
    ? Math.max(0, maxEnergy)
    : BATTERY_MAX_ENERGY;
  if (!Number.isFinite(root.metadata.energyStored)) {
    root.metadata.energyStored = Number.isFinite(stored)
      ? clamp(stored, 0, root.metadata.maxEnergy)
      : BATTERY_DEFAULT_ENERGY;
  }
  item.maxEnergy = root.metadata.maxEnergy;
  item.energyStored = root.metadata.energyStored;
}

function consumeFabricatorEnergy(root, amount) {
  const battery = getFabricatorBatteryRoot(root);
  const cost = Math.max(0, Number(amount) || 0);
  if (!battery) return cost <= 0;
  initializeBatteryEnergy(battery);
  if ((battery.metadata.energyStored ?? 0) < cost) return false;
  battery.metadata.energyStored -= cost;
  battery.metadata.placedItem.energyStored = battery.metadata.energyStored;
  if (activeFabricatorRoot === root) renderFabricatorAnalysis();
  return true;
}

function refundFabricatorEnergy(root, amount) {
  const battery = getFabricatorBatteryRoot(root);
  const refund = Math.max(0, Number(amount) || 0);
  if (!battery || refund <= 0) return;
  initializeBatteryEnergy(battery);
  battery.metadata.energyStored = clamp(
    (battery.metadata.energyStored ?? 0) + refund,
    0,
    battery.metadata.maxEnergy ?? BATTERY_MAX_ENERGY,
  );
  battery.metadata.placedItem.energyStored = battery.metadata.energyStored;
}

function updateFabricatorDisassembly(seconds) {
  if (!fabricatorDisassemblyJobs.size) return;

  for (const job of [...fabricatorDisassemblyJobs]) {
    if (
      !job.root ||
      job.root.isDisposed?.() ||
      !job.mesh ||
      job.mesh.isDisposed?.()
    ) {
      cancelFabricatorDisassembly(job);
      continue;
    }

    job.elapsed = Math.min(job.elapsed + seconds, job.duration);
    job.remaining = Math.max(0, job.duration - job.elapsed);
    const progress = job.duration > 0 ? job.elapsed / job.duration : 1;
    updateFabricatorDisassemblyEffects(job, progress);

    if (activeFabricatorRoot === job.root) {
      renderFabricatorAnalysis();
    }
    if (progress >= 1) {
      completeFabricatorDisassembly(job);
    }
  }
}

function completeFabricatorDisassembly(job) {
  fabricatorDisassemblyJobs.delete(job);
  cleanupFabricatorDisassemblyEffects(job.effects);

  if (job.root?.metadata?.fabricatorMountedAsteroid === job.mounted) {
    delete job.root.metadata.fabricatorMountedAsteroid;
  }
  if (job.root?.metadata?.fabricatorDisassembly === job) {
    delete job.root.metadata.fabricatorDisassembly;
  }
  job.mesh?.dispose(false, true);

  const addedRewards = grantFabricatorRewards(job.rewards);
  refreshPlacementPreview();
  if (activeFabricatorRoot === job.root) {
    renderFabricatorAnalysis();
  }
  showInventoryRewardToasts(addedRewards);
  updateInteractionPrompt({
    prompt: `Disassembled · Added ${formatFabricatorRewards(addedRewards)}`,
  });
}

function cancelFabricatorDisassembly(job) {
  fabricatorDisassemblyJobs.delete(job);
  cleanupFabricatorDisassemblyEffects(job.effects);
  if (job.root?.metadata?.fabricatorDisassembly === job) {
    delete job.root.metadata.fabricatorDisassembly;
  }
  if (activeFabricatorRoot === job.root) renderFabricatorAnalysis();
}

function formatFabricatorRewards(rewards) {
  if (!rewards.length) return "nothing";
  return rewards
    .map(({ item, count }) => `${count} ${formatRewardItemName(item, count)}`)
    .join(" · ");
}

function grantFabricatorRewards(rewards) {
  const addedRewards = [];
  for (const reward of rewards) {
    if (addInventoryItemCount(reward.item, reward.count)) {
      addedRewards.push(reward);
    }
  }
  renderHotbars();
  renderInventoryGrid();
  return addedRewards;
}

async function startFabricatorCraftJob(root, recipe) {
  const loadingJob = {
    root,
    recipe,
    elapsed: 0,
    remaining: FABRICATOR_CRAFT_SECONDS,
    duration: FABRICATOR_CRAFT_SECONDS,
    loading: true,
  };
  root.metadata = {
    ...(root.metadata ?? {}),
    fabricatorCrafting: loadingJob,
  };

  const previewItem = createFabricatorCraftPreviewItem(recipe.item, root);
  const previewRoot = await loadItemModelRoot(previewItem, {
    name: `${recipe.id}-fabricating-preview`,
    pickable: false,
    hologram: true,
  });
  if (!isActivePlacedRoot(root)) {
    previewRoot.dispose(false, true);
    throw new Error("Fabricator unavailable");
  }

  positionFabricatorCraftPreviewRoot(previewRoot, root, previewItem);
  const meshEntries = createFabricatorCraftMeshEntries(previewRoot);
  if (!meshEntries.length) {
    previewRoot.dispose(false, true);
    throw new Error("Crafted model has no printable meshes");
  }

  const primaryEntry = getPrimaryFabricatorCraftMeshEntry(meshEntries);
  const clipMaterials = installFabricatorCraftClipMaterials(previewRoot);
  const clipBounds = getRootBoundsInPlatform(previewRoot);
  const effects = createFabricatorDisassemblyEffects(
    root,
    primaryEntry.mesh,
    primaryEntry.meshData,
    { cutCap: false },
  );
  effects?.traceRing?.setEnabled?.(false);
  effects?.traceGlow?.setEnabled?.(false);
  const job = {
    root,
    recipe,
    previewRoot,
    meshEntries,
    mesh: primaryEntry.mesh,
    meshData: primaryEntry.meshData,
    disableMeshClipping: true,
    disableTraceRing: true,
    clipMaterials,
    clipBounds,
    effects,
    elapsed: 0,
    remaining: FABRICATOR_CRAFT_SECONDS,
    duration: FABRICATOR_CRAFT_SECONDS,
  };
  root.metadata.fabricatorCrafting = job;
  fabricatorCraftJobs.add(job);
  updateFabricatorCraftJobEffects(job, 0);
  return job;
}

function createFabricatorCraftPreviewItem(item, fabricatorRoot) {
  return {
    ...item,
    maxSize: getFabricatorCraftPreviewMaxSize(item, fabricatorRoot),
  };
}

function getFabricatorCraftPreviewMaxSize(item, fabricatorRoot) {
  const configuredSize = Number(item?.maxSize);
  const itemSize =
    Number.isFinite(configuredSize) && configuredSize > 0
      ? configuredSize
      : FABRICATOR_CRAFT_PREVIEW_MAX_SIZE;
  const bounds = fabricatorRoot ? getRootBoundsInPlatform(fabricatorRoot) : null;
  if (!bounds) {
    return clamp(
      itemSize,
      FABRICATOR_CRAFT_PREVIEW_MIN_SIZE,
      FABRICATOR_CRAFT_PREVIEW_MAX_SIZE,
    );
  }

  const size = bounds.max.subtract(bounds.min);
  const fitSize = Math.min(
    FABRICATOR_CRAFT_PREVIEW_MAX_SIZE,
    Math.max(size.x, 0.001) * 0.48,
    Math.max(size.y, 0.001) * 0.7,
  );
  return clamp(
    Math.min(itemSize, fitSize),
    FABRICATOR_CRAFT_PREVIEW_MIN_SIZE,
    FABRICATOR_CRAFT_PREVIEW_MAX_SIZE,
  );
}

function positionFabricatorCraftPreviewRoot(previewRoot, fabricatorRoot, item) {
  const platformRoot = level?.platform?.root;
  const bounds = fabricatorRoot ? getRootBoundsInPlatform(fabricatorRoot) : null;
  if (!previewRoot || !platformRoot || !bounds) return;

  previewRoot.parent = platformRoot;
  previewRoot.rotation = B.Vector3.FromArray(resolveItemRotation(item));
  previewRoot.computeWorldMatrix(true);
  const center = bounds.min.add(bounds.max).scale(0.5);
  const forward = getFabricatorAsteroidForwardDirection(bounds);
  const right = getFabricatorAsteroidRightDirection(forward);
  const current = getNodePositionInPlatform(previewRoot);
  const target = new B.Vector3(center.x, current.y, center.z)
    .addInPlace(forward.scale(FABRICATOR_ASTEROID_FORWARD_OFFSET))
    .addInPlace(right.scale(FABRICATOR_ASTEROID_RIGHT_OFFSET));
  setNodePositionInPlatform(previewRoot, target);
  settleFabricatorCraftPreviewOnSurface(
    previewRoot,
    bounds.min.y + FABRICATOR_ASTEROID_BOTTOM_CLEARANCE,
  );
}

function settleFabricatorCraftPreviewOnSurface(previewRoot, surfaceY) {
  const bounds = getRootBoundsInPlatform(previewRoot);
  if (!bounds) return;
  previewRoot.position.y += surfaceY - bounds.min.y;
  previewRoot.computeWorldMatrix(true);
}

function createFabricatorCraftMeshEntries(previewRoot) {
  return getRootRenderableMeshes(previewRoot)
    .filter(
      (mesh) =>
        mesh.isVisible !== false &&
        mesh.visibility !== 0 &&
        !mesh.metadata?.itemCollisionMesh,
    )
    .map((mesh) => ({
      mesh,
      meshData: createFabricatorDisassemblyMeshData(mesh),
    }))
    .filter((entry) => Boolean(entry.meshData));
}

function installFabricatorCraftClipMaterials(previewRoot) {
  const cache = new Map();
  for (const mesh of getRootRenderableMeshes(previewRoot)) {
    if (!mesh.material) continue;
    mesh.material = cloneFabricatorCraftClipMaterial(mesh.material, cache);
  }
  return [...cache.values()].filter(
    (material) => !material.subMaterials?.length,
  );
}

function cloneFabricatorCraftClipMaterial(material, cache) {
  if (!material) return material;
  if (cache.has(material)) return cache.get(material);

  const clone =
    material.clone?.(`${material.name ?? "material"}-fabricator-crop`) ??
    material;
  cache.set(material, clone);

  if (clone.subMaterials?.length) {
    clone.subMaterials = clone.subMaterials.map((subMaterial) =>
      cloneFabricatorCraftClipMaterial(subMaterial, cache),
    );
  } else {
    clone.backFaceCulling = false;
    clone.twoSidedLighting = true;
    clone.clipPlane = null;
  }
  return clone;
}

function getPrimaryFabricatorCraftMeshEntry(entries) {
  return entries.reduce((best, entry) => {
    const bestVolume = getFabricatorMeshDataVolume(best.meshData);
    const entryVolume = getFabricatorMeshDataVolume(entry.meshData);
    return entryVolume > bestVolume ? entry : best;
  }, entries[0]);
}

function getFabricatorMeshDataVolume(data) {
  const min = data?.platformMin ?? data?.min;
  const max = data?.platformMax ?? data?.max;
  if (!min || !max) return 0;
  return Math.max(max.x - min.x, 0.0001) *
    Math.max(max.y - min.y, 0.0001) *
    Math.max(max.z - min.z, 0.0001);
}

function updateFabricatorCraft(seconds) {
  if (!fabricatorCraftJobs.size) return;

  for (const job of [...fabricatorCraftJobs]) {
    if (
      !job.root ||
      job.root.isDisposed?.() ||
      !job.previewRoot ||
      job.previewRoot.isDisposed?.()
    ) {
      cancelFabricatorCraft(job);
      continue;
    }

    job.elapsed = Math.min(job.elapsed + seconds, job.duration);
    job.remaining = Math.max(0, job.duration - job.elapsed);
    const progress = job.duration > 0 ? job.elapsed / job.duration : 1;
    updateFabricatorCraftJobEffects(job, progress);

    if (activeFabricatorRoot === job.root) {
      renderFabricatorAnalysis();
    }
    if (progress >= 1) {
      completeFabricatorCraft(job);
    }
  }
}

function updateFabricatorCraftJobEffects(job, progress) {
  const disassemblyProgress = clamp(1 - progress, 0, 0.999999);
  updateFabricatorCraftPreviewCrop(job, progress);
  updateFabricatorCraftExactContour(job);
  updateFabricatorDisassemblyEffects(job, disassemblyProgress);
}

function updateFabricatorCraftPreviewCrop(job, progress) {
  if (!job.previewRoot || job.previewRoot.isDisposed?.()) return;
  const bounds = job.clipBounds ?? getRootBoundsInPlatform(job.previewRoot);
  if (!bounds) return;

  const reveal = smoothstep(0, 1, clamp(progress, 0, 1));
  const height = bounds.max.y - bounds.min.y;
  const cropY = bounds.min.y + height * (reveal * 1.04);
  job.cropY = cropY;
  setFabricatorCraftClipPlane(job, cropY);
}

function setFabricatorCraftClipPlane(job, platformY) {
  const platformRoot = level?.platform?.root;
  if (!platformRoot) return;

  platformRoot.computeWorldMatrix?.(true);
  const platformMatrix = platformRoot.getWorldMatrix();
  const worldPoint = B.Vector3.TransformCoordinates(
    new B.Vector3(0, platformY, 0),
    platformMatrix,
  );
  const worldNormal = B.Vector3.TransformNormal(
    new B.Vector3(0, 1, 0),
    platformMatrix,
  );
  if (worldNormal.lengthSquared() <= 0.000001) return;
  worldNormal.normalize();

  const plane = new B.Plane(
    worldNormal.x,
    worldNormal.y,
    worldNormal.z,
    -B.Vector3.Dot(worldNormal, worldPoint),
  );
  for (const material of job.clipMaterials ?? []) {
    material.clipPlane = plane;
  }
}

function updateFabricatorCraftExactContour(job) {
  if (!job.effects || !Number.isFinite(job.cropY)) return;
  const elapsed = Number.isFinite(job.elapsed) ? job.elapsed : 0;
  const lastUpdate = job.lastCraftContourUpdateSeconds ?? -Infinity;
  if (
    job.craftContourPaths &&
    elapsed - lastUpdate < FABRICATOR_CRAFT_CONTOUR_UPDATE_SECONDS
  ) {
    return;
  }

  const contourData = createFabricatorCraftContourData(
    job.meshEntries ?? [],
    job.cropY,
  );
  job.craftContourPaths = contourData.paths;
  job.craftContourPathLengths = contourData.pathLengths;
  job.craftContourTotalLength = contourData.totalLength;
  job.lastCraftContourUpdateSeconds = elapsed;
  job.effects.craftContourTubes = disposeFabricatorContourTubeSet(
    job.effects.craftContourTubes,
  );
  job.effects.craftContourGlowTubes = disposeFabricatorContourTubeSet(
    job.effects.craftContourGlowTubes,
  );
}

function createFabricatorCraftContourPaths(meshEntries, y) {
  return createFabricatorCraftContourData(meshEntries, y).paths;
}

function createFabricatorCraftContourData(meshEntries, y) {
  const paths = [];
  for (const entry of meshEntries) {
    paths.push(...createFabricatorSliceContourLoopPaths(entry.meshData, y));
  }
  const entries = paths
    .filter((path) => path.length >= 2)
    .map((path) => ({ path, length: getFabricatorPathLength(path) }))
    .filter((entry) => entry.length > 0.001)
    .sort((a, b) => b.length - a.length);

  return {
    paths: entries.map((entry) => entry.path),
    pathLengths: entries.map((entry) => entry.length),
    totalLength: entries.reduce((sum, entry) => sum + entry.length, 0),
  };
}

function updateFabricatorContourTubeSet(meshes, paths, options) {
  const platformRoot = level?.platform?.root;
  const nextMeshes = [];
  const maxPathCount = 24;

  for (let index = 0; index < Math.min(paths.length, maxPathCount); index += 1) {
    const path = paths[index];
    const existing = meshes[index];
    const canUpdate =
      existing &&
      !existing.isDisposed?.() &&
      existing.metadata?.pathPointCount === path.length;
    if (existing && !canUpdate) {
      existing.dispose(false, true);
    }
    const mesh = B.MeshBuilder.CreateTube(
      `${options.name}-${index}`,
      {
        path,
        radius: options.radius,
        tessellation: 8,
        cap: B.Mesh.CAP_ALL,
        updatable: true,
        instance: canUpdate ? existing : undefined,
      },
      scene,
    );
    if (!canUpdate) {
      mesh.parent = platformRoot ?? null;
      mesh.material = options.material;
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      mesh.receiveShadows = false;
      mesh.metadata = {
        ...(mesh.metadata ?? {}),
        excludeFromBounds: true,
        excludeFromCollision: true,
        fabricatorDisassemblyEffect: true,
      };
    }
    mesh.metadata = {
      ...(mesh.metadata ?? {}),
      pathPointCount: path.length,
    };
    nextMeshes.push(mesh);
  }

  for (let index = maxPathCount; index < meshes.length; index += 1) {
    meshes[index]?.dispose(false, true);
  }
  for (let index = paths.length; index < Math.min(meshes.length, maxPathCount); index += 1) {
    meshes[index]?.dispose(false, true);
  }
  return nextMeshes;
}

function disposeFabricatorContourTubeSet(meshes = []) {
  for (const mesh of meshes) {
    mesh?.dispose(false, true);
  }
  return [];
}

function completeFabricatorCraft(job) {
  fabricatorCraftJobs.delete(job);
  cleanupFabricatorDisassemblyEffects(job.effects);
  if (job.root?.metadata?.fabricatorCrafting === job) {
    delete job.root.metadata.fabricatorCrafting;
  }
  job.previewRoot?.dispose(false, true);

  const added = addInventoryItemCount(job.recipe.item, 1);
  renderHotbars();
  renderInventoryGrid();
  refreshPlacementPreview();
  if (activeFabricatorRoot === job.root) {
    renderFabricatorAnalysis();
  }
  if (added) showInventoryRewardToast(job.recipe.item, 1);
  updateInteractionPrompt({
    prompt: added
      ? `Fabricated ${job.recipe.name}`
      : `Fabricated ${job.recipe.name} - inventory full`,
  });
}

function cancelFabricatorCraft(job) {
  fabricatorCraftJobs.delete(job);
  cleanupFabricatorDisassemblyEffects(job.effects);
  job.previewRoot?.dispose(false, true);
  if (job.root?.metadata?.fabricatorCrafting === job) {
    delete job.root.metadata.fabricatorCrafting;
  }
  if (activeFabricatorRoot === job.root) renderFabricatorAnalysis();
}

function showInventoryRewardToasts(rewards) {
  for (const reward of rewards) {
    showInventoryRewardToast(reward.item, reward.count);
  }
}

function showInventoryRewardToast(item, count) {
  if (!inventoryToastLayer || count <= 0) return;

  const toast = document.createElement("div");
  toast.className = "inventory-toast";

  const label = document.createElement("span");
  label.textContent = `+ ${count} ${formatRewardItemName(item, count)}`;

  const image = document.createElement("img");
  image.className = "inventory-toast-icon";
  image.alt = "";

  toast.append(label, image);
  inventoryToastLayer.append(toast);

  createInventoryPortraitDataUrl(item)
    .then((portrait) => {
      image.src = portrait || createItemPortrait(item);
    })
    .catch(() => {
      image.src = createItemPortrait(item);
    });

  setTimeout(() => toast.classList.add("leaving"), 2200);
  setTimeout(() => toast.remove(), 2800);
}

function formatRewardItemName(item, count) {
  const name = (item?.name ?? item?.id ?? "item").toLowerCase();
  if (count === 1 || name.endsWith("s")) return name;
  if (name.endsWith("y")) return `${name.slice(0, -1)}ies`;
  return `${name}s`;
}

function createFabricatorDisassemblyEffects(
  root,
  asteroidMesh,
  meshData = null,
  options = {},
) {
  const platformRoot = level?.platform?.root;
  if (!platformRoot || !asteroidMesh) return null;

  const starts = getFabricatorLaserSourcePoints(root);
  const end = getNodePositionInPlatform(asteroidMesh);
  const beamMaterial = createFabricatorLaserMaterial();
  const beamGlowMaterial = createFabricatorLaserGlowMaterial();
  const beams = starts.map((start, index) => {
    const path = createFabricatorLaserPath(start, end, 0);
    const core = B.MeshBuilder.CreateTube(
      `fabricator-red-fabrication-laser-${index}`,
      {
        path,
        radius: FABRICATOR_LASER_CORE_RADIUS,
        tessellation: 32,
        cap: B.Mesh.CAP_ALL,
        updatable: true,
      },
      scene,
    );
    const glow = B.MeshBuilder.CreateTube(
      `fabricator-red-fabrication-laser-glow-${index}`,
      {
        path,
        radius: FABRICATOR_LASER_GLOW_RADIUS,
        tessellation: 32,
        cap: B.Mesh.CAP_ALL,
        updatable: true,
      },
      scene,
    );
    core.parent = platformRoot;
    glow.parent = platformRoot;
    core.material = beamMaterial;
    glow.material = beamGlowMaterial;
    core.isPickable = false;
    glow.isPickable = false;
    core.checkCollisions = false;
    glow.checkCollisions = false;
    const metadata = {
      excludeFromBounds: true,
      excludeFromCollision: true,
      fabricatorDisassemblyEffect: true,
    };
    core.metadata = { ...(core.metadata ?? {}), ...metadata };
    glow.metadata = { ...(glow.metadata ?? {}), ...metadata };
    return { core, glow };
  });

  const scanLineMaterial = createFabricatorLaserMaterial(
    "fabricator-red-hot-print-line-material",
  );
  const scanLines = starts.map((_, index) => {
    const scanLine = B.MeshBuilder.CreateTube(
      `fabricator-red-hot-print-line-${index}`,
      {
        path: [end, end.add(new B.Vector3(0.0001, 0, 0))],
        radius: FABRICATOR_LASER_RADIUS * 1.25,
        tessellation: 14,
        cap: B.Mesh.CAP_ALL,
        updatable: true,
      },
      scene,
    );
    scanLine.parent = platformRoot;
    scanLine.material = scanLineMaterial;
    scanLine.isPickable = false;
    scanLine.checkCollisions = false;
    scanLine.metadata = {
      ...(scanLine.metadata ?? {}),
      excludeFromBounds: true,
      excludeFromCollision: true,
      fabricatorDisassemblyEffect: true,
    };
    return scanLine;
  });
  const traceMaterial = createFabricatorTraceMaterial();
  const traceGlowMaterial = createFabricatorTraceGlowMaterial();
  const showCutCap = options.cutCap !== false;
  const cutCapMaterial = showCutCap
    ? createFabricatorCutCapMaterial(asteroidMesh)
    : null;
  const initialSliceProgress = meshData
    ? getFabricatorLayerSliceProgress(meshData, 0)
    : 0;
  const initialTracePath = meshData
    ? createFabricatorTraceRingPath(meshData, initialSliceProgress, 0, false, {
        stable: true,
      })
    : createFabricatorTraceRingFallbackPath(end, 0.05, 0, true);
  const traceRing = B.MeshBuilder.CreateTube(
    "fabricator-red-materialization-trace",
    {
      path: initialTracePath,
      radius: FABRICATOR_LASER_RADIUS * 1.1,
      tessellation: 14,
      cap: B.Mesh.CAP_ALL,
      updatable: true,
    },
    scene,
  );
  const traceGlow = B.MeshBuilder.CreateTube(
    "fabricator-red-materialization-trace-glow",
    {
      path: initialTracePath,
      radius: FABRICATOR_LASER_GLOW_RADIUS * 0.55,
      tessellation: 14,
      cap: B.Mesh.CAP_ALL,
      updatable: true,
    },
    scene,
  );
  traceRing.parent = platformRoot;
  traceGlow.parent = platformRoot;
  traceRing.material = traceMaterial;
  traceGlow.material = traceGlowMaterial;
  traceRing.isPickable = false;
  traceGlow.isPickable = false;
  traceRing.checkCollisions = false;
  traceGlow.checkCollisions = false;
  const traceMetadata = {
    excludeFromBounds: true,
    excludeFromCollision: true,
    fabricatorDisassemblyEffect: true,
  };
  traceRing.metadata = { ...(traceRing.metadata ?? {}), ...traceMetadata };
  traceGlow.metadata = { ...(traceGlow.metadata ?? {}), ...traceMetadata };
  const cutCap = showCutCap
    ? createFabricatorCutCapMesh(
        "fabricator-rock-cut-cap",
        initialTracePath,
        cutCapMaterial,
      )
    : null;
  if (cutCap) {
    cutCap.parent = platformRoot;
    cutCap.metadata = { ...(cutCap.metadata ?? {}), ...traceMetadata };
  }
  const cutCapLight = showCutCap
    ? createFabricatorCutCapLight(cutCap, initialTracePath)
    : null;

  return {
    beams,
    beamMaterial,
    beamGlowMaterial,
    scanLines,
    scanLineMaterial,
    traceRing,
    traceGlow,
    traceMaterial,
    traceGlowMaterial,
    cutCap,
    cutCapMaterial,
    cutCapLight,
  };
}

function createFabricatorLaserPath(start, end, progress) {
  return [start, end];
}

function createFabricatorCutCapMesh(name, path, material) {
  const mesh = new B.Mesh(name, scene);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.receiveShadows = true;
  updateFabricatorCutCapMesh(mesh, path);
  return mesh;
}

function updateFabricatorCutCapMesh(mesh, path) {
  if (!mesh || !Array.isArray(path) || path.length < 4) return;

  const ring = path.slice(0, -1);
  if (ring.length < 3) return;

  const center = ring
    .reduce((sum, point) => sum.addInPlace(point), B.Vector3.Zero())
    .scaleInPlace(1 / ring.length);
  const positions = [center.x, center.y - 0.0008, center.z];
  const normals = [0, 1, 0];
  const uvs = [0.5, 0.5];
  const indices = [];
  let maxRadius = 0.0001;

  for (const point of ring) {
    maxRadius = Math.max(
      maxRadius,
      Math.hypot(point.x - center.x, point.z - center.z),
    );
  }

  for (const point of ring) {
    positions.push(point.x, point.y - 0.0008, point.z);
    normals.push(0, 1, 0);
    uvs.push(
      0.5 + (point.x - center.x) / (maxRadius * 2),
      0.5 + (point.z - center.z) / (maxRadius * 2),
    );
  }

  for (let index = 1; index <= ring.length; index += 1) {
    const next = index === ring.length ? 1 : index + 1;
    indices.push(0, index, next);
  }

  const vertexData = new B.VertexData();
  vertexData.positions = positions;
  vertexData.normals = normals;
  vertexData.uvs = uvs;
  vertexData.indices = indices;
  vertexData.applyToMesh(mesh, true);
  mesh.refreshBoundingInfo?.();
}

function createFabricatorCutCapLight(cutCap, path) {
  if (!cutCap) return null;
  const light = new B.PointLight(
    "fabricator-rock-cut-cap-light",
    B.Vector3.Zero(),
    scene,
  );
  light.diffuse = new B.Color3(0.58, 0.55, 0.48);
  light.specular = new B.Color3(0.08, 0.07, 0.055);
  light.intensity = 0.34;
  light.range = 0.45;
  light.includedOnlyMeshes = [cutCap];
  updateFabricatorCutCapLight(light, path);
  return light;
}

function updateFabricatorCutCapLight(light, path) {
  if (!light || !Array.isArray(path) || path.length < 4) return;

  const ring = path.slice(0, -1);
  const center = ring
    .reduce((sum, point) => sum.addInPlace(point), B.Vector3.Zero())
    .scaleInPlace(1 / ring.length);
  const platformRoot = level?.platform?.root;
  if (platformRoot) {
    platformRoot.computeWorldMatrix?.(true);
    light.position.copyFrom(
      B.Vector3.TransformCoordinates(
        center.add(new B.Vector3(0, 0.12, 0)),
        platformRoot.getWorldMatrix(),
      ),
    );
  } else {
    light.position.copyFrom(center.add(new B.Vector3(0, 0.12, 0)));
  }
}

function createFabricatorTraceRingFallbackPath(
  center,
  radius,
  elapsed,
  stable = false,
) {
  const path = [];
  for (let index = 0; index <= FABRICATOR_TRACE_RING_POINTS; index += 1) {
    const t = index / FABRICATOR_TRACE_RING_POINTS;
    const angle = t * Math.PI * 2;
    const ripple = stable ? 1 : 1 + Math.sin(angle * 5 + elapsed * 7) * 0.08;
    path.push(
      new B.Vector3(
        center.x + Math.cos(angle) * radius * ripple,
        center.y,
        center.z + Math.sin(angle) * radius * ripple,
      ),
    );
  }
  return path;
}

function createFabricatorTraceRingPath(
  data,
  progress,
  elapsed,
  wideGlow = false,
  options = {},
) {
  const min = data.platformMin;
  const max = data.platformMax;
  const stable = Boolean(options.stable);
  if (!min || !max) {
    return createFabricatorTraceRingFallbackPath(
      B.Vector3.Zero(),
      0.05,
      elapsed,
      stable,
    );
  }

  const center = min.add(max).scale(0.5);
  const width = Math.max(data.platformWidth ?? max.x - min.x, 0.0001);
  const height = Math.max(data.platformHeight ?? max.y - min.y, 0.0001);
  const depth = Math.max(data.platformDepth ?? max.z - min.z, 0.0001);
  const clampedProgress = clamp(progress, 0, 0.999999);
  const y = max.y - height * clampedProgress;
  const contour = createFabricatorMeshSliceContourPath(
    data,
    center,
    y,
    elapsed,
    wideGlow,
    stable,
  );
  if (contour.length >= 4) return contour;

  const normalizedY = clamp(
    (y - center.y) / Math.max(height * 0.5, 0.0001),
    -1,
    1,
  );
  const sliceScale = Math.max(
    0.18,
    Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY)),
  );
  return createFabricatorTraceRingFallbackPath(
    new B.Vector3(center.x, y, center.z),
    Math.max(width, depth) * 0.5 * sliceScale,
    elapsed,
    stable,
  );
}

function createFabricatorMeshSliceContourPath(
  data,
  center,
  y,
  elapsed,
  wideGlow,
  stable = false,
) {
  const positions = data.platformPositions;
  const indices = data.sourceIndices;
  if (!positions?.length || !indices?.length) return [];

  const points = [];
  for (let index = 0; index < indices.length; index += 3) {
    const triangle = [
      getPlatformVertex(positions, indices[index]),
      getPlatformVertex(positions, indices[index + 1]),
      getPlatformVertex(positions, indices[index + 2]),
    ];
    appendFabricatorSliceIntersections(points, triangle, y);
  }

  if (points.length < 8) return [];

  const bins = new Array(FABRICATOR_TRACE_RING_POINTS).fill(null);
  for (const point of points) {
    const angle = Math.atan2(point.z - center.z, point.x - center.x);
    const normalized = (angle + Math.PI) / (Math.PI * 2);
    const bin = Math.min(
      FABRICATOR_TRACE_RING_POINTS - 1,
      Math.max(0, Math.floor(normalized * FABRICATOR_TRACE_RING_POINTS)),
    );
    const radiusSq =
      (point.x - center.x) * (point.x - center.x) +
      (point.z - center.z) * (point.z - center.z);
    if (!bins[bin] || radiusSq > bins[bin].radiusSq) {
      bins[bin] = { point, radiusSq };
    }
  }

  const filledBins = fillFabricatorContourBins(bins);
  if (!filledBins) return [];

  const glowScale = wideGlow ? 1.035 : 1;
  const path = filledBins.map(({ point }, index) => {
    const x = center.x + (point.x - center.x) * glowScale;
    const z = center.z + (point.z - center.z) * glowScale;
    const angle = (index / FABRICATOR_TRACE_RING_POINTS) * Math.PI * 2;
    const lift = stable ? 0 : Math.sin(angle * 7 + elapsed * 8) * 0.0015;
    return new B.Vector3(x, point.y + lift, z);
  });
  path.push(path[0].clone());
  return path;
}

function fillFabricatorContourBins(bins) {
  const populated = bins
    .map((entry, index) => (entry ? { ...entry, index } : null))
    .filter(Boolean);
  if (populated.length < 8) return null;

  return bins.map((entry, index) => {
    if (entry) return entry;

    const before = findNearestFabricatorContourBin(populated, index, -1);
    const after = findNearestFabricatorContourBin(populated, index, 1);
    if (!before && !after) return populated[0];
    if (!before) return after.entry;
    if (!after) return before.entry;

    const span = before.distance + after.distance;
    const amount = span > 0 ? before.distance / span : 0;
    return {
      point: B.Vector3.Lerp(before.entry.point, after.entry.point, amount),
      radiusSq: lerp(before.entry.radiusSq, after.entry.radiusSq, amount),
    };
  });
}

function findNearestFabricatorContourBin(populated, targetIndex, direction) {
  let best = null;
  for (const entry of populated) {
    const rawDistance =
      direction < 0
        ? (targetIndex - entry.index + FABRICATOR_TRACE_RING_POINTS) %
          FABRICATOR_TRACE_RING_POINTS
        : (entry.index - targetIndex + FABRICATOR_TRACE_RING_POINTS) %
          FABRICATOR_TRACE_RING_POINTS;
    if (rawDistance === 0) continue;
    if (!best || rawDistance < best.distance) {
      best = { entry, distance: rawDistance };
    }
  }
  return best;
}

function getPlatformVertex(positions, vertexIndex) {
  const index = vertexIndex * 3;
  return new B.Vector3(
    positions[index],
    positions[index + 1],
    positions[index + 2],
  );
}

function appendFabricatorSliceIntersections(points, triangle, y) {
  const intersections = [];
  for (let index = 0; index < 3; index += 1) {
    const a = triangle[index];
    const b = triangle[(index + 1) % 3];
    const da = a.y - y;
    const db = b.y - y;
    if (Math.abs(da) < 0.000001) intersections.push(a);
    if (da * db < 0) {
      const amount = da / (da - db);
      intersections.push(
        new B.Vector3(
          a.x + (b.x - a.x) * amount,
          y,
          a.z + (b.z - a.z) * amount,
        ),
      );
    }
  }
  if (intersections.length < 2) return;
  points.push(intersections[0], intersections[1]);
}

function createFabricatorSliceContourLoopPaths(data, y) {
  const positions = data?.platformPositions;
  const indices = data?.sourceIndices;
  if (!positions?.length || !indices?.length) return [];

  const segments = [];
  for (let index = 0; index < indices.length; index += 3) {
    const triangle = [
      getPlatformVertex(positions, indices[index]),
      getPlatformVertex(positions, indices[index + 1]),
      getPlatformVertex(positions, indices[index + 2]),
    ];
    const segment = getFabricatorSliceIntersectionSegment(triangle, y);
    if (segment) segments.push(segment);
  }
  return createFabricatorContourPathsFromSegments(segments);
}

function getFabricatorSliceIntersectionSegment(triangle, y) {
  const intersections = [];
  for (let index = 0; index < 3; index += 1) {
    const a = triangle[index];
    const b = triangle[(index + 1) % 3];
    const da = a.y - y;
    const db = b.y - y;
    if (Math.abs(da) < 0.000001) intersections.push(a);
    if (da * db < 0) {
      const amount = da / (da - db);
      intersections.push(
        new B.Vector3(
          a.x + (b.x - a.x) * amount,
          y,
          a.z + (b.z - a.z) * amount,
        ),
      );
    }
  }

  const unique = [];
  for (const point of intersections) {
    if (!unique.some((candidate) => candidate.subtract(point).lengthSquared() < 1e-10)) {
      unique.push(point);
    }
  }
  if (unique.length < 2) return null;
  if (unique[0].subtract(unique[1]).lengthSquared() < 1e-10) return null;
  return [unique[0], unique[1]];
}

function createFabricatorContourPathsFromSegments(segments) {
  const endpointMap = new Map();
  const unused = new Set();
  segments.forEach((segment, index) => {
    unused.add(index);
    for (const point of segment) {
      const key = getFabricatorContourPointKey(point);
      if (!endpointMap.has(key)) endpointMap.set(key, []);
      endpointMap.get(key).push(index);
    }
  });

  const paths = [];
  while (unused.size) {
    const firstIndex = unused.values().next().value;
    unused.delete(firstIndex);
    const firstSegment = segments[firstIndex];
    const path = [firstSegment[0], firstSegment[1]];

    extendFabricatorContourPath(path, segments, endpointMap, unused, false);
    extendFabricatorContourPath(path, segments, endpointMap, unused, true);

    if (path.length >= 2) {
      const first = path[0];
      const last = path[path.length - 1];
      if (first.subtract(last).lengthSquared() < 0.000001) {
        path[path.length - 1] = first.clone();
      }
      paths.push(path);
    }
  }
  return paths.filter((path) => getFabricatorPathLength(path) > 0.001);
}

function extendFabricatorContourPath(path, segments, endpointMap, unused, prepend) {
  for (let guard = 0; guard < segments.length; guard += 1) {
    const endpoint = prepend ? path[0] : path[path.length - 1];
    const key = getFabricatorContourPointKey(endpoint);
    const nextIndex = (endpointMap.get(key) ?? []).find((index) =>
      unused.has(index),
    );
    if (nextIndex === undefined) return;
    unused.delete(nextIndex);
    const [a, b] = segments[nextIndex];
    const nextPoint =
      a.subtract(endpoint).lengthSquared() < b.subtract(endpoint).lengthSquared()
        ? b
        : a;
    if (prepend) {
      path.unshift(nextPoint);
    } else {
      path.push(nextPoint);
    }
  }
}

function getFabricatorContourPointKey(point) {
  const precision = 10000;
  return [
    Math.round(point.x * precision),
    Math.round(point.y * precision),
    Math.round(point.z * precision),
  ].join("|");
}

function getFabricatorPathLength(path) {
  let length = 0;
  for (let index = 1; index < path.length; index += 1) {
    length += B.Vector3.Distance(path[index - 1], path[index]);
  }
  return length;
}

function createFabricatorLaserMaterial(
  name = "fabricator-red-fabrication-laser-material",
) {
  const material = new B.StandardMaterial(name, scene);
  material.diffuseColor = new B.Color3(1, 0.12, 0.06);
  material.emissiveColor = new B.Color3(3.2, 0.28, 0.08);
  material.specularColor = new B.Color3(1, 0.4, 0.22);
  material.alpha = 0.72;
  material.disableLighting = true;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  material.alphaMode = B.Engine.ALPHA_ADD;
  material.needDepthPrePass = true;
  return material;
}

function createFabricatorLaserGlowMaterial(
  name = "fabricator-red-fabrication-laser-glow-material",
) {
  const material = new B.StandardMaterial(name, scene);
  material.diffuseColor = new B.Color3(1, 0.02, 0.01);
  material.emissiveColor = new B.Color3(2.2, 0.08, 0.025);
  material.specularColor = B.Color3.Black();
  material.alpha = 0.24;
  material.disableLighting = true;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  material.alphaMode = B.Engine.ALPHA_ADD;
  material.backFaceCulling = false;
  return material;
}

function createFabricatorTraceMaterial(
  name = "fabricator-red-materialization-trace-material",
) {
  const material = new B.StandardMaterial(name, scene);
  material.diffuseColor = new B.Color3(1, 0.18, 0.08);
  material.emissiveColor = new B.Color3(3.4, 0.34, 0.12);
  material.specularColor = new B.Color3(1, 0.45, 0.24);
  material.alpha = 0.88;
  material.disableLighting = true;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  material.alphaMode = B.Engine.ALPHA_ADD;
  return material;
}

function createFabricatorTraceGlowMaterial(
  name = "fabricator-red-materialization-trace-glow-material",
) {
  const material = new B.StandardMaterial(name, scene);
  material.diffuseColor = new B.Color3(1, 0.04, 0.01);
  material.emissiveColor = new B.Color3(2.2, 0.12, 0.04);
  material.specularColor = B.Color3.Black();
  material.alpha = 0.22;
  material.disableLighting = true;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  material.alphaMode = B.Engine.ALPHA_ADD;
  material.backFaceCulling = false;
  return material;
}

function createFabricatorCutCapMaterial(asteroidMesh) {
  const material = new B.StandardMaterial(
    "fabricator-rock-cut-cap-material",
    scene,
  );
  const sourceMaterial = asteroidMesh?.material;
  const sourceDiffuse = getFabricatorCutCapBaseColor(asteroidMesh);
  material.diffuseColor = sourceDiffuse.scale(0.96);
  material.diffuseTexture = null;
  material.bumpTexture = null;
  material.invertNormalMapY = false;
  material.specularColor =
    sourceMaterial?.specularColor?.clone?.().scaleInPlace(0.55) ??
    new B.Color3(0.024, 0.022, 0.019);
  material.specularPower = sourceMaterial?.specularPower ?? 30;
  material.roughness = sourceMaterial?.roughness ?? 0.82;
  material.ambientColor = sourceDiffuse.scale(0.55);
  material.emissiveColor = sourceDiffuse.scale(0.12);
  material.disableLighting = false;
  material.maxSimultaneousLights = Math.max(
    sourceMaterial?.maxSimultaneousLights ?? 4,
    4,
  );
  material.backFaceCulling = false;
  material.twoSidedLighting = true;
  material.transparencyMode = B.Material.MATERIAL_OPAQUE;
  material.alphaMode = B.Engine.ALPHA_DISABLE;
  material.needDepthPrePass = false;
  material.disableDepthWrite = false;
  return material;
}

function getFabricatorCutCapBaseColor(asteroidMesh) {
  const material = asteroidMesh?.material;
  const tint = asteroidMesh?.metadata?.asteroidColor;
  const candidates = [
    material?.diffuseColor,
    material?.albedoColor,
    material?.ambientColor,
  ].filter(Boolean);

  let color = candidates.find((candidate) => isUsableRockColor(candidate));
  if (!color) {
    color = new B.Color3(0.34, 0.33, 0.3);
  } else {
    color = color.clone();
  }

  if (Array.isArray(tint) && tint.length >= 3) {
    color = new B.Color3(
      color.r * tint[0],
      color.g * tint[1],
      color.b * tint[2],
    );
  }

  const luminance = getColorLuminance(color);
  if (luminance < 0.18) {
    const lift = (0.18 - luminance) / 0.18;
    color = B.Color3.Lerp(color, new B.Color3(0.42, 0.41, 0.37), lift);
  }
  return color;
}

function isUsableRockColor(color) {
  return (
    Number.isFinite(color?.r) &&
    Number.isFinite(color?.g) &&
    Number.isFinite(color?.b) &&
    getColorLuminance(color) > 0.045
  );
}

function getColorLuminance(color) {
  return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
}

function getFabricatorLayerSliceProgress(data, progress) {
  const layerCount = Math.max(
    Math.floor(data?.layerCount ?? FABRICATOR_PRINT_LAYER_COUNT),
    1,
  );
  const clampedProgress = clamp(progress, 0, 0.999999);
  const layerIndex = Math.min(
    layerCount - 1,
    Math.floor(clampedProgress * layerCount),
  );
  return clamp((layerIndex + 0.5) / layerCount, 0, 0.999999);
}

function updateFabricatorDisassemblyEffects(job, progress) {
  const pulse = 0.5 + 0.5 * Math.sin(job.elapsed * 18);
  if (job.effects?.beams?.length) {
    const starts = getFabricatorLaserSourcePoints(job.root);
    const laneCount = Math.max(job.effects.beams.length, 1);
    job.effects.beams.forEach((beam, index) => {
      const start = starts[index] ?? starts[0];
      const target =
        getFabricatorCraftContourTraceTarget(job, index, laneCount) ??
        getFabricatorDisassemblyRasterState(
          job,
          progress,
          index,
          laneCount,
        )?.target;
      if (!beam?.core || !start || !target) return;
      const path = createFabricatorLaserPath(start, target, progress);
      B.MeshBuilder.CreateTube(
        `fabricator-red-fabrication-laser-${index}`,
        {
          path,
          radius: FABRICATOR_LASER_CORE_RADIUS * (0.82 + pulse * 0.18),
          tessellation: 32,
          cap: B.Mesh.CAP_ALL,
          instance: beam.core,
        },
        scene,
      );
      if (beam.glow) {
        B.MeshBuilder.CreateTube(
          `fabricator-red-fabrication-laser-glow-${index}`,
          {
            path,
            radius: FABRICATOR_LASER_GLOW_RADIUS * (0.86 + pulse * 0.2),
            tessellation: 32,
            cap: B.Mesh.CAP_ALL,
            instance: beam.glow,
          },
          scene,
        );
      }
    });
  }
  if (job.effects?.scanLines?.length) {
    const laneCount = Math.max(job.effects.scanLines.length, 1);
    job.effects.scanLines.forEach((scanLine, index) => {
      const target =
        getFabricatorCraftContourTraceTarget(job, index, laneCount) ??
        getFabricatorDisassemblyRasterState(
          job,
          progress,
          index,
          laneCount,
        )?.target;
      if (!scanLine || !target) return;
      const path = [
        target,
        target.add(new B.Vector3(0, FABRICATOR_LASER_RADIUS * 1.8, 0)),
      ];
      B.MeshBuilder.CreateTube(
        `fabricator-red-hot-print-line-${index}`,
        {
          path,
          radius: FABRICATOR_LASER_RADIUS * (0.7 + pulse * 0.28),
          tessellation: 14,
          cap: B.Mesh.CAP_ALL,
          instance: scanLine,
        },
        scene,
      );
    });
  }
  if (job.effects?.traceRing && job.meshData && !job.disableTraceRing) {
    const sliceProgress = getFabricatorLayerSliceProgress(
      job.meshData,
      progress,
    );
    const path = createFabricatorTraceRingPath(
      job.meshData,
      sliceProgress,
      job.elapsed,
      false,
      { stable: true },
    );
    B.MeshBuilder.CreateTube(
      "fabricator-red-materialization-trace",
      {
        path,
        radius: FABRICATOR_LASER_RADIUS * (0.78 + pulse * 0.28),
        tessellation: 14,
        cap: B.Mesh.CAP_ALL,
        instance: job.effects.traceRing,
      },
      scene,
    );
    if (job.effects.traceGlow) {
      B.MeshBuilder.CreateTube(
        "fabricator-red-materialization-trace-glow",
        {
          path: createFabricatorTraceRingPath(
            job.meshData,
            sliceProgress,
            job.elapsed,
            true,
            { stable: true },
          ),
          radius: FABRICATOR_LASER_GLOW_RADIUS * (0.48 + pulse * 0.18),
          tessellation: 14,
          cap: B.Mesh.CAP_ALL,
          instance: job.effects.traceGlow,
        },
        scene,
      );
    }
    if (job.effects.cutCap) {
      updateFabricatorCutCapMesh(job.effects.cutCap, path);
    }
    if (job.effects.cutCapLight) {
      updateFabricatorCutCapLight(job.effects.cutCapLight, path);
    }
  }
  if (job.effects?.beamMaterial) {
    job.effects.beamMaterial.alpha = 0.62 + pulse * 0.22;
    job.effects.beamMaterial.emissiveColor.copyFromFloats(
      2.4 + pulse * 1.1,
      0.14 + pulse * 0.2,
      0.035 + pulse * 0.04,
    );
  }
  if (job.effects?.beamGlowMaterial) {
    job.effects.beamGlowMaterial.alpha = 0.16 + pulse * 0.16;
    job.effects.beamGlowMaterial.emissiveColor.copyFromFloats(
      1.65 + pulse * 0.95,
      0.045 + pulse * 0.08,
      0.014,
    );
  }
  if (job.effects?.scanLineMaterial) {
    job.effects.scanLineMaterial.alpha = 0.45 + pulse * 0.24;
    job.effects.scanLineMaterial.emissiveColor.copyFromFloats(
      2.2 + pulse * 0.8,
      0.14 + pulse * 0.18,
      0.035,
    );
  }
  if (job.effects?.traceMaterial) {
    job.effects.traceMaterial.alpha = 0.7 + pulse * 0.22;
    job.effects.traceMaterial.emissiveColor.copyFromFloats(
      2.7 + pulse * 1.1,
      0.22 + pulse * 0.24,
      0.06 + pulse * 0.05,
    );
  }
  if (job.effects?.traceGlowMaterial) {
    job.effects.traceGlowMaterial.alpha = 0.16 + pulse * 0.14;
    job.effects.traceGlowMaterial.emissiveColor.copyFromFloats(
      1.75 + pulse * 0.95,
      0.065 + pulse * 0.1,
      0.018,
    );
  }
  if (job.mesh && !job.disableMeshClipping && !job.mesh.isDisposed?.()) {
    updateFabricatorAsteroidReversePrintMesh(job, progress);
  }
}

function getFabricatorCraftContourTraceTarget(job, laneIndex = 0, laneCount = 1) {
  const paths = job.craftContourPaths ?? [];
  if (!paths.length) return null;

  const pathLengths =
    job.craftContourPathLengths ?? paths.map((path) => getFabricatorPathLength(path));
  const totalLength =
    job.craftContourTotalLength ??
    pathLengths.reduce((sum, length) => sum + length, 0);
  if (totalLength <= 0.0001) return null;

  const safeLaneCount = Math.max(Math.floor(laneCount), 1);
  const safeLaneIndex =
    ((Math.floor(laneIndex) % safeLaneCount) + safeLaneCount) % safeLaneCount;
  const traceSpeed = 0.2;
  let distance =
    (job.elapsed * traceSpeed +
      (safeLaneIndex / safeLaneCount) * Math.max(totalLength, 0.0001)) %
    totalLength;

  for (let index = 0; index < paths.length; index += 1) {
    const length = pathLengths[index];
    if (distance > length) {
      distance -= length;
      continue;
    }
    return getPointAlongFabricatorPath(paths[index], distance);
  }
  return getPointAlongFabricatorPath(paths[0], 0);
}

function getPointAlongFabricatorPath(path, distance) {
  if (!Array.isArray(path) || !path.length) return null;
  if (path.length === 1) return path[0].clone();

  let remaining = Math.max(0, Number(distance) || 0);
  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    const length = B.Vector3.Distance(from, to);
    if (length <= 0.000001) continue;
    if (remaining <= length) {
      return B.Vector3.Lerp(from, to, remaining / length);
    }
    remaining -= length;
  }
  return path[path.length - 1].clone();
}

function getFabricatorDisassemblyRasterState(
  job,
  progress,
  laneIndex = 0,
  laneCount = 1,
) {
  const mesh = job.mesh;
  const data = job.meshData;
  if (!mesh || mesh.isDisposed?.() || !data) return null;

  const clampedProgress = clamp(progress, 0, 0.999999);
  const safeLaneCount = Math.max(Math.floor(laneCount), 1);
  const safeLaneIndex =
    ((Math.floor(laneIndex) % safeLaneCount) + safeLaneCount) % safeLaneCount;
  const layerFloat = clampedProgress * data.layerCount;
  const layerIndex = Math.min(data.layerCount - 1, Math.floor(layerFloat));
  const layerProgress = layerFloat - layerIndex;
  const laneLineCount = Math.max(
    Math.ceil(data.linesPerLayer / safeLaneCount),
    1,
  );
  const laneLineFloat = layerProgress * laneLineCount;
  const laneLineIndex = Math.min(laneLineCount - 1, Math.floor(laneLineFloat));
  const passProgress = laneLineFloat - laneLineIndex;
  const lineIndex = Math.min(
    data.linesPerLayer - 1,
    safeLaneIndex + laneLineIndex * safeLaneCount,
  );
  const forward = (layerIndex + laneLineIndex + safeLaneIndex) % 2 === 0;
  const scanProgress = forward ? passProgress : 1 - passProgress;

  if (data.platformPositions?.length) {
    const platformY =
      data.platformMax.y - (layerIndex + 0.5) * data.platformLayerHeight;
    const platformZ =
      data.platformMin.z + (lineIndex + 0.5) * data.platformLineDepth;
    const startX = forward ? data.platformMin.x : data.platformMax.x;
    const endX = forward ? data.platformMax.x : data.platformMin.x;
    const target = getFabricatorRasterPlatformPoint(
      data,
      startX + (endX - startX) * scanProgress,
      platformY,
      platformZ,
    );

    return {
      target,
      lineStart: new B.Vector3(startX, platformY, platformZ),
      layerIndex,
      lineIndex,
      passProgress,
      forward,
      laneIndex: safeLaneIndex,
    };
  }

  const localY = data.max.y - (layerIndex + 0.5) * data.layerHeight;
  const localZ = data.min.z + (lineIndex + 0.5) * data.lineDepth;
  const startX = forward ? data.min.x : data.max.x;
  const endX = forward ? data.max.x : data.min.x;
  const lineStartPoint = new B.Vector3(startX, localY, localZ);
  const localTarget = getFabricatorRasterMeshPoint(
    data,
    startX + (endX - startX) * scanProgress,
    localY,
    localZ,
  );

  return {
    target: nodeLocalPointToPlatform(mesh, localTarget),
    lineStart: nodeLocalPointToPlatform(mesh, lineStartPoint),
    layerIndex,
    lineIndex,
    passProgress,
    forward,
    laneIndex: safeLaneIndex,
  };
}

function updateFabricatorAsteroidReversePrintMesh(job, progress) {
  if (!job.meshData) return;

  const sliceProgress = getFabricatorLayerSliceProgress(job.meshData, progress);
  if (job.lastAsteroidSliceProgress === sliceProgress) return;
  job.lastAsteroidSliceProgress = sliceProgress;
  updateFabricatorAsteroidClippedMesh(job.mesh, job.meshData, sliceProgress);
  job.mesh.refreshBoundingInfo?.();
}

function updateFabricatorAsteroidClippedMesh(mesh, data, sliceProgress) {
  if (!mesh || !data?.positions?.length || !data.sourceIndices?.length) return;

  const planeY = data.platformPositions?.length
    ? data.platformMax.y - data.platformHeight * sliceProgress
    : data.max.y - data.height * sliceProgress;
  const vertexData = createFabricatorClippedAsteroidVertexData(data, planeY);
  vertexData.applyToMesh(mesh, true);
}

function createFabricatorClippedAsteroidVertexData(data, planeY) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const colors = [];
  const indices = [];
  const hasNormals = Boolean(data.normals?.length);
  const hasUvs = Boolean(data.uvs?.length);
  const hasColors = Boolean(data.colors?.length);

  for (let index = 0; index < data.sourceIndices.length; index += 3) {
    const clipped = clipFabricatorTriangleToSlice(
      [
        createFabricatorClipVertex(data, data.sourceIndices[index]),
        createFabricatorClipVertex(data, data.sourceIndices[index + 1]),
        createFabricatorClipVertex(data, data.sourceIndices[index + 2]),
      ],
      planeY,
    );
    if (clipped.length < 3) continue;

    const firstIndex = positions.length / 3;
    for (const vertex of clipped) {
      positions.push(vertex.position.x, vertex.position.y, vertex.position.z);
      if (hasNormals) {
        normals.push(vertex.normal.x, vertex.normal.y, vertex.normal.z);
      }
      if (hasUvs) {
        uvs.push(vertex.uv.x, vertex.uv.y);
      }
      if (hasColors) {
        colors.push(
          vertex.color.r,
          vertex.color.g,
          vertex.color.b,
          vertex.color.a,
        );
      }
    }

    for (
      let triangleIndex = 1;
      triangleIndex < clipped.length - 1;
      triangleIndex += 1
    ) {
      indices.push(
        firstIndex,
        firstIndex + triangleIndex,
        firstIndex + triangleIndex + 1,
      );
    }
  }

  const vertexData = new B.VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  if (hasNormals) {
    vertexData.normals = normals;
  } else {
    B.VertexData.ComputeNormals(positions, indices, normals);
    vertexData.normals = normals;
  }
  if (hasUvs) vertexData.uvs = uvs;
  if (hasColors) vertexData.colors = colors;
  return vertexData;
}

function createFabricatorClipVertex(data, vertexIndex) {
  const positionIndex = vertexIndex * 3;
  const uvIndex = vertexIndex * 2;
  const colorIndex = vertexIndex * 4;
  const clipPositions = data.platformPositions?.length
    ? data.platformPositions
    : data.positions;

  return {
    position: new B.Vector3(
      data.positions[positionIndex],
      data.positions[positionIndex + 1],
      data.positions[positionIndex + 2],
    ),
    clipY: clipPositions[positionIndex + 1],
    normal: data.normals?.length
      ? new B.Vector3(
          data.normals[positionIndex],
          data.normals[positionIndex + 1],
          data.normals[positionIndex + 2],
        )
      : B.Vector3.Up(),
    uv: data.uvs?.length
      ? new B.Vector2(data.uvs[uvIndex], data.uvs[uvIndex + 1])
      : B.Vector2.Zero(),
    color: data.colors?.length
      ? new B.Color4(
          data.colors[colorIndex],
          data.colors[colorIndex + 1],
          data.colors[colorIndex + 2],
          data.colors[colorIndex + 3] ?? 1,
        )
      : new B.Color4(1, 1, 1, 1),
  };
}

function clipFabricatorTriangleToSlice(vertices, planeY) {
  const clipped = [];
  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const previous = vertices[(index + vertices.length - 1) % vertices.length];
    const currentInside = current.clipY <= planeY;
    const previousInside = previous.clipY <= planeY;

    if (currentInside !== previousInside) {
      clipped.push(interpolateFabricatorClipVertex(previous, current, planeY));
    }
    if (currentInside) clipped.push(current);
  }
  return clipped;
}

function interpolateFabricatorClipVertex(from, to, planeY) {
  const span = to.clipY - from.clipY;
  const amount = Math.abs(span) > 0.000001 ? (planeY - from.clipY) / span : 0;
  const normal = B.Vector3.Lerp(from.normal, to.normal, amount);
  if (normal.lengthSquared() > 0.000001) normal.normalize();
  return {
    position: B.Vector3.Lerp(from.position, to.position, amount),
    clipY: planeY,
    normal,
    uv: new B.Vector2(
      lerp(from.uv.x, to.uv.x, amount),
      lerp(from.uv.y, to.uv.y, amount),
    ),
    color: new B.Color4(
      lerp(from.color.r, to.color.r, amount),
      lerp(from.color.g, to.color.g, amount),
      lerp(from.color.b, to.color.b, amount),
      lerp(from.color.a, to.color.a, amount),
    ),
  };
}

function getFabricatorRasterMeshPoint(data, x, y, z) {
  let bestIndex = 0;
  let bestScore = Infinity;
  for (let index = 0; index < data.positions.length; index += 3) {
    const dx = data.positions[index] - x;
    const dy = data.positions[index + 1] - y;
    const dz = data.positions[index + 2] - z;
    const score = dx * dx + dy * dy + dz * dz * 0.35;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return new B.Vector3(
    data.positions[bestIndex],
    data.positions[bestIndex + 1],
    data.positions[bestIndex + 2],
  );
}

function getFabricatorRasterPlatformPoint(data, x, y, z) {
  let bestIndex = 0;
  let bestScore = Infinity;
  const positions = data.platformPositions ?? [];
  for (let index = 0; index < positions.length; index += 3) {
    const dx = positions[index] - x;
    const dy = positions[index + 1] - y;
    const dz = positions[index + 2] - z;
    const score = dx * dx + dy * dy + dz * dz * 0.35;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return new B.Vector3(
    positions[bestIndex],
    positions[bestIndex + 1],
    positions[bestIndex + 2],
  );
}

function createFabricatorDisassemblyMeshData(mesh) {
  const positions = mesh
    .getVerticesData?.(B.VertexBuffer.PositionKind)
    ?.slice();
  const normals = mesh.getVerticesData?.(B.VertexBuffer.NormalKind)?.slice();
  const uvs = mesh.getVerticesData?.(B.VertexBuffer.UVKind)?.slice();
  const colors = mesh.getVerticesData?.(B.VertexBuffer.ColorKind)?.slice();
  const sourceIndices = mesh.getIndices?.()?.slice();
  if (!positions?.length || !sourceIndices?.length) return null;

  const min = new B.Vector3(Infinity, Infinity, Infinity);
  const max = new B.Vector3(-Infinity, -Infinity, -Infinity);
  for (let index = 0; index < positions.length; index += 3) {
    min.x = Math.min(min.x, positions[index]);
    min.y = Math.min(min.y, positions[index + 1]);
    min.z = Math.min(min.z, positions[index + 2]);
    max.x = Math.max(max.x, positions[index]);
    max.y = Math.max(max.y, positions[index + 1]);
    max.z = Math.max(max.z, positions[index + 2]);
  }

  const layerCount = FABRICATOR_PRINT_LAYER_COUNT;
  const linesPerLayer = FABRICATOR_PRINT_LINES_PER_LAYER;
  const layerHeight = Math.max((max.y - min.y) / layerCount, 0.0001);
  const lineDepth = Math.max((max.z - min.z) / linesPerLayer, 0.0001);
  const platformGeometry = createFabricatorPlatformGeometryData(
    mesh,
    positions,
    sourceIndices,
    layerCount,
    linesPerLayer,
  );
  const triangleCentroids = [];
  for (let index = 0; index < sourceIndices.length; index += 3) {
    const a = sourceIndices[index];
    const b = sourceIndices[index + 1];
    const c = sourceIndices[index + 2];
    triangleCentroids.push(getTriangleCentroid(positions, a, b, c));
  }
  return {
    positions,
    normals,
    uvs,
    colors,
    sourceIndices,
    triangleCentroids,
    min,
    max,
    center: min.add(max).scale(0.5),
    width: Math.max(max.x - min.x, 0.0001),
    height: Math.max(max.y - min.y, 0.0001),
    depth: Math.max(max.z - min.z, 0.0001),
    layerCount,
    linesPerLayer,
    totalPasses: layerCount * linesPerLayer,
    layerHeight,
    lineDepth,
    ...platformGeometry,
  };
}

function createFabricatorPlatformGeometryData(
  mesh,
  positions,
  sourceIndices,
  layerCount,
  linesPerLayer,
) {
  const platformRoot = level?.platform?.root;
  if (!mesh || !platformRoot) return {};

  mesh.computeWorldMatrix?.(true);
  platformRoot.computeWorldMatrix?.(true);
  const meshWorld = mesh.getWorldMatrix();
  const inversePlatform = platformRoot.getWorldMatrix().clone().invert();
  const platformPositions = [];
  const platformMin = new B.Vector3(Infinity, Infinity, Infinity);
  const platformMax = new B.Vector3(-Infinity, -Infinity, -Infinity);

  for (let index = 0; index < positions.length; index += 3) {
    const worldPoint = B.Vector3.TransformCoordinates(
      new B.Vector3(
        positions[index],
        positions[index + 1],
        positions[index + 2],
      ),
      meshWorld,
    );
    const platformPoint = B.Vector3.TransformCoordinates(
      worldPoint,
      inversePlatform,
    );
    platformPositions.push(platformPoint.x, platformPoint.y, platformPoint.z);
    platformMin.x = Math.min(platformMin.x, platformPoint.x);
    platformMin.y = Math.min(platformMin.y, platformPoint.y);
    platformMin.z = Math.min(platformMin.z, platformPoint.z);
    platformMax.x = Math.max(platformMax.x, platformPoint.x);
    platformMax.y = Math.max(platformMax.y, platformPoint.y);
    platformMax.z = Math.max(platformMax.z, platformPoint.z);
  }

  if (!platformPositions.length) return {};

  const platformTriangleCentroids = [];
  for (let index = 0; index < sourceIndices.length; index += 3) {
    const a = sourceIndices[index];
    const b = sourceIndices[index + 1];
    const c = sourceIndices[index + 2];
    platformTriangleCentroids.push(
      getTriangleCentroid(platformPositions, a, b, c),
    );
  }

  const platformHeight = Math.max(platformMax.y - platformMin.y, 0.0001);
  const platformWidth = Math.max(platformMax.x - platformMin.x, 0.0001);
  const platformDepth = Math.max(platformMax.z - platformMin.z, 0.0001);
  return {
    platformPositions,
    platformTriangleCentroids,
    platformMin,
    platformMax,
    platformWidth,
    platformHeight,
    platformDepth,
    platformLayerHeight: platformHeight / layerCount,
    platformLineDepth: platformDepth / linesPerLayer,
  };
}

function getFabricatorRemainingTriangleIndices(data, progress, laneCount = 1) {
  if (progress >= 0.9999) return [];

  const clampedProgress = clamp(progress, 0, 0.9999);
  const centroids = data.platformTriangleCentroids ?? data.triangleCentroids;
  const remaining = [];

  for (let index = 0; index < data.sourceIndices.length; index += 3) {
    const centroid = centroids[index / 3];
    const traceProgress = data.platformTriangleCentroids
      ? getFabricatorTraceProgressForPlatformPoint(data, centroid, laneCount)
      : getFabricatorTopDownProgressForLocalPoint(data, centroid);
    if (traceProgress <= clampedProgress) {
      continue;
    }

    remaining.push(
      data.sourceIndices[index],
      data.sourceIndices[index + 1],
      data.sourceIndices[index + 2],
    );
  }

  return remaining;
}

function getFabricatorTraceProgressForPlatformPoint(
  data,
  point,
  laneCount = 1,
) {
  const safeLaneCount = Math.max(Math.floor(laneCount), 1);
  const min = data.platformMin;
  const max = data.platformMax;
  if (!min || !max) return 1;

  const width = Math.max(data.platformWidth ?? max.x - min.x, 0.0001);
  const height = Math.max(data.platformHeight ?? max.y - min.y, 0.0001);
  const depth = Math.max(data.platformDepth ?? max.z - min.z, 0.0001);
  const layerCount = Math.max(
    data.layerCount ?? FABRICATOR_PRINT_LAYER_COUNT,
    1,
  );
  const linesPerLayer = Math.max(
    data.linesPerLayer ?? FABRICATOR_PRINT_LINES_PER_LAYER,
    1,
  );
  const yProgress = clamp((max.y - point.y) / height, 0, 0.999999);
  const zProgress = clamp((point.z - min.z) / depth, 0, 0.999999);
  const xProgress = clamp((point.x - min.x) / width, 0, 1);
  const layerIndex = Math.min(
    layerCount - 1,
    Math.floor(yProgress * layerCount),
  );
  const lineIndex = Math.min(
    linesPerLayer - 1,
    Math.floor(zProgress * linesPerLayer),
  );
  const laneIndex = lineIndex % safeLaneCount;
  const laneLineIndex = Math.floor(lineIndex / safeLaneCount);
  const laneLineCount = Math.max(Math.ceil(linesPerLayer / safeLaneCount), 1);
  const forward = (layerIndex + laneLineIndex + laneIndex) % 2 === 0;
  const scanProgress = forward ? xProgress : 1 - xProgress;
  return clamp(
    (layerIndex + (laneLineIndex + scanProgress) / laneLineCount) / layerCount,
    0,
    1,
  );
}

function getFabricatorTopDownProgressForLocalPoint(data, point) {
  const height = Math.max(data.height ?? data.max.y - data.min.y, 0.0001);
  return clamp((data.max.y - point.y) / height, 0, 1);
}

function getTriangleCentroid(positions, a, b, c) {
  const ai = a * 3;
  const bi = b * 3;
  const ci = c * 3;
  return {
    x: (positions[ai] + positions[bi] + positions[ci]) / 3,
    y: (positions[ai + 1] + positions[bi + 1] + positions[ci + 1]) / 3,
    z: (positions[ai + 2] + positions[bi + 2] + positions[ci + 2]) / 3,
  };
}

function getNodePositionInPlatform(node) {
  const platformRoot = level?.platform?.root;
  if (!platformRoot || !node) {
    return node?.position?.clone?.() ?? B.Vector3.Zero();
  }

  node.computeWorldMatrix?.(true);
  platformRoot.computeWorldMatrix?.(true);
  const inversePlatform = platformRoot.getWorldMatrix().clone().invert();
  const worldPosition = node.getAbsolutePosition?.() ?? node.position;
  return B.Vector3.TransformCoordinates(worldPosition, inversePlatform);
}

function setNodePositionInPlatform(node, position) {
  const platformRoot = level?.platform?.root;
  if (!platformRoot || !node) {
    node?.position?.copyFrom?.(position);
    return;
  }

  if (node.parent === platformRoot) {
    node.position.copyFrom(position);
    return;
  }

  platformRoot.computeWorldMatrix?.(true);
  const worldPosition = B.Vector3.TransformCoordinates(
    position,
    platformRoot.getWorldMatrix(),
  );
  if (!node.parent) {
    node.position.copyFrom(worldPosition);
    return;
  }

  node.parent.computeWorldMatrix?.(true);
  node.position.copyFrom(
    B.Vector3.TransformCoordinates(
      worldPosition,
      node.parent.getWorldMatrix().clone().invert(),
    ),
  );
}

function getFabricatorLaserSourcePoint(root) {
  return getFabricatorLaserSourcePoints(root)[0];
}

function getFabricatorLaserSourcePoints(root) {
  const nubPoints = getFabricatorTopNubLaserPoints(root);
  if (nubPoints.length) return nubPoints;

  const bounds = getRootBoundsInPlatform(root);
  if (!bounds) return [getWireAnchorPoint(root, "fabricator")];

  const center = bounds.min.add(bounds.max).scale(0.5);
  const halfSpacing = Math.max(
    bounds.max.subtract(bounds.min).x * 0.22,
    0.0001,
  );
  return [
    new B.Vector3(center.x - halfSpacing, bounds.max.y + 0.12, center.z),
    new B.Vector3(center.x + halfSpacing, bounds.max.y + 0.12, center.z),
  ];
}

function getFabricatorTopNubLaserPoints(root) {
  const platformRoot = level?.platform?.root;
  if (!root || !platformRoot) return [];

  const rootBounds = getRootBoundsInPlatform(root);
  const meshes = getRootRenderableMeshes(root);
  if (!rootBounds || !meshes.length) return [];

  const rootCenter = rootBounds.min.add(rootBounds.max).scale(0.5);
  const rootSize = rootBounds.max.subtract(rootBounds.min);
  const inversePlatform = platformRoot.getWorldMatrix().clone().invert();
  const candidates = [];

  for (const mesh of meshes) {
    const bounds = getMeshesBoundsInMatrix([mesh], inversePlatform);
    if (!bounds) continue;

    const size = bounds.max.subtract(bounds.min);
    const center = bounds.min.add(bounds.max).scale(0.5);
    const topDistance = Math.abs(bounds.max.y - rootBounds.max.y);
    const topScore =
      1 - clamp(topDistance / Math.max(rootSize.y * 0.22, 0.0001), 0, 1);
    const smallFootprint =
      1 -
      clamp(
        Math.max(
          size.x / Math.max(rootSize.x, 0.0001),
          size.z / Math.max(rootSize.z, 0.0001),
        ) * 5.5,
        0,
        1,
      );
    const verticalNub =
      clamp(size.y / Math.max(Math.max(size.x, size.z), 0.0001), 0, 2) / 2;
    const frontPenalty = clamp(
      (center.z - rootCenter.z) / Math.max(rootSize.z * 0.5, 0.0001),
      0,
      1,
    );
    const score =
      topScore * 3 + smallFootprint * 2 + verticalNub - frontPenalty;

    if (
      topScore > 0.12 &&
      smallFootprint > 0.18 &&
      size.y > rootSize.y * 0.025
    ) {
      candidates.push({ bounds, center, score });
    }
  }

  if (!candidates.length) return [];

  candidates.sort((a, b) => b.score - a.score);
  const selected = [];
  const minLateralSeparation = Math.max(rootSize.x * 0.16, 0.0001);

  for (const candidate of candidates) {
    const separated = selected.every(
      (other) =>
        Math.abs(candidate.center.x - other.center.x) >= minLateralSeparation,
    );
    if (separated) selected.push(candidate);
    if (selected.length >= 2) break;
  }
  if (selected.length < 2) {
    for (const candidate of candidates) {
      if (!selected.includes(candidate)) selected.push(candidate);
      if (selected.length >= 2) break;
    }
  }

  const points = selected.slice(0, 2).map(({ bounds }) => {
    const center = bounds.min.add(bounds.max).scale(0.5);
    return new B.Vector3(
      center.x,
      bounds.min.y + FABRICATOR_LASER_NUB_Y_OFFSET,
      center.z,
    );
  });

  if (points.length === 1) {
    const lateralOffset = points[0].x - rootCenter.x;
    if (Math.abs(lateralOffset) > rootSize.x * 0.08) {
      points.push(
        new B.Vector3(rootCenter.x - lateralOffset, points[0].y, points[0].z),
      );
    } else {
      const halfSpacing = Math.max(rootSize.x * 0.22, 0.0001);
      points[0].x = rootCenter.x - halfSpacing;
      points.push(
        new B.Vector3(rootCenter.x + halfSpacing, points[0].y, points[0].z),
      );
    }
  }

  return points;
}

function nodeLocalPointToPlatform(node, localPoint) {
  const platformRoot = level?.platform?.root;
  if (!node || !platformRoot) return localPoint.clone();

  node.computeWorldMatrix?.(true);
  platformRoot.computeWorldMatrix?.(true);
  const worldPoint = B.Vector3.TransformCoordinates(
    localPoint,
    node.getWorldMatrix(),
  );
  return B.Vector3.TransformCoordinates(
    worldPoint,
    platformRoot.getWorldMatrix().clone().invert(),
  );
}

function nodeLocalDirectionToPlatform(node, localDirection) {
  const platformRoot = level?.platform?.root;
  if (!node || !platformRoot) return localDirection.clone();

  node.computeWorldMatrix?.(true);
  platformRoot.computeWorldMatrix?.(true);
  const worldDirection = B.Vector3.TransformNormal(
    localDirection,
    node.getWorldMatrix(),
  );
  const platformDirection = B.Vector3.TransformNormal(
    worldDirection,
    platformRoot.getWorldMatrix().clone().invert(),
  );
  if (platformDirection.lengthSquared() <= 0.000001) {
    return localDirection.clone();
  }
  return platformDirection.normalize();
}

function platformPointToNodeLocal(node, platformPoint) {
  const platformRoot = level?.platform?.root;
  if (!node || !platformRoot) return platformPoint.clone();

  platformRoot.computeWorldMatrix?.(true);
  node.computeWorldMatrix?.(true);
  const worldPoint = B.Vector3.TransformCoordinates(
    platformPoint,
    platformRoot.getWorldMatrix(),
  );
  return B.Vector3.TransformCoordinates(
    worldPoint,
    node.getWorldMatrix().clone().invert(),
  );
}

function cleanupFabricatorDisassemblyEffects(effects) {
  for (const beam of effects?.beams ?? []) {
    beam?.core?.dispose(false, true);
    beam?.glow?.dispose(false, true);
    beam?.dispose?.(false, true);
  }
  for (const scanLine of effects?.scanLines ?? []) {
    scanLine?.dispose(false, true);
  }
  effects?.beam?.dispose(false, true);
  effects?.scanLine?.dispose(false, true);
  effects?.traceRing?.dispose(false, true);
  effects?.traceGlow?.dispose(false, true);
  for (const contour of effects?.craftContourTubes ?? []) {
    contour?.dispose(false, true);
  }
  for (const contour of effects?.craftContourGlowTubes ?? []) {
    contour?.dispose(false, true);
  }
  effects?.cutCap?.dispose(false, true);
  effects?.cutCapLight?.dispose?.();
  effects?.beamMaterial?.dispose?.();
  effects?.beamGlowMaterial?.dispose?.();
  effects?.scanLineMaterial?.dispose?.();
  effects?.traceMaterial?.dispose?.();
  effects?.traceGlowMaterial?.dispose?.();
  effects?.cutCapMaterial?.dispose?.();
}

function openHatchWarningModal(interaction) {
  if (!hatchWarningModal || !hatchWarningActions || !interaction) return false;
  closePlayerModals();
  pendingHatchInteraction = interaction;
  hatchWarningActions.replaceChildren(
    ...createHatchWarningButtons(isHelmetProtecting()),
  );
  hatchWarningModal.hidden = false;
  document.body.classList.add("ui-modal-open");
  exitPointerLock();
  updateInteractionPrompt(null);
  return true;
}

function createHatchWarningButtons(hasHelmet) {
  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "hatch-open-button";
  openButton.textContent = hasHelmet ? "Open" : "Open without helmet";
  openButton.addEventListener("click", (event) => {
    event.stopPropagation();
    confirmOpenHatch();
  });

  if (hasHelmet) return [openButton];

  const abortButton = document.createElement("button");
  abortButton.type = "button";
  abortButton.textContent = "Abort";
  abortButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closePlayerModals();
  });
  return [openButton, abortButton];
}

function confirmOpenHatch() {
  const interaction = pendingHatchInteraction;
  closePlayerModals();
  if (!interaction || interaction.isOpen) return;

  const result = interaction.activate?.();
  if (result === false) return;

  triggerHatchDecompression(interaction);
  updateInteractionPrompt(null);
}

function closePlayerModals() {
  inventoryModal.hidden = true;
  notebookModal.hidden = true;
  if (fabricatorModal) fabricatorModal.hidden = true;
  if (oxygenGeneratorModal) oxygenGeneratorModal.hidden = true;
  if (batteryModal) batteryModal.hidden = true;
  if (hatchWarningModal) hatchWarningModal.hidden = true;
  activeFabricatorRoot = null;
  activeOxygenGeneratorRoot = null;
  fabricatorAnalysisStaticKey = "";
  pendingHatchInteraction = null;
  document.body.classList.remove("ui-modal-open");
  keys.clear();
}

function isUiModalOpen() {
  return (
    !inventoryModal.hidden ||
    !notebookModal.hidden ||
    Boolean(fabricatorModal && !fabricatorModal.hidden) ||
    Boolean(oxygenGeneratorModal && !oxygenGeneratorModal.hidden) ||
    Boolean(batteryModal && !batteryModal.hidden) ||
    Boolean(hatchWarningModal && !hatchWarningModal.hidden)
  );
}

function exitPointerLock() {
  if (document.pointerLockElement) {
    document.exitPointerLock?.();
  }
}

async function startGameFromPath(path) {
  try {
    if (gameStarted || gameBooting) return;
    setMenuBusy(true);
    const saveFile = await loadSaveFile(path);
    saveFile.path = path;
    await startGame(saveFile);
  } catch (error) {
    setMenuBusy(false);
    setLoadingScreen(false);
    showRuntimeError(error);
  }
}

async function startGameFromFile(file) {
  try {
    if (gameStarted || gameBooting) return;
    setMenuBusy(true);
    const saveFile = JSON.parse(await file.text());
    saveFile.path = file.name;
    await startGame(saveFile);
  } catch (error) {
    setMenuBusy(false);
    setLoadingScreen(false);
    showRuntimeError(error);
  }
}

async function startGame(saveFile) {
  if (gameStarted || gameBooting) return;
  gameBooting = true;
  setLoadingScreen(true, "Preparing save");
  currentSaveFile = saveFile;
  stopMenuBackground();
  document.body.classList.remove("menu-open");

  try {
    brownDwarfLevel = applySaveToLevel(baseBrownDwarfLevel, saveFile);
    applySavedWorldPreload(brownDwarfLevel, saveFile.world);
    engine = new B.Engine(canvas, true, {
      antialias: true,
      adaptToDeviceRatio: false,
      powerPreference: "high-performance",
    });
    engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, 1.25));
    engine.metadata = { performance: {} };
    scene = new B.Scene(engine);
    scene.metadata = {
      timeScale: 1,
      profiler: createAssetProfiler(),
    };
    playerDead = false;
    playerHealth = PLAYER_HEALTH_MAX;
    playerFood = PLAYER_FOOD_MAX;
    playerThirst = PLAYER_THIRST_MAX;
    playerRestroom = PLAYER_RESTROOM_MAX;
    playerComfort = PLAYER_COMFORT_MAX;
    playerTemperatureC = PLAYER_TEMPERATURE_IDEAL_C;
    document.body.classList.remove("player-dead");
    deathScreen?.setAttribute("aria-hidden", "true");
    nearDeathPulse?.style.setProperty("--near-death-intensity", "0");
    collisionDebugVisible = false;
    performanceMonitor = createPerformanceMonitor(engine, metrics);

    scene.clearColor.set(0, 0, 0, 1);
    scene.environmentIntensity = 1.15;
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.exposure = 0.9;
    scene.imageProcessingConfiguration.contrast = 1.06;
    configureImportedMaterialLighting(scene);
    configureObjectBoundsRenderer(scene);

    camera = new B.UniversalCamera(
      "player-camera",
      B.Vector3.FromArray(brownDwarfLevel.spawn.position),
      scene,
    );
    camera.fov = Math.PI / 3;
    camera.minZ = 0.05;
    camera.maxZ = 3000;
    camera.speed = 0;
    camera.angularSensibility = BASE_MOUSE_SENSIBILITY;
    camera.inertia = 0.18;
    camera.setTarget(B.Vector3.FromArray(brownDwarfLevel.spawn.target));
    enforceUprightCamera(camera);
    camera.attachControl(canvas, true);
    playerPlaceholderRig = createPlayerPlaceholderRig(scene, camera);

    canvas.addEventListener("pointerdown", handleCanvasPointerDown);
    installBackgroundMusicUnlock(backgroundMusic);

    updateLoadingStatus("Building level");
    level = buildLevel(scene, brownDwarfLevel);
    installDebrisFieldPlayerCollision();
    thirdPersonCamera = createThirdPersonCamera(scene, camera);
    playerPhysics = {
      verticalVelocity: 0,
      grounded: Boolean(level.platform),
      eyeHeight: level.platform?.physics?.eyeHeight ?? camera.position.y,
      platformEyeHeight:
        level.platform?.physics?.eyeHeight ?? camera.position.y,
    };
    installHudControls();

    engine.runRenderLoop(() => {
      const frame = performanceMonitor.beginFrame();
      scene.render();
      performanceMonitor.endFrame(frame);
    });
    addEventListener("resize", () => engine?.resize());

    await waitForInitialLevelAssets();
    updateLoadingStatus("Restoring saved world");
    await restoreSavedWorldState(saveFile.world);
    await initializeMountedHooks();
    mountedHooksInitialized = true;
    updateLoadingStatus("Finalizing scene");
    await waitForSceneReady(scene);

    toolTipsVisible = false;
    updateToolTipsVisibility();
    refreshPlacementPreview();
    installPlayerLoop();
    gameStarted = true;
    gameBooting = false;
    setLoadingScreen(false);
    setMenuBusy(false);
  } catch (error) {
    gameBooting = false;
    cleanupFailedGameStart();
    document.body.classList.add("menu-open");
    startMenuBackground();
    throw error;
  }
}

function resolveDebrisFieldPlayerCollisions(seconds) {
  level?.debrisField?.rocks?.resolvePlayerCollisions?.(seconds);
}

function installDebrisFieldPlayerCollision() {
  const rocks = level?.debrisField?.rocks;
  if (!rocks?.setPlayerCollisionSource) return;

  rocks.setPlayerCollisionSource(() => {
    const platform = level?.platform?.physics;
    if (!camera || !platform) return null;

    const bounds = getSolidLevelPlayerBounds(platform);
    const capsule = getPlayerCollisionCapsule(camera.position, bounds);
    rocks.computeWorldMatrix?.(true);
    const rocksWorldMatrix = rocks.getWorldMatrix();
    const worldToRocksMatrix = rocksWorldMatrix.clone().invert();
    return {
      capsuleStart: platformLocalPointToWorld(capsule.start),
      capsuleEnd: platformLocalPointToWorld(capsule.end),
      radius: bounds.radius,
      skin: ASTEROID_CONTACT_SKIN,
      minRockRadius: 0.22,
      playerPushFraction: 0.65,
      worldToLocal: (point) =>
        B.Vector3.TransformCoordinates(point, worldToRocksMatrix),
      localToWorldVector: (vector) =>
        B.Vector3.TransformNormal(vector, rocksWorldMatrix),
      applyCorrection: (worldCorrection, localNormal) => {
        applyDebrisAsteroidPlayerCorrection(
          worldCorrection,
          localNormal,
          rocks,
          platform,
        );
      },
    };
  });
}

function getPlayerCollisionCapsule(position, bounds) {
  const clearance = Math.max(bounds.clearance, bounds.radius * 2);
  const headOffset = Math.min(bounds.radius, clearance);
  const footOffset = Math.max(clearance - bounds.radius, headOffset);
  return {
    start: position.add(B.Axis.Y.scale(-headOffset)),
    end: position.add(B.Axis.Y.scale(-footOffset)),
  };
}

function applyDebrisAsteroidPlayerCorrection(
  worldCorrection,
  localNormal,
  rocks,
  platform,
) {
  if (!camera || !worldCorrection) return;

  const localCorrection = worldVectorToPlatformLocal(worldCorrection);
  camera.position.addInPlace(localCorrection);
  if (platform) {
    const resolved = resolvePlayerAgainstSolidLevel(camera.position, platform);
    camera.position.copyFrom(resolved.position);
  }

  if (!zeroGravityMode || flyMode) return;

  const worldNormal = rocks?.getWorldMatrix
    ? B.Vector3.TransformNormal(localNormal, rocks.getWorldMatrix())
    : worldCorrection.clone();
  const localNormalToPlayer = worldVectorToPlatformLocal(worldNormal);
  if (localNormalToPlayer.lengthSquared() <= 0.000001) return;

  localNormalToPlayer.normalize();
  const impulse = Math.min(worldCorrection.length() * 2.4, 0.45);
  zeroGravityVelocity.addInPlace(localNormalToPlayer.scale(impulse));
  clampVectorLengthInPlace(zeroGravityVelocity, ZERO_G_MAX_SPEED);
}

function createThirdPersonCamera(scene, playerCamera) {
  const followCamera = new B.UniversalCamera(
    "third-person-camera",
    playerCamera.position.clone(),
    scene,
  );
  followCamera.parent = playerCamera.parent;
  followCamera.fov = playerCamera.fov;
  followCamera.minZ = 0.03;
  followCamera.maxZ = playerCamera.maxZ;
  followCamera.speed = 0;
  updateThirdPersonCamera();
  scene.activeCamera = playerCamera;
  return followCamera;
}

function createPlayerPlaceholderRig(scene, parentCamera) {
  const root = new B.TransformNode("player-placeholder-body", scene);
  root.parent = parentCamera.parent ?? null;
  root.position.copyFrom(parentCamera.position);
  root.rotation.set(0, getCameraYaw(parentCamera), 0);

  const suitMaterial = new B.StandardMaterial(
    "player-placeholder-suit-material",
    scene,
  );
  suitMaterial.diffuseColor = new B.Color3(0.48, 0.56, 0.62);
  suitMaterial.emissiveColor = new B.Color3(0.055, 0.065, 0.075);
  suitMaterial.specularColor = new B.Color3(0.18, 0.2, 0.22);
  suitMaterial.specularPower = 58;

  const lensMaterial = new B.StandardMaterial(
    "player-placeholder-eye-lens-material",
    scene,
  );
  lensMaterial.diffuseColor = new B.Color3(0.02, 0.06, 0.08);
  lensMaterial.emissiveColor = new B.Color3(0.0, 0.18, 0.26);
  lensMaterial.specularColor = new B.Color3(0.4, 0.9, 1);

  createPlayerPlaceholderCapsule(scene, root, suitMaterial);
  createPlayerPlaceholderHead(scene, root, suitMaterial, lensMaterial);

  measurePlayerPlaceholderSourceBounds(root);
  syncPlayerPlaceholderPose(root);
  updatePlayerPlaceholderVisibility(root);
  return root;
}

function createPlayerPlaceholderCapsule(scene, root, material) {
  if (typeof B.MeshBuilder.CreateCapsule === "function") {
    const capsule = B.MeshBuilder.CreateCapsule(
      "player-placeholder-capsule",
      {
        height: 0.9,
        radius: 0.18,
        tessellation: 18,
        subdivisions: 4,
        capSubdivisions: 8,
      },
      scene,
    );
    capsule.parent = root;
    capsule.position.set(0, -0.64, 0.38);
    capsule.material = material;
    configurePlayerPlaceholderMesh(capsule);
    return capsule;
  }

  const capsuleRoot = new B.TransformNode("player-placeholder-capsule", scene);
  capsuleRoot.parent = root;
  capsuleRoot.position.set(0, -0.64, 0.38);

  for (const [mesh, y] of [
    [
      B.MeshBuilder.CreateCylinder(
        "player-placeholder-capsule-core",
        { height: 0.54, diameter: 0.36, tessellation: 18 },
        scene,
      ),
      0,
    ],
    [
      B.MeshBuilder.CreateSphere(
        "player-placeholder-capsule-top",
        { diameter: 0.36, segments: 18 },
        scene,
      ),
      0.27,
    ],
    [
      B.MeshBuilder.CreateSphere(
        "player-placeholder-capsule-bottom",
        { diameter: 0.36, segments: 18 },
        scene,
      ),
      -0.27,
    ],
  ]) {
    mesh.parent = capsuleRoot;
    mesh.position.y = y;
    mesh.material = material;
    configurePlayerPlaceholderMesh(mesh);
  }

  return capsuleRoot;
}

function createPlayerPlaceholderHead(scene, root, material, lensMaterial) {
  const head = B.MeshBuilder.CreateSphere(
    "player-placeholder-head",
    { diameter: 1, segments: 16 },
    scene,
  );
  head.parent = root;
  head.position.set(0, -0.045, -0.09);
  head.scaling.set(0.14, 0.17, 0.14);
  head.material = material;
  configurePlayerPlaceholderMesh(head, { thirdPersonOnly: true });

  for (const [name, x] of [
    ["left-eye", -0.045],
    ["right-eye", 0.045],
  ]) {
    const eye = B.MeshBuilder.CreateSphere(
      `player-placeholder-${name}`,
      { diameter: 1, segments: 8 },
      scene,
    );
    eye.parent = root;
    eye.position.set(x, 0, 0.025);
    eye.scaling.set(0.018, 0.026, 0.008);
    eye.material = lensMaterial;
    configurePlayerPlaceholderMesh(eye, { thirdPersonOnly: true });
  }
}

function configurePlayerPlaceholderMesh(mesh, options = {}) {
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    excludeFromBounds: true,
    excludeFromCollision: true,
    playerPlaceholderBody: true,
    thirdPersonOnly: Boolean(options.thirdPersonOnly),
  };
}

function updatePlayerPlaceholderVisibility(root) {
  if (!root) return;
  for (const mesh of root.getChildMeshes(false)) {
    mesh.setEnabled(thirdPersonMode);
  }
}

function measurePlayerPlaceholderSourceBounds(root) {
  const bounds = getRootLocalBounds(root);
  if (!bounds) return;
  const sourceHeight = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(sourceHeight) || sourceHeight <= 0) return;
  root.metadata = {
    ...(root.metadata ?? {}),
    sourceBounds: {
      min: bounds.min.clone(),
      max: bounds.max.clone(),
    },
    sourceHeight,
  };
}

function syncPlayerPlaceholderToPhysics(platform) {
  if (!playerPlaceholderRig || !platform) return;
  const playerHeight =
    platform.playerHeight ?? (platform.eyeHeight ?? 0) - (platform.floorY ?? 0);
  if (!Number.isFinite(playerHeight) || playerHeight <= 0) return;
  const sourceHeight = playerPlaceholderRig.metadata?.sourceHeight ?? 1;
  const scale = playerHeight / sourceHeight;
  if (
    Math.abs((playerPlaceholderRig.metadata?.physicsScale ?? 0) - scale) < 0.001
  ) {
    return;
  }
  playerPlaceholderRig.scaling.setAll(scale);
  playerPlaceholderRig.metadata = {
    ...(playerPlaceholderRig.metadata ?? {}),
    physicsScale: scale,
  };
}

function syncPlayerPlaceholderPose(root = playerPlaceholderRig) {
  if (!root || !camera) return;
  root.parent = camera.parent ?? null;
  root.position.copyFrom(camera.position);
  root.rotationQuaternion = null;
  root.rotation.set(0, getCameraYaw(camera), 0);
}

function getCameraYaw(targetCamera) {
  const rotation = getCameraEulerRotation(targetCamera);
  return Number.isFinite(rotation.y) ? rotation.y : 0;
}

function getCameraEulerRotation(targetCamera) {
  if (!targetCamera) return B.Vector3.Zero();
  if (targetCamera.rotationQuaternion) {
    return targetCamera.rotationQuaternion.toEulerAngles();
  }
  return targetCamera.rotation ?? B.Vector3.Zero();
}

function enforceUprightCamera(targetCamera) {
  if (!targetCamera) return;
  if (targetCamera.rotationQuaternion) {
    targetCamera.rotation.copyFrom(
      targetCamera.rotationQuaternion.toEulerAngles(),
    );
    targetCamera.rotationQuaternion = null;
  }
  targetCamera.rotation.x = clamp(
    Number.isFinite(targetCamera.rotation.x) ? targetCamera.rotation.x : 0,
    -PLAYER_MAX_LOOK_PITCH,
    PLAYER_MAX_LOOK_PITCH,
  );
  if (!Number.isFinite(targetCamera.rotation.y)) targetCamera.rotation.y = 0;
  targetCamera.rotation.z = 0;
}

function toggleThirdPersonCamera() {
  if (!thirdPersonCamera || !scene) return;

  thirdPersonMode = !thirdPersonMode;
  if (thirdPersonMode) {
    enforceUprightCamera(camera);
    updateThirdPersonCamera(true);
    thirdPersonCamera.rotation.copyFrom(camera.rotation);
    enforceUprightCamera(thirdPersonCamera);
    camera.detachControl(canvas);
    thirdPersonCamera.attachControl(canvas, true);
    scene.activeCamera = thirdPersonCamera;
  } else {
    enforceUprightCamera(thirdPersonCamera);
    camera.rotation.copyFrom(thirdPersonCamera.rotation);
    enforceUprightCamera(camera);
    thirdPersonCamera.detachControl(canvas);
    camera.attachControl(canvas, true);
    scene.activeCamera = camera;
  }
  syncPlayerPlaceholderPose();
  updatePlayerPlaceholderVisibility(playerPlaceholderRig);
  updateHudButtons();
}

function syncPlayerLookFromThirdPersonCamera() {
  if (!thirdPersonMode || !thirdPersonCamera || !camera) return;
  enforceUprightCamera(thirdPersonCamera);
  camera.rotation.copyFrom(thirdPersonCamera.rotation);
  enforceUprightCamera(camera);
}

function updateThirdPersonCamera(snap = false) {
  if (!thirdPersonCamera || !camera) return;

  const forward = camera.getDirection(B.Axis.Z);
  if (camera.parent) {
    const inverseParent = camera.parent.getWorldMatrix().clone().invert();
    B.Vector3.TransformNormalToRef(forward, inverseParent, forward);
  }
  forward.y *= 0.28;
  if (forward.lengthSquared() < 0.0001) forward.copyFrom(B.Axis.Z);
  forward.normalize();

  const desiredPosition = camera.position
    .subtract(forward.scale(THIRD_PERSON_DISTANCE))
    .add(new B.Vector3(0, THIRD_PERSON_HEIGHT, 0));

  if (snap) {
    thirdPersonCamera.position.copyFrom(desiredPosition);
  } else {
    B.Vector3.LerpToRef(
      thirdPersonCamera.position,
      desiredPosition,
      0.28,
      thirdPersonCamera.position,
    );
  }
  enforceUprightCamera(camera);
  thirdPersonCamera.rotation.copyFrom(camera.rotation);
  enforceUprightCamera(thirdPersonCamera);
}

function startMenuBackground() {
  if (menuEngine) return;

  menuEngine = new B.Engine(canvas, true, {
    antialias: true,
    adaptToDeviceRatio: false,
    powerPreference: "high-performance",
  });
  menuEngine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, 1.5));

  menuScene = new B.Scene(menuEngine);
  menuScene.clearColor = new B.Color4(0.002, 0.006, 0.018, 1);
  menuScene.imageProcessingConfiguration.toneMappingEnabled = true;
  menuScene.imageProcessingConfiguration.exposure = 1.05;

  menuCamera = new B.UniversalCamera(
    "menu-camera",
    B.Vector3.Zero(),
    menuScene,
  );
  menuCamera.fov = Math.PI / 3;
  menuCamera.minZ = 0.1;
  menuCamera.maxZ = MENU_STAR_DOME_RADIUS * 2;
  menuScene.activeCamera = menuCamera;

  createMenuStarDome(menuScene);

  menuEngine.runRenderLoop(() => {
    const seconds = performance.now() / 1000;
    menuCamera.rotation.set(
      Math.sin(seconds * 0.04) * 0.055,
      seconds * 0.0175,
      Math.sin(seconds * 0.025) * 0.018,
    );
    menuScene.render();
  });
  addEventListener("resize", resizeMenuBackground);
}

function stopMenuBackground() {
  removeEventListener("resize", resizeMenuBackground);
  menuEngine?.stopRenderLoop();
  menuScene?.dispose();
  menuEngine?.dispose();
  menuEngine = null;
  menuScene = null;
  menuCamera = null;
}

function resizeMenuBackground() {
  menuEngine?.resize();
}

function createMenuStarDome(targetScene) {
  const root = new B.TransformNode("menu-star-dome", targetScene);
  const random = createSeededRandom(83471);
  const layers = [
    { count: 5200, pointSize: 1.05, brightness: 0.54 },
    { count: 820, pointSize: 1.75, brightness: 0.82 },
    { count: 120, pointSize: 2.6, brightness: 1.05 },
  ];

  for (const [index, layer] of layers.entries()) {
    const cloud = new B.PointsCloudSystem(
      `menu-stars-${index}`,
      layer.pointSize,
      targetScene,
    );
    cloud.addPoints(layer.count, (star) => {
      const y = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const ring = Math.sqrt(1 - y * y);
      const color = randomStarColor(random());
      const light = layer.brightness * (0.68 + random() * 0.5);

      star.position.set(
        MENU_STAR_DOME_RADIUS * ring * Math.cos(angle),
        MENU_STAR_DOME_RADIUS * y,
        MENU_STAR_DOME_RADIUS * ring * Math.sin(angle),
      );
      star.color = new B.Color4(
        color[0] * light,
        color[1] * light,
        color[2] * light,
        1,
      );
    });
    cloud.buildMeshAsync().then((mesh) => {
      mesh.parent = root;
      mesh.isPickable = false;
      mesh.alwaysSelectAsActiveMesh = true;
    });
  }

  return root;
}

function randomStarColor(tint) {
  if (tint < 0.14) return [0.48, 0.66, 1.0];
  if (tint < 0.28) return [0.64, 0.92, 1.0];
  if (tint < 0.4) return [0.64, 1.0, 0.86];
  if (tint < 0.53) return [1.0, 0.72, 0.42];
  if (tint < 0.65) return [1.0, 0.48, 0.34];
  if (tint < 0.75) return [0.88, 0.58, 1.0];
  return [1.0, 0.98, 0.9];
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function installHudControls() {
  if (level.platform) {
    const orbit = level.platform.orbit;
    const orbitStatus = document.createElement("span");
    orbitStatus.textContent =
      `Orbit ${(orbit.speedMps / 1000).toFixed(1)} km/s · ` +
      `${orbit.radiusKm.toLocaleString()} km`;
    hud.append(orbitStatus);
  }

  const healthControl = createLifeSupportMeter("health", "health");
  healthMeterRoot = healthControl.root;
  healthMeter = healthControl.meter;
  healthMeterFill = healthControl.fill;
  const mainIssue = createStatusTile("main-issue", "Main Issue");
  mainIssueRoot = mainIssue.root;
  mainIssueText = mainIssue.value;
  const oxygenStatus = createOxygenStatusBox();
  const foodStatus = createStatusTile("food", "Food Status");
  foodStatusRoot = foodStatus.root;
  foodStatusText = foodStatus.value;
  const thirstStatus = createStatusTile("thirst", "Thirst");
  thirstStatusRoot = thirstStatus.root;
  thirstStatusText = thirstStatus.value;
  const restroomStatus = createStatusTile("restroom", "Restroom Status");
  restroomStatusRoot = restroomStatus.root;
  restroomStatusText = restroomStatus.value;
  const comfortStatus = createStatusTile("comfort", "Comfort");
  comfortStatusRoot = comfortStatus.root;
  comfortStatusText = comfortStatus.value;
  const temperatureStatus = createStatusTile("temperature", "Temperature");
  temperatureStatusRoot = temperatureStatus.root;
  temperatureStatusText = temperatureStatus.value;
  timeButton = createHudButton();
  flyButton = createHudButton();
  cameraButton = createHudButton();
  visorButton = createHudButton();
  saveStartButton = createHudButton();
  const sensitivityControl = createMouseSensitivityControl();
  timeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    timeSpeedIndex = (timeSpeedIndex + 1) % timeSpeeds.length;
    scene.metadata.timeScale = timeSpeeds[timeSpeedIndex];
    updateHudButtons();
  });
  flyButton.addEventListener("click", (event) => {
    event.stopPropagation();
    flyMode = !flyMode;
    playerPhysics.verticalVelocity = 0;
    updateHudButtons();
  });
  cameraButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleThirdPersonCamera();
  });
  visorButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleHelmetVisor();
    updateHudButtons();
  });
  saveStartButton.addEventListener("click", (event) => {
    event.stopPropagation();
    saveCurrentWorldState();
  });
  vitals?.append(
    oxygenStatus.root,
    foodStatus.root,
    thirstStatus.root,
    restroomStatus.root,
    comfortStatus.root,
    temperatureStatus.root,
    mainIssue.root,
    healthControl.root,
  );
  hud.append(
    timeButton,
    flyButton,
    cameraButton,
    visorButton,
    saveStartButton,
    sensitivityControl,
  );
  updateHudButtons();
}

function createOxygenStatusBox() {
  const root = document.createElement("span");
  root.className = "vital-status-tile oxygen";

  const title = document.createElement("span");
  title.className = "vital-status-title";
  title.textContent = "Oxygen Status";

  oxygenStatusText = document.createElement("span");
  oxygenStatusText.className = "vital-status-value";

  oxygenPressureText = document.createElement("span");
  oxygenPressureText.className = "vital-status-detail";

  const meter = document.createElement("span");
  meter.className = "helmet-oxygen-meter";
  meter.hidden = true;

  const fill = document.createElement("span");
  fill.className = "helmet-oxygen-fill";

  const label = document.createElement("span");
  label.className = "helmet-oxygen-label";

  meter.append(fill, label);
  root.append(title, oxygenStatusText, oxygenPressureText, meter);

  oxygenStatusRoot = root;
  helmetOxygenMeter = meter;
  helmetOxygenFill = fill;
  helmetOxygenText = label;
  return { root };
}

function createStatusTile(kind, labelText) {
  const root = document.createElement("span");
  root.className = `vital-status-tile ${kind}`;

  const title = document.createElement("span");
  title.className = "vital-status-title";
  title.textContent = labelText;

  const value = document.createElement("span");
  value.className = "vital-status-value";

  root.append(title, value);
  return { root, value };
}

function createLifeSupportMeter(kind, labelText) {
  const root = document.createElement("span");
  root.className = `hud-meter ${kind}`;

  const text = document.createElement("span");
  text.className = "hud-meter-text";
  text.append(createVitalIcon(labelText));

  const meter = document.createElement("span");
  meter.className = "hud-meter-track";
  meter.style.setProperty("--meter-value", "100%");

  const fill = document.createElement("span");
  fill.className = "hud-meter-fill";
  meter.append(fill);

  root.append(text, meter);
  return { root, meter, fill, text };
}

function createVitalIcon(type) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    type === "food"
      ? "M42 6c6 4 8 12 3 19l-13 18c-3 4-7 5-11 3l-3 4c2 4 0 8-4 9-3 1-7-1-8-4-4 0-7-3-6-7 1-4 5-6 9-4l3-4c-3-3-3-8 0-12L25 10c5-7 12-8 17-4Zm-7 7c-3-2-6-1-9 3L15 31c-2 3-1 6 2 8 3 2 6 2 8-1l12-16c2-4 2-7-2-9Z"
      : "M32 57C18 46 7 36 7 23 7 15 13 9 21 9c5 0 9 3 11 7 2-4 6-7 11-7 8 0 14 6 14 14 0 13-11 23-25 34Z",
  );
  svg.append(path);
  return svg;
}

function createMouseSensitivityControl() {
  const label = document.createElement("label");
  label.className = "hud-slider";
  label.addEventListener("pointerdown", (event) => event.stopPropagation());
  label.addEventListener("click", (event) => event.stopPropagation());

  const text = document.createElement("span");
  text.textContent = "Look";
  mouseSensitivityValue = document.createElement("span");
  mouseSensitivityValue.className = "hud-slider-value";

  mouseSensitivitySlider = document.createElement("input");
  mouseSensitivitySlider.type = "range";
  mouseSensitivitySlider.min = "0.25";
  mouseSensitivitySlider.max = "3";
  mouseSensitivitySlider.step = "0.05";
  mouseSensitivitySlider.value = "1";
  mouseSensitivitySlider.title = "Mouse look sensitivity";
  mouseSensitivitySlider.setAttribute("aria-label", "Mouse sensitivity");
  mouseSensitivitySlider.addEventListener("input", () => {
    updateMouseSensitivity(Number(mouseSensitivitySlider.value));
  });

  label.append(text, mouseSensitivitySlider, mouseSensitivityValue);
  updateMouseSensitivity(Number(mouseSensitivitySlider.value));
  return label;
}

function updateMouseSensitivity(multiplier) {
  const sensitivity = Math.max(0.25, Math.min(multiplier || 1, 3));
  if (camera) {
    camera.angularSensibility = BASE_MOUSE_SENSIBILITY / sensitivity;
  }
  if (mouseSensitivityValue) {
    mouseSensitivityValue.textContent = `${sensitivity.toFixed(2)}x`;
  }
}

async function saveCurrentWorldState() {
  if (!currentSaveFile || !camera) {
    updateInteractionPrompt({ prompt: "No save loaded" });
    return;
  }

  const save = cloneSave(currentSaveFile);
  save.world = createWorldSaveState();

  const filename = getCurrentSaveFilename();
  const json = `${JSON.stringify(save, null, 2)}\n`;

  try {
    const wroteLocalFile = await saveCurrentFileThroughDevServer(json);
    if (wroteLocalFile) {
      // The local development server wrote the active save file directly.
    } else if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "Spaceraft save file",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
    } else {
      downloadTextFile(filename, json, "application/json");
    }

    currentSaveFile = save;
    updateInteractionPrompt({ prompt: "World saved" });
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error("Failed to save world state.", error);
      updateInteractionPrompt({ prompt: "Could not save file" });
    }
  }
}

function createWorldSaveState() {
  return {
    version: 1,
    scene: {
      timeScale: scene?.metadata?.timeScale ?? 1,
    },
    player: {
      position: vectorToArray(camera.position),
      rotationDegrees: vectorRadiansToDegrees(camera.rotation),
      flyMode,
      zeroGravityMode,
      zeroGravityVelocity: vectorToArray(zeroGravityVelocity),
      thirdPersonMode,
      selectedHotbarIndex,
    },
    lifeSupport: {
      cabinPressureKpa: Number(getCabinPressureKpa().toFixed(1)),
      helmetOxygenLiters: Number(helmetOxygenLiters.toFixed(1)),
    },
    inventory: inventoryItems.map(sanitizeInventoryEntryForSave),
    hotbar: hotbarItems.map(sanitizeInventoryEntryForSave),
    pickups: {
      collectedIds: getCollectedPickupIds(),
    },
    placedItems: getPlacedItemsForSave(),
    helmet: getHelmetStateForSave(),
    tether: {
      attached:
        Boolean(playerTether?.interaction) &&
        playerTether.interaction.type === "helmet-hook",
      activeLength: playerTether
        ? Number(playerTether.activeLength.toFixed(4))
        : null,
      deployedLength: playerTether
        ? Number(playerTether.deployedLength.toFixed(4))
        : null,
      maxLength: playerTether
        ? Number(playerTether.maxLength.toFixed(4))
        : null,
      particles: playerTether
        ? playerTether.particles.map((particle) =>
            vectorToArray(particle.position),
          )
        : null,
    },
  };
}

function getCollectedPickupIds() {
  const ids = new Set();
  for (const interaction of level?.platform?.interactions ?? []) {
    if (interaction.type === "pickup" && interaction.collected) {
      ids.add(interaction.item?.id ?? interaction.rootId);
    }
  }
  return [...ids].filter(Boolean).sort();
}

function getPlacedItemsForSave() {
  const placed = [];
  const roots = getPlacedItemRoots(() => true);
  const rootIndex = new Map(roots.map((root, index) => [root, index]));

  for (const root of roots) {
    const itemForSave = { ...root.metadata.placedItem };
    if (isBatteryItem(itemForSave)) {
      const energy = getBatteryEnergyState(root);
      itemForSave.energyStored = energy.stored;
      itemForSave.maxEnergy = energy.max;
    }
    if (isOxygenGeneratorItem(itemForSave)) {
      const state = initializeOxygenGeneratorState(root);
      if (state) {
        itemForSave.oxygenGenerator = createOxygenGeneratorSaveState(state);
      }
    }
    const placedItem = {
      item: sanitizeItemForSave(itemForSave),
      position: vectorToArray(root.position),
      rotationDegrees: vectorRadiansToDegrees(root.rotation),
    };
    const connectedBatteryIndex = rootIndex.get(getConnectedBatteryRoot(root));
    if (Number.isInteger(connectedBatteryIndex)) {
      placedItem.connectedBatteryIndex = connectedBatteryIndex;
      const wireMeters = getPowerWireConnectionStoredMeters(root);
      if (wireMeters > 0) {
        placedItem.connectedWireMeters = Number(wireMeters.toFixed(2));
      }
    }
    placed.push(placedItem);
  }
  return placed;
}

function getHelmetStateForSave() {
  const hook = getHelmetHookInteraction();
  return {
    equipped: equippedHelmet
      ? {
          item: sanitizeItemForSave(equippedHelmet.item),
          visorOpen: Boolean(equippedHelmet.visorOpen),
        }
      : null,
    mountedItem: hook?.mountedItem
      ? sanitizeItemForSave(hook.mountedItem)
      : null,
  };
}

function sanitizeInventoryEntryForSave(entry) {
  if (!entry) return null;
  return sanitizeItemForSave(entry);
}

function sanitizeItemForSave(item) {
  if (!item) return null;
  const {
    portrait,
    modelPortraitLoaded,
    modelPortraitLoading,
    modelPortraitFailed,
    visor,
    animationGroups,
    ...clean
  } = item;
  return cloneSave(clean);
}

function applySavedWorldPreload(levelConfig, world) {
  if (!world?.pickups?.collectedIds?.length || !levelConfig?.platform) return;
  levelConfig.platform.collectedPickupIds = world.pickups.collectedIds;
}

async function restoreSavedWorldState(world) {
  if (!world) return;

  restorePlayerState(world.player);
  restoreSceneState(world.scene);
  restoreLifeSupportState(world.lifeSupport);
  restoreInventoryState(world);
  await restoreHelmetState(world.helmet, world.lifeSupport);
  await restorePlacedItems(world.placedItems);
  if (world.tether?.attached) {
    const hook = getHelmetHookInteraction();
    if (hook) {
      attachPlayerTether(hook);
      if (Number.isFinite(world.tether.activeLength)) {
        playerTether.activeLength = Math.min(
          playerTether.maxLength,
          Math.max(0.2, world.tether.activeLength),
        );
        playerTether.segmentLength =
          playerTether.activeLength / TETHER_SEGMENT_COUNT;
      }
      if (Number.isFinite(world.tether.deployedLength)) {
        playerTether.deployedLength = Math.min(
          playerTether.maxLength,
          Math.max(TETHER_INITIAL_DEPLOYED_LENGTH, world.tether.deployedLength),
        );
      } else if (Number.isFinite(world.tether.activeLength)) {
        playerTether.deployedLength = Math.min(
          playerTether.maxLength,
          Math.max(TETHER_INITIAL_DEPLOYED_LENGTH, world.tether.activeLength),
        );
      }
      restoreTetherParticles(world.tether.particles);
    }
  }

  renderHotbars();
  renderInventoryGrid();
  refreshPlacementPreview();
  updateHudButtons();
}

function restoreLifeSupportState(lifeSupport) {
  const savedPressureKpa = Number(lifeSupport?.cabinPressureKpa);
  const savedPressureAtm = Number(lifeSupport?.cabinPressureAtm);
  if (Number.isFinite(savedPressureKpa)) {
    cabinPressureAtm =
      (Math.max(0, Math.min(savedPressureKpa, PRESSURE_STANDARD_KPA)) /
        PRESSURE_STANDARD_KPA) *
      CABIN_PRESSURE_INITIAL_ATM;
  } else {
    cabinPressureAtm = Number.isFinite(savedPressureAtm)
      ? Math.max(0, Math.min(savedPressureAtm, CABIN_PRESSURE_INITIAL_ATM))
      : CABIN_PRESSURE_INITIAL_ATM;
  }

  helmetOxygenLiters = resolveSavedHelmetOxygenLiters(lifeSupport);
  updateLifeSupportHud();
}

function resolveSavedHelmetOxygenLiters(lifeSupport) {
  const savedLiters = Number(lifeSupport?.helmetOxygenLiters);
  if (Number.isFinite(savedLiters)) {
    return clamp(savedLiters, 0, HELMET_OXYGEN_MAX_LITERS);
  }

  const savedSeconds = Number(lifeSupport?.helmetOxygenSeconds);
  if (Number.isFinite(savedSeconds)) {
    return clamp(
      (savedSeconds / HELMET_OXYGEN_SECONDS_TO_EMPTY) *
        HELMET_OXYGEN_MAX_LITERS,
      0,
      HELMET_OXYGEN_MAX_LITERS,
    );
  }

  return HELMET_OXYGEN_MAX_LITERS;
}

function restoreTetherParticles(savedParticles) {
  if (!playerTether || !Array.isArray(savedParticles)) return;
  const particles = playerTether.particles;
  for (
    let index = 0;
    index < particles.length && index < savedParticles.length;
    index += 1
  ) {
    if (!Array.isArray(savedParticles[index])) continue;
    particles[index].position.copyFrom(
      B.Vector3.FromArray(savedParticles[index]),
    );
    particles[index].previous.copyFrom(particles[index].position);
  }
  updatePlayerTether(0);
}

function restoreSceneState(savedScene) {
  if (!savedScene || !scene?.metadata) return;
  const timeScale = Number(savedScene.timeScale);
  if (!Number.isFinite(timeScale)) return;

  scene.metadata.timeScale = timeScale;
  const index = timeSpeeds.indexOf(timeScale);
  if (index !== -1) timeSpeedIndex = index;
}

function restorePlayerState(player) {
  if (!player) return;

  if (Array.isArray(player.position)) {
    camera.position.copyFrom(B.Vector3.FromArray(player.position));
  }
  if (Array.isArray(player.rotationDegrees)) {
    camera.rotation = B.Vector3.FromArray(
      vectorDegreesToRadians(player.rotationDegrees),
    );
    enforceUprightCamera(camera);
  }
  flyMode = Boolean(player.flyMode);
  zeroGravityMode =
    player.zeroGravityMode === undefined
      ? true
      : Boolean(player.zeroGravityMode);
  if (Array.isArray(player.zeroGravityVelocity)) {
    zeroGravityVelocity.copyFrom(
      B.Vector3.FromArray(player.zeroGravityVelocity),
    );
  } else {
    zeroGravityVelocity.copyFromFloats(0, 0, 0);
  }
  thirdPersonMode = false;
  selectedHotbarIndex = Number.isInteger(player.selectedHotbarIndex)
    ? Math.max(0, Math.min(player.selectedHotbarIndex, hotbarItems.length - 1))
    : selectedHotbarIndex;
  if (playerPhysics) {
    playerPhysics.verticalVelocity = 0;
    playerPhysics.grounded = Boolean(level.platform);
    syncPlayerPhysicsToPlatformHeight(level.platform?.physics, {
      snapCamera: playerPhysics.grounded && !flyMode && !zeroGravityMode,
    });
  }
}

function restoreInventoryState(world) {
  restoreItemArray(hotbarItems, world.hotbar);
  restoreItemArray(inventoryItems, world.inventory);
}

function restoreItemArray(target, source) {
  if (!Array.isArray(source)) return;
  for (let index = 0; index < target.length; index += 1) {
    target[index] = source[index] ? cloneSave(source[index]) : null;
    if (target[index]) hydrateInventoryPortrait(target[index], target[index]);
  }
}

async function restoreHelmetState(helmet, lifeSupport) {
  const hook = getHelmetHookInteraction();
  if (hook) {
    hook.initialMountResolved = true;
    hook.initialMountedItem = null;
    hook.mountedRoot?.dispose(false, true);
    hook.mountedRoot = null;
    hook.mountedItem = null;
    if (helmet?.mountedItem) {
      await mountHelmetItemOnHook(hook, cloneSave(helmet.mountedItem));
    }
  }

  if (helmet?.equipped?.item) {
    const equipped = await equipHelmetItem(cloneSave(helmet.equipped.item));
    if (equipped) {
      helmetOxygenLiters = resolveSavedHelmetOxygenLiters(lifeSupport);
      updateLifeSupportHud();
    }
    if (equipped && helmet.equipped.visorOpen) {
      setHelmetVisorOpen(true, true);
      updateHudButtons();
    }
  }
}

async function restorePlacedItems(placedItems) {
  if (!Array.isArray(placedItems)) return;
  const roots = await Promise.all(
    placedItems.map((placed) => restorePlacedItem(placed)),
  );
  restorePlacedPowerConnections(placedItems, roots);
  refreshPowerConnectionWires();
}

async function restorePlacedItem(placed) {
  if (!placed?.item?.modelUrl || !Array.isArray(placed.position)) return;
  try {
    const root = await loadItemModelRoot(placed.item, {
      name: `${placed.item.id ?? "item"}-placed`,
      pickable: true,
    });
    root.position.copyFrom(B.Vector3.FromArray(placed.position));
    if (Array.isArray(placed.rotationDegrees)) {
      root.rotation = B.Vector3.FromArray(
        vectorDegreesToRadians(placed.rotationDegrees),
      );
    }
    installPlacedItemMetadata(root, placed.item);
    refreshFabricatorReflectionProbe(root, placed.item);
    return root;
  } catch (error) {
    console.error("Failed to restore placed item.", error);
    return null;
  }
}

function restorePlacedPowerConnections(placedItems, roots) {
  for (let index = 0; index < placedItems.length; index += 1) {
    const machine = roots[index];
    const batteryIndex = Number(placedItems[index]?.connectedBatteryIndex);
    const battery = Number.isInteger(batteryIndex) ? roots[batteryIndex] : null;
    if (!machine || !battery) continue;
    const savedMeters = Number(placedItems[index]?.connectedWireMeters);
    connectPowerWire(
      battery,
      machine,
      Number.isFinite(savedMeters) && savedMeters > 0
        ? savedMeters
        : getPowerWireConnectionLengthMeters(battery, machine),
    );
  }
}

function queuePowerConnectionWireRefresh() {
  requestAnimationFrame(() => refreshPowerConnectionWires());
}

function refreshPowerConnectionWires() {
  for (const wire of powerConnectionWires) {
    wire.dispose(false, true);
  }
  powerConnectionWires.clear();

  const batteries = getPlacedItemRoots((item) => isBatteryItem(item));
  for (const battery of batteries) {
    initializeBatteryEnergy(battery);
  }

  for (const endpoint of [...getPoweredMachineRoots(), ...getSolarPanelRoots()]) {
    const battery = getConnectedBatteryRoot(endpoint);
    if (!battery) {
      clearPowerWireConnection(endpoint);
      continue;
    }

    const wire = createPowerConnectionWire(endpoint, battery);
    if (wire) powerConnectionWires.add(wire);
  }
}

function getPlacedItemRoots(predicate) {
  const roots = new Set();
  for (const mesh of scene?.meshes ?? []) {
    const root = mesh.metadata?.glbPickupRoot;
    const item = root?.metadata?.placedItem;
    if (isActivePlacedRoot(root) && item && predicate(item)) {
      roots.add(root);
    }
  }
  return [...roots];
}

function isActivePlacedRoot(root) {
  return Boolean(
    root &&
    !root.isDisposed?.() &&
    root.isEnabled?.() !== false &&
    root.metadata?.placedItem,
  );
}

function getPoweredMachineRoots() {
  return getPlacedItemRoots((item) => isPoweredMachineItem(item));
}

function isPoweredMachineItem(item) {
  return isFabricatorItem(item) || isOxygenGeneratorItem(item);
}

function getSolarPanelRoots() {
  return getPlacedItemRoots((item) => isSolarPanelItem(item));
}

function getConnectedBatteryRoot(endpoint) {
  const linked = endpoint?.metadata?.connectedBattery;
  if (
    isActivePlacedRoot(linked) &&
    isBatteryItem(linked.metadata?.placedItem)
  ) {
    return linked;
  }
  return null;
}

function connectPowerWire(battery, endpoint, wireMeters = null) {
  if (!isActivePlacedRoot(battery) || !isActivePlacedRoot(endpoint)) return false;
  if (!isBatteryItem(battery.metadata?.placedItem)) return false;
  if (
    !isPoweredMachineItem(endpoint.metadata?.placedItem) &&
    !isSolarPanelItem(endpoint.metadata?.placedItem)
  ) {
    return false;
  }
  if (battery === endpoint) return false;

  initializeBatteryEnergy(battery);
  const connectionMeters = Number(wireMeters);
  const measuredMeters = getPowerWireConnectionLengthMeters(battery, endpoint);
  endpoint.metadata = {
    ...(endpoint.metadata ?? {}),
    connectedBattery: battery,
    powerWireMeters:
      Number.isFinite(connectionMeters) && connectionMeters > 0
        ? connectionMeters
        : measuredMeters,
  };
  refreshPowerConnectionWires();
  if (activeFabricatorRoot === endpoint) renderFabricatorAnalysis();
  if (activeOxygenGeneratorRoot === endpoint) renderOxygenGeneratorPanel();
  return true;
}

function removePowerConnectionsForRoot(root, options = {}) {
  if (!root) return;
  if (pendingPowerWire?.source === root) {
    cancelPowerWireExtension();
  }
  removePowerConnectionsForNode(root, {
    refund: options.refund !== false,
  });
  refreshPowerConnectionWires();
}

function createPowerConnectionWire(endpoint, battery) {
  const platformRoot = level?.platform?.root;
  if (!platformRoot) return null;

  const endpointPoint = getWireAnchorPoint(
    endpoint,
    getPowerWireAnchorType(endpoint),
  );
  const batteryPoint = getWireAnchorPoint(battery, "battery");
  if (!endpointPoint || !batteryPoint) return null;

  const isSolarConnection = isSolarPanelItem(endpoint.metadata?.placedItem);
  const path = createPowerWirePath(endpointPoint, batteryPoint);
  const wire = B.MeshBuilder.CreateTube(
    isSolarConnection ? "power-connection-blue-wire" : "power-connection-red-wire",
    {
      path,
      radius: FABRICATOR_BATTERY_WIRE_RADIUS,
      tessellation: 8,
      cap: B.Mesh.CAP_ALL,
    },
    scene,
  );
  wire.parent = platformRoot;
  wire.material = getPowerWireMaterial(isSolarConnection ? "solar" : "load");
  wire.isPickable = false;
  wire.checkCollisions = false;
  wire.receiveShadows = true;
  wire.metadata = {
    ...(wire.metadata ?? {}),
    excludeFromBounds: true,
    excludeFromCollision: true,
    powerConnectionWire: true,
  };
  return wire;
}

function createPowerWirePath(start, end) {
  return [start, end];
}

function getPowerWireConnectionLengthMeters(battery, endpoint) {
  const batteryPoint = getWireAnchorPoint(battery, "battery");
  const endpointPoint = getWireAnchorPoint(
    endpoint,
    getPowerWireAnchorType(endpoint),
  );
  if (!batteryPoint || !endpointPoint) return 0;
  const path = createPowerWirePath(endpointPoint, batteryPoint);
  let length = 0;
  for (let index = 1; index < path.length; index += 1) {
    length += B.Vector3.Distance(path[index - 1], path[index]);
  }
  return length * WIRE_METERS_PER_WORLD_UNIT;
}

function getPowerWireConnectionStoredMeters(endpoint) {
  const stored = Number(endpoint?.metadata?.powerWireMeters);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const battery = getConnectedBatteryRoot(endpoint);
  return battery ? getPowerWireConnectionLengthMeters(battery, endpoint) : 0;
}

function clearPowerWireConnection(endpoint) {
  if (!endpoint?.metadata) return 0;
  const meters = getPowerWireConnectionStoredMeters(endpoint);
  delete endpoint.metadata.connectedBattery;
  delete endpoint.metadata.powerWireMeters;
  return meters;
}

function getPowerWireAnchorType(root) {
  const item = root?.metadata?.placedItem;
  if (isFabricatorItem(item)) return "fabricator";
  if (isSolarPanelItem(item)) return "solar-panel";
  if (isBatteryItem(item)) return "battery";
  return "machine";
}

function getWireAnchorPoint(root, type) {
  const bounds = getRootBoundsInPlatform(root);
  if (!bounds) return root.position.clone();

  const center = bounds.min.add(bounds.max).scale(0.5);
  if (type === "fabricator") {
    return new B.Vector3(center.x, bounds.min.y + 0.06, center.z);
  }
  if (type === "machine") {
    return new B.Vector3(center.x, bounds.min.y + 0.08, center.z);
  }
  if (type === "solar-panel") {
    return center;
  }
  return new B.Vector3(center.x, center.y, center.z);
}

function getPowerWireMaterial(kind = "load") {
  const solar = kind === "solar";
  const materialName = solar
    ? "solar-panel-battery-blue-wire-material"
    : "fabricator-battery-red-wire-material";
  const existing = scene.getMaterialByName?.(materialName);
  if (existing) return existing;

  const material = new B.PBRMaterial(materialName, scene);
  material.albedoColor = solar
    ? new B.Color3(0.06, 0.38, 0.88)
    : new B.Color3(0.62, 0.018, 0.012);
  material.metallic = 0;
  material.roughness = 0.58;
  material.microSurface = 0.42;
  material.reflectivityColor = solar
    ? new B.Color3(0.015, 0.08, 0.18)
    : new B.Color3(0.055, 0.018, 0.014);
  material.emissiveColor = solar
    ? new B.Color3(0.012, 0.045, 0.12)
    : new B.Color3(0.012, 0, 0);
  material.backFaceCulling = false;
  return material;
}

function getPowerWirePreviewMaterial(kind = "load") {
  const solar = kind === "solar";
  const materialName = solar
    ? "solar-power-wire-preview-hologram-material"
    : "power-wire-preview-hologram-material";
  const existing = scene.getMaterialByName?.(materialName);
  if (existing) return existing;

  const material = new B.PBRMaterial(materialName, scene);
  material.albedoColor = solar
    ? new B.Color3(0.12, 0.52, 1)
    : new B.Color3(0.95, 0.04, 0.02);
  material.emissiveColor = solar
    ? new B.Color3(0.04, 0.22, 0.58)
    : new B.Color3(0.45, 0.02, 0.01);
  material.reflectivityColor = solar
    ? new B.Color3(0.16, 0.55, 1)
    : new B.Color3(1, 0.18, 0.08);
  material.metallic = 0;
  material.roughness = 0.24;
  material.alpha = 0.42;
  material.backFaceCulling = false;
  if ("transparencyMode" in material) {
    material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  }
  if ("alphaMode" in material) {
    material.alphaMode = B.Engine.ALPHA_COMBINE;
  }
  if ("disableDepthWrite" in material) {
    material.disableDepthWrite = true;
  }
  return material;
}

function handlePowerWireKey(interaction) {
  const root = interaction?.root;
  const item = root?.metadata?.placedItem ?? interaction?.item;
  if (pendingPowerWire) {
    if (canCompletePowerWireAtRoot(root)) {
      return completePowerWireExtension(root);
    }
    if (root === pendingPowerWire.source) {
      return cancelPowerWireExtension("Wire canceled");
    }
    updateInteractionPrompt({
      prompt: `Aim at ${getPowerWireTargetLabel()} and press Y`,
      durationMs: 900,
    });
    return false;
  }

  if (
    root &&
    (isBatteryItem(item) || isPoweredMachineItem(item) || isSolarPanelItem(item))
  ) {
    if (hasPowerWireConnection(root)) {
      return detachPowerWireFromNode(root);
    }
    return startPowerWireExtension(root);
  }
  return false;
}

function startPowerWireExtension(source) {
  if (
    !isActivePlacedRoot(source) ||
    !isPowerWireEndpointItem(source.metadata?.placedItem)
  ) {
    return false;
  }
  if (getAvailableWireMeters() <= 0) {
    updateInteractionPrompt({
      prompt: "No wire in inventory",
      durationMs: 900,
    });
    return false;
  }
  cancelPowerWireExtension();
  const sourcePoint = getPowerWireEndpointPoint(source);
  const playerPoint = getPlayerPowerWirePoint();
  if (!sourcePoint || !playerPoint) return false;
  const activeLength = getPowerWirePreviewLength(sourcePoint, playerPoint);
  pendingPowerWire = {
    source,
    sourceType: getPowerWireEndpointType(source.metadata?.placedItem),
    previewMesh: null,
    particles: createTetherParticles(sourcePoint, playerPoint, activeLength),
    maxLength: activeLength,
    activeLength,
    segmentLength: activeLength / TETHER_SEGMENT_COUNT,
  };
  updatePowerWirePreview(0);
  updateInteractionPrompt({
    prompt: `Wire started - aim at ${getPowerWireTargetLabel()} and press Y`,
    durationMs: 900,
  });
  return true;
}

function completePowerWireExtension(target) {
  const source = pendingPowerWire?.source;
  if (!source) return false;
  if (
    !isActivePlacedRoot(source) ||
    !isPowerWireEndpointItem(source.metadata?.placedItem)
  ) {
    cancelPowerWireExtension("Wire source unavailable");
    return false;
  }
  if (!canCompletePowerWireAtRoot(target)) {
    updateInteractionPrompt({
      prompt: `Target needs ${getPowerWireTargetLabel()}`,
      durationMs: 900,
    });
    return false;
  }
  const battery = pendingPowerWire.sourceType === "battery" ? source : target;
  const endpoint = pendingPowerWire.sourceType === "battery" ? target : source;
  const wireLength = getPowerWireConnectionLengthMeters(battery, endpoint);
  if (getAvailableWireMeters() + 0.0001 < wireLength) {
    updateInteractionPrompt({
      prompt: `Need ${formatWireMeters(wireLength)} wire`,
      durationMs: 1100,
    });
    return false;
  }
  if (connectPowerWire(battery, endpoint, wireLength)) {
    consumeWireMeters(wireLength);
    const endpointName = endpoint.metadata?.placedItem?.name ?? "machine";
    cancelPowerWireExtension();
    updateInteractionPrompt({
      prompt: `Wire connected to ${endpointName} - ${formatWireMeters(
        wireLength,
      )}`,
      durationMs: 1200,
    });
    return true;
  }
  updateInteractionPrompt({
    prompt: "Could not connect wire",
    durationMs: 900,
  });
  return false;
}

function cancelPowerWireExtension(prompt) {
  pendingPowerWire?.previewMesh?.dispose(false, true);
  pendingPowerWire = null;
  if (prompt) {
    updateInteractionPrompt({
      prompt,
      durationMs: 900,
    });
  }
  return true;
}

function detachPowerWireFromNode(root) {
  if (!root) return false;
  const result = removePowerConnectionsForNode(root, {
    refund: true,
    requireRefundSpace: true,
  });
  if (result.count <= 0) {
    updateInteractionPrompt({
      prompt: result.inventoryFull
        ? `Need room for ${formatWireMeters(result.meters)} wire`
        : "No wire connected",
      durationMs: 900,
    });
    return false;
  }

  refreshPowerConnectionWires();
  if (activeFabricatorRoot) renderFabricatorAnalysis();
  if (activeOxygenGeneratorRoot) renderOxygenGeneratorPanel();
  const refundText =
    result.refundedMeters > 0
      ? ` · +${formatWireMeters(result.refundedMeters)} wire`
      : "";
  updateInteractionPrompt({
    prompt:
      (result.count === 1
        ? "Wire disconnected"
        : `${result.count} wires disconnected`) + refundText,
    durationMs: 1200,
  });
  return true;
}

function removePowerConnectionsForNode(root, options = {}) {
  const refund = options.refund !== false;
  const endpoints = new Set();
  if (
    (isPoweredMachineItem(root?.metadata?.placedItem) ||
      isSolarPanelItem(root?.metadata?.placedItem)) &&
    getConnectedBatteryRoot(root)
  ) {
    endpoints.add(root);
  }
  if (isBatteryItem(root?.metadata?.placedItem)) {
    for (const endpoint of [...getPoweredMachineRoots(), ...getSolarPanelRoots()]) {
      if (endpoint.metadata?.connectedBattery === root) {
        endpoints.add(endpoint);
      }
    }
  }
  const meters = [...endpoints].reduce(
    (total, endpoint) => total + getPowerWireConnectionStoredMeters(endpoint),
    0,
  );
  if (refund && options.requireRefundSpace && !canAddWireMeters(meters)) {
    return {
      count: 0,
      meters,
      refundedMeters: 0,
      leftoverMeters: meters,
      inventoryFull: true,
    };
  }
  for (const endpoint of endpoints) {
    clearPowerWireConnection(endpoint);
  }
  const leftoverMeters = refund ? addWireMeters(meters) : meters;
  return {
    count: endpoints.size,
    meters,
    refundedMeters: Math.max(0, meters - leftoverMeters),
    leftoverMeters,
  };
}

function hasPowerWireConnection(root) {
  return getPowerWireConnectionCount(root) > 0;
}

function getPowerWireConnectionCount(root) {
  if (!root) return 0;
  let count = 0;
  if (
    (isPoweredMachineItem(root.metadata?.placedItem) ||
      isSolarPanelItem(root.metadata?.placedItem)) &&
    getConnectedBatteryRoot(root)
  ) {
    count += 1;
  }
  if (isBatteryItem(root.metadata?.placedItem)) {
    for (const endpoint of [...getPoweredMachineRoots(), ...getSolarPanelRoots()]) {
      if (endpoint.metadata?.connectedBattery === root) count += 1;
    }
  }
  return count;
}

function updatePowerWirePreview(seconds = 0) {
  if (!pendingPowerWire) return;
  const source = pendingPowerWire.source;
  if (
    !isActivePlacedRoot(source) ||
    !isPowerWireEndpointItem(source.metadata?.placedItem)
  ) {
    cancelPowerWireExtension();
    return;
  }

  simulatePowerWirePreview(getTetherStepSeconds(seconds));
  const path = getPowerWirePreviewPath();
  if (path.length < 2) return;

  if (pendingPowerWire.previewMesh) {
    B.MeshBuilder.CreateTube(
      "power-wire-preview",
      {
        path,
        radius: POWER_WIRE_PREVIEW_RADIUS,
        tessellation: 6,
        cap: B.Mesh.CAP_ALL,
        instance: pendingPowerWire.previewMesh,
      },
      scene,
    );
    return;
  }

  const preview = B.MeshBuilder.CreateTube(
    "power-wire-preview",
    {
      path,
      radius: POWER_WIRE_PREVIEW_RADIUS,
      tessellation: 6,
      cap: B.Mesh.CAP_ALL,
      updatable: true,
    },
    scene,
  );
  preview.parent = level?.platform?.root ?? null;
  preview.material = getPowerWirePreviewMaterial(
    pendingPowerWire.sourceType === "solar" ? "solar" : "load",
  );
  preview.isPickable = false;
  preview.checkCollisions = false;
  preview.receiveShadows = false;
  preview.alwaysSelectAsActiveMesh = true;
  preview.renderingGroupId = 1;
  preview.metadata = {
    ...(preview.metadata ?? {}),
    excludeFromBounds: true,
    excludeFromCollision: true,
    powerWirePreview: true,
  };
  pendingPowerWire.previewMesh = preview;
}

function simulatePowerWirePreview(seconds = 0) {
  const wire = pendingPowerWire;
  if (!wire?.particles?.length) return;

  const sourcePoint = getPowerWireEndpointPoint(wire.source);
  const playerPoint = getPlayerPowerWirePoint();
  if (!sourcePoint || !playerPoint) return;

  const particles = wire.particles;
  const lastIndex = particles.length - 1;
  wire.maxLength = Math.max(
    wire.maxLength ?? 0,
    B.Vector3.Distance(sourcePoint, playerPoint) + TETHER_SLACK_RESERVE,
  );
  wire.activeLength = getPowerWirePreviewLength(sourcePoint, playerPoint);
  wire.segmentLength = wire.activeLength / TETHER_SEGMENT_COUNT;

  particles[0].position.copyFrom(sourcePoint);
  particles[0].previous.copyFrom(sourcePoint);
  particles[lastIndex].position.copyFrom(playerPoint);

  const platform = level.platform?.physics;
  const playerPosition = getPlayerPlatformPosition();
  const constrainParticlesToPlatform = isPositionInsidePlatformPhysicsVolume(
    playerPosition,
    platform,
  );
  const acceleration = TETHER_GRAVITY.scale(seconds * seconds);
  for (let index = 1; index < lastIndex; index += 1) {
    const particle = particles[index];
    const velocity = particle.position
      .subtract(particle.previous)
      .scale(TETHER_DAMPING);
    particle.previous.copyFrom(particle.position);
    particle.position.addInPlace(velocity).addInPlace(acceleration);
    if (constrainParticlesToPlatform) {
      constrainTetherParticleToPlatform(particle.position, platform);
    }
  }

  for (
    let iteration = 0;
    iteration < TETHER_SOLVER_ITERATIONS;
    iteration += 1
  ) {
    particles[0].position.copyFrom(sourcePoint);
    particles[lastIndex].position.copyFrom(playerPoint);
    for (let index = 0; index < lastIndex; index += 1) {
      solveTetherSegment(
        particles[index],
        particles[index + 1],
        getTetherParticleInvMass(index, lastIndex),
        getTetherParticleInvMass(index + 1, lastIndex),
        wire.segmentLength,
      );
    }
    for (let index = 1; index < lastIndex; index += 1) {
      if (constrainParticlesToPlatform) {
        constrainTetherParticleToPlatform(particles[index].position, platform);
      }
    }
  }

  particles[0].position.copyFrom(sourcePoint);
  particles[0].previous.copyFrom(sourcePoint);
  particles[lastIndex].position.copyFrom(playerPoint);
  particles[lastIndex].previous.copyFrom(playerPoint);
}

function getPowerWirePreviewPath() {
  return (
    pendingPowerWire?.particles?.map((particle) => particle.position.clone()) ?? []
  );
}

function getPowerWirePreviewLength(start, end) {
  return B.Vector3.Distance(start, end) + TETHER_SLACK_RESERVE;
}

function canCompletePowerWireAtRoot(root) {
  if (!pendingPowerWire || !root || root === pendingPowerWire.source) return false;
  const item = root.metadata?.placedItem;
  if (
    pendingPowerWire.sourceType === "battery" &&
    (isPoweredMachineItem(item) || isSolarPanelItem(item)) &&
    getConnectedBatteryRoot(root)
  ) {
    return false;
  }
  return pendingPowerWire.sourceType === "battery"
    ? isPoweredMachineItem(item) || isSolarPanelItem(item)
    : isBatteryItem(item);
}

function getPowerWireTargetLabel() {
  return pendingPowerWire?.sourceType === "battery"
    ? "a machine or solar panel"
    : "a battery";
}

function isPowerWireEndpointItem(item) {
  return isBatteryItem(item) || isPoweredMachineItem(item) || isSolarPanelItem(item);
}

function getPowerWireEndpointType(item) {
  if (isBatteryItem(item)) return "battery";
  if (isSolarPanelItem(item)) return "solar";
  return "machine";
}

function getPowerWireEndpointPoint(root) {
  return getWireAnchorPoint(root, getPowerWireAnchorType(root));
}

function getPlayerPowerWirePoint() {
  const playerPosition = getPlayerPlatformPosition();
  return playerPosition ? playerPosition.add(TETHER_ATTACH_OFFSET) : null;
}

function getHelmetHookInteraction() {
  return (level?.platform?.interactions ?? []).find(
    (interaction) => interaction.type === "helmet-hook",
  );
}

async function saveCurrentFileThroughDevServer(json) {
  const path = currentSaveFile?.path;
  if (!path || path.startsWith("blob:") || path.startsWith("data:")) {
    return false;
  }

  try {
    const response = await fetch("./api/save-current", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, json }),
    });
    if ([404, 405, 501].includes(response.status)) return false;
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Save failed: ${response.status}`);
    }
    return true;
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}

function getCurrentSaveFilename() {
  const path = currentSaveFile?.path ?? "spaceraft-save.json";
  const name = path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
  return name.endsWith(".json") ? name : `${name}.json`;
}

function downloadTextFile(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function cloneSave(save) {
  return JSON.parse(JSON.stringify(save));
}

function vectorRadiansToDegrees(vector) {
  return [
    radiansToDegrees(vector.x),
    radiansToDegrees(vector.y),
    radiansToDegrees(vector.z),
  ].map((value) => Number(value.toFixed(3)));
}

function radiansToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function vectorDegreesToRadians(degrees) {
  return degrees.map((degree) => (degree * Math.PI) / 180);
}

function vectorToArray(vector) {
  return [vector.x, vector.y, vector.z].map((value) =>
    Number(value.toFixed(4)),
  );
}

function installPlayerLoop() {
  scene.onBeforeRenderObservable.add(() => {
    scene.metadata.profiler.measure("Player", () => {
      const seconds = Math.min(engine.getDeltaTime() / 1000, 0.05);
      if (playerDead) {
        updateLifeSupportHud();
        return;
      }
      const platformPhysics = level.platform?.physics;
      const zeroGravityMovement = Boolean(
        platformPhysics && zeroGravityMode && !flyMode,
      );
      const groundedMovement = Boolean(
        platformPhysics && !flyMode && !zeroGravityMovement,
      );
      const crouching = groundedMovement && isShiftHeld();
      const move = B.Vector3.Zero();
      syncPlayerPhysicsToPlatformHeight(platformPhysics, {
        preserveCameraOffset: zeroGravityMovement || flyMode,
        snapCamera: groundedMovement && playerPhysics.grounded,
      });
      syncPlayerPlaceholderToPhysics(platformPhysics);
      syncPlayerLookFromThirdPersonCamera();
      enforceUprightCamera(camera);
      syncPlayerPlaceholderPose();
      const forward = camera.getDirection(B.Axis.Z);
      const right = camera.getDirection(B.Axis.X);

      if (!mountedHooksInitialized) {
        mountedHooksInitialized = true;
        initializeMountedHooks();
      }
      asteroidPhysicsActivationElapsed += seconds;
      if (
        asteroidPhysicsActivationElapsed >= ASTEROID_PHYSICS_ACTIVATION_SECONDS
      ) {
        asteroidPhysicsActivationElapsed = 0;
        activateNearbyDebrisAsteroidBodies();
      }
      interactionUpdateElapsed += seconds;
      if (interactionUpdateElapsed >= INTERACTION_UPDATE_SECONDS) {
        interactionUpdateElapsed = 0;
        updateActiveInteraction();
      }
      if (camera.parent) {
        const inverseParent = camera.parent.getWorldMatrix().clone().invert();
        B.Vector3.TransformNormalToRef(forward, inverseParent, forward);
        B.Vector3.TransformNormalToRef(right, inverseParent, right);
      }
      if (groundedMovement) {
        updateCrouch(platformPhysics, seconds, crouching);
        forward.y = 0;
        right.y = 0;
        if (forward.lengthSquared() > 0) forward.normalize();
        if (right.lengthSquared() > 0) right.normalize();
      }

      if (keys.has("KeyW")) move.addInPlace(forward);
      if (keys.has("KeyS")) move.subtractInPlace(forward);
      if (keys.has("KeyD")) move.addInPlace(right);
      if (keys.has("KeyA")) move.subtractInPlace(right);
      if (!platformPhysics) {
        if (keys.has("Space")) move.y += 1;
        if (isShiftHeld()) move.y -= 1;
      } else if (flyMode || zeroGravityMovement) {
        if (keys.has("Space")) move.y += 1;
        if (isShiftHeld()) move.y -= 1;
      }
      updateHatchDecompression(seconds);
      updateOpenCabinPressureLeak();
      oxygenGeneratorUpdateElapsed += seconds;
      if (oxygenGeneratorUpdateElapsed >= OXYGEN_GENERATOR_UPDATE_SECONDS) {
        updateSolarPanels(oxygenGeneratorUpdateElapsed);
        updateOxygenGenerators(oxygenGeneratorUpdateElapsed);
        oxygenGeneratorUpdateElapsed = 0;
      }
      updateLifeSupport(seconds);
      scene.metadata.profiler.measure("Fabricator", () => {
        updateFabricatorDisassembly(seconds);
        updateFabricatorCraft(seconds);
      });

      if (zeroGravityMovement) {
        updateZeroGravityThrusters(move, platformPhysics, seconds);
      } else if (move.lengthSquared() > 0) {
        stopZeroGravityThrusterEffect();
        const baseSpeed = isControlHeld()
          ? brownDwarfLevel.player.boostSpeed
          : brownDwarfLevel.player.speed;
        const speed = crouching ? baseSpeed * CROUCH_SPEED_SCALE : baseSpeed;
        if (groundedMovement) {
          movePlayerHorizontally(
            move.normalize().scale(speed * seconds),
            platformPhysics,
          );
        } else {
          movePlayerFreely(
            move.normalize().scale(speed * seconds),
            platformPhysics,
          );
        }
      } else {
        stopZeroGravityThrusterEffect();
      }
      if (groundedMovement) {
        updatePlatformGravity(platformPhysics, seconds);
      }
      resolveDebrisFieldPlayerCollisions(seconds);
      updateAsteroidPhysics(seconds, platformPhysics);
      updatePlayerTether(seconds);
      updatePowerWirePreview(seconds);
      if (thirdPersonMode) {
        updateThirdPersonCamera();
      }
      placementUpdateElapsed += seconds;
      if (placementUpdateElapsed >= PLACEMENT_UPDATE_SECONDS) {
        placementUpdateElapsed = 0;
        updatePlacementPreview();
      }

      level.starfield.position.copyFrom(camera.globalPosition);
      scene.metadata.profiler.setGpuWeight("Starfield", 1.8);
      scene.metadata.profiler.setGpuWeight(
        "Platform",
        level.platform ? 0.8 : 0,
      );
    });
  });
}

function updateActiveInteraction() {
  const interactions = level.platform?.interactions ?? [];
  if (isUiModalOpen()) {
    updateInteractionPrompt(null);
    return;
  }
  if (heldAsteroid) {
    const fabricatorInteraction = createFabricatorInteractionFromLook();
    if (fabricatorInteraction) {
      updateInteractionPrompt(fabricatorInteraction);
      return;
    }
    updateInteractionPrompt({
      prompt: createAsteroidPrompt(
        heldAsteroid.mesh?.metadata?.asteroidComposition,
        "Asteroid held · Press E to drop",
      ),
    });
    return;
  }

  const maxRange = interactions.reduce(
    (range, interaction) => Math.max(range, interaction.range ?? 1.8),
    Math.max(GLB_PICKUP_PROMPT_RANGE, ASTEROID_PICKUP_RANGE),
  );
  const ray = createCameraLookRay(maxRange);
  const hit = scene.pickWithRay(ray, (mesh) =>
    Boolean(mesh.metadata?.interaction ?? mesh.metadata?.glbPickupLabel),
  );
  const interaction =
    hit?.pickedMesh?.metadata?.interaction ??
    createGlbPickupPrompt(hit?.pickedMesh);

  if (!hit?.hit || !interaction || hit.distance > (interaction.range ?? 1.8)) {
    updateInteractionPrompt(createAsteroidPickupInteraction());
    return;
  }

  updateInteractionPrompt(interaction);
}

function createFabricatorInteractionFromLook() {
  const ray = createCameraLookRay(GLB_PICKUP_PROMPT_RANGE);
  const hit = scene.pickWithRay(ray, (mesh) =>
    Boolean(mesh.metadata?.interaction ?? mesh.metadata?.glbPickupLabel),
  );
  const interaction =
    hit?.pickedMesh?.metadata?.interaction ??
    createGlbPickupPrompt(hit?.pickedMesh);
  if (
    !hit?.hit ||
    interaction?.type !== "fabricator" ||
    hit.distance > (interaction.range ?? GLB_PICKUP_PROMPT_RANGE)
  ) {
    return null;
  }
  return interaction;
}

function createGlbPickupPrompt(mesh) {
  const label = mesh?.metadata?.glbPickupLabel;
  if (!label) return null;
  const item = mesh.metadata.glbPickupItem ?? {
    id: label,
    name: label,
  };
  if (isFabricatorItem(item)) {
    const root = mesh.metadata?.glbPickupRoot ?? mesh;
    const mounted = root?.metadata?.fabricatorMountedAsteroid;
    const disassembly = root?.metadata?.fabricatorDisassembly;
    const crafting = root?.metadata?.fabricatorCrafting;
    const busyText = disassembly
      ? `Disassembling ${Math.ceil(disassembly.remaining ?? 0)}s`
      : crafting
        ? `Fabricating ${crafting.recipe?.name ?? "item"} ${Math.ceil(
            crafting.remaining ?? 0,
          )}s`
        : "";
    const yieldText = formatAsteroidComposition(mounted?.composition);
    const occupiedText = mounted && yieldText ? ` · Yield ${yieldText}` : "";
    const battery = getFabricatorBatteryRoot(root);
    const energy = getBatteryEnergyState(battery);
    const energyText = battery
      ? ` · Energy ${energy.stored}/${energy.max}`
      : " · No battery";
    const wireText = getPowerWirePromptText(root, "Fabricator");
    const heldPrompt = createHeldAsteroidFabricatorPrompt(root, label);
    return {
      type: "fabricator",
      range: mesh.metadata.glbPickupRange ?? GLB_PICKUP_PROMPT_RANGE,
      root,
      item,
      activate: () => deactivateGlbPickupMesh(root),
      acceptsHeldAsteroid:
        !busyText &&
        Boolean(heldAsteroid) &&
        canPlaceHeldAsteroidOnFabricator(root).ok,
      prompt: busyText
        ? `${label} busy · ${busyText}`
        : heldAsteroid
        ? heldPrompt
        : `Press E to pick up ${label} · F use · ${wireText}${occupiedText}${energyText}`,
    };
  }

  if (isOxygenGeneratorItem(item)) {
    const root = mesh.metadata?.glbPickupRoot ?? mesh;
    const state = initializeOxygenGeneratorState(root) ?? {};
    const battery = getOxygenGeneratorBatteryRoot(root);
    const energy = getBatteryEnergyState(battery);
    const energyText = battery
      ? ` · Energy ${energy.stored}/${energy.max}`
      : " · No battery";
    const wireText = getPowerWirePromptText(root, "oxygen generator");
    return {
      type: "oxygen-generator",
      range: mesh.metadata.glbPickupRange ?? GLB_PICKUP_PROMPT_RANGE,
      root,
      item: createOxygenGeneratorPickupItem(root, item),
      prompt:
        `Press E to pick up ${label} · F use · G load ice · ${wireText}` +
        ` · Water ${formatTankValue(state.waterLiters ?? 0)} L` +
        ` · H2 ${formatTankValue(state.hydrogenLiters ?? 0)} L` +
        energyText,
      activate: () => deactivateGlbPickupMesh(root),
    };
  }

  if (isBatteryItem(item)) {
    const root = mesh.metadata?.glbPickupRoot ?? mesh;
    const energy = getBatteryEnergyState(root);
    const batteryItem = {
      ...item,
      energyStored: energy.stored,
      maxEnergy: energy.max,
    };
    return {
      type: "battery",
      range: mesh.metadata.glbPickupRange ?? GLB_PICKUP_PROMPT_RANGE,
      root,
      item: batteryItem,
      prompt: `Press E to pick up ${label} · F inspect energy ${energy.stored}/${energy.max} · ${getPowerWirePromptText(root, label)}`,
      activate: () => deactivateGlbPickupMesh(root),
    };
  }

  if (isSolarPanelItem(item)) {
    const root = mesh.metadata?.glbPickupRoot ?? mesh;
    const battery = getConnectedBatteryRoot(root);
    const exposure = getSolarPanelLightExposure(root);
    root.metadata = {
      ...(root.metadata ?? {}),
      solarPanelExposure: exposure,
    };
    const rate = Math.max(
      0,
      Number(item.solarEnergyPerSecond ?? SOLAR_PANEL_ENERGY_PER_SECOND) ||
        SOLAR_PANEL_ENERGY_PER_SECOND,
    );
    const output = rate * exposure;
    const batteryText = battery ? "Battery linked" : "No battery";
    return {
      type: "solar-panel",
      range: mesh.metadata.glbPickupRange ?? GLB_PICKUP_PROMPT_RANGE,
      root,
      item,
      prompt: `Press E to pick up ${label} · ${getPowerWirePromptText(
        root,
        label,
      )} · ${batteryText} · Light ${Math.round(exposure * 100)}% · +${output.toFixed(2)}/s`,
      activate: () => deactivateGlbPickupMesh(root),
    };
  }

  return {
    type: "pickup",
    range: mesh.metadata.glbPickupRange ?? GLB_PICKUP_PROMPT_RANGE,
    item,
    prompt: isHelmetItem(item)
      ? `Press E to pick up ${label} · Q equip`
      : `Press E to pick up ${label}`,
    activate: () => deactivateGlbPickupMesh(mesh),
  };
}

function getPowerWirePromptText(root, label = "machine") {
  const item = root?.metadata?.placedItem;
  if (pendingPowerWire) {
    if (root === pendingPowerWire.source) return "Y cancel wire";
    if (canCompletePowerWireAtRoot(root)) return `Y connect wire to ${label}`;
    return "Y wire active";
  }
  const connectionCount = getPowerWireConnectionCount(root);
  if (connectionCount > 0) {
    return connectionCount === 1 ? "Y remove wire" : `Y remove ${connectionCount} wires`;
  }
  if (isBatteryItem(item)) return "Y start wire";
  if (isPoweredMachineItem(item)) return "Y start wire";
  if (isSolarPanelItem(item)) return "Y start wire";
  return "Y wire";
}

function showBatteryEnergy(interaction) {
  if (!batteryModal) return false;
  const energy = getBatteryEnergyState(interaction?.root);
  const fill = energy.max > 0 ? (energy.stored / energy.max) * 100 : 0;
  closePlayerModals();
  if (batteryEnergyValue) {
    batteryEnergyValue.textContent = `${energy.stored}/${energy.max}`;
  }
  if (batteryEnergyFill) {
    batteryEnergyFill.style.width = `${clamp(fill, 0, 100).toFixed(1)}%`;
  }
  batteryModal.hidden = false;
  document.body.classList.add("ui-modal-open");
  exitPointerLock();
  updateInteractionPrompt(null);
  return true;
}

function collectFabricatorInteraction(interaction) {
  const root = interaction?.root;
  if (!root) return false;
  if (root.metadata?.fabricatorMountedAsteroid?.mesh) {
    updateInteractionPrompt({ prompt: "Unload asteroid before pickup" });
    return false;
  }
  if (root.metadata?.fabricatorDisassembly || root.metadata?.fabricatorCrafting) {
    updateInteractionPrompt({ prompt: "Fabricator is busy" });
    return false;
  }
  return collectPickupInteraction({
    type: "pickup",
    item: interaction.item,
    activate: interaction.activate,
  });
}

function collectOxygenGeneratorInteraction(interaction) {
  const root = interaction?.root;
  if (!root) return false;
  return collectPickupInteraction({
    type: "pickup",
    item: createOxygenGeneratorPickupItem(root, interaction.item),
    activate: interaction.activate,
  });
}

function createOxygenGeneratorPickupItem(root, item = {}) {
  const state = initializeOxygenGeneratorState(root);
  return {
    ...item,
    placementSurface: "floor",
    stackLimit: 1,
    oxygenGenerator: state ? createOxygenGeneratorSaveState(state) : undefined,
  };
}

function createHeldAsteroidFabricatorPrompt(root, label) {
  const placement = canPlaceHeldAsteroidOnFabricator(root);
  if (!placement.ok) {
    return `${placement.prompt} · Press F to use ${label}`;
  }
  return createAsteroidPrompt(
    heldAsteroid.mesh?.metadata?.asteroidComposition,
    `Press E to load ${label} · Press F to use`,
  );
}

function canPlaceHeldAsteroidOnFabricator(root) {
  if (!heldAsteroid?.mesh) {
    return { ok: false, prompt: "No asteroid held" };
  }
  if (!root) {
    return { ok: false, prompt: "No fabricator target" };
  }
  if (root.metadata?.fabricatorMountedAsteroid?.mesh) {
    return { ok: false, prompt: "Fabricator occupied" };
  }

  const radius = getHeldAsteroidRadius();
  if (radius > FABRICATOR_ASTEROID_MAX_RADIUS) {
    return { ok: false, prompt: "Asteroid too large for fabricator" };
  }
  return { ok: true, radius };
}

function getHeldAsteroidRadius() {
  const radius = Number(heldAsteroid?.radius);
  if (Number.isFinite(radius) && radius > 0) return radius;
  return (
    heldAsteroid?.mesh?.getBoundingInfo?.().boundingSphere.radiusWorld ?? 0
  );
}

function placeHeldAsteroidOnFabricator(interaction) {
  const root = interaction?.root;
  const placement = canPlaceHeldAsteroidOnFabricator(root);
  if (!placement.ok) {
    updateInteractionPrompt({ prompt: placement.prompt });
    return false;
  }

  const mesh = heldAsteroid.mesh;
  const composition = cloneSave(mesh.metadata?.asteroidComposition ?? {});
  mesh.computeWorldMatrix(true);
  if (level?.platform?.root) {
    mesh.setParent(level.platform.root);
  } else {
    mesh.parent = null;
  }
  positionAsteroidOnFabricator(mesh, root, placement.radius);
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    excludeFromBounds: false,
    excludeFromCollision: true,
    fabricatorMountedAsteroid: true,
    heldAsteroid: false,
  };
  delete mesh.metadata.interaction;

  root.metadata = {
    ...(root.metadata ?? {}),
    fabricatorMountedAsteroid: {
      mesh,
      composition,
      radius: placement.radius,
    },
  };
  heldAsteroid = null;
  renderFabricatorAnalysis();
  updateInteractionPrompt({
    prompt: createAsteroidPrompt(composition, "Asteroid loaded"),
  });
  return true;
}

function positionAsteroidOnFabricator(mesh, root, radius) {
  const platformRoot = level?.platform?.root;
  const bounds = root ? getRootBoundsInPlatform(root) : null;
  if (bounds && platformRoot) {
    const center = bounds.min.add(bounds.max).scale(0.5);
    const forward = getFabricatorAsteroidForwardDirection(bounds);
    const right = getFabricatorAsteroidRightDirection(forward);
    const target = new B.Vector3(center.x, 0, center.z)
      .addInPlace(forward.scale(FABRICATOR_ASTEROID_FORWARD_OFFSET))
      .addInPlace(right.scale(FABRICATOR_ASTEROID_RIGHT_OFFSET));
    target.y = mesh.position.y;
    mesh.position.copyFrom(target);
    settleAsteroidMeshOnFabricatorSurface(
      mesh,
      bounds.min.y + FABRICATOR_ASTEROID_BOTTOM_CLEARANCE,
    );
    return;
  }

  mesh.setParent(root ?? platformRoot ?? null);
  mesh.position.set(FABRICATOR_ASTEROID_RIGHT_OFFSET, radius, 0.075);
  settleAsteroidMeshOnFabricatorSurface(
    mesh,
    FABRICATOR_ASTEROID_BOTTOM_CLEARANCE,
  );
}

function settleAsteroidMeshOnFabricatorSurface(mesh, surfaceY) {
  const platformRoot = level?.platform?.root;
  if (!mesh || !platformRoot) return;

  mesh.computeWorldMatrix(true);
  platformRoot.computeWorldMatrix?.(true);
  const bounds = getMeshesBoundsInMatrix(
    [mesh],
    platformRoot.getWorldMatrix().clone().invert(),
  );
  if (!bounds) return;
  mesh.position.y += surfaceY - bounds.min.y;
  mesh.computeWorldMatrix(true);
}

function getFabricatorAsteroidForwardDirection(bounds) {
  const platform = level?.platform?.physics;
  if (!platform || !bounds) return B.Vector3.Zero();

  const center = bounds.min.add(bounds.max).scale(0.5);
  const minX = platform.minX ?? -platform.width * 0.5;
  const maxX = platform.maxX ?? platform.width * 0.5;
  const minZ = platform.minZ ?? -platform.depth * 0.5;
  const maxZ = platform.maxZ ?? platform.depth * 0.5;
  const nearestWalls = [
    { distance: Math.abs(center.x - minX), direction: new B.Vector3(1, 0, 0) },
    { distance: Math.abs(maxX - center.x), direction: new B.Vector3(-1, 0, 0) },
    { distance: Math.abs(center.z - minZ), direction: new B.Vector3(0, 0, 1) },
    { distance: Math.abs(maxZ - center.z), direction: new B.Vector3(0, 0, -1) },
  ];
  nearestWalls.sort((a, b) => a.distance - b.distance);
  return nearestWalls[0]?.direction ?? B.Vector3.Zero();
}

function getFabricatorAsteroidRightDirection(forward) {
  const direction = forward?.clone?.() ?? B.Vector3.Zero();
  if (direction.lengthSquared?.() > 0.000001) {
    direction.normalize();
    return new B.Vector3(direction.z, 0, -direction.x);
  }
  return new B.Vector3(1, 0, 0);
}

function deactivateGlbPickupMesh(mesh) {
  const root = mesh?.metadata?.glbPickupRoot ?? mesh;
  removePowerConnectionsForRoot(root);
  unregisterPlacedItemCollisionMeshes(root);
  const meshes = root?.getChildMeshes?.() ?? [mesh].filter(Boolean);
  for (const child of meshes) {
    child.isPickable = false;
    child.checkCollisions = false;
    child.showBoundingBox = false;
    if (child.metadata) {
      delete child.metadata.interaction;
      delete child.metadata.glbPickupLabel;
      delete child.metadata.glbPickupRange;
      delete child.metadata.glbPickupRoot;
      delete child.metadata.glbPickupItem;
    }
  }
  root?.setEnabled?.(false);
  root?.dispose?.(false, false);
  refreshPowerConnectionWires();
}

function createCameraLookRay(distance) {
  camera.computeWorldMatrix(true);
  const origin = camera.globalPosition.clone();
  const direction = camera.getDirection(B.Axis.Z);
  if (direction.lengthSquared() < 0.0001) {
    direction.copyFrom(B.Axis.Z);
  }
  direction.normalize();
  return new B.Ray(origin, direction, distance);
}

function createAsteroidPickupInteraction() {
  const debrisRocks = level?.debrisField?.rocks;
  if (!debrisRocks?.findAsteroidAlongRay) return null;

  const ray = createCameraLookRay(ASTEROID_PICKUP_RANGE);
  const candidate = debrisRocks.findAsteroidAlongRay(
    ray,
    ASTEROID_PICKUP_RANGE,
  );
  if (!candidate) return null;

  return {
    type: "asteroid",
    range: ASTEROID_PICKUP_RANGE,
    prompt: createAsteroidPrompt(
      candidate.composition ?? candidate.rock?.composition,
      "Press E to pick up asteroid",
    ),
    activate: () => pickUpAsteroidFromField(candidate),
  };
}

function activateNearbyDebrisAsteroidBodies() {
  const debrisRocks = level?.debrisField?.rocks;
  if (!debrisRocks?.extractAsteroidsInSphere || !camera) return;

  const asteroids = debrisRocks.extractAsteroidsInSphere(
    camera.globalPosition,
    ASTEROID_PHYSICS_ACTIVATION_RANGE,
    ASTEROID_PHYSICS_ACTIVATION_LIMIT,
  );
  for (const asteroid of asteroids) {
    createFieldAsteroidBody(asteroid);
  }
}

function createFieldAsteroidBody(asteroid) {
  if (!asteroid?.sourceMesh) return null;

  const mesh = createAsteroidMeshFromSource(
    asteroid.sourceMesh,
    "field-asteroid",
    asteroid,
  );
  if (level?.platform?.root) {
    mesh.parent = level.platform.root;
    mesh.position.copyFrom(worldPointToPlatformLocal(asteroid.position));
  } else {
    mesh.position.copyFrom(asteroid.position);
  }
  mesh.scaling.copyFrom(asteroid.scale);
  mesh.rotationQuaternion =
    asteroid.rotation?.clone?.() ?? B.Quaternion.Identity();
  mesh.isPickable = true;
  mesh.checkCollisions = false;
  mesh.receiveShadows = true;
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    excludeFromBounds: false,
    excludeFromCollision: true,
    heldAsteroid: false,
    fieldAsteroid: true,
    asteroidComposition: cloneSave(asteroid.composition ?? {}),
    asteroidColor: cloneSave(asteroid.color ?? null),
  };
  installDroppedAsteroidInteraction(mesh);
  const velocity = worldVectorToPlatformLocal(
    asteroid.velocity ?? B.Vector3.Zero(),
  );
  registerAsteroidBody(mesh, {
    radius: asteroid.radius,
    velocity,
    ambientVelocity: velocity,
    angularVelocity:
      asteroid.angularVelocity?.clone?.() ?? createAsteroidAngularVelocity(),
  });
  return mesh;
}

function pickUpAsteroidFromField(candidate) {
  if (heldAsteroid) return false;

  const asteroid = level?.debrisField?.rocks?.takeAsteroid?.(candidate);
  if (!asteroid?.sourceMesh) return false;

  heldAsteroid = {
    mesh: createHeldAsteroidMesh(asteroid),
    radius: asteroid.radius,
  };
  updateInteractionPrompt({
    prompt: createAsteroidPrompt(
      asteroid.composition,
      "Asteroid held · Press E to drop",
    ),
  });
  return true;
}

function createHeldAsteroidMesh(asteroid) {
  const mesh = createAsteroidMeshFromSource(
    asteroid.sourceMesh,
    "held-asteroid",
    asteroid,
  );
  mesh.parent = camera;
  mesh.position.copyFrom(HELD_ASTEROID_OFFSET);
  mesh.scaling.copyFrom(asteroid.scale);
  mesh.rotationQuaternion =
    asteroid.rotation?.clone?.() ?? B.Quaternion.Identity();
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.receiveShadows = true;
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    heldAsteroid: true,
    asteroidComposition: asteroid.composition ?? null,
    asteroidColor: asteroid.color ?? null,
  };
  return mesh;
}

function createAsteroidMeshFromSource(sourceMesh, name, asteroid = {}) {
  const positions = sourceMesh?.getVerticesData?.(B.VertexBuffer.PositionKind);
  const mesh = positions
    ? new B.Mesh(name, scene)
    : B.MeshBuilder.CreateIcoSphere(
        name,
        { radius: 1, subdivisions: 3, flat: false, updatable: true },
        scene,
      );

  if (positions) {
    const vertexData = new B.VertexData();
    vertexData.positions = positions.slice();
    vertexData.normals = sourceMesh
      .getVerticesData(B.VertexBuffer.NormalKind)
      ?.slice();
    vertexData.uvs = sourceMesh.getVerticesData(B.VertexBuffer.UVKind)?.slice();
    vertexData.colors = sourceMesh
      .getVerticesData(B.VertexBuffer.ColorKind)
      ?.slice();
    vertexData.indices = sourceMesh.getIndices()?.slice();
    vertexData.applyToMesh(mesh, true);
  }

  mesh.useVertexColors = false;
  mesh.hasVertexAlpha = false;
  mesh.material = createShipLitAsteroidMaterial(
    sourceMesh?.material,
    name,
    asteroid.color,
  );
  return mesh;
}

function createShipLitAsteroidMaterial(sourceMaterial, name, tint) {
  const material = new B.StandardMaterial(`${name}-ship-lit-material`, scene);
  const baseDiffuse =
    sourceMaterial?.diffuseColor?.clone?.() ?? new B.Color3(0.28, 0.26, 0.22);
  material.diffuseColor = Array.isArray(tint)
    ? new B.Color3(
        baseDiffuse.r * tint[0],
        baseDiffuse.g * tint[1],
        baseDiffuse.b * tint[2],
      )
    : baseDiffuse;
  material.diffuseTexture = sourceMaterial?.diffuseTexture ?? null;
  material.bumpTexture = sourceMaterial?.bumpTexture ?? null;
  if (
    material.bumpTexture &&
    sourceMaterial?.bumpTexture?.level !== undefined
  ) {
    material.bumpTexture.level = sourceMaterial.bumpTexture.level;
  }
  material.invertNormalMapY = Boolean(sourceMaterial?.invertNormalMapY);
  material.useParallax = Boolean(sourceMaterial?.useParallax);
  material.useParallaxOcclusion = Boolean(sourceMaterial?.useParallaxOcclusion);
  material.parallaxScaleBias = sourceMaterial?.parallaxScaleBias ?? 0;
  material.specularColor =
    sourceMaterial?.specularColor?.clone?.() ?? new B.Color3(0.04, 0.035, 0.03);
  material.specularPower = sourceMaterial?.specularPower ?? 42;
  material.ambientColor =
    sourceMaterial?.ambientColor?.clone?.() ??
    new B.Color3(0.028, 0.026, 0.022);

  material.alpha = 1;
  material.backFaceCulling = false;
  material.twoSidedLighting = true;
  material.maxSimultaneousLights = Math.max(
    material.maxSimultaneousLights ?? 4,
    4,
  );

  if ("transparencyMode" in material) {
    material.transparencyMode = B.Material.MATERIAL_OPAQUE;
  }
  if ("alphaMode" in material) {
    material.alphaMode = B.Engine.ALPHA_DISABLE;
  }
  if ("needDepthPrePass" in material) {
    material.needDepthPrePass = false;
  }
  if ("disableDepthWrite" in material) {
    material.disableDepthWrite = false;
  }
  if ("forceDepthWrite" in material) {
    material.forceDepthWrite = true;
  }
  if ("disableLighting" in material) {
    material.disableLighting = false;
  }
  if ("unlit" in material) {
    material.unlit = false;
  }
  if ("useAlphaFromAlbedoTexture" in material) {
    material.useAlphaFromAlbedoTexture = false;
  }
  if ("useAlphaFromDiffuseTexture" in material) {
    material.useAlphaFromDiffuseTexture = false;
  }
  return material;
}

function registerAsteroidBody(mesh, options = {}) {
  if (!mesh || mesh.isDisposed?.()) return null;

  unregisterAsteroidBody(mesh);
  mesh.computeWorldMatrix(true);
  const radius = options.radius ?? getAsteroidMeshRadius(mesh);
  const body = {
    mesh,
    radius,
    velocity: options.velocity?.clone?.() ?? B.Vector3.Zero(),
    ambientVelocity: options.ambientVelocity?.clone?.() ?? null,
    angularVelocity:
      options.angularVelocity?.clone?.() ?? createAsteroidAngularVelocity(),
  };
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    asteroidBody: body,
    asteroidPhysics: true,
  };
  asteroidBodies.add(body);
  return body;
}

function unregisterAsteroidBody(mesh) {
  const body = mesh?.metadata?.asteroidBody;
  if (body) asteroidBodies.delete(body);
  if (mesh?.metadata) {
    delete mesh.metadata.asteroidBody;
    delete mesh.metadata.asteroidPhysics;
  }
}

function getAsteroidMeshRadius(mesh) {
  mesh.computeWorldMatrix(true);
  return Math.max(
    mesh.getBoundingInfo?.().boundingSphere.radiusWorld ?? 0,
    ASTEROID_CONTACT_SKIN,
  );
}

function createAsteroidAngularVelocity() {
  return new B.Vector3(
    (Math.random() - 0.5) * 1.3,
    (Math.random() - 0.5) * 1.3,
    (Math.random() - 0.5) * 1.3,
  );
}

function getDroppedAsteroidVelocity() {
  const velocity = zeroGravityMode
    ? zeroGravityVelocity.clone()
    : B.Vector3.Zero();
  const forward = getCameraForwardLocalDirection();
  if (forward.lengthSquared() > 0.0001) {
    velocity.addInPlace(forward.scale(ASTEROID_THROW_SPEED));
  }
  clampVectorLengthInPlace(velocity, ASTEROID_MAX_SPEED);
  return velocity;
}

function updateAsteroidPhysics(seconds, platform) {
  if (!seconds || !asteroidBodies.size) return;

  const bodies = [...asteroidBodies].filter((body) =>
    isAsteroidBodyActive(body),
  );
  for (const body of bodies) {
    updateAsteroidBody(body, seconds, platform);
  }
  resolveAsteroidBodyPairs(bodies);
}

function isAsteroidBodyActive(body) {
  const mesh = body?.mesh;
  if (!mesh || mesh.isDisposed?.() || mesh.isEnabled?.(true) === false) {
    asteroidBodies.delete(body);
    return false;
  }
  if (mesh.metadata?.heldAsteroid || mesh.metadata?.fabricatorMountedAsteroid) {
    return false;
  }
  return true;
}

function updateAsteroidBody(body, seconds, platform) {
  const mesh = body.mesh;
  maintainFieldAsteroidStreamVelocity(body);
  clampVectorLengthInPlace(body.velocity, ASTEROID_MAX_SPEED);
  mesh.position.addInPlace(body.velocity.scale(seconds));
  updateAsteroidSpin(body, seconds);

  const collidedWithObject = resolveAsteroidAgainstCollisionObjects(body, platform);
  const collidedWithPlayer = resolveAsteroidAgainstPlayer(body, platform);
  if (collidedWithObject || collidedWithPlayer) {
    body.velocity.scaleInPlace(ASTEROID_COLLISION_DAMPING);
  }
  maintainFieldAsteroidStreamVelocity(body);
}

function maintainFieldAsteroidStreamVelocity(body) {
  const ambientVelocity = body?.ambientVelocity;
  if (!ambientVelocity || ambientVelocity.lengthSquared() <= 0.000001) return;

  const ambientSpeed = ambientVelocity.length();
  const minSpeed = Math.min(
    ambientSpeed,
    Math.max(ASTEROID_FIELD_STREAM_MIN_SPEED, ambientSpeed * 0.55),
  );
  if (minSpeed <= 0) return;

  const direction = ambientVelocity.scale(1 / ambientSpeed);
  const currentSpeed = B.Vector3.Dot(body.velocity, direction);
  if (currentSpeed >= minSpeed) return;

  body.velocity.addInPlace(direction.scale(minSpeed - currentSpeed));
  clampVectorLengthInPlace(body.velocity, ASTEROID_MAX_SPEED);
}

function updateAsteroidSpin(body, seconds) {
  const spin = body.angularVelocity;
  const angle = spin.length() * seconds;
  if (angle <= 0.000001) return;

  const axis = spin.clone().normalize();
  const delta = B.Quaternion.RotationAxis(axis, angle);
  const current =
    body.mesh.rotationQuaternion?.clone?.() ??
    B.Quaternion.RotationYawPitchRoll(
      body.mesh.rotation.y,
      body.mesh.rotation.x,
      body.mesh.rotation.z,
    );
  body.mesh.rotationQuaternion = delta.multiply(current);
}

function resolveAsteroidAgainstCollisionObjects(body, platform) {
  if (!platform) return false;

  let collided = false;
  body.mesh.computeWorldMatrix(true);
  for (const collider of getAuthoredCollisionMeshes(platform)) {
    const correction = getSphereObbCorrection(
      body.mesh.getAbsolutePosition(),
      body.radius,
      collider,
    );
    if (!correction) continue;

    const localCorrection = worldVectorToPlatformLocal(correction);
    body.mesh.position.addInPlace(localCorrection);
    bounceAsteroidVelocity(body, localCorrection);
    body.mesh.computeWorldMatrix(true);
    collided = true;
  }
  return collided;
}

function bounceAsteroidVelocity(body, localCorrection) {
  if (localCorrection.lengthSquared() <= 0.000001) return;
  const normal = localCorrection.normalize();
  const speedIntoSurface = B.Vector3.Dot(body.velocity, normal);
  if (speedIntoSurface < 0) {
    body.velocity.subtractInPlace(
      normal.scale((1 + ASTEROID_BOUNCE_RESTITUTION) * speedIntoSurface),
    );
  }
}

function resolveAsteroidAgainstPlayer(body, platform) {
  if (!camera || !platform || body.mesh === heldAsteroid?.mesh) return false;

  const bounds = getSolidLevelPlayerBounds(platform);
  const asteroidCenter = body.mesh.position;
  const samples = getPlayerCollisionSamplePoints(camera.position, bounds);
  const fallbackNormal = getCameraForwardLocalDirection();
  let best = null;
  let bestPenetration = 0;

  for (const sample of samples) {
    const delta = asteroidCenter.subtract(sample);
    const distance = delta.length();
    const minDistance = body.radius + bounds.radius + ASTEROID_CONTACT_SKIN;
    const penetration = minDistance - distance;
    if (penetration <= bestPenetration) continue;

    bestPenetration = penetration;
    best = {
      normal: distance > 0.000001 ? delta.scale(1 / distance) : fallbackNormal,
      penetration,
    };
  }

  if (!best) return false;

  const asteroidPush = best.normal.scale(
    best.penetration * (1 - ASTEROID_PLAYER_PUSH_FRACTION),
  );
  const playerPush = best.normal.scale(
    -best.penetration * ASTEROID_PLAYER_PUSH_FRACTION,
  );
  body.mesh.position.addInPlace(asteroidPush);
  if (zeroGravityMode && !flyMode) {
    camera.position.addInPlace(playerPush);
  }

  const playerVelocity = zeroGravityMode
    ? zeroGravityVelocity
    : B.Vector3.Zero();
  const relativeVelocity = body.velocity.subtract(playerVelocity);
  const closingSpeed = B.Vector3.Dot(relativeVelocity, best.normal);
  if (closingSpeed < 0) {
    const impulse = (1 + ASTEROID_BOUNCE_RESTITUTION) * -closingSpeed;
    body.velocity.addInPlace(best.normal.scale(impulse));
    if (zeroGravityMode && !flyMode) {
      zeroGravityVelocity.subtractInPlace(best.normal.scale(impulse * 0.35));
      clampVectorLengthInPlace(zeroGravityVelocity, ZERO_G_MAX_SPEED);
    }
  } else if (body.velocity.lengthSquared() < 0.0001) {
    body.velocity.addInPlace(best.normal.scale(0.12));
  }
  clampVectorLengthInPlace(body.velocity, ASTEROID_MAX_SPEED);
  return true;
}

function getCameraForwardLocalDirection() {
  const direction = camera.getDirection(B.Axis.Z);
  if (camera.parent) {
    const inverseParent = camera.parent.getWorldMatrix().clone().invert();
    B.Vector3.TransformNormalToRef(direction, inverseParent, direction);
  }
  if (direction.lengthSquared() <= 0.000001) return new B.Vector3(1, 0, 0);
  return direction.normalize();
}

function resolveAsteroidBodyPairs(bodies) {
  for (let aIndex = 0; aIndex < bodies.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < bodies.length; bIndex += 1) {
      resolveAsteroidBodyPair(bodies[aIndex], bodies[bIndex]);
    }
  }
}

function resolveAsteroidBodyPair(a, b) {
  const delta = b.mesh.position.subtract(a.mesh.position);
  let distance = delta.length();
  const minDistance = a.radius + b.radius + ASTEROID_CONTACT_SKIN;
  if (distance >= minDistance) return;

  const normal =
    distance > 0.000001 ? delta.scale(1 / distance) : new B.Vector3(1, 0, 0);
  if (distance <= 0.000001) distance = 0;
  const correction = normal.scale((minDistance - distance) * 0.5);
  a.mesh.position.subtractInPlace(correction);
  b.mesh.position.addInPlace(correction);

  const relativeVelocity = b.velocity.subtract(a.velocity);
  const closingSpeed = B.Vector3.Dot(relativeVelocity, normal);
  if (closingSpeed >= 0) return;

  const impulse = (-(1 + ASTEROID_BOUNCE_RESTITUTION) * closingSpeed) / 2;
  a.velocity.subtractInPlace(normal.scale(impulse));
  b.velocity.addInPlace(normal.scale(impulse));
  clampVectorLengthInPlace(a.velocity, ASTEROID_MAX_SPEED);
  clampVectorLengthInPlace(b.velocity, ASTEROID_MAX_SPEED);
}

function dropHeldAsteroid() {
  if (!heldAsteroid?.mesh) return false;

  const mesh = heldAsteroid.mesh;
  const velocity = getDroppedAsteroidVelocity();
  const radius = getHeldAsteroidRadius();
  mesh.computeWorldMatrix(true);
  if (level?.platform?.root) {
    mesh.setParent(level.platform.root);
  } else {
    mesh.parent = null;
  }
  mesh.isPickable = true;
  mesh.checkCollisions = false;
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    excludeFromBounds: false,
    excludeFromCollision: true,
    heldAsteroid: false,
  };
  installDroppedAsteroidInteraction(mesh);
  registerAsteroidBody(mesh, { radius, velocity });
  heldAsteroid = null;
  updateInteractionPrompt(null);
  return true;
}

function installDroppedAsteroidInteraction(mesh) {
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    interaction: {
      type: "asteroid",
      range: ASTEROID_PICKUP_RANGE,
      getPrompt: () =>
        createAsteroidPrompt(
          mesh.metadata?.asteroidComposition,
          "Press E to pick up asteroid",
        ),
      activate: () => pickUpDroppedAsteroid(mesh),
    },
  };
}

function pickUpDroppedAsteroid(mesh) {
  if (heldAsteroid || !mesh || mesh.isDisposed?.()) return false;

  unregisterAsteroidBody(mesh);
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    excludeFromBounds: true,
    excludeFromCollision: true,
    interaction: null,
    heldAsteroid: true,
  };
  delete mesh.metadata.interaction;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.setParent(camera);
  mesh.position.copyFrom(HELD_ASTEROID_OFFSET);
  heldAsteroid = {
    mesh,
    radius: mesh.getBoundingInfo?.().boundingSphere.radiusWorld,
  };
  updateInteractionPrompt({
    prompt: createAsteroidPrompt(
      mesh.metadata?.asteroidComposition,
      "Asteroid held · Press E to drop",
    ),
  });
  return true;
}

function createAsteroidPrompt(composition, actionText) {
  const compositionText = formatAsteroidComposition(composition);
  return compositionText ? `${actionText} · ${compositionText}` : actionText;
}

function formatAsteroidComposition(composition) {
  const yieldValues = getAsteroidYield(composition);
  if (!yieldValues) return "";

  return [
    ["Iron", yieldValues.iron],
    ["Copper", yieldValues.copper],
    ["Water", yieldValues.water],
    ["Silicon", yieldValues.silicon],
  ]
    .map(([label, value]) => `${label} ${value}`)
    .join(" · ");
}

function getAsteroidYield(composition) {
  if (!composition) return null;

  const iron = clampAsteroidResourceYield(composition.iron);
  const copper = clampAsteroidResourceYield(composition.copper);
  const water = clampAsteroidResourceYield(composition.water);
  const silicon = clampAsteroidResourceYield(composition.silicon);
  const total = iron + copper + water + silicon;
  if (!Number.isFinite(total) || total <= 0) return null;

  return { iron, copper, water, silicon };
}

function clampAsteroidResourceYield(value) {
  const amount = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(10, amount));
}

function updateInteractionPrompt(interaction) {
  const now = performance.now();
  const plainPrompt =
    interaction &&
    typeof interaction.prompt === "string" &&
    !interaction.type &&
    !interaction.getPrompt;

  if (!plainPrompt && transientPromptUntil > now) {
    activeInteraction = interaction;
    return;
  }

  if (plainPrompt) {
    transientPromptUntil = now + (interaction.durationMs ?? 2400);
  } else if (interaction || transientPromptUntil <= now) {
    transientPromptUntil = 0;
  }

  activeInteraction = interaction;
  if (!interactionPrompt) return;

  if (!interaction) {
    if (transientPromptUntil > now) return;
    setHiddenIfChanged(interactionPrompt, true);
    setTextIfChanged(interactionPrompt, "");
    return;
  }

  setHiddenIfChanged(interactionPrompt, false);
  if (interaction.type === "helmet-hook") {
    setTextIfChanged(interactionPrompt, getHelmetHookPrompt(interaction));
    return;
  }
  setTextIfChanged(
    interactionPrompt,
    interaction.getPrompt?.() ?? interaction.prompt ?? "Press E",
  );
}

function getHelmetHookPrompt(interaction) {
  if (interaction.mounting) return "Mounting helmet...";
  const tetherText =
    playerTether?.interaction === interaction ? "Q detach tether" : "Q tether";
  if (interaction.mountedRoot) {
    return "Press E to take helmet · Q equip helmet";
  }
  if (equippedHelmet) return `Helmet equipped · ${tetherText}`;
  if (findHelmetInventorySlot()) {
    return `Press E to mount helmet · ${tetherText}`;
  }
  return `Helmet required · ${tetherText}`;
}

function toggleObjectBounds() {
  objectBoundsVisible = !objectBoundsVisible;
  if (scene?.metadata) {
    scene.metadata.objectBoundsVisible = objectBoundsVisible;
  }
  applyObjectBoundsVisibility();
}

function toggleCollisionDebug() {
  collisionDebugVisible = !collisionDebugVisible;
  const count = setAuthoredCollisionMeshesVisible(collisionDebugVisible);
  if (collisionDebugVisible && count === 0) {
    updateInteractionPrompt({ prompt: "No authored collision meshes found" });
  }
}

function setAuthoredCollisionMeshesVisible(visible) {
  if (!scene) return 0;
  let count = 0;
  for (const mesh of scene.meshes) {
    if (!mesh.metadata?.authoredCollisionMesh) continue;
    count += 1;
    mesh.isVisible = visible;
    mesh.visibility = visible ? 0.28 : 0;
    mesh.showBoundingBox = visible;
    mesh.renderingGroupId = visible ? 3 : (mesh.metadata.renderingGroupId ?? 0);
    if (visible) {
      mesh.material = getAuthoredCollisionDebugMaterial();
    } else if (mesh.metadata.originalMaterial !== undefined) {
      mesh.material = mesh.metadata.originalMaterial;
    }
  }
  return count;
}

function getAuthoredCollisionDebugMaterial() {
  const materialName = "authored-collision-debug-material";
  const existing = scene.getMaterialByName?.(materialName);
  if (existing) return existing;

  const material = new B.StandardMaterial(materialName, scene);
  material.diffuseColor = new B.Color3(1, 0.7, 0.05);
  material.emissiveColor = new B.Color3(0.55, 0.32, 0.02);
  material.specularColor = B.Color3.Black();
  material.alpha = 0.28;
  material.wireframe = true;
  material.disableLighting = true;
  material.backFaceCulling = false;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  material.needDepthPrePass = false;
  material.disableDepthWrite = true;
  return material;
}

function applyObjectBoundsVisibility() {
  if (!scene) return;
  for (const mesh of scene.meshes) {
    const showBounds = isObjectBoundsMesh(mesh);
    if (showBounds || mesh.metadata?.objectBoundsManaged) {
      mesh.showBoundingBox = objectBoundsVisible && showBounds;
      mesh.metadata = {
        ...(mesh.metadata ?? {}),
        objectBoundsManaged: showBounds,
      };
    }
  }
}

function isObjectBoundsMesh(mesh) {
  return (
    mesh?.getTotalVertices?.() > 0 &&
    !mesh.metadata?.excludeFromBounds &&
    (Boolean(mesh.metadata?.glbPickupLabel) ||
      mesh.metadata?.interaction?.type === "pickup" ||
      mesh.metadata?.interaction?.type === "asteroid")
  );
}

function configureObjectBoundsRenderer(targetScene) {
  const renderer = targetScene.getBoundingBoxRenderer?.();
  if (!renderer) return;
  renderer.frontColor = new B.Color3(1, 1, 1);
  renderer.backColor = new B.Color3(1, 1, 1);
  renderer.showBackLines = true;
}

function isShiftHeld() {
  return keys.has("ShiftLeft") || keys.has("ShiftRight");
}

function isControlHeld() {
  return keys.has("ControlLeft") || keys.has("ControlRight");
}

function getPlayerStandingSurface(platform) {
  if (!platform || !camera) return null;
  const bounds = getSolidLevelPlayerBounds(platform);
  if (!isPlayerInsideSolidLevelFootprint(camera.position, platform, bounds)) {
    return null;
  }

  return {
    floorY: bounds.floorY,
    eyeHeight: bounds.minEyeY,
    normal: B.Axis.Y.clone(),
  };
}

function movePlayerWithSolidLevelCollision(
  displacement,
  platform,
  options = {},
) {
  if (!platform || !camera || displacement.lengthSquared() <= 0.0000001) {
    return null;
  }

  const collision = resolveSolidLevelMovement(displacement, platform, options);
  if (!collision) return null;

  camera.position.copyFrom(collision.position);
  return collision;
}

function movePlayerWithSolidLevelSlide(displacement, platform, options = {}) {
  const collision = movePlayerWithSolidLevelCollision(displacement, platform, {
    ...options,
    ignoreWalkableSurfaces: false,
  });
  if (!collision) {
    camera.position.addInPlace(displacement);
    return null;
  }
  return collision;
}

function resolveSolidLevelMovement(displacement, platform) {
  const start = camera.position.clone();
  const target = start.add(displacement);
  const { position, normal } = resolvePlayerAgainstSolidLevel(target, platform);
  if (position.subtract(target).lengthSquared() <= 0.00000001) return null;

  const distance = displacement.length();
  const resolvedMovement = position.subtract(start);
  return {
    distance,
    allowedDistance: Math.min(resolvedMovement.length(), distance),
    normal,
    point: position.clone(),
    position,
  };
}

function resolvePlayerAgainstSolidLevel(position, platform) {
  const bounds = getSolidLevelPlayerBounds(platform);
  const resolved = position.clone();
  const normal = B.Vector3.Zero();
  const hasAuthoredColliders = getAuthoredCollisionMeshes(platform).length > 0;

  if (hasAuthoredColliders) {
    resolveAuthoredCollisionMeshes(resolved, normal, platform, bounds);
    if (normal.lengthSquared() > 0.000001) {
      normal.normalize();
    }
    return { position: resolved, normal };
  }

  if (resolved.y < bounds.minEyeY) {
    resolved.y = bounds.minEyeY;
    normal.addInPlace(B.Axis.Y);
  }
  if (resolved.y > bounds.maxEyeY) {
    resolved.y = bounds.maxEyeY;
    normal.subtractInPlace(B.Axis.Y);
  }

  resolveSolidLevelBox(resolved, normal, platform, bounds);

  if (normal.lengthSquared() > 0.000001) {
    normal.normalize();
  }
  return { position: resolved, normal };
}

function resolveAuthoredCollisionMeshes(position, normal, platform, bounds) {
  const meshes = getAuthoredCollisionMeshes(platform);
  if (!meshes.length) return;

  for (let pass = 0; pass < 4; pass += 1) {
    let moved = false;
    for (const mesh of meshes) {
      const correction = getPlayerColliderCorrection(position, bounds, mesh);
      if (!correction) continue;
      const localCorrection = worldVectorToPlatformLocal(correction);
      position.addInPlace(localCorrection);
      normal.addInPlace(localCorrection);
      moved = true;
    }
    if (!moved) break;
  }
}

function getAuthoredCollisionMeshes(platform) {
  const meshes = new Set(platform?.authoredCollisionMeshes ?? []);
  for (const mesh of scene?.meshes ?? []) {
    if (mesh.metadata?.itemCollisionMesh) {
      meshes.add(mesh);
    }
  }
  return [...meshes].filter(
    (mesh) =>
      mesh &&
      !mesh.isDisposed?.() &&
      mesh.isEnabled?.(true) !== false &&
      mesh.metadata?.authoredCollisionMesh,
  );
}

function getPlayerColliderCorrection(position, bounds, mesh) {
  const samples = getPlayerCollisionSamplePoints(position, bounds);
  let bestCorrection = null;
  let bestLengthSquared = 0;

  for (const sample of samples) {
    const correction = getSphereObbCorrection(
      platformLocalPointToWorld(sample),
      bounds.radius,
      mesh,
    );
    const lengthSquared = correction?.lengthSquared?.() ?? 0;
    if (lengthSquared > bestLengthSquared) {
      bestCorrection = correction;
      bestLengthSquared = lengthSquared;
    }
  }

  return bestCorrection;
}

function getPlayerCollisionSamplePoints(position, bounds) {
  const clearance = Math.max(bounds.clearance, bounds.radius * 2);
  const headOffset = Math.min(bounds.radius, clearance);
  const footOffset = Math.max(clearance - bounds.radius, 0);
  const offsets = [headOffset, clearance * 0.5, footOffset];
  const uniqueOffsets = [
    ...new Set(offsets.map((offset) => offset.toFixed(4))),
  ];
  return uniqueOffsets.map((offset) =>
    position.add(B.Axis.Y.scale(-Number(offset))),
  );
}

function getSphereObbCorrection(center, radius, mesh) {
  const obb = getMeshWorldObb(mesh);
  if (!obb) return null;

  const delta = center.subtract(obb.center);
  const local = obb.axes.map((axis) => B.Vector3.Dot(delta, axis));
  const closest = obb.center.clone();
  let inside = true;

  for (let index = 0; index < 3; index += 1) {
    const clamped = clamp(
      local[index],
      -obb.halfExtents[index],
      obb.halfExtents[index],
    );
    if (Math.abs(local[index]) > obb.halfExtents[index]) inside = false;
    closest.addInPlace(obb.axes[index].scale(clamped));
  }

  if (!inside) {
    const separation = center.subtract(closest);
    const distanceSquared = separation.lengthSquared();
    const expandedRadius = radius + PLAYER_COLLISION_SKIN;
    if (distanceSquared >= expandedRadius * expandedRadius) return null;
    if (distanceSquared <= 0.0000001) return null;
    const distance = Math.sqrt(distanceSquared);
    return separation.scale((expandedRadius - distance) / distance);
  }

  let bestAxis = 0;
  let bestPenetration = Infinity;
  for (let index = 0; index < 3; index += 1) {
    const penetration = obb.halfExtents[index] - Math.abs(local[index]);
    if (penetration < bestPenetration) {
      bestPenetration = penetration;
      bestAxis = index;
    }
  }

  const sign = local[bestAxis] >= 0 ? 1 : -1;
  return obb.axes[bestAxis].scale(
    sign * (bestPenetration + radius + PLAYER_COLLISION_SKIN),
  );
}

function getMeshWorldObb(mesh) {
  mesh.computeWorldMatrix(true);
  const world = mesh.getWorldMatrix();
  const box = mesh.getBoundingInfo().boundingBox;
  const centerLocal = box.minimum.add(box.maximum).scale(0.5);
  const halfLocal = box.maximum.subtract(box.minimum).scale(0.5);
  const basis = [
    B.Vector3.TransformNormal(B.Axis.X, world),
    B.Vector3.TransformNormal(B.Axis.Y, world),
    B.Vector3.TransformNormal(B.Axis.Z, world),
  ];
  const axes = [];
  const halfExtents = [];

  for (let index = 0; index < 3; index += 1) {
    const length = basis[index].length();
    if (length <= 0.000001) return null;
    axes.push(basis[index].scale(1 / length));
    halfExtents.push(
      Math.max(halfLocal.asArray()[index] * length, PLAYER_COLLISION_SKIN),
    );
  }

  return {
    center: B.Vector3.TransformCoordinates(centerLocal, world),
    axes,
    halfExtents,
  };
}

function resolveSolidLevelBox(position, normal, platform, bounds) {
  resolveSolidLevelBoundary(
    position,
    normal,
    platform,
    bounds,
    "x",
    bounds.minX + bounds.radius,
    new B.Vector3(-1, 0, 0),
    1,
  );
  resolveSolidLevelBoundary(
    position,
    normal,
    platform,
    bounds,
    "x",
    bounds.maxX - bounds.radius,
    new B.Vector3(1, 0, 0),
    -1,
  );
  resolveSolidLevelBoundary(
    position,
    normal,
    platform,
    bounds,
    "z",
    bounds.minZ + bounds.radius,
    new B.Vector3(0, 0, -1),
    1,
  );
  resolveSolidLevelBoundary(
    position,
    normal,
    platform,
    bounds,
    "z",
    bounds.maxZ - bounds.radius,
    new B.Vector3(0, 0, 1),
    -1,
  );
}

function resolveSolidLevelBoundary(
  position,
  normal,
  platform,
  bounds,
  axis,
  limit,
  outwardNormal,
  correctionSign,
) {
  const outside =
    correctionSign > 0 ? position[axis] < limit : position[axis] > limit;
  if (!outside) return;
  if (isPlayerInOpenDoorAperture(position, platform, bounds, outwardNormal)) {
    return;
  }

  position[axis] = limit;
  normal.addInPlace(outwardNormal.scale(-1));
}

function getSolidLevelPlayerBounds(platform) {
  const radius = Math.max(platform.radius ?? 0, 0);
  const clearance = getPlayerEyeClearance(platform);
  const floorY = platform.floorY ?? 0;
  const ceilingY = platform.ceilingY ?? floorY + clearance + radius;
  const minEyeY = floorY + clearance;
  const maxEyeY = Math.max(
    minEyeY,
    ceilingY - Math.max(radius, PLAYER_COLLISION_SKIN),
  );
  return {
    radius,
    clearance,
    floorY,
    ceilingY,
    minEyeY,
    maxEyeY,
    minX: platform.minX ?? -((platform.width ?? 0) * 0.5),
    maxX: platform.maxX ?? (platform.width ?? 0) * 0.5,
    minZ: platform.minZ ?? -((platform.depth ?? 0) * 0.5),
    maxZ: platform.maxZ ?? (platform.depth ?? 0) * 0.5,
  };
}

function isPlayerInsideSolidLevelFootprint(position, platform, bounds) {
  return (
    (position.x >= bounds.minX + bounds.radius &&
      position.x <= bounds.maxX - bounds.radius &&
      position.z >= bounds.minZ + bounds.radius &&
      position.z <= bounds.maxZ - bounds.radius) ||
    isPlayerInOpenDoorAperture(position, platform, bounds)
  );
}

function isPlayerInOpenDoorAperture(
  position,
  platform,
  bounds = getSolidLevelPlayerBounds(platform),
  boundaryNormal = null,
) {
  for (const passage of platform.doorPassages ?? []) {
    if (!passage?.interaction?.isOpen) continue;
    if (
      boundaryNormal &&
      B.Vector3.Dot(passage.normal, boundaryNormal) < 0.62
    ) {
      continue;
    }
    if (isPlayerCapsuleInsideDoorAperture(position, bounds, passage)) {
      return true;
    }
  }
  return false;
}

function isPlayerCapsuleInsideDoorAperture(position, bounds, passage) {
  const bodyCenter = position.add(B.Axis.Y.scale(-bounds.clearance * 0.5));
  const delta = bodyCenter.subtract(passage.center);
  const rightDistance = B.Vector3.Dot(delta, passage.right);
  const upDistance = B.Vector3.Dot(delta, passage.up);
  const halfBodyHeight = Math.max(bounds.clearance * 0.5 - bounds.radius, 0);
  const halfWidth = Math.max(
    bounds.radius * 0.35,
    (passage.collisionHalfWidth ?? passage.halfWidth ?? 0) -
      bounds.radius * 0.35,
  );
  const halfHeight =
    (passage.collisionHalfHeight ?? passage.halfHeight ?? 0) +
    bounds.radius * 0.65;

  return (
    Math.abs(rightDistance) <= halfWidth &&
    Math.abs(upDistance) + halfBodyHeight <= halfHeight
  );
}

function getPlayerEyeClearance(platform) {
  const floorY = platform.floorY ?? 0;
  const eyeHeight = playerPhysics?.eyeHeight ?? platform.eyeHeight ?? floorY;
  return Math.max(eyeHeight - floorY, (platform.radius ?? 0) * 2);
}

function getPlatformStandingEyeHeight(platform) {
  const floorY = platform?.floorY ?? 0;
  const configuredHeight = Number(platform?.playerHeight);
  if (Number.isFinite(configuredHeight) && configuredHeight > 0) {
    return floorY + configuredHeight;
  }
  return platform?.eyeHeight ?? floorY;
}

function syncPlayerPhysicsToPlatformHeight(platform, options = {}) {
  if (!playerPhysics || !platform) return;
  const standingEyeHeight = getPlatformStandingEyeHeight(platform);
  const previousEyeHeight = playerPhysics.platformEyeHeight;
  const eyeHeightDelta = Number.isFinite(previousEyeHeight)
    ? standingEyeHeight - previousEyeHeight
    : 0;
  playerPhysics.platformEyeHeight = standingEyeHeight;
  playerPhysics.eyeHeight = standingEyeHeight;
  if (options.snapCamera) {
    camera.position.y = standingEyeHeight;
  } else if (
    options.preserveCameraOffset &&
    isPositionInsidePlatformPhysicsVolume(camera.position, platform) &&
    Number.isFinite(eyeHeightDelta) &&
    Math.abs(eyeHeightDelta) > 0.0001
  ) {
    camera.position.y += eyeHeightDelta;
  }
}

function updateCrouch(platform, seconds, crouching) {
  const floorY = platform.floorY ?? 0;
  const standingEyeHeight = getPlatformStandingEyeHeight(platform);
  if (
    !Number.isFinite(playerPhysics.platformEyeHeight) ||
    Math.abs(playerPhysics.platformEyeHeight - standingEyeHeight) > 0.0001
  ) {
    syncPlayerPhysicsToPlatformHeight(platform, {
      snapCamera: playerPhysics.grounded,
    });
  }
  const standingHeight = standingEyeHeight - floorY;
  const crouchEyeHeight = Math.max(
    floorY + platform.radius * 2,
    floorY + standingHeight * CROUCH_EYE_HEIGHT_SCALE,
  );
  const targetEyeHeight = crouching ? crouchEyeHeight : standingEyeHeight;
  const currentEyeHeight = playerPhysics.eyeHeight ?? standingEyeHeight;
  const blend = 1 - Math.exp(-CROUCH_TRANSITION_SPEED * seconds);

  playerPhysics.eyeHeight =
    currentEyeHeight + (targetEyeHeight - currentEyeHeight) * blend;
  if (playerPhysics.grounded) {
    camera.position.y = playerPhysics.eyeHeight;
  }
}

function setMenuBusy(isBusy) {
  document
    .querySelectorAll(".main-menu button, .main-menu input")
    .forEach((element) => {
      element.disabled = isBusy;
    });
  menuError.textContent = isBusy ? "Loading..." : "";
}

function setLoadingScreen(isVisible, status = "Loading") {
  document.body.classList.toggle("game-loading", isVisible);
  loadingScreen?.setAttribute("aria-hidden", String(!isVisible));
  if (isVisible) updateLoadingStatus(status);
}

function updateLoadingStatus(status) {
  if (loadingStatus) loadingStatus.textContent = status;
}

async function waitForInitialLevelAssets() {
  updateLoadingStatus("Loading ship");
  await level?.platform?.readyPromise;
  updateLoadingStatus("Loading starfield");
  await level?.starfield?.metadata?.readyPromise;
}

function waitForSceneReady(targetScene) {
  if (!targetScene) return Promise.resolve();
  return new Promise((resolve) => {
    targetScene.executeWhenReady(resolve);
  });
}

function cleanupFailedGameStart() {
  canvas.removeEventListener("pointerdown", handleCanvasPointerDown);
  engine?.stopRenderLoop();
  scene?.dispose();
  engine?.dispose();
  engine = null;
  scene = null;
  performanceMonitor = null;
  camera = null;
  thirdPersonCamera = null;
  level = null;
  playerPhysics = null;
  playerPlaceholderRig = null;
  currentSaveFile = null;
  setLoadingScreen(false);
}

function showRuntimeError(error) {
  const message = error?.stack ?? error?.message ?? String(error);
  if (document.body.classList.contains("menu-open")) {
    menuError.textContent = message;
  }
  if (gameStarted) {
    metrics.textContent = `Render error: ${message}`;
  }
  console.error(error);
}

function createHudButton() {
  const button = document.createElement("button");
  button.type = "button";
  return button;
}

function createBackgroundMusic(src) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.21;
  return audio;
}

function installBackgroundMusicUnlock(audio) {
  let started = false;
  let starting = false;
  const events = ["pointerdown", "keydown", "touchstart"];
  const start = () => {
    if (started || starting) return;
    starting = true;
    audio
      .play()
      .then(() => {
        starting = false;
        started = true;
        for (const eventName of events) removeEventListener(eventName, start);
      })
      .catch((error) => {
        starting = false;
        console.warn(
          "Background music is waiting for user interaction.",
          error,
        );
      });
  };

  start();
  for (const eventName of events) addEventListener(eventName, start);
}

function updateHudButtons() {
  updateLifeSupportHud();
  const timeScale = scene.metadata.timeScale;
  timeButton.textContent =
    timeScale === 0 ? "Time paused" : `Time ${timeScale}x`;
  timeButton.title = "Cycle simulation time speed";
  flyButton.textContent = flyMode ? "Fly on" : "Fly off";
  flyButton.title = "Toggle fake gravity / free flight";
  flyButton.setAttribute("aria-pressed", String(flyMode));
  if (cameraButton) {
    cameraButton.textContent = thirdPersonMode ? "3rd person" : "1st person";
    cameraButton.title = "Toggle third-person camera";
    cameraButton.setAttribute("aria-pressed", String(thirdPersonMode));
  }
  if (visorButton) {
    const hasHelmet = Boolean(equippedHelmet);
    visorButton.textContent = !hasHelmet
      ? "No helmet"
      : equippedHelmet.visorOpen
        ? "Visor close"
        : "Visor open";
    visorButton.title = hasHelmet
      ? "Open or close helmet visor"
      : "Equip a helmet to use the visor";
    visorButton.disabled = !hasHelmet;
    visorButton.setAttribute(
      "aria-pressed",
      String(hasHelmet && equippedHelmet.visorOpen),
    );
  }
  if (saveStartButton) {
    saveStartButton.textContent = "Save world";
    saveStartButton.title =
      "Save current player, inventory, objects, and hook state";
  }
}

function updateToolTipsVisibility() {
  document.body.classList.toggle("tooltips-hidden", !toolTipsVisible);
}

function toggleToolTipsVisibility() {
  toolTipsVisible = !toolTipsVisible;
  updateToolTipsVisibility();
  if (activeInteraction) {
    updateInteractionPrompt(activeInteraction);
  }
}

function toggleZeroGravityMode() {
  zeroGravityMode = !zeroGravityMode;
  zeroGravityVelocity.copyFromFloats(0, 0, 0);
  stopZeroGravityThrusterEffect();
  if (playerPhysics) {
    playerPhysics.verticalVelocity = 0;
    playerPhysics.grounded = false;
  }
  updateQuickAccessButtons();
}

function updateQuickAccessButtons() {}

function updatePlatformGravity(platform, seconds) {
  const standingSurface = getPlayerStandingSurface(platform);
  const overDeck = Boolean(standingSurface);
  const eyeHeight =
    standingSurface?.eyeHeight ?? playerPhysics.eyeHeight ?? platform.eyeHeight;

  if (keys.has("Space") && playerPhysics.grounded) {
    playerPhysics.verticalVelocity = platform.jumpSpeed;
    playerPhysics.grounded = false;
  }

  playerPhysics.verticalVelocity -= platform.gravity * seconds;
  camera.position.y += playerPhysics.verticalVelocity * seconds;

  if (
    overDeck &&
    playerPhysics.verticalVelocity <= 0 &&
    camera.position.y <= eyeHeight
  ) {
    camera.position.y = eyeHeight;
    playerPhysics.verticalVelocity = 0;
    playerPhysics.grounded = true;
  } else {
    playerPhysics.grounded = false;
  }
}

function updateZeroGravityThrusters(thrustInput, platform, seconds) {
  if (!platform || !playerPhysics) return;

  const thrustDirection =
    thrustInput.lengthSquared() > 0.000001
      ? thrustInput.clone().normalize()
      : null;
  updateZeroGravityThrusterEffect(thrustDirection);

  if (thrustDirection) {
    const thrust = thrustDirection.scale(
      ZERO_G_THRUST_ACCELERATION *
        (isControlHeld() ? ZERO_G_THRUST_BOOST_MULTIPLIER : 1) *
        seconds,
    );
    zeroGravityVelocity.addInPlace(thrust);
    clampVectorLengthInPlace(
      zeroGravityVelocity,
      hatchDecompression ? HATCH_DECOMPRESSION_MAX_SPEED : ZERO_G_MAX_SPEED,
    );
  }

  const movement = zeroGravityVelocity.scale(seconds);
  const collision = movePlayerWithSolidLevelSlide(movement, platform, {
    sampleBody: true,
  });
  if (collision?.normal) {
    const impactSpeed = B.Vector3.Dot(zeroGravityVelocity, collision.normal);
    if (impactSpeed < 0) {
      zeroGravityVelocity.subtractInPlace(collision.normal.scale(impactSpeed));
    }
  }
  playerPhysics.grounded = false;
  playerPhysics.verticalVelocity = zeroGravityVelocity.y;
}

function clampVectorLengthInPlace(vector, maxLength) {
  const lengthSquared = vector.lengthSquared();
  if (lengthSquared <= maxLength * maxLength) return;
  vector.scaleInPlace(maxLength / Math.sqrt(lengthSquared));
}

function updateZeroGravityThrusterEffect(thrustDirection) {
  if (!scene || !camera || !thrustDirection) {
    stopZeroGravityThrusterEffect();
    return;
  }

  const effect = getZeroGravityThrusterEffect();
  camera.computeWorldMatrix(true);
  const exhaustDirection = thrustDirection.scale(-1);
  const worldExhaustDirection =
    transformPlayerLocalDirectionToWorld(exhaustDirection);
  const emitterPosition = camera.globalPosition
    .add(worldExhaustDirection.scale(ZERO_G_THRUSTER_EMITTER_OFFSET))
    .add(camera.getDirection(B.Axis.Y).scale(-0.28));
  const spread = 0.2;

  effect.system.emitter = emitterPosition;
  effect.system.direction1 = worldExhaustDirection
    .add(camera.getDirection(B.Axis.X).scale(-spread))
    .add(camera.getDirection(B.Axis.Y).scale(-spread * 0.45));
  effect.system.direction2 = worldExhaustDirection
    .add(camera.getDirection(B.Axis.X).scale(spread))
    .add(camera.getDirection(B.Axis.Y).scale(spread * 0.45));

  if (!zeroGravityThrusterActive) {
    effect.system.start();
    zeroGravityThrusterActive = true;
  }
}

function stopZeroGravityThrusterEffect() {
  if (!zeroGravityThrusterActive) return;
  zeroGravityThrusterEffect?.system?.stop();
  zeroGravityThrusterActive = false;
}

function getZeroGravityThrusterEffect() {
  if (zeroGravityThrusterEffect) return zeroGravityThrusterEffect;

  const system = new B.ParticleSystem("zero-g-white-thruster", 140, scene);
  system.particleTexture = createZeroGravityThrusterTexture();
  system.minSize = 0.018;
  system.maxSize = 0.055;
  system.minLifeTime = 0.12;
  system.maxLifeTime = 0.28;
  system.emitRate = ZERO_G_THRUSTER_EMIT_RATE;
  system.minEmitPower = 0.18;
  system.maxEmitPower = 0.72;
  system.updateSpeed = 0.018;
  system.blendMode = B.ParticleSystem.BLENDMODE_ADD;
  system.gravity = B.Vector3.Zero();
  system.color1 = new B.Color4(1, 1, 1, 0.95);
  system.color2 = new B.Color4(0.72, 0.9, 1, 0.65);
  system.colorDead = new B.Color4(1, 1, 1, 0);
  system.minEmitBox = B.Vector3.Zero();
  system.maxEmitBox = B.Vector3.Zero();

  zeroGravityThrusterEffect = { system };
  return zeroGravityThrusterEffect;
}

function createZeroGravityThrusterTexture() {
  const texture = new B.DynamicTexture(
    "zero-g-white-thruster-sprite",
    { width: 32, height: 32 },
    scene,
    false,
  );
  const context = texture.getContext();
  const gradient = context.createRadialGradient(16, 16, 1, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.32, "rgba(235,248,255,0.82)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.clearRect(0, 0, 32, 32);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  texture.update(false);
  return texture;
}

function transformPlayerLocalDirectionToWorld(direction) {
  if (!camera?.parent) return direction.clone().normalize();
  return B.Vector3.TransformNormal(
    direction,
    camera.parent.getWorldMatrix(),
  ).normalize();
}

function isPositionInsidePlatformPhysicsVolume(position, platform) {
  if (!position || !platform) return false;
  const radius = platform.radius ?? 0;
  const margin = Math.max(radius * 1.5, 0.04);
  const minX = (platform.minX ?? -platform.width * 0.5) - margin;
  const maxX = (platform.maxX ?? platform.width * 0.5) + margin;
  const minZ = (platform.minZ ?? -platform.depth * 0.5) - margin;
  const maxZ = (platform.maxZ ?? platform.depth * 0.5) + margin;
  const minY = (platform.floorY ?? 0) - margin;
  const maxY =
    platform.ceilingY !== undefined ? platform.ceilingY + margin : Infinity;
  return (
    position.x >= minX &&
    position.x <= maxX &&
    position.y >= minY &&
    position.y <= maxY &&
    position.z >= minZ &&
    position.z <= maxZ
  );
}

function movePlayerHorizontally(displacement, platform) {
  const startX = camera.position.x;
  const startZ = camera.position.z;
  if (!platform || displacement.lengthSquared() <= 0) return B.Vector3.Zero();

  const steps = [
    new B.Vector3(displacement.x, 0, 0),
    new B.Vector3(0, 0, displacement.z),
  ];
  for (const step of steps) {
    if (step.lengthSquared() <= 0.0000001) continue;
    const collision = movePlayerWithSolidLevelCollision(step, platform, {
      sampleBody: true,
    });
    if (!collision) {
      camera.position.addInPlace(step);
    }
  }

  return new B.Vector3(
    camera.position.x - startX,
    0,
    camera.position.z - startZ,
  );
}

function movePlayerFreely(displacement, platform) {
  if (!platform || displacement.lengthSquared() <= 0) {
    camera.position.addInPlace(displacement);
    return;
  }

  movePlayerWithSolidLevelSlide(displacement, platform, {
    sampleBody: true,
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeRadians(radians) {
  const turn = Math.PI * 2;
  return ((radians % turn) + turn) % turn;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp(
    (value - edge0) / Math.max(edge1 - edge0, Number.EPSILON),
    0,
    1,
  );
  return t * t * (3 - 2 * t);
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

function createAssetProfiler() {
  const currentCpu = new Map();
  const smoothedCpu = new Map();
  const gpuWeights = new Map();

  return {
    beginFrame() {
      currentCpu.clear();
    },

    measure(name, fn) {
      const start = performance.now();
      try {
        return fn();
      } finally {
        this.addCpu(name, performance.now() - start);
      }
    },

    addCpu(name, milliseconds) {
      currentCpu.set(name, (currentCpu.get(name) ?? 0) + milliseconds);
    },

    setGpuWeight(name, weight) {
      if (!Number.isFinite(weight) || weight <= 0) {
        gpuWeights.delete(name);
      } else {
        gpuWeights.set(name, weight);
      }
    },

    getCpuBreakdown(totalCpuMs) {
      for (const [name, milliseconds] of currentCpu) {
        const previous = smoothedCpu.get(name) ?? milliseconds;
        smoothedCpu.set(name, previous * 0.84 + milliseconds * 0.16);
      }
      const measured = [...smoothedCpu.entries()].filter(
        ([, milliseconds]) => milliseconds > 0.002,
      );
      const measuredTotal = measured.reduce(
        (sum, [, milliseconds]) => sum + milliseconds,
        0,
      );
      const denominator = Math.max(totalCpuMs, measuredTotal, 0.0001);
      const other = Math.max(0, totalCpuMs - measuredTotal);
      const rows = measured.map(([name, milliseconds]) => ({
        name,
        percent: (milliseconds / denominator) * 100,
      }));
      if (other / denominator > 0.04) {
        rows.push({
          name: "Render/other",
          percent: (other / denominator) * 100,
        });
      }
      return rows.sort((a, b) => b.percent - a.percent);
    },

    getGpuBreakdown() {
      const rows = [...gpuWeights.entries()]
        .filter(([, weight]) => weight > 0)
        .map(([name, weight]) => ({ name, weight }));
      const total = rows.reduce((sum, row) => sum + row.weight, 0);
      if (total <= 0) return [];
      return rows
        .map((row) => ({
          name: row.name,
          percent: (row.weight / total) * 100,
        }))
        .sort((a, b) => b.percent - a.percent);
    },
  };
}

function createPerformanceMonitor(engine, container) {
  const frameBudget = 1000 / 60;
  const fpsElement = container.querySelector("#metric-fps");
  const cpuElement = container.querySelector("#metric-cpu");
  const gpuElement = container.querySelector("#metric-gpu");
  const cpuBreakdownElement = container.querySelector("#metric-cpu-breakdown");
  const gpuBreakdownElement = container.querySelector("#metric-gpu-breakdown");
  const gl = engine._gl;
  const supportsTimerQuery =
    typeof WebGL2RenderingContext !== "undefined" &&
    gl instanceof WebGL2RenderingContext;
  const timerExtension = supportsTimerQuery
    ? gl.getExtension("EXT_disjoint_timer_query_webgl2")
    : null;
  const pendingQueries = [];
  let smoothedCpuMs = 0;
  let smoothedGpuMs = null;
  let frameNumber = 0;
  let lastDisplayUpdate = 0;

  function pollGpuQueries() {
    if (!timerExtension) return;

    while (pendingQueries.length > 0) {
      const query = pendingQueries[0];
      const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
      if (!available) break;

      pendingQueries.shift();
      const disjoint = gl.getParameter(timerExtension.GPU_DISJOINT_EXT);
      if (!disjoint) {
        const gpuMs = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1_000_000;
        smoothedGpuMs =
          smoothedGpuMs === null ? gpuMs : smoothedGpuMs * 0.86 + gpuMs * 0.14;
        engine.metadata.performance.gpuMs = smoothedGpuMs;
      }
      gl.deleteQuery(query);
    }
  }

  function beginGpuQuery() {
    if (
      !timerExtension ||
      frameNumber % 4 !== 0 ||
      pendingQueries.length >= 4
    ) {
      return null;
    }

    const query = gl.createQuery();
    try {
      gl.beginQuery(timerExtension.TIME_ELAPSED_EXT, query);
      return query;
    } catch {
      gl.deleteQuery(query);
      return null;
    }
  }

  return {
    beginFrame() {
      pollGpuQueries();
      engine.scenes[0]?.metadata?.profiler?.beginFrame();
      return {
        cpuStart: performance.now(),
        gpuQuery: beginGpuQuery(),
      };
    },

    endFrame(frame) {
      if (frame.gpuQuery) {
        gl.endQuery(timerExtension.TIME_ELAPSED_EXT);
        pendingQueries.push(frame.gpuQuery);
      }

      const cpuMs = performance.now() - frame.cpuStart;
      smoothedCpuMs =
        smoothedCpuMs === 0 ? cpuMs : smoothedCpuMs * 0.86 + cpuMs * 0.14;
      engine.metadata.performance.cpuMs = smoothedCpuMs;
      frameNumber += 1;

      const now = performance.now();
      if (now - lastDisplayUpdate < 250) return;
      lastDisplayUpdate = now;

      const fps = Math.round(engine.getFps());
      const cpuPercent = Math.min((smoothedCpuMs / frameBudget) * 100, 999);
      fpsElement.textContent = `FPS ${fps}`;
      cpuElement.textContent = `CPU ${smoothedCpuMs.toFixed(1)}ms ${cpuPercent.toFixed(0)}%`;
      const profiler = engine.scenes[0]?.metadata?.profiler;
      if (profiler && cpuBreakdownElement && gpuBreakdownElement) {
        cpuBreakdownElement.textContent = `CPU parts ${formatBreakdown(profiler.getCpuBreakdown(smoothedCpuMs))}`;
        gpuBreakdownElement.textContent = `GPU est ${formatBreakdown(profiler.getGpuBreakdown())}`;
      }

      if (smoothedGpuMs === null) {
        gpuElement.textContent = "GPU n/a";
      } else {
        const gpuPercent = Math.min((smoothedGpuMs / frameBudget) * 100, 999);
        gpuElement.textContent = `GPU ${smoothedGpuMs.toFixed(1)}ms ${gpuPercent.toFixed(0)}%`;
      }
    },
  };
}

function formatBreakdown(rows) {
  if (!rows.length) return "--";
  return rows
    .slice(0, 5)
    .map((row) => `${row.name} ${Math.round(row.percent)}%`)
    .join(" · ");
}
