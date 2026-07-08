import baseBrownDwarfLevel from "./levels/brown_dwarf/level.js";
import { createItemPortrait } from "./src/item-portraits.js";
import { createGlbModelPortrait } from "./src/model-preview.js";
import { buildLevel } from "./src/level-system.js";
import { applySaveToLevel, loadSaveFile } from "./src/save-system.js";

const B = window.BABYLON;
const DEFAULT_SAVE_PATH = "./saves/brown-dwarf-default.json";
const canvas = document.querySelector("#sandbox");
const metrics = document.querySelector(".metrics");
const hud = document.querySelector(".hud");
const menuError = document.querySelector("#menu-error");
const savePathInput = document.querySelector("#save-path-input");
const saveFileInput = document.querySelector("#save-file-input");
const hotbar = document.querySelector("#hotbar");
const zeroGravityKeyButton = document.querySelector("#zero-gravity-key-button");
const inventoryKeyButton = document.querySelector("#inventory-key-button");
const notebookKeyButton = document.querySelector("#notebook-key-button");
const inventoryModal = document.querySelector("#inventory-modal");
const notebookModal = document.querySelector("#notebook-modal");
const inventoryGrid = document.querySelector(".inventory-grid");
const modalHotbar = document.querySelector(".modal-hotbar");
const notebookTabs = document.querySelector(".notebook-tabs");
const notebookCopy = document.querySelector(".notebook-copy");
const interactionPrompt = document.querySelector("#interaction-prompt");
const backgroundMusic = createBackgroundMusic("./background.mp3");
const BASE_MOUSE_SENSIBILITY = 2600;
const GLB_PICKUP_PROMPT_RANGE = 1.8;
const MENU_STAR_DOME_RADIUS = 900;
const PLACEMENT_RANGE = 3.2;
const PLACEMENT_PADDING = 0.035;
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
const ZERO_G_THRUST_ACCELERATION = 1.55;
const ZERO_G_THRUST_BOOST_MULTIPLIER = 1.55;
const ZERO_G_MAX_SPEED = 4.6;
const ZERO_G_THRUSTER_EMIT_RATE = 85;
const ZERO_G_THRUSTER_EMITTER_OFFSET = 0.34;
const CROUCH_EYE_HEIGHT_SCALE = 0.76;
const CROUCH_TRANSITION_SPEED = 8;
const CROUCH_SPEED_SCALE = 0.45;
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
  if (event.code === "F3") {
    event.preventDefault();
    if (gameStarted) toggleToolTips();
    return;
  }
  if (!gameStarted) return;
  if (event.code === "F6") {
    event.preventDefault();
    toggleObjectBounds();
    return;
  }
  if (event.code === "F8") {
    event.preventDefault();
    toggleThirdPersonCamera();
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
    if (!toggleTetherFromActiveHook()) {
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
  if (event.code === "KeyE" && activeInteraction) {
    event.preventDefault();
    let interactionHandled = true;
    if (activeInteraction.type === "pickup") {
      interactionHandled = collectPickupInteraction(activeInteraction);
    } else if (activeInteraction.type === "helmet-hook") {
      interactionHandled = activateHelmetHook(activeInteraction);
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
let zeroGravityMode = false;
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
let timeButton = null;
let flyButton = null;
let cameraButton = null;
let visorButton = null;
let saveStartButton = null;
let mouseSensitivitySlider = null;
let mouseSensitivityValue = null;
let activeInteraction = null;
let objectBoundsVisible = false;
let draggedInventorySlot = null;
let placementPreview = null;
let placementPreviewKey = "";
let placementPreviewLoadId = 0;
let placementState = null;
let placementInProgress = false;
let equippedHelmet = null;
let helmetEquipInProgress = false;
let playerTether = null;

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

  renderHotbars();
  renderInventoryGrid();
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
  if (options.items) {
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
  }
  slot.append(key);
  return slot;
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
    root.position.copyFrom(state.localPosition);
    settleItemRootOnFloor(root, item);
    installPlacedItemMetadata(root, item);

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

function attachPlayerTether(interaction) {
  if (!interaction?.tetherAnchor || !level?.platform?.root) {
    updateInteractionPrompt({ prompt: "No tether anchor" });
    return false;
  }

  detachPlayerTether();
  const material = createPlayerTetherMaterial();
  const anchor = interaction.tetherAnchor.position.clone();
  const maxLength = interaction.tetherLength ?? 2.35;
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
    dampenPlayerVelocityFromTetherCorrection(correction);
  }
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
    root.position.set(0, -0.125, 0.075);
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
    setHelmetVisorOpen(false, true);
    updateHudButtons();
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
  const id = item.id ?? "item";
  const existingEntry = findInventoryEntry(id);
  if (existingEntry) {
    existingEntry.count = (existingEntry.count ?? 1) + 1;
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
    count: 1,
    portrait: item.portrait ?? createItemPortrait(item),
  };
  slot.items[slot.index] = entry;
  hydrateInventoryPortrait(entry, item);
  return true;
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

  for (const mesh of getRootRenderableMeshes(root)) {
    mesh.isPickable = Boolean(options.pickable);
    mesh.checkCollisions = false;
    mesh.receiveShadows = !options.hologram;
    mesh.showBoundingBox = false;
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
  for (const mesh of getRootRenderableMeshes(root)) {
    mesh.isPickable = true;
    mesh.metadata = {
      ...(mesh.metadata ?? {}),
      glbPickupLabel: item.name ?? item.label ?? item.id ?? "Item",
      glbPickupRange: GLB_PICKUP_PROMPT_RANGE,
      glbPickupRoot: root,
      glbPickupItem: { ...item },
    };
    mesh.showBoundingBox = Boolean(scene.metadata?.objectBoundsVisible);
  }
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

  placementPreview.root.position.copyFrom(state.localPosition);
  settleItemRootOnFloor(placementPreview.root, item);
  placementPreview.root.setEnabled(true);
  applyPlacementPreviewMaterial(placementPreview, state.valid);
}

function getPlacementState(item, root) {
  const platform = level.platform?.physics;
  if (!platform || !root) return null;

  const localPoint = getFloorPlacementPoint(platform);
  if (!localPoint) return null;

  root.position.copyFrom(localPoint);
  settleItemRootOnFloor(root, item);
  const bounds = getRootBoundsInPlatform(root);
  if (!bounds) return null;

  const inside = isPlacementInsidePlatform(bounds, platform);
  const blocked = inside && doesPlacementOverlap(bounds, root);
  return {
    localPosition: root.position.clone(),
    bounds,
    valid: inside && !blocked,
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

function doesPlacementOverlap(bounds, previewRoot) {
  for (const root of getActivePlaceableRoots()) {
    if (root === previewRoot) continue;
    const otherBounds = getRootBoundsInPlatform(root);
    if (
      otherBounds &&
      boundsOverlapXZ(bounds, otherBounds, PLACEMENT_PADDING)
    ) {
      return true;
    }
  }
  return false;
}

function getActivePlaceableRoots() {
  const roots = new Set();
  for (const mesh of scene.meshes) {
    const root = mesh.metadata?.glbPickupRoot;
    if (!root || root === placementPreview?.root) continue;
    if (root.isDisposed?.() || root.isEnabled?.() === false) continue;
    roots.add(root);
  }
  return roots;
}

function boundsOverlapXZ(a, b, padding = 0) {
  return !(
    a.max.x + padding <= b.min.x ||
    a.min.x - padding >= b.max.x ||
    a.max.z + padding <= b.min.z ||
    a.min.z - padding >= b.max.z
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
    .filter((mesh) => mesh.getTotalVertices?.() > 0);
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

function closePlayerModals() {
  inventoryModal.hidden = true;
  notebookModal.hidden = true;
  document.body.classList.remove("ui-modal-open");
  keys.clear();
}

function isUiModalOpen() {
  return !inventoryModal.hidden || !notebookModal.hidden;
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
  camera.attachControl(canvas, true);

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

function toggleThirdPersonCamera() {
  if (!thirdPersonCamera || !scene) return;

  thirdPersonMode = !thirdPersonMode;
  if (thirdPersonMode) {
    updateThirdPersonCamera(true);
    thirdPersonCamera.rotation.copyFrom(camera.rotation);
    camera.detachControl(canvas);
    thirdPersonCamera.attachControl(canvas, true);
    scene.activeCamera = thirdPersonCamera;
  } else {
    camera.rotation.copyFrom(thirdPersonCamera.rotation);
    thirdPersonCamera.detachControl(canvas);
    camera.attachControl(canvas, true);
    scene.activeCamera = camera;
  }
  updateHudButtons();
}

function syncPlayerLookFromThirdPersonCamera() {
  if (!thirdPersonMode || !thirdPersonCamera || !camera) return;
  camera.rotation.copyFrom(thirdPersonCamera.rotation);
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
  thirdPersonCamera.rotation.copyFrom(camera.rotation);
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
  const roots = new Set();
  for (const mesh of scene?.meshes ?? []) {
    const root = mesh.metadata?.glbPickupRoot;
    if (root?.metadata?.placedItem && root.isEnabled?.() !== false) {
      roots.add(root);
    }
  }

  for (const root of roots) {
    placed.push({
      item: sanitizeItemForSave(root.metadata.placedItem),
      position: vectorToArray(root.position),
      rotationDegrees: vectorRadiansToDegrees(root.rotation),
    });
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
  restoreInventoryState(world);
  restoreHelmetState(world.helmet);
  restorePlacedItems(world.placedItems);
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
  }
  flyMode = Boolean(player.flyMode);
  zeroGravityMode = Boolean(player.zeroGravityMode);
  if (Array.isArray(player.zeroGravityVelocity)) {
    zeroGravityVelocity.copyFrom(B.Vector3.FromArray(player.zeroGravityVelocity));
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

function restoreHelmetState(helmet) {
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
  } catch (error) {
    console.error("Failed to restore placed item.", error);
  }
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
      syncPlayerLookFromThirdPersonCamera();
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
          constrainPlayerToPlatform(platformPhysics);
        } else {
          camera.position.addInPlace(move.normalize().scale(speed * seconds));
        }
      } else {
        stopZeroGravityThrusterEffect();
      }
      if (groundedMovement) {
        updatePlatformGravity(platformPhysics, seconds);
      }
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

  const maxRange = interactions.reduce(
    (range, interaction) => Math.max(range, interaction.range ?? 1.8),
    GLB_PICKUP_PROMPT_RANGE,
  );
  const ray = createCameraLookRay(maxRange);
  const hit = scene.pickWithRay(ray, (mesh) =>
    Boolean(mesh.metadata?.interaction ?? mesh.metadata?.glbPickupLabel),
  );
  const interaction =
    hit?.pickedMesh?.metadata?.interaction ??
    createGlbPickupPrompt(hit?.pickedMesh);

  if (!hit?.hit || !interaction || hit.distance > (interaction.range ?? 1.8)) {
    updateInteractionPrompt(null);
    return;
  }

  updateInteractionPrompt(interaction);
}

function createGlbPickupPrompt(mesh) {
  const label = mesh?.metadata?.glbPickupLabel;
  if (!label) return null;
  const item = mesh.metadata.glbPickupItem ?? {
    id: label,
    name: label,
  };

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

function deactivateGlbPickupMesh(mesh) {
  const root = mesh?.metadata?.glbPickupRoot ?? mesh;
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
    return `Press E to take helmet · ${tetherText}`;
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

function applyObjectBoundsVisibility() {
  if (!scene) return;
  for (const mesh of scene.meshes) {
    if (isPickupDebugMesh(mesh)) {
      mesh.showBoundingBox = objectBoundsVisible;
    }
  }
}

function isPickupDebugMesh(mesh) {
  return (
    mesh?.getTotalVertices?.() > 0 &&
    Boolean(
      mesh.metadata?.glbPickupLabel ||
      mesh.metadata?.interaction?.type === "pickup",
    )
  );
}

function configureObjectBoundsRenderer(targetScene) {
  const renderer = targetScene.getBoundingBoxRenderer?.();
  if (!renderer) return;
  renderer.frontColor = new B.Color3(0.2, 1, 0.38);
  renderer.backColor = new B.Color3(0.08, 0.5, 0.16);
  renderer.showBackLines = true;
}

function isShiftHeld() {
  return keys.has("ShiftLeft") || keys.has("ShiftRight");
}

function isControlHeld() {
  return keys.has("ControlLeft") || keys.has("ControlRight");
}

function updateCrouch(platform, seconds, crouching) {
  const floorY = platform.floorY ?? 0;
  const standingEyeHeight = platform.eyeHeight;
  if (playerPhysics.platformEyeHeight !== standingEyeHeight) {
    playerPhysics.platformEyeHeight = standingEyeHeight;
    playerPhysics.eyeHeight = standingEyeHeight;
    if (playerPhysics.grounded) {
      camera.position.y = standingEyeHeight;
    }
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
  const timeScale = scene.metadata.timeScale;
  timeButton.textContent =
    timeScale === 0 ? "Time paused" : `Time ${timeScale}x`;
  timeButton.title = "Cycle simulation time speed";
  flyButton.textContent = flyMode ? "Fly on" : "Fly off";
  flyButton.title = "Toggle fake gravity / free flight";
  flyButton.setAttribute("aria-pressed", String(flyMode));
  if (cameraButton) {
    cameraButton.textContent = thirdPersonMode ? "3rd person" : "1st person";
    cameraButton.title = "Toggle third-person camera (F8)";
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

function toggleToolTips() {
  toolTipsVisible = !toolTipsVisible;
  updateToolTipsVisibility();
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
  const minX = platform.minX ?? -platform.width * 0.5;
  const maxX = platform.maxX ?? platform.width * 0.5;
  const minZ = platform.minZ ?? -platform.depth * 0.5;
  const maxZ = platform.maxZ ?? platform.depth * 0.5;
  const overDeck =
    (camera.position.x >= minX &&
      camera.position.x <= maxX &&
      camera.position.z >= minZ &&
      camera.position.z <= maxZ) ||
    Boolean(getOpenPlatformPassageAt(camera.position, platform));

  const eyeHeight = playerPhysics.eyeHeight ?? platform.eyeHeight;

  if (keys.has("Space") && playerPhysics.grounded) {
    playerPhysics.verticalVelocity = platform.jumpSpeed;
    playerPhysics.grounded = false;
  }

  playerPhysics.verticalVelocity -= platform.gravity * seconds;
  camera.position.y += playerPhysics.verticalVelocity * seconds;
  constrainPlayerToPlatform(platform);

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

  if (
    platform.ceilingY !== undefined &&
    camera.position.y > platform.ceilingY - platform.radius
  ) {
    camera.position.y = platform.ceilingY - platform.radius;
    playerPhysics.verticalVelocity = Math.min(
      playerPhysics.verticalVelocity,
      0,
    );
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

  if (!isPositionInsidePlatformPhysicsVolume(camera.position, platform)) {
    camera.position.addInPlace(zeroGravityVelocity.scale(seconds));
    playerPhysics.grounded = false;
    playerPhysics.verticalVelocity = zeroGravityVelocity.y;
    return;
  }

  const requestedHorizontal = new B.Vector3(
    zeroGravityVelocity.x * seconds,
    0,
    zeroGravityVelocity.z * seconds,
  );
  const beforeX = camera.position.x;
  const beforeZ = camera.position.z;
  movePlayerHorizontally(requestedHorizontal, platform);
  constrainPlayerToPlatform(platform, { constrainVertical: false });
  const actualHorizontal = new B.Vector3(
    camera.position.x - beforeX,
    0,
    camera.position.z - beforeZ,
  );
  if (Math.abs(actualHorizontal.x - requestedHorizontal.x) > 0.0001) {
    zeroGravityVelocity.x = 0;
  }
  if (Math.abs(actualHorizontal.z - requestedHorizontal.z) > 0.0001) {
    zeroGravityVelocity.z = 0;
  }

  const requestedY = zeroGravityVelocity.y * seconds;
  const beforeY = camera.position.y;
  camera.position.y += requestedY;
  constrainPlayerVerticallyToPlatform(platform);
  if (Math.abs(camera.position.y - beforeY - requestedY) > 0.0001) {
    zeroGravityVelocity.y = 0;
  }
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
  const worldExhaustDirection = transformPlayerLocalDirectionToWorld(
    exhaustDirection,
  );
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
    platform.ceilingY !== undefined
      ? platform.ceilingY + margin
      : Infinity;
  return (
    position.x >= minX &&
    position.x <= maxX &&
    position.y >= minY &&
    position.y <= maxY &&
    position.z >= minZ &&
    position.z <= maxZ
  );
}

function constrainPlayerVerticallyToPlatform(platform) {
  if (getOpenPlatformPassageAt(camera.position, platform)) {
    playerPhysics.grounded = false;
    return;
  }

  const minY = playerPhysics.eyeHeight ?? platform.eyeHeight;
  let grounded = false;
  if (platform.floorY !== undefined && camera.position.y <= minY) {
    camera.position.y = minY;
    grounded = true;
  }

  if (
    platform.ceilingY !== undefined &&
    camera.position.y > platform.ceilingY - (platform.radius ?? 0)
  ) {
    camera.position.y = platform.ceilingY - (platform.radius ?? 0);
  }
  playerPhysics.grounded = grounded;
}

function movePlayerHorizontally(displacement, platform) {
  const startX = camera.position.x;
  const startZ = camera.position.z;
  if (!platform || displacement.lengthSquared() <= 0) return B.Vector3.Zero();

  if (canMoveHorizontally(displacement, platform)) {
    camera.position.addInPlace(displacement);
  } else {
    const xOnly = new B.Vector3(displacement.x, 0, 0);
    if (xOnly.lengthSquared() > 0 && canMoveHorizontally(xOnly, platform)) {
      camera.position.addInPlace(xOnly);
    }

    const zOnly = new B.Vector3(0, 0, displacement.z);
    if (zOnly.lengthSquared() > 0 && canMoveHorizontally(zOnly, platform)) {
      camera.position.addInPlace(zOnly);
    }
  }

  return new B.Vector3(
    camera.position.x - startX,
    0,
    camera.position.z - startZ,
  );
}

function canMoveHorizontally(displacement, platform) {
  const collisionMeshes = platform.collisionMeshes ?? [];
  if (!collisionMeshes.length) return true;

  const distance = displacement.length();
  if (distance <= 0) return true;

  const direction = displacement.scale(1 / distance);
  const side = new B.Vector3(-direction.z, 0, direction.x);
  const eye = camera.position;
  const radius = platform.radius ?? 0;
  const castDistance = distance + radius * 1.35;
  const ceilingY = platform.ceilingY ?? eye.y + platform.playerHeight;
  const playerHeight = playerPhysics.eyeHeight - (platform.floorY ?? 0);
  const destination = eye.add(displacement);
  if (getOpenPlatformPassageAt(destination, platform)) return true;

  const sampleHeights = [
    0,
    -playerHeight * 0.35,
    Math.min(playerHeight * 0.25, ceilingY - eye.y - radius),
  ];
  const sideOffsets = [0, -radius * 0.85, radius * 0.85];

  for (const height of sampleHeights) {
    for (const sideOffset of sideOffsets) {
      const origin = eye
        .add(new B.Vector3(0, height, 0))
        .add(side.scale(sideOffset));
      const ray = createWorldRay(origin, direction, castDistance);
      const hit = scene.pickWithRay(ray, (mesh) =>
        isActivePlatformCollisionMesh(mesh, collisionMeshes),
      );
      if (hit?.hit && hit.distance <= castDistance) return false;
    }
  }

  return true;
}

function createWorldRay(localOrigin, localDirection, distance) {
  if (!camera.parent) {
    return new B.Ray(localOrigin, localDirection, distance);
  }

  const parentWorld = camera.parent.getWorldMatrix();
  const worldOrigin = B.Vector3.TransformCoordinates(localOrigin, parentWorld);
  const worldDirection = B.Vector3.TransformNormal(
    localDirection,
    parentWorld,
  ).normalize();
  return new B.Ray(worldOrigin, worldDirection, distance);
}

function constrainPlayerToPlatform(platform, options = {}) {
  const radius = platform.radius ?? 0;
  const minX = platform.minX ?? -platform.width * 0.5;
  const maxX = platform.maxX ?? platform.width * 0.5;
  const minZ = platform.minZ ?? -platform.depth * 0.5;
  const maxZ = platform.maxZ ?? platform.depth * 0.5;
  const passage = getOpenPlatformPassageAt(camera.position, platform);

  if (passage?.oriented) {
    constrainPlayerToOrientedPassage(
      camera.position,
      passage,
      radius,
      options,
    );
  } else if (passage) {
    camera.position.x = clamp(
      camera.position.x,
      (passage.minX ?? minX) + radius,
      (passage.maxX ?? maxX) - radius,
    );
    camera.position.z = clamp(
      camera.position.z,
      (passage.minZ ?? minZ) + radius,
      (passage.maxZ ?? maxZ) - radius,
    );
  } else {
    camera.position.x = clamp(camera.position.x, minX + radius, maxX - radius);
    camera.position.z = clamp(camera.position.z, minZ + radius, maxZ - radius);
  }

  if (options.constrainVertical !== false && platform.floorY !== undefined) {
    camera.position.y = Math.max(
      camera.position.y,
      playerPhysics.eyeHeight ?? platform.eyeHeight,
    );
  }
}

function isActivePlatformCollisionMesh(mesh, collisionMeshes) {
  if (!collisionMeshes.includes(mesh)) return false;
  const doorInteraction = mesh.metadata?.platformDoorCollision;
  return !doorInteraction?.isOpen;
}

function getOpenPlatformPassageAt(position, platform) {
  const radius = platform.radius ?? 0;
  for (const passage of platform.doorPassages ?? []) {
    if (!passage.interaction?.isOpen) continue;
    if (!isPositionInsidePassage(position, passage, radius)) continue;
    return passage;
  }
  return null;
}

function isPositionInsidePassage(position, passage, radius) {
  if (passage.oriented) {
    const local = getOrientedPassagePosition(position, passage);
    return (
      Math.abs(local.right) <= passage.halfWidth + radius &&
      Math.abs(local.up) <= passage.halfHeight + radius &&
      local.normal >= -passage.inwardDepth - radius &&
      local.normal <= passage.outwardDepth + radius
    );
  }

  return (
    position.x >= (passage.minX ?? -Infinity) + radius &&
    position.x <= (passage.maxX ?? Infinity) - radius &&
    position.y >= (passage.minY ?? -Infinity) &&
    position.y <= (passage.maxY ?? Infinity) &&
    position.z >= (passage.minZ ?? -Infinity) + radius &&
    position.z <= (passage.maxZ ?? Infinity) - radius
  );
}

function constrainPlayerToOrientedPassage(position, passage, radius, options) {
  const local = getOrientedPassagePosition(position, passage);
  const nextRight = clamp(
    local.right,
    -passage.halfWidth + radius,
    passage.halfWidth - radius,
  );
  const nextUp =
    options.constrainVertical === false
      ? local.up
      : clamp(local.up, -passage.halfHeight, passage.halfHeight);
  const nextNormal = clamp(
    local.normal,
    -passage.inwardDepth,
    passage.outwardDepth,
  );

  position
    .copyFrom(passage.center)
    .addInPlace(passage.right.scale(nextRight))
    .addInPlace(passage.up.scale(nextUp))
    .addInPlace(passage.normal.scale(nextNormal));
}

function getOrientedPassagePosition(position, passage) {
  const offset = position.subtract(passage.center);
  return {
    right: B.Vector3.Dot(offset, passage.right),
    up: B.Vector3.Dot(offset, passage.up),
    normal: B.Vector3.Dot(offset, passage.normal),
  };
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
