import baseBrownDwarfLevel from "./levels/brown_dwarf/level.js";
import { createItemPortrait } from "./src/item-portraits.js";
import { createGlbModelPortrait } from "./src/model-preview.js";
import { buildLevel } from "./src/level-system.js";
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
const savePathInput = document.querySelector("#save-path-input");
const saveFileInput = document.querySelector("#save-file-input");
const hotbar = document.querySelector("#hotbar");
const zeroGravityKeyButton = document.querySelector("#zero-gravity-key-button");
const inventoryKeyButton = document.querySelector("#inventory-key-button");
const notebookKeyButton = document.querySelector("#notebook-key-button");
const inventoryModal = document.querySelector("#inventory-modal");
const notebookModal = document.querySelector("#notebook-modal");
const fabricatorModal = document.querySelector("#fabricator-modal");
const hatchWarningModal = document.querySelector("#hatch-warning-modal");
const hatchWarningActions = document.querySelector("#hatch-warning-actions");
const fabricatorDisassembleButton = document.querySelector(
  "#fabricator-disassemble-button",
);
const fabricatorAnalysisStatus = document.querySelector(
  "#fabricator-analysis-status",
);
const fabricatorYieldIron = document.querySelector("#fabricator-yield-iron");
const fabricatorYieldCopper = document.querySelector(
  "#fabricator-yield-copper",
);
const fabricatorYieldWater = document.querySelector("#fabricator-yield-water");
const inventoryGrid = document.querySelector(".inventory-grid");
const modalHotbar = document.querySelector(".modal-hotbar");
const clothingGrid = document.querySelector(".clothing-grid");
const notebookTabs = document.querySelector(".notebook-tabs");
const notebookCopy = document.querySelector(".notebook-copy");
const interactionPrompt = document.querySelector("#interaction-prompt");
const backgroundMusic = createBackgroundMusic("./background.mp3");
const BASE_MOUSE_SENSIBILITY = 2600;
const GLB_PICKUP_PROMPT_RANGE = 1.8;
const MENU_STAR_DOME_RADIUS = 900;
const PLACEMENT_RANGE = 3.2;
const PLACEMENT_PADDING = 0.035;
const ASTEROID_PICKUP_RANGE = 2.8;
const FABRICATOR_ASTEROID_MAX_RADIUS = 0.11;
const FABRICATOR_ASTEROID_BOTTOM_CLEARANCE = 0.05;
const FABRICATOR_ASTEROID_FORWARD_OFFSET = 0.06;
const FABRICATOR_DISASSEMBLE_SECONDS = 10;
const FABRICATOR_LASER_RADIUS = 0.008;
const ASTEROID_THROW_SPEED = 0.85;
const ASTEROID_BOUNCE_RESTITUTION = 0.68;
const ASTEROID_COLLISION_DAMPING = 0.985;
const ASTEROID_MAX_SPEED = 5.6;
const ASTEROID_CONTACT_SKIN = 0.004;
const ASTEROID_PLAYER_PUSH_FRACTION = 0.42;
const FABRICATOR_BATTERY_WIRE_RADIUS = 0.008;
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
const ZERO_G_THRUST_ACCELERATION = 1.55;
const ZERO_G_THRUST_BOOST_MULTIPLIER = 1.55;
const ZERO_G_MAX_SPEED = 4.6;
const ZERO_G_THRUSTER_EMIT_RATE = 85;
const ZERO_G_THRUSTER_EMITTER_OFFSET = 0.34;
const HATCH_DECOMPRESSION_INITIAL_IMPULSE = 3.4;
const HATCH_DECOMPRESSION_ACCELERATION = 6.25;
const HATCH_DECOMPRESSION_DURATION = 1.35;
const HATCH_DECOMPRESSION_MAX_SPEED = 6.75;
const HATCH_WIND_PARTICLE_SECONDS = 1.15;
const CABIN_PRESSURE_INITIAL_ATM = 0.3;
const CABIN_PRESSURE_VACUUM_ATM = 0;
const HELMET_OXYGEN_MAX_SECONDS = 300;
const HELMET_OXYGEN_DRAIN_PER_SECOND = 1;
const CROUCH_EYE_HEIGHT_SCALE = 0.76;
const CROUCH_TRANSITION_SPEED = 8;
const CROUCH_SPEED_SCALE = 0.45;
const PLAYER_COLLISION_SKIN = 0.012;
const PLAYER_MAX_LOOK_PITCH = Math.PI / 2 - 0.01;
const THIRD_PERSON_DISTANCE = 0.82;
const THIRD_PERSON_HEIGHT = 0.22;
let gameStarted = false;

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
    if (activeInteraction.type === "pickup") {
      interactionHandled = collectPickupInteraction(activeInteraction);
    } else if (activeInteraction.type === "helmet-hook") {
      interactionHandled = activateHelmetHook(activeInteraction);
    } else if (activeInteraction.type === "fabricator") {
      interactionHandled = false;
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
let toolTipsVisible = true;
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
let airPressureMeter = null;
let airPressureMeterText = null;
let oxygenMeter = null;
let oxygenMeterFill = null;
let oxygenMeterText = null;
let mouseSensitivitySlider = null;
let mouseSensitivityValue = null;
let activeInteraction = null;
let objectBoundsVisible = false;
let collisionDebugVisible = false;
let draggedInventorySlot = null;
let placementPreview = null;
let placementPreviewKey = "";
let placementPreviewLoadId = 0;
let placementState = null;
let placementInProgress = false;
let equippedHelmet = null;
let helmetEquipInProgress = false;
let playerTether = null;
let playerPlaceholderRig = null;
let heldAsteroid = null;
let activeFabricatorRoot = null;
let pendingHatchInteraction = null;
let cabinPressureAtm = CABIN_PRESSURE_INITIAL_ATM;
let helmetOxygenSeconds = HELMET_OXYGEN_MAX_SECONDS;
const asteroidBodies = new Set();
const fabricatorBatteryWires = new Set();
const fabricatorDisassemblyJobs = new Set();

const fabricatorResourceItems = {
  iron: { id: "iron", name: "Iron", icon: "Fe", swatch: "#a7adb1" },
  copper: { id: "copper", name: "Copper", icon: "Cu", swatch: "#c8753e" },
  water: { id: "water", name: "Water", icon: "H2O", swatch: "#58b9e8" },
};

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
  zeroGravityKeyButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (gameStarted) toggleZeroGravityMode();
  });
  inventoryKeyButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (gameStarted) toggleInventory();
  });
  notebookKeyButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (gameStarted) toggleNotebook();
  });
  inventoryModal.addEventListener("click", (event) => {
    if (event.target === inventoryModal) closePlayerModals();
  });
  notebookModal.addEventListener("click", (event) => {
    if (event.target === notebookModal) closePlayerModals();
  });
  fabricatorModal?.addEventListener("click", (event) => {
    if (event.target === fabricatorModal) closePlayerModals();
  });
  hatchWarningModal?.addEventListener("click", (event) => {
    if (event.target === hatchWarningModal) closePlayerModals();
  });
  fabricatorDisassembleButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    pulseFabricatorDisassembleButton();
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
}) {
  const wrapper = document.createElement("div");
  wrapper.className = "clothing-slot";

  const slot = createItemSlot(entry, 0, {
    locked: true,
    placeholder: label.slice(0, 1),
  });
  slot.classList.add("clothing-item-slot");
  slot.title = entry?.name ?? `${label} clothing slot`;

  if (accepts && onDrop) {
    installClothingSlotDropHandlers(slot, accepts, onDrop);
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
    slot.title = name;
    if (portrait) {
      const image = document.createElement("img");
      image.className = "slot-portrait";
      image.alt = "";
      image.src = portrait;
      slot.append(image);
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

function installClothingSlotDropHandlers(slot, accepts, onDrop) {
  slot.addEventListener("dragover", (event) => {
    const sourceSlot = draggedInventorySlot;
    const entry = sourceSlot?.items?.[sourceSlot.index];
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
    const entry = sourceSlot?.items?.[sourceSlot.index];
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
    targetEntry.count = (targetEntry.count ?? 1) + (sourceEntry.count ?? 1);
    sourceSlot.items[sourceSlot.index] = null;
  } else {
    sourceSlot.items[sourceSlot.index] = targetEntry ?? null;
    targetSlot.items[targetSlot.index] = sourceEntry;
  }

  renderHotbars();
  renderInventoryGrid();
  refreshPlacementPreview();
}

function collectPickupInteraction(interaction) {
  const item = interaction.item ?? {};
  const id = item.id ?? "item";
  const existingEntry = findInventoryEntry(id);
  if (existingEntry) {
    existingEntry.count = (existingEntry.count ?? 1) + 1;
    mergeItemMetadata(existingEntry, item);
    hydrateInventoryPortrait(existingEntry, item);
    interaction.activate?.();
    renderHotbars();
    renderInventoryGrid();
    refreshPlacementPreview();
    return true;
  }

  const slot = findEmptyInventorySlot();
  if (!slot) {
    updateInteractionPrompt({ prompt: "Inventory full" });
    return false;
  }

  const entry = {
    ...item,
    id,
    name: item.name ?? item.label ?? "Item",
    count: 1,
    portrait: item.portrait ?? createItemPortrait(item),
  };
  slot.items[slot.index] = entry;
  hydrateInventoryPortrait(entry, item);
  interaction.activate?.();
  renderHotbars();
  renderInventoryGrid();
  refreshPlacementPreview();
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
  if (!item.modelUrl || entry.modelPortraitLoaded) return;

  createGlbModelPortrait(item.modelUrl, {
    rotation: item.rotation ?? item.rotationDegrees,
  }).then((portrait) => {
    if (!portrait) return;
    entry.portrait = portrait;
    entry.modelPortraitLoaded = true;
    renderHotbars();
    renderInventoryGrid();
  });
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
    installPlacedItemMetadata(root, item);
    refreshFabricatorBatteryWires();

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
  if (!interaction || interaction.decompressionTriggered) return;

  const direction = getHatchOutflowDirection(interaction);
  interaction.decompressionTriggered = true;
  cabinPressureAtm = CABIN_PRESSURE_VACUUM_ATM;
  hatchDecompression = {
    direction,
    elapsed: 0,
    duration: HATCH_DECOMPRESSION_DURATION,
  };
  zeroGravityMode = true;
  zeroGravityVelocity.addInPlace(
    direction.scale(HATCH_DECOMPRESSION_INITIAL_IMPULSE),
  );
  clampVectorLengthInPlace(zeroGravityVelocity, HATCH_DECOMPRESSION_MAX_SPEED);
  if (playerPhysics) {
    playerPhysics.grounded = false;
    playerPhysics.verticalVelocity = zeroGravityVelocity.y;
  }
  createHatchWindBurst(interaction, direction);
  updateQuickAccessButtons();
  updateLifeSupportHud();
}

function updateHatchDecompression(seconds) {
  if (!hatchDecompression) return;

  const progress = hatchDecompression.elapsed / hatchDecompression.duration;
  const falloff = Math.max(0, 1 - progress);
  zeroGravityVelocity.addInPlace(
    hatchDecompression.direction.scale(
      HATCH_DECOMPRESSION_ACCELERATION * falloff * falloff * seconds,
    ),
  );
  clampVectorLengthInPlace(zeroGravityVelocity, HATCH_DECOMPRESSION_MAX_SPEED);
  if (playerPhysics) {
    playerPhysics.grounded = false;
    playerPhysics.verticalVelocity = zeroGravityVelocity.y;
  }

  hatchDecompression.elapsed += seconds;
  if (hatchDecompression.elapsed >= hatchDecompression.duration) {
    hatchDecompression = null;
  }
}

function updateLifeSupport(seconds) {
  if (!equippedHelmet) return;

  helmetOxygenSeconds = Math.max(
    0,
    helmetOxygenSeconds - HELMET_OXYGEN_DRAIN_PER_SECOND * seconds,
  );
  updateLifeSupportHud();
}

function updateLifeSupportHud() {
  if (airPressureMeterText) {
    airPressureMeterText.textContent = `Cabin ${cabinPressureAtm.toFixed(2)} atm`;
  }
  if (airPressureMeter) {
    const pressurePercent =
      CABIN_PRESSURE_INITIAL_ATM > 0
        ? cabinPressureAtm / CABIN_PRESSURE_INITIAL_ATM
        : 0;
    airPressureMeter.style.setProperty(
      "--meter-value",
      `${Math.max(0, Math.min(pressurePercent, 1)) * 100}%`,
    );
  }
  if (oxygenMeterText) {
    oxygenMeterText.textContent = equippedHelmet
      ? `O2 ${Math.ceil(helmetOxygenSeconds)}s`
      : "O2 no helmet";
  }
  if (oxygenMeter) {
    oxygenMeter.classList.toggle(
      "empty",
      !equippedHelmet || helmetOxygenSeconds <= 0,
    );
  }
  if (oxygenMeterFill) {
    const oxygenPercent = equippedHelmet
      ? helmetOxygenSeconds / HELMET_OXYGEN_MAX_SECONDS
      : 0;
    oxygenMeterFill.style.width = `${Math.max(0, Math.min(oxygenPercent, 1)) * 100}%`;
  }
}

function getHatchOutflowDirection(interaction) {
  const normal = interaction?.passage?.normal?.clone?.() ?? B.Axis.Z.clone();
  if (normal.lengthSquared() <= 0.000001) return B.Axis.Z.clone();
  return normal.normalize();
}

function createHatchWindBurst(interaction, direction) {
  if (!scene || !level?.platform?.root) return;

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
  const system = new B.ParticleSystem("hatch-decompression-wind", 520, scene);

  system.particleTexture = texture;
  system.emitter = emitter;
  system.minEmitBox = B.Vector3.Zero();
  system.maxEmitBox = B.Vector3.Zero();
  system.direction1 = outflow.add(right.scale(-0.42)).add(up.scale(-0.24));
  system.direction2 = outflow.add(right.scale(0.42)).add(up.scale(0.24));
  system.minEmitPower = 2.4;
  system.maxEmitPower = 7.5;
  system.emitRate = 720;
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
  if (equippedHelmet || helmetEquipInProgress) {
    updateInteractionPrompt({ prompt: "Helmet already equipped" });
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
    root.position.set(0, -0.22, 0.075);
    root.scaling.scaleInPlace(1.08);
    root.computeWorldMatrix(true);

    for (const mesh of getRootRenderableMeshes(root)) {
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      if (mesh.material) {
        mesh.material.backFaceCulling = true;
      }
    }

    equippedHelmet = {
      root,
      item,
      visorOpen: false,
      animationGroups: root.metadata?.importedAnimationGroups ?? [],
      visor: createHelmetVisorController(root),
    };
    helmetOxygenSeconds = HELMET_OXYGEN_MAX_SECONDS;
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

function initializeMountedHooks() {
  const interactions = level.platform?.interactions ?? [];
  for (const interaction of interactions) {
    if (
      interaction.type !== "helmet-hook" ||
      !interaction.initialMountedItem ||
      interaction.initialMountResolved
    ) {
      continue;
    }

    interaction.initialMountResolved = true;
    mountHelmetItemOnHook(interaction, { ...interaction.initialMountedItem });
  }
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
  const existingEntry = findInventoryEntry(id);
  if (existingEntry) {
    existingEntry.count = (existingEntry.count ?? 1) + amount;
    mergeItemMetadata(existingEntry, item);
    hydrateInventoryPortrait(existingEntry, item);
    return true;
  }

  const slot = findEmptyInventorySlot();
  if (!slot) return false;

  const entry = {
    ...item,
    id,
    name: item.name ?? item.label ?? "Item",
    count: amount,
    portrait: item.portrait ?? createItemPortrait(item),
  };
  slot.items[slot.index] = entry;
  hydrateInventoryPortrait(entry, item);
  return true;
}

function canAddInventoryItemCounts(items) {
  const existingIds = new Set(
    [...hotbarItems, ...inventoryItems].filter(Boolean).map((entry) => entry.id),
  );
  const neededSlots = new Set();
  for (const { item, count } of items) {
    if (!item?.id || count <= 0 || existingIds.has(item.id)) continue;
    neededSlots.add(item.id);
  }
  const emptySlots = [...hotbarItems, ...inventoryItems].filter(
    (entry) => !entry,
  ).length;
  return neededSlots.size <= emptySlots;
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
  };
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
  return B.Vector3.FromArray(resolveItemRotation(item));
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
  renderFabricatorAnalysis();
  fabricatorModal.hidden = false;
  document.body.classList.add("ui-modal-open");
  exitPointerLock();
}

function pulseFabricatorDisassembleButton() {
  startFabricatorDisassembly(activeFabricatorRoot);
}

function renderFabricatorAnalysis() {
  const mounted = activeFabricatorRoot?.metadata?.fabricatorMountedAsteroid;
  const yieldValues = getAsteroidYield(mounted?.composition);
  const hasYield = Boolean(yieldValues);
  const disassembly = activeFabricatorRoot?.metadata?.fabricatorDisassembly;
  const processing = Boolean(disassembly);

  if (fabricatorAnalysisStatus) {
    let statusText = "No asteroid loaded";
    if (processing) {
      statusText = `Disassembling ${Math.ceil(disassembly.remaining)}s`;
    } else if (hasYield) {
      statusText = "Asteroid analyzed";
    }
    fabricatorAnalysisStatus.textContent = statusText;
  }
  if (fabricatorYieldIron) {
    fabricatorYieldIron.textContent = hasYield ? String(yieldValues.iron) : "-";
  }
  if (fabricatorYieldCopper) {
    fabricatorYieldCopper.textContent = hasYield
      ? String(yieldValues.copper)
      : "-";
  }
  if (fabricatorYieldWater) {
    fabricatorYieldWater.textContent = hasYield
      ? String(yieldValues.water)
      : "-";
  }
  if (fabricatorDisassembleButton) {
    fabricatorDisassembleButton.disabled = !hasYield || processing;
    fabricatorDisassembleButton.textContent = processing
      ? "Disassembling"
      : "Disassemble";
  }
}

function startFabricatorDisassembly(root) {
  if (!root || root.metadata?.fabricatorDisassembly) return false;

  const mounted = root.metadata?.fabricatorMountedAsteroid;
  const yieldValues = getAsteroidYield(mounted?.composition);
  if (!mounted?.mesh || !yieldValues) {
    updateInteractionPrompt({ prompt: "No asteroid loaded" });
    renderFabricatorAnalysis();
    return false;
  }

  const rewards = createFabricatorRewards(yieldValues);
  if (!canAddInventoryItemCounts(rewards)) {
    updateInteractionPrompt({ prompt: "Inventory full" });
    return false;
  }

  const job = {
    root,
    mounted,
    mesh: mounted.mesh,
    rewards,
    elapsed: 0,
    remaining: FABRICATOR_DISASSEMBLE_SECONDS,
    duration: FABRICATOR_DISASSEMBLE_SECONDS,
    originalScaling: mounted.mesh.scaling.clone(),
    effects: createFabricatorDisassemblyEffects(root, mounted.mesh),
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

function createFabricatorRewards(yieldValues) {
  return [
    { item: fabricatorResourceItems.iron, count: yieldValues.iron },
    { item: fabricatorResourceItems.water, count: yieldValues.water },
    { item: fabricatorResourceItems.copper, count: yieldValues.copper },
  ].filter(({ count }) => count > 0);
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

  for (const { item, count } of job.rewards) {
    addInventoryItemCount(item, count);
  }
  renderHotbars();
  renderInventoryGrid();
  refreshPlacementPreview();
  if (activeFabricatorRoot === job.root) {
    renderFabricatorAnalysis();
  }
  updateInteractionPrompt({
    prompt: `Disassembled · ${formatFabricatorRewards(job.rewards)}`,
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
  return rewards
    .map(({ item, count }) => `${count} ${item.name}`)
    .join(" · ");
}

function createFabricatorDisassemblyEffects(root, asteroidMesh) {
  const platformRoot = level?.platform?.root;
  if (!platformRoot || !asteroidMesh) return null;

  const start = getWireAnchorPoint(root, "fabricator");
  const end = asteroidMesh.position.clone();
  const beamMaterial = createFabricatorLaserMaterial();
  const beam = B.MeshBuilder.CreateTube(
    "fabricator-blue-disassembly-laser",
    {
      path: [start, end],
      radius: FABRICATOR_LASER_RADIUS,
      tessellation: 12,
      cap: B.Mesh.CAP_ALL,
    },
    scene,
  );
  beam.parent = platformRoot;
  beam.material = beamMaterial;
  beam.isPickable = false;
  beam.checkCollisions = false;
  beam.metadata = {
    ...(beam.metadata ?? {}),
    excludeFromBounds: true,
    excludeFromCollision: true,
    fabricatorDisassemblyEffect: true,
  };

  const impactMaterial = createFabricatorLaserMaterial();
  const impact = B.MeshBuilder.CreateSphere(
    "fabricator-blue-disassembly-impact",
    { diameter: 0.07, segments: 16 },
    scene,
  );
  impact.parent = platformRoot;
  impact.position.copyFrom(end);
  impact.material = impactMaterial;
  impact.isPickable = false;
  impact.checkCollisions = false;
  impact.metadata = {
    ...(impact.metadata ?? {}),
    excludeFromBounds: true,
    excludeFromCollision: true,
    fabricatorDisassemblyEffect: true,
  };

  return { beam, impact, beamMaterial, impactMaterial };
}

function createFabricatorLaserMaterial() {
  const material = new B.StandardMaterial(
    "fabricator-blue-disassembly-laser-material",
    scene,
  );
  material.diffuseColor = new B.Color3(0.12, 0.55, 1);
  material.emissiveColor = new B.Color3(0.18, 0.75, 1);
  material.specularColor = new B.Color3(0.65, 0.9, 1);
  material.alpha = 0.72;
  return material;
}

function updateFabricatorDisassemblyEffects(job, progress) {
  const pulse = 0.5 + 0.5 * Math.sin(job.elapsed * 18);
  if (job.effects?.beamMaterial) {
    job.effects.beamMaterial.alpha = 0.52 + pulse * 0.34;
    job.effects.beamMaterial.emissiveColor.copyFromFloats(
      0.12 + pulse * 0.12,
      0.55 + pulse * 0.28,
      1,
    );
  }
  if (job.effects?.impact) {
    const scale = 0.75 + pulse * 0.55 + progress * 0.85;
    job.effects.impact.scaling.setAll(scale);
  }
  if (job.effects?.impactMaterial) {
    job.effects.impactMaterial.alpha = 0.36 + pulse * 0.42;
  }
  if (job.mesh && !job.mesh.isDisposed?.()) {
    const shrink = Math.max(0.05, 1 - progress * 0.95);
    job.mesh.scaling.copyFrom(job.originalScaling.scale(shrink));
    job.mesh.rotation.y += 0.025;
  }
}

function cleanupFabricatorDisassemblyEffects(effects) {
  effects?.beam?.dispose(false, true);
  effects?.impact?.dispose(false, true);
  effects?.beamMaterial?.dispose?.();
  effects?.impactMaterial?.dispose?.();
}

function openHatchWarningModal(interaction) {
  if (!hatchWarningModal || !hatchWarningActions || !interaction) return false;
  closePlayerModals();
  pendingHatchInteraction = interaction;
  hatchWarningActions.replaceChildren(
    ...createHatchWarningButtons(Boolean(equippedHelmet)),
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
  if (hatchWarningModal) hatchWarningModal.hidden = true;
  activeFabricatorRoot = null;
  pendingHatchInteraction = null;
  document.body.classList.remove("ui-modal-open");
  keys.clear();
}

function isUiModalOpen() {
  return (
    !inventoryModal.hidden ||
    !notebookModal.hidden ||
    Boolean(fabricatorModal && !fabricatorModal.hidden) ||
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
    setMenuBusy(true);
    const saveFile = await loadSaveFile(path);
    saveFile.path = path;
    startGame(saveFile);
  } catch (error) {
    setMenuBusy(false);
    showRuntimeError(error);
  }
}

async function startGameFromFile(file) {
  try {
    setMenuBusy(true);
    const saveFile = JSON.parse(await file.text());
    saveFile.path = file.name;
    startGame(saveFile);
  } catch (error) {
    setMenuBusy(false);
    showRuntimeError(error);
  }
}

function startGame(saveFile) {
  if (gameStarted) return;
  gameStarted = true;
  currentSaveFile = saveFile;
  stopMenuBackground();
  document.body.classList.remove("menu-open");

  brownDwarfLevel = applySaveToLevel(baseBrownDwarfLevel, saveFile);
  applySavedWorldPreload(brownDwarfLevel, saveFile.world);
  engine = new B.Engine(canvas, true, {
    antialias: true,
    adaptToDeviceRatio: false,
    powerPreference: "high-performance",
  });
  engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, 1.5));
  engine.metadata = { performance: {} };
  scene = new B.Scene(engine);
  scene.metadata = {
    timeScale: 1,
    profiler: createAssetProfiler(),
  };
  collisionDebugVisible = false;
  performanceMonitor = createPerformanceMonitor(engine, metrics);

  scene.clearColor.set(0, 0, 0, 1);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.exposure = 0.9;
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

  level = buildLevel(scene, brownDwarfLevel);
  thirdPersonCamera = createThirdPersonCamera(scene, camera);
  playerPhysics = {
    verticalVelocity: 0,
    grounded: Boolean(level.platform),
    eyeHeight: level.platform?.physics?.eyeHeight ?? camera.position.y,
    platformEyeHeight: level.platform?.physics?.eyeHeight ?? camera.position.y,
  };
  installHudControls();
  restoreSavedWorldState(saveFile.world);
  toolTipsVisible = true;
  updateToolTipsVisibility();
  refreshPlacementPreview();
  installPlayerLoop();

  engine.runRenderLoop(() => {
    const frame = performanceMonitor.beginFrame();
    scene.render();
    performanceMonitor.endFrame(frame);
  });
  addEventListener("resize", () => engine?.resize());
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

  const airPressureControl = createLifeSupportMeter("air-pressure", "Cabin");
  airPressureMeter = airPressureControl.meter;
  airPressureMeterText = airPressureControl.text;
  const oxygenControl = createLifeSupportMeter("oxygen", "O2");
  oxygenMeter = oxygenControl.meter;
  oxygenMeterFill = oxygenControl.fill;
  oxygenMeterText = oxygenControl.text;
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
  vitals?.append(airPressureControl.root, oxygenControl.root);
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

function createLifeSupportMeter(kind, labelText) {
  const root = document.createElement("span");
  root.className = `hud-meter ${kind}`;

  const text = document.createElement("span");
  text.className = "hud-meter-text";
  text.textContent = labelText;

  const meter = document.createElement("span");
  meter.className = "hud-meter-track";
  meter.style.setProperty("--meter-value", "100%");

  const fill = document.createElement("span");
  fill.className = "hud-meter-fill";
  meter.append(fill);

  root.append(text, meter);
  return { root, meter, fill, text };
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
      cabinPressureAtm: Number(cabinPressureAtm.toFixed(3)),
      helmetOxygenSeconds: Number(helmetOxygenSeconds.toFixed(1)),
    },
    inventory: inventoryItems.map(sanitizeInventoryEntryForSave),
    hotbar: hotbarItems.map(sanitizeInventoryEntryForSave),
    pickups: {
      collectedIds: getCollectedPickupIds(),
    },
    placedItems: getPlacedItemsForSave(),
    asteroids: {
      dropped: getDroppedAsteroidsForSave(),
    },
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
  const roots = new Set();
  for (const mesh of scene?.meshes ?? []) {
    const root = mesh.metadata?.glbPickupRoot;
    if (root?.metadata?.placedItem && root.isEnabled?.() !== false) {
      roots.add(root);
    }
  }

  for (const root of roots) {
    const placedItem = {
      item: sanitizeItemForSave(root.metadata.placedItem),
      position: vectorToArray(root.position),
      rotationDegrees: vectorRadiansToDegrees(root.rotation),
    };
    const mountedAsteroid = getFabricatorMountedAsteroidForSave(root);
    if (mountedAsteroid) {
      placedItem.fabricatorMountedAsteroid = mountedAsteroid;
    }
    placed.push(placedItem);
  }
  return placed;
}

function getDroppedAsteroidsForSave() {
  return [...asteroidBodies]
    .filter((body) => isAsteroidBodyActive(body))
    .map((body) => {
      const mesh = body.mesh;
      const rotation =
        mesh.rotationQuaternion?.toEulerAngles?.() ?? mesh.rotation;
      return {
        position: vectorToArray(mesh.position),
        rotationDegrees: vectorRadiansToDegrees(rotation),
        scale: vectorToArray(mesh.scaling),
        velocity: vectorToArray(body.velocity),
        angularVelocity: vectorToArray(body.angularVelocity),
        radius: Number(body.radius.toFixed(4)),
        composition: cloneSave(mesh.metadata?.asteroidComposition ?? {}),
        color: cloneSave(mesh.metadata?.asteroidColor ?? null),
      };
    });
}

function getFabricatorMountedAsteroidForSave(root) {
  const mounted = root?.metadata?.fabricatorMountedAsteroid;
  const mesh = mounted?.mesh;
  if (!mesh || mesh.isDisposed?.()) return null;
  const composition = mounted.composition ?? mesh.metadata?.asteroidComposition;
  if (!composition) return null;

  return {
    composition: cloneSave(composition),
    color: cloneSave(mesh.metadata?.asteroidColor ?? null),
    radius: Number((mounted.radius ?? 0).toFixed(4)),
    scale: vectorToArray(mesh.scaling),
  };
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
  const { portrait, modelPortraitLoaded, visor, animationGroups, ...clean } =
    item;
  return cloneSave(clean);
}

function applySavedWorldPreload(levelConfig, world) {
  if (!world?.pickups?.collectedIds?.length || !levelConfig?.platform) return;
  levelConfig.platform.collectedPickupIds = world.pickups.collectedIds;
}

function restoreSavedWorldState(world) {
  if (!world) return;

  restorePlayerState(world.player);
  restoreSceneState(world.scene);
  restoreLifeSupportState(world.lifeSupport);
  restoreInventoryState(world);
  restoreHelmetState(world.helmet, world.lifeSupport);
  restorePlacedItems(world.placedItems);
  restoreDroppedAsteroids(world.asteroids?.dropped);
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
  const savedPressure = Number(lifeSupport?.cabinPressureAtm);
  cabinPressureAtm = Number.isFinite(savedPressure)
    ? Math.max(0, Math.min(savedPressure, CABIN_PRESSURE_INITIAL_ATM))
    : CABIN_PRESSURE_INITIAL_ATM;

  const savedOxygen = Number(lifeSupport?.helmetOxygenSeconds);
  helmetOxygenSeconds = Number.isFinite(savedOxygen)
    ? Math.max(0, Math.min(savedOxygen, HELMET_OXYGEN_MAX_SECONDS))
    : HELMET_OXYGEN_MAX_SECONDS;
  updateLifeSupportHud();
}

function restoreDroppedAsteroids(savedAsteroids) {
  if (!Array.isArray(savedAsteroids)) return;
  for (const asteroid of savedAsteroids) {
    restoreDroppedAsteroid(asteroid);
  }
}

function restoreDroppedAsteroid(asteroid) {
  if (!Array.isArray(asteroid?.position)) return;

  const radius =
    Number(asteroid.radius) || FABRICATOR_ASTEROID_MAX_RADIUS * 0.7;
  const mesh = createAsteroidMeshFromSource(null, "dropped-asteroid", {
    color: asteroid.color,
  });
  mesh.parent = level?.platform?.root ?? null;
  mesh.position.copyFrom(B.Vector3.FromArray(asteroid.position));
  mesh.scaling.copyFrom(
    B.Vector3.FromArray(asteroid.scale ?? [radius, radius, radius]),
  );
  if (Array.isArray(asteroid.rotationDegrees)) {
    mesh.rotation = B.Vector3.FromArray(
      vectorDegreesToRadians(asteroid.rotationDegrees),
    );
  }
  mesh.isPickable = true;
  mesh.checkCollisions = false;
  mesh.receiveShadows = true;
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    excludeFromBounds: false,
    excludeFromCollision: true,
    heldAsteroid: false,
    asteroidComposition: cloneSave(asteroid.composition ?? {}),
    asteroidColor: cloneSave(asteroid.color ?? null),
  };
  installDroppedAsteroidInteraction(mesh);
  registerAsteroidBody(mesh, {
    radius,
    velocity: Array.isArray(asteroid.velocity)
      ? B.Vector3.FromArray(asteroid.velocity)
      : B.Vector3.Zero(),
    angularVelocity: Array.isArray(asteroid.angularVelocity)
      ? B.Vector3.FromArray(asteroid.angularVelocity)
      : createAsteroidAngularVelocity(),
  });
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

function restoreHelmetState(helmet, lifeSupport) {
  const hook = getHelmetHookInteraction();
  if (hook) {
    hook.initialMountResolved = true;
    hook.initialMountedItem = null;
    hook.mountedRoot?.dispose(false, true);
    hook.mountedRoot = null;
    hook.mountedItem = null;
    if (helmet?.mountedItem) {
      mountHelmetItemOnHook(hook, cloneSave(helmet.mountedItem));
    }
  }

  if (helmet?.equipped?.item) {
    equipHelmetItem(cloneSave(helmet.equipped.item)).then((equipped) => {
      const savedOxygen = Number(lifeSupport?.helmetOxygenSeconds);
      if (equipped && Number.isFinite(savedOxygen)) {
        helmetOxygenSeconds = Math.max(
          0,
          Math.min(savedOxygen, HELMET_OXYGEN_MAX_SECONDS),
        );
        updateLifeSupportHud();
      }
      if (equipped && helmet.equipped.visorOpen) {
        setHelmetVisorOpen(true, true);
        updateHudButtons();
      }
    });
  }
}

function restorePlacedItems(placedItems) {
  if (!Array.isArray(placedItems)) return;
  for (const placed of placedItems) {
    restorePlacedItem(placed);
  }
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
    restoreFabricatorMountedAsteroid(root, placed.fabricatorMountedAsteroid);
    queueFabricatorBatteryWireRefresh();
  } catch (error) {
    console.error("Failed to restore placed item.", error);
  }
}

function restoreFabricatorMountedAsteroid(root, asteroid) {
  if (!asteroid || !isFabricatorItem(root?.metadata?.placedItem)) return;

  const radius =
    Number(asteroid.radius) || FABRICATOR_ASTEROID_MAX_RADIUS * 0.7;
  const mesh = createAsteroidMeshFromSource(
    null,
    "fabricator-mounted-asteroid",
    {
      color: asteroid.color,
    },
  );
  mesh.scaling.copyFrom(
    B.Vector3.FromArray(asteroid.scale ?? [radius, radius, radius]),
  );
  if (level?.platform?.root) {
    mesh.parent = level.platform.root;
  }
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.receiveShadows = true;
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    excludeFromBounds: false,
    excludeFromCollision: true,
    fabricatorMountedAsteroid: true,
    asteroidComposition: cloneSave(asteroid.composition ?? {}),
    asteroidColor: cloneSave(asteroid.color ?? null),
  };
  positionAsteroidOnFabricator(mesh, root, radius);
  root.metadata = {
    ...(root.metadata ?? {}),
    fabricatorMountedAsteroid: {
      mesh,
      composition: cloneSave(asteroid.composition ?? {}),
      radius,
    },
  };
}

function queueFabricatorBatteryWireRefresh() {
  requestAnimationFrame(() => refreshFabricatorBatteryWires());
}

function refreshFabricatorBatteryWires() {
  for (const wire of fabricatorBatteryWires) {
    wire.dispose(false, true);
  }
  fabricatorBatteryWires.clear();

  const fabricators = getPlacedItemRoots((item) => isFabricatorItem(item));
  const batteries = getPlacedItemRoots((item) => isBatteryItem(item));
  if (!fabricators.length || !batteries.length) return;

  const usedBatteries = new Set();
  for (const fabricator of fabricators) {
    const battery = findClosestPlacedRoot(fabricator, batteries, usedBatteries);
    if (!battery) continue;
    usedBatteries.add(battery);
    const wire = createFabricatorBatteryWire(fabricator, battery);
    if (wire) fabricatorBatteryWires.add(wire);
  }
}

function getPlacedItemRoots(predicate) {
  const roots = new Set();
  for (const mesh of scene?.meshes ?? []) {
    const root = mesh.metadata?.glbPickupRoot;
    const item = root?.metadata?.placedItem;
    if (root && item && root.isEnabled?.() !== false && predicate(item)) {
      roots.add(root);
    }
  }
  return [...roots];
}

function findClosestPlacedRoot(source, candidates, excluded = new Set()) {
  let closest = null;
  let closestDistance = Infinity;
  for (const candidate of candidates) {
    if (excluded.has(candidate)) continue;
    const distance = source.position
      .subtract(candidate.position)
      .lengthSquared();
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }
  return closest;
}

function createFabricatorBatteryWire(fabricator, battery) {
  const platformRoot = level?.platform?.root;
  if (!platformRoot) return null;

  const fabricatorPoint = getWireAnchorPoint(fabricator, "fabricator");
  const batteryPoint = getWireAnchorPoint(battery, "battery");
  if (!fabricatorPoint || !batteryPoint) return null;

  const midpoint = fabricatorPoint.add(batteryPoint).scale(0.5);
  midpoint.y = Math.min(fabricatorPoint.y, batteryPoint.y) - 0.045;
  const wire = B.MeshBuilder.CreateTube(
    "fabricator-battery-red-wire",
    {
      path: [fabricatorPoint, midpoint, batteryPoint],
      radius: FABRICATOR_BATTERY_WIRE_RADIUS,
      tessellation: 10,
      cap: B.Mesh.CAP_ALL,
    },
    scene,
  );
  wire.parent = platformRoot;
  wire.material = getFabricatorBatteryWireMaterial();
  wire.isPickable = false;
  wire.checkCollisions = false;
  wire.receiveShadows = true;
  wire.metadata = {
    ...(wire.metadata ?? {}),
    excludeFromBounds: true,
    excludeFromCollision: true,
    fabricatorBatteryWire: true,
  };
  return wire;
}

function getWireAnchorPoint(root, type) {
  const bounds = getRootBoundsInPlatform(root);
  if (!bounds) return root.position.clone();

  const center = bounds.min.add(bounds.max).scale(0.5);
  if (type === "fabricator") {
    return new B.Vector3(center.x, bounds.min.y + 0.06, center.z);
  }
  return new B.Vector3(center.x, center.y, center.z);
}

function getFabricatorBatteryWireMaterial() {
  const materialName = "fabricator-battery-red-wire-material";
  const existing = scene.getMaterialByName?.(materialName);
  if (existing) return existing;

  const material = new B.StandardMaterial(materialName, scene);
  material.diffuseColor = new B.Color3(0.95, 0.04, 0.025);
  material.emissiveColor = new B.Color3(0.28, 0.01, 0.006);
  material.specularColor = new B.Color3(0.45, 0.08, 0.06);
  material.specularPower = 48;
  return material;
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

      initializeMountedHooks();
      updateActiveInteraction();
      updatePlacementPreview();

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
      updateLifeSupport(seconds);
      updateFabricatorDisassembly(seconds);

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
      updateAsteroidPhysics(seconds, platformPhysics);
      updatePlayerTether(seconds);
      if (thirdPersonMode) {
        updateThirdPersonCamera();
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
    Boolean(mesh.metadata?.glbPickupLabel),
  );
  const interaction = createGlbPickupPrompt(hit?.pickedMesh);
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
    const yieldText = formatAsteroidComposition(mounted?.composition);
    const occupiedText = mounted && yieldText ? ` · Yield ${yieldText}` : "";
    const heldPrompt = createHeldAsteroidFabricatorPrompt(root, label);
    return {
      type: "fabricator",
      range: mesh.metadata.glbPickupRange ?? GLB_PICKUP_PROMPT_RANGE,
      root,
      item,
      acceptsHeldAsteroid:
        Boolean(heldAsteroid) && canPlaceHeldAsteroidOnFabricator(root).ok,
      prompt: heldAsteroid
        ? heldPrompt
        : `Press F to use ${label}${occupiedText}`,
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
    mesh.position.copyFrom(
      new B.Vector3(
        center.x,
        bounds.min.y + radius + FABRICATOR_ASTEROID_BOTTOM_CLEARANCE,
        center.z,
      ).addInPlace(forward.scale(FABRICATOR_ASTEROID_FORWARD_OFFSET)),
    );
    return;
  }

  mesh.setParent(root ?? platformRoot ?? null);
  mesh.position.set(0, radius + FABRICATOR_ASTEROID_BOTTOM_CLEARANCE, 0.075);
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

function deactivateGlbPickupMesh(mesh) {
  const root = mesh?.metadata?.glbPickupRoot ?? mesh;
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
  refreshFabricatorBatteryWires();
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
        { radius: 1, subdivisions: 3, flat: false },
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
    vertexData.applyToMesh(mesh);
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
  clampVectorLengthInPlace(body.velocity, ASTEROID_MAX_SPEED);
  mesh.position.addInPlace(body.velocity.scale(seconds));
  updateAsteroidSpin(body, seconds);

  resolveAsteroidAgainstCollisionObjects(body, platform);
  resolveAsteroidAgainstPlayer(body, platform);
  body.velocity.scaleInPlace(ASTEROID_COLLISION_DAMPING);
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
  if (!platform) return;

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
  }
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
  if (!camera || !platform || body.mesh === heldAsteroid?.mesh) return;

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

  if (!best) return;

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
  ]
    .map(([label, value]) => `${label} ${value}`)
    .join(" · ");
}

function getAsteroidYield(composition) {
  if (!composition) return null;

  const iron = Math.max(0, Math.min(10, Math.round(Number(composition.iron))));
  const copper = Math.max(
    0,
    Math.min(10, Math.round(Number(composition.copper))),
  );
  const water = Math.max(
    0,
    Math.min(10, Math.round(Number(composition.water))),
  );
  const total = iron + copper + water;
  if (!Number.isFinite(total) || total <= 0) return null;

  return { iron, copper, water };
}

function updateInteractionPrompt(interaction) {
  activeInteraction = interaction;
  if (!interactionPrompt) return;

  if (!interaction) {
    interactionPrompt.hidden = true;
    interactionPrompt.textContent = "";
    return;
  }

  interactionPrompt.hidden = !toolTipsVisible;
  if (interaction.type === "helmet-hook") {
    interactionPrompt.textContent = getHelmetHookPrompt(interaction);
    return;
  }
  interactionPrompt.textContent =
    interaction.getPrompt?.() ?? interaction.prompt ?? "Press E";
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

function updateQuickAccessButtons() {
  if (!zeroGravityKeyButton) return;
  zeroGravityKeyButton.title = zeroGravityMode
    ? "Disable zero gravity (K)"
    : "Enable zero gravity (K)";
  zeroGravityKeyButton.setAttribute("aria-pressed", String(zeroGravityMode));
}

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
    clampVectorLengthInPlace(zeroGravityVelocity, ZERO_G_MAX_SPEED);
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
  if (!platform) return false;
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
