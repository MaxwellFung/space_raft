import baseBrownDwarfLevel from "./levels/brown_dwarf/level.js";
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
const survivalBars = document.querySelector(".survival-bars");
const hotbar = document.querySelector("#hotbar");
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
const BASE_MOUSE_SENSIBILITY = 5200;
const CROUCH_EYE_HEIGHT_SCALE = 0.76;
const CROUCH_TRANSITION_SPEED = 8;
const CROUCH_SPEED_SCALE = 0.45;
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
    return;
  }
  if (isUiModalOpen()) {
    if (movementKeys.has(event.code)) event.preventDefault();
    return;
  }
  if (event.code === "KeyE" && activeInteraction) {
    event.preventDefault();
    activeInteraction.activate?.();
    keys.delete("KeyE");
    updateInteractionPrompt(null);
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
let toolTipsVisible = true;
let selectedHotbarIndex = 0;
let selectedNotebookPage = "objectives";
let brownDwarfLevel = null;
let engine = null;
let scene = null;
let performanceMonitor = null;
let camera = null;
let level = null;
let playerPhysics = null;
let timeButton = null;
let flyButton = null;
let mouseSensitivitySlider = null;
let mouseSensitivityValue = null;
let activeInteraction = null;

const survivalMeters = [
  {
    id: "water",
    label: "Water",
    icon: "H2O",
    value: 78,
    dark: "#125c8a",
    light: "#53d7ff",
    glow: "rgba(83, 215, 255, 0.58)",
  },
  {
    id: "food",
    label: "Food",
    icon: "FD",
    value: 64,
    dark: "#8a561b",
    light: "#ffc15c",
    glow: "rgba(255, 193, 92, 0.5)",
  },
  {
    id: "health",
    label: "Health",
    icon: "+",
    value: 91,
    dark: "#7d1d23",
    light: "#ff626d",
    glow: "rgba(255, 98, 109, 0.5)",
  },
  {
    id: "oxygen",
    label: "Oxygen",
    icon: "O2",
    value: 86,
    dark: "#15766e",
    light: "#74ffe1",
    glow: "rgba(116, 255, 225, 0.5)",
  },
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

  renderSurvivalBars();
  renderHotbars();
  renderInventoryGrid();
  renderNotebook();
}

function renderSurvivalBars() {
  survivalBars.replaceChildren(
    ...survivalMeters.map((meter) => {
      const wrapper = document.createElement("div");
      wrapper.className = "survival-meter";
      wrapper.title = meter.label;

      const icon = document.createElement("span");
      icon.className = "survival-icon";
      icon.textContent = meter.icon;

      const track = document.createElement("span");
      track.className = "survival-track";
      track.style.setProperty("--bar-dark", meter.dark);
      track.style.setProperty("--bar-light", meter.light);
      track.style.setProperty("--bar-glow", meter.glow);

      const fill = document.createElement("span");
      fill.className = "survival-fill";
      fill.style.setProperty("--value", String(meter.value));

      track.append(fill);
      wrapper.append(icon, track);
      return wrapper;
    }),
  );
}

function renderHotbars() {
  hotbar.replaceChildren(
    ...hotbarItems.map((entry, index) =>
      createItemSlot(entry, index, {
        selected: index === selectedHotbarIndex,
        key: index === 9 ? "0" : String(index + 1),
        onClick: () => {
          selectedHotbarIndex = index;
          renderHotbars();
        },
      }),
    ),
  );
  modalHotbar.replaceChildren(
    ...hotbarItems.map((entry, index) =>
      createItemSlot(entry, index, {
        selected: index === selectedHotbarIndex,
        key: index === 9 ? "0" : String(index + 1),
        onClick: () => {
          selectedHotbarIndex = index;
          renderHotbars();
        },
      }),
    ),
  );
}

function renderInventoryGrid() {
  const slots = Array.from({ length: 20 }, (_, index) =>
    createItemSlot(inventoryItems[index] ?? null, index),
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
    const { count = 1, icon = "", name = "" } = entry;
    slot.title = name;
    const iconLabel = document.createElement("span");
    iconLabel.textContent = icon;
    slot.append(iconLabel);
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
  document.body.classList.remove("menu-open");

  brownDwarfLevel = applySaveToLevel(baseBrownDwarfLevel, saveFile);
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

  canvas.addEventListener("click", () => canvas.requestPointerLock?.());
  installBackgroundMusicUnlock(backgroundMusic);

  level = buildLevel(scene, brownDwarfLevel);
  playerPhysics = {
    verticalVelocity: 0,
    grounded: Boolean(level.platform),
    eyeHeight: level.platform?.physics?.eyeHeight ?? camera.position.y,
    platformEyeHeight: level.platform?.physics?.eyeHeight ?? camera.position.y,
  };
  installHudControls();
  updateToolTipsVisibility();
  installPlayerLoop();

  engine.runRenderLoop(() => {
    const frame = performanceMonitor.beginFrame();
    scene.render();
    performanceMonitor.endFrame(frame);
  });
  addEventListener("resize", () => engine?.resize());
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
  hud.append(timeButton, flyButton, sensitivityControl);
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

function installPlayerLoop() {
  scene.onBeforeRenderObservable.add(() => {
    scene.metadata.profiler.measure("Player", () => {
      const seconds = Math.min(engine.getDeltaTime() / 1000, 0.05);
      const platformPhysics = level.platform?.physics;
      const groundedMovement = Boolean(platformPhysics && !flyMode);
      const crouching = groundedMovement && isShiftHeld();
      const move = B.Vector3.Zero();
      const forward = camera.getDirection(B.Axis.Z);
      const right = camera.getDirection(B.Axis.X);

      updateActiveInteraction();

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
      } else if (flyMode) {
        if (keys.has("Space")) move.y += 1;
        if (isShiftHeld()) move.y -= 1;
      }

      if (move.lengthSquared() > 0) {
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
      }
      if (groundedMovement) {
        updatePlatformGravity(platformPhysics, seconds);
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
  if (!interactions.length || isUiModalOpen()) {
    updateInteractionPrompt(null);
    return;
  }

  const maxRange = interactions.reduce(
    (range, interaction) => Math.max(range, interaction.range ?? 1.8),
    1.8,
  );
  const ray = createWorldRay(
    camera.position,
    camera.getDirection(B.Axis.Z),
    maxRange,
  );
  const hit = scene.pickWithRay(ray, (mesh) =>
    Boolean(mesh.metadata?.interaction),
  );
  const interaction = hit?.pickedMesh?.metadata?.interaction ?? null;

  if (!hit?.hit || !interaction || hit.distance > (interaction.range ?? 1.8)) {
    updateInteractionPrompt(null);
    return;
  }

  updateInteractionPrompt(interaction);
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
  interactionPrompt.textContent =
    interaction.getPrompt?.() ?? interaction.prompt ?? "Press E";
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
}

function toggleToolTips() {
  toolTipsVisible = !toolTipsVisible;
  updateToolTipsVisibility();
}

function updateToolTipsVisibility() {
  document.body.classList.toggle("tooltips-hidden", !toolTipsVisible);
}

function updatePlatformGravity(platform, seconds) {
  const minX = platform.minX ?? -platform.width * 0.5;
  const maxX = platform.maxX ?? platform.width * 0.5;
  const minZ = platform.minZ ?? -platform.depth * 0.5;
  const maxZ = platform.maxZ ?? platform.depth * 0.5;
  const overDeck =
    camera.position.x >= minX &&
    camera.position.x <= maxX &&
    camera.position.z >= minZ &&
    camera.position.z <= maxZ;

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

function movePlayerHorizontally(displacement, platform) {
  if (!platform || displacement.lengthSquared() <= 0) return;

  if (canMoveHorizontally(displacement, platform)) {
    camera.position.addInPlace(displacement);
    return;
  }

  const xOnly = new B.Vector3(displacement.x, 0, 0);
  if (xOnly.lengthSquared() > 0 && canMoveHorizontally(xOnly, platform)) {
    camera.position.addInPlace(xOnly);
  }

  const zOnly = new B.Vector3(0, 0, displacement.z);
  if (zOnly.lengthSquared() > 0 && canMoveHorizontally(zOnly, platform)) {
    camera.position.addInPlace(zOnly);
  }
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
        collisionMeshes.includes(mesh),
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

function constrainPlayerToPlatform(platform) {
  const radius = platform.radius ?? 0;
  const minX = platform.minX ?? -platform.width * 0.5;
  const maxX = platform.maxX ?? platform.width * 0.5;
  const minZ = platform.minZ ?? -platform.depth * 0.5;
  const maxZ = platform.maxZ ?? platform.depth * 0.5;

  camera.position.x = Math.min(
    Math.max(camera.position.x, minX + radius),
    maxX - radius,
  );
  camera.position.z = Math.min(
    Math.max(camera.position.z, minZ + radius),
    maxZ - radius,
  );
  if (platform.floorY !== undefined) {
    camera.position.y = Math.max(
      camera.position.y,
      playerPhysics.eyeHeight ?? platform.eyeHeight,
    );
  }
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
