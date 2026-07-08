import { replaceGlassWithClearMaterial } from "./spaceship-glass.js";
import {
  SHIP_INTERIOR_PROP_SPECS,
  SHIP_INTERIOR_WALK_BOUNDS,
  SHIP_MODEL_SPEC,
} from "./ship-interior-layout.js";

const B = window.BABYLON;

const canvas = document.querySelector("#studio-canvas");
const statusText = document.querySelector("#studio-status");
const readout = document.querySelector("#studio-readout");
const errorBox = document.querySelector("#runtime-error");
const assetStrip = document.querySelector("#asset-strip");
const spinToggle = document.querySelector("#spin-toggle");
const walkToggle = document.querySelector("#walk-toggle");
const labelsToggle = document.querySelector("#labels-toggle");
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
const interactionTooltip = document.querySelector("#interaction-tooltip");
const startOrbitMode = new URLSearchParams(location.search).has("orbit");
const PLAYER_SPEED = 2;
const PLAYER_BOOST_SPEED = 4.8;
const PICKUP_RANGE = 1.65;
const CROUCH_EYE_HEIGHT_SCALE = 0.76;
const CROUCH_TRANSITION_SPEED = 8;
const CROUCH_SPEED_SCALE = 0.45;
const ITEM_GRAVITY = 10.5;
const ITEM_SLEEP_EPSILON = 0.02;
const INVENTORY_SIZE = 20;
const HOTBAR_SIZE = 10;
const STUDIO_BOUNDS = {
  minX: SHIP_INTERIOR_WALK_BOUNDS.minX,
  maxX: SHIP_INTERIOR_WALK_BOUNDS.maxX,
  minZ: SHIP_INTERIOR_WALK_BOUNDS.minZ,
  maxZ: SHIP_INTERIOR_WALK_BOUNDS.maxZ,
  floorY: SHIP_INTERIOR_WALK_BOUNDS.minY,
  ceilingY: SHIP_INTERIOR_WALK_BOUNDS.maxY,
  radius: 0.18,
  playerHeight: 1.0,
  gravity: 30,
  jumpSpeed: 5.4,
};
const assetSpecs = [
  {
    ...studioAssetFromLayout(SHIP_MODEL_SPEC),
    isShip: true,
  },
  ...SHIP_INTERIOR_PROP_SPECS.map(studioAssetFromLayout),
];

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

const inventoryItems = Array.from({ length: INVENTORY_SIZE }, () => null);
const hotbarItems = Array.from({ length: HOTBAR_SIZE }, () => null);
const notebookPages = [
  {
    id: "layout",
    title: "Layout",
    copy: [
      "This studio imports the same shared ship interior layout as the brown-dwarf level.",
      "Edit src/ship-interior-layout.js to move props here and in the real ship at the same time.",
    ],
  },
  {
    id: "controls",
    title: "Controls",
    copy: [
      "WASD moves, Space jumps, Ctrl sprints, and Shift crouches.",
      "Tab opens inventory. T opens notebook. Click the canvas to lock mouse look.",
    ],
  },
  {
    id: "cargo",
    title: "Cargo",
    copy: [
      "Forward tanks are upright. The crate contains visible rations and water bottles.",
      "Fabricator, helmet, and battery are staged nearby for ship-readiness checks.",
    ],
  },
];

let selectedHotbarIndex = 0;
let selectedNotebookPage = "layout";

function studioAssetFromLayout(spec) {
  return {
    id: spec.id,
    label: spec.label,
    url: spec.modelUrl,
    maxSize: spec.maxSize,
    position: spec.position,
    rotation: degreesToRadians(spec.rotationDegrees ?? [0, 0, 0]),
    floorY: (spec.floorOffset ?? 0) + (spec.deckOffset ?? 0),
    swatch: spec.swatch,
  };
}

function degreesToRadians(degrees) {
  return degrees.map((degree) => (degree * Math.PI) / 180);
}

addEventListener("error", (event) =>
  showRuntimeError(event.error ?? event.message),
);
addEventListener("unhandledrejection", (event) =>
  showRuntimeError(event.reason),
);

if (!B) {
  showRuntimeError("Babylon.js did not load.");
}

const engine = new B.Engine(canvas, true, {
  antialias: true,
  adaptToDeviceRatio: false,
  powerPreference: "high-performance",
});
engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, 1.5));

const scene = new B.Scene(engine);
scene.clearColor = new B.Color4(0.93, 0.95, 0.97, 1);
scene.collisionsEnabled = true;
scene.environmentIntensity = 0.88;
scene.imageProcessingConfiguration.toneMappingEnabled = true;
scene.imageProcessingConfiguration.exposure = 1.12;
scene.imageProcessingConfiguration.contrast = 1.04;
const boundingBoxRenderer = scene.getBoundingBoxRenderer?.();
if (boundingBoxRenderer) {
  boundingBoxRenderer.frontColor = new B.Color3(0.14, 1, 0.26);
  boundingBoxRenderer.backColor = new B.Color3(0.05, 0.42, 0.12);
  boundingBoxRenderer.showBackLines = true;
}

const camera = new B.ArcRotateCamera(
  "studio-camera",
  -Math.PI * 0.3,
  Math.PI * 0.36,
  9.1,
  new B.Vector3(0, 1.18, 0),
  scene,
);
camera.lowerRadiusLimit = 3.6;
camera.upperRadiusLimit = 14;
camera.wheelDeltaPercentage = 0.015;
camera.panningSensibility = 110;
camera.minZ = 0.02;
camera.attachControl(canvas, true);
scene.activeCamera = camera;

const walkCamera = new B.UniversalCamera(
  "studio-walk-camera",
  new B.Vector3(0, STUDIO_BOUNDS.playerHeight, -2.35),
  scene,
);
walkCamera.minZ = 0.02;
walkCamera.fov = Math.PI * 0.48;
walkCamera.speed = 0;
walkCamera.angularSensibility = 600;
walkCamera.inertia = 0.24;
walkCamera.checkCollisions = false;
walkCamera.ellipsoid = new B.Vector3(
  STUDIO_BOUNDS.radius,
  STUDIO_BOUNDS.radius,
  STUDIO_BOUNDS.radius,
);
walkCamera.ellipsoidOffset = B.Vector3.Zero();
walkCamera.keysUp = [];
walkCamera.keysDown = [];
walkCamera.keysLeft = [];
walkCamera.keysRight = [];

const studioRoot = new B.TransformNode("studio-root", scene);
const assetRoot = new B.TransformNode("studio-assets", scene);
assetRoot.parent = studioRoot;
const labelRoot = new B.TransformNode("studio-labels", scene);
labelRoot.parent = studioRoot;

const loadedRoots = [];
const collisionMeshes = [];
const itemRecords = [];
const keys = new Set();
let spinEnabled = false;
let walkMode = false;
let lastRenderMs = performance.now();
let activeInteraction = null;

const playerPhysics = {
  verticalVelocity: 0,
  grounded: true,
  eyeHeight: getStandingEyeHeight(),
  platformEyeHeight: getStandingEyeHeight(),
};

const playerCollider = B.MeshBuilder.CreateSphere(
  "studio-player-collider",
  { diameter: STUDIO_BOUNDS.radius * 2, segments: 8 },
  scene,
);
playerCollider.isVisible = false;
playerCollider.isPickable = false;
playerCollider.checkCollisions = false;
playerCollider.ellipsoid = walkCamera.ellipsoid.clone();
playerCollider.ellipsoidOffset = B.Vector3.Zero();

createStudioShell(scene);
const shadowGenerator = createStudioLights(scene);
createAssetStrip();
installControls();
installPlayerUi();
loadStudio();

engine.runRenderLoop(() => {
  const now = performance.now();
  const deltaSeconds = Math.min((now - lastRenderMs) / 1000, 0.05);
  lastRenderMs = now;

  if (spinEnabled) {
    assetRoot.rotation.y += deltaSeconds * 0.28;
  }

  updateLooseItemPhysics(deltaSeconds);
  updatePlayerPhysics(deltaSeconds);
  updateActiveInteraction();

  scene.render();
  updateReadout();
});

addEventListener("resize", () => engine.resize());

async function loadStudio() {
  statusText.textContent = "Loading studio";

  for (const spec of assetSpecs) {
    const root = await loadAsset(spec);
    if (!root) continue;

    loadedRoots.push(root);
    const itemRecord = spec.isShip ? null : createItemRecord(spec, root);
    for (const mesh of getRenderableMeshes(root)) {
      mesh.receiveShadows = true;
      mesh.checkCollisions = true;
      mesh.isPickable = true;
      collisionMeshes.push(mesh);
      shadowGenerator.addShadowCaster(mesh);
    }
    if (itemRecord) {
      itemRecord.interaction = createPickupInteraction(itemRecord);
      itemRecords.push(itemRecord);
    }
    for (const mesh of getRenderableMeshes(root)) {
      if (itemRecord) {
        mesh.metadata = {
          ...(mesh.metadata ?? {}),
          interaction: itemRecord.interaction,
        };
      }
    }
    const label = createAssetLabel(spec, root);
    if (itemRecord) itemRecord.labelNode = label;
  }

  statusText.textContent = `${loadedRoots.length} assets loaded`;
  frameHome();
  standInStudio();
  if (!startOrbitMode) setWalkMode(true, false);
}

async function loadAsset(spec) {
  try {
    const result = await B.SceneLoader.ImportMeshAsync("", "", spec.url, scene);
    const root = new B.TransformNode(`${spec.id}-root`, scene);
    root.parent = assetRoot;

    for (const node of [...result.meshes, ...result.transformNodes]) {
      if (!node.parent) node.parent = root;
    }

    makeMaterialsStudioReady(result);
    if (spec.isShip) {
      replaceGlassWithClearMaterial(result, scene, {
        glassColor: [0.82, 0.96, 1],
        glassRimColor: [0.6, 0.86, 1],
        glassAlpha: 0.28,
        glassThicknessAlpha: 0.17,
        glassEnvironmentIntensity: 0.95,
        glassDirectIntensity: 0.58,
        glassEdges: false,
      });
    }

    normalizeModel(root, spec.maxSize);
    root.rotation = B.Vector3.FromArray(spec.rotation ?? [0, 0, 0]);
    root.position.addInPlace(B.Vector3.FromArray(spec.position ?? [0, 0, 0]));
    settleOnFloor(root, spec.floorY ?? 0);
    root.computeWorldMatrix(true);

    return root;
  } catch (error) {
    showRuntimeError(`Failed to load ${spec.label}: ${error.message ?? error}`);
    return null;
  }
}

function createItemRecord(spec, root) {
  root.computeWorldMatrix(true);
  const bounds = getMeshBounds(getRenderableMeshes(root));
  const size = bounds.max.subtract(bounds.min);
  const item = {
    id: spec.id,
    label: spec.label,
    root,
    spec,
    velocity: B.Vector3.Zero(),
    dynamic: true,
    sleeping: true,
    size,
    boundsOffsetMin: bounds.min.subtract(root.position),
    boundsOffsetMax: bounds.max.subtract(root.position),
  };
  return item;
}

function createStudioShell(scene) {
  const floorMaterial = new B.PBRMaterial("studio-floor-material", scene);
  floorMaterial.albedoColor = new B.Color3(0.86, 0.89, 0.9);
  floorMaterial.roughness = 0.72;
  floorMaterial.metallic = 0;

  const wallMaterial = new B.PBRMaterial("studio-wall-material", scene);
  wallMaterial.albedoColor = new B.Color3(0.92, 0.94, 0.95);
  wallMaterial.roughness = 0.66;
  wallMaterial.metallic = 0;

  const floor = B.MeshBuilder.CreateGround(
    "studio-floor",
    { width: 11, height: 7, subdivisions: 2 },
    scene,
  );
  floor.receiveShadows = true;
  floor.checkCollisions = true;
  floor.material = floorMaterial;
  collisionMeshes.push(floor);

  const backWall = B.MeshBuilder.CreatePlane(
    "studio-back-wall",
    { width: 11, height: 4.6 },
    scene,
  );
  backWall.position.set(0, 2.3, 3.5);
  backWall.receiveShadows = true;
  backWall.checkCollisions = true;
  backWall.material = wallMaterial;
  collisionMeshes.push(backWall);

  const leftWall = B.MeshBuilder.CreatePlane(
    "studio-left-wall",
    { width: 7, height: 4.6 },
    scene,
  );
  leftWall.position.set(-5.5, 2.3, 0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadows = true;
  leftWall.checkCollisions = true;
  leftWall.material = wallMaterial;
  collisionMeshes.push(leftWall);

  const gridMaterial = new B.StandardMaterial("studio-grid-material", scene);
  gridMaterial.diffuseColor = new B.Color3(0.43, 0.48, 0.52);
  gridMaterial.emissiveColor = new B.Color3(0.15, 0.17, 0.18);
  gridMaterial.alpha = 0.25;

  for (let x = -5; x <= 5; x += 1) {
    const line = B.MeshBuilder.CreateLines(
      `floor-grid-x-${x}`,
      {
        points: [new B.Vector3(x, 0.006, -3.2), new B.Vector3(x, 0.006, 3.2)],
      },
      scene,
    );
    line.color = new B.Color3(0.43, 0.48, 0.52);
    line.alpha = x === 0 ? 0.42 : 0.18;
  }

  for (let z = -3; z <= 3; z += 1) {
    const line = B.MeshBuilder.CreateLines(
      `floor-grid-z-${z}`,
      {
        points: [new B.Vector3(-5.2, 0.006, z), new B.Vector3(5.2, 0.006, z)],
      },
      scene,
    );
    line.color = new B.Color3(0.43, 0.48, 0.52);
    line.alpha = z === 0 ? 0.42 : 0.18;
  }

  createStudioBoundary(
    scene,
    "studio-right-wall",
    [5.5, 2.3, 0],
    [7, 4.6],
    -Math.PI / 2,
    wallMaterial,
  );
}

function createStudioBoundary(scene, name, position, size, rotationY, material) {
  const wall = B.MeshBuilder.CreatePlane(
    name,
    { width: size[0], height: size[1] },
    scene,
  );
  wall.position = B.Vector3.FromArray(position);
  wall.rotation.y = rotationY;
  wall.receiveShadows = true;
  wall.checkCollisions = true;
  wall.material = material;
  collisionMeshes.push(wall);
}

function createStudioLights(scene) {
  const hemi = new B.HemisphericLight("studio-fill", new B.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.78;
  hemi.diffuse = new B.Color3(0.92, 0.96, 1);
  hemi.groundColor = new B.Color3(0.64, 0.68, 0.7);

  const key = new B.DirectionalLight(
    "studio-key",
    new B.Vector3(-0.35, -0.82, -0.42),
    scene,
  );
  key.position = new B.Vector3(4.8, 6.2, 4.4);
  key.intensity = 2.25;
  key.diffuse = new B.Color3(1, 0.96, 0.9);

  const fill = new B.DirectionalLight(
    "studio-side-fill",
    new B.Vector3(0.7, -0.36, 0.28),
    scene,
  );
  fill.intensity = 0.78;
  fill.diffuse = new B.Color3(0.72, 0.84, 1);

  const rim = new B.DirectionalLight(
    "studio-rim",
    new B.Vector3(-0.42, -0.22, 0.86),
    scene,
  );
  rim.intensity = 0.62;
  rim.diffuse = new B.Color3(0.86, 0.94, 1);

  createSoftbox(scene, "softbox-main", [-1.8, 4.1, -2.35], [2.9, 0.04, 1.1]);
  createSoftbox(scene, "softbox-side", [5.25, 2.8, -2.0], [0.04, 1.3, 1.9]);

  const shadowGenerator = new B.ShadowGenerator(2048, key);
  shadowGenerator.bias = 0.0007;
  shadowGenerator.normalBias = 0.025;
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 18;
  shadowGenerator.darkness = 0.18;
  return shadowGenerator;
}

function createSoftbox(scene, name, position, size) {
  const material = new B.StandardMaterial(`${name}-material`, scene);
  material.diffuseColor = new B.Color3(1, 1, 1);
  material.emissiveColor = new B.Color3(1, 0.96, 0.88);
  material.specularColor = B.Color3.Black();
  material.disableLighting = true;

  const softbox = B.MeshBuilder.CreateBox(
    name,
    { width: size[0], height: size[1], depth: size[2] },
    scene,
  );
  softbox.position = B.Vector3.FromArray(position);
  softbox.isPickable = false;
  softbox.material = material;
}

function createAssetLabel(spec, root) {
  const bounds = getMeshBounds(getRenderableMeshes(root));
  const height = bounds.max.y - bounds.min.y;
  const label = B.MeshBuilder.CreatePlane(
    `${spec.id}-label`,
    { width: 0.78, height: 0.22 },
    scene,
  );
  label.parent = labelRoot;
  label.position = new B.Vector3(
    spec.position[0],
    Math.max(0.34, height + 0.34),
    spec.position[2],
  );
  label.billboardMode = B.Mesh.BILLBOARDMODE_ALL;
  label.isPickable = false;

  const texture = new B.DynamicTexture(
    `${spec.id}-label-texture`,
    { width: 384, height: 108 },
    scene,
    true,
  );
  const context = texture.getContext();
  context.clearRect(0, 0, 384, 108);
  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  roundRect(context, 8, 10, 368, 88, 18);
  context.fill();
  context.strokeStyle = "rgba(48, 63, 78, 0.18)";
  context.lineWidth = 3;
  roundRect(context, 8, 10, 368, 88, 18);
  context.stroke();
  context.fillStyle = spec.swatch;
  roundRect(context, 28, 38, 38, 32, 7);
  context.fill();
  context.fillStyle = "#10151a";
  context.font = "700 34px Inter, system-ui, sans-serif";
  context.textBaseline = "middle";
  context.fillText(spec.label, 82, 55);
  texture.update();

  const material = new B.StandardMaterial(`${spec.id}-label-material`, scene);
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.opacityTexture = texture;
  material.disableLighting = true;
  material.backFaceCulling = false;
  label.material = material;
  return label;
}

function createAssetStrip() {
  assetStrip.replaceChildren(
    ...assetSpecs
      .filter((spec) => !spec.isShip)
      .map((spec) => {
        const item = document.createElement("span");
        item.textContent = spec.label;
        item.style.setProperty("--swatch", spec.swatch);
        return item;
      }),
  );
}

function installControls() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      setWalkMode(false);
      const view = button.dataset.view;
      if (view === "home") frameHome();
      if (view === "front") setCameraView(Math.PI, Math.PI * 0.38, 8.2);
      if (view === "side") setCameraView(-Math.PI / 2, Math.PI * 0.38, 8.2);
      if (view === "top") setCameraView(-Math.PI / 2, 0.08, 8.6);
    });
  });

  spinToggle.addEventListener("click", () => {
    spinEnabled = !spinEnabled;
    spinToggle.setAttribute("aria-pressed", String(spinEnabled));
  });

  walkToggle.addEventListener("click", () => {
    setWalkMode(!walkMode, true);
  });

  labelsToggle.addEventListener("click", () => {
    const enabled = !labelRoot.isEnabled();
    labelRoot.setEnabled(enabled);
    labelsToggle.setAttribute("aria-pressed", String(enabled));
  });

  canvas.addEventListener("click", () => {
    if (walkMode) requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    document.body.classList.toggle(
      "pointer-locked",
      document.pointerLockElement === canvas,
    );
    updateReadout();
  });

  addEventListener("keydown", (event) => {
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
    if (event.code.startsWith("Digit")) {
      const digit = Number(event.code.slice("Digit".length));
      if (digit >= 0 && digit <= 9) {
        selectedHotbarIndex = digit === 0 ? 9 : digit - 1;
        renderHotbars();
      }
    }
    if (!walkMode) return;
    if (isUiModalOpen()) return;
    if (event.code === "KeyE" && activeInteraction) {
      event.preventDefault();
      if (collectPickupInteraction(activeInteraction)) {
        updateInteractionTooltip(null);
      }
      keys.delete("KeyE");
      return;
    }
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "Space",
        "ShiftLeft",
        "ShiftRight",
        "ControlLeft",
        "ControlRight",
      ].includes(event.code)
    ) {
      event.preventDefault();
      keys.add(event.code);
    }
  });

  addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });
}

function installPlayerUi() {
  inventoryKeyButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleInventory();
  });
  notebookKeyButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleNotebook();
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
  inventoryGrid.replaceChildren(
    ...inventoryItems.map((entry, index) =>
      createItemSlot(entry, index, {
        onClick: null,
      }),
    ),
  );
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
    slot.title = entry.name;
    const icon = document.createElement("img");
    icon.className = "slot-portrait";
    icon.alt = "";
    icon.src = entry.portrait;
    slot.append(icon);
    if ((entry.count ?? 1) > 1) {
      const count = document.createElement("span");
      count.className = "slot-count";
      count.textContent = String(entry.count);
      slot.append(count);
    }
  }

  slot.append(key);
  return slot;
}

function toggleInventory() {
  const willOpen = inventoryModal.hidden;
  closePlayerModals();
  inventoryModal.hidden = !willOpen;
  if (willOpen) exitPointerLock();
}

function toggleNotebook() {
  const willOpen = notebookModal.hidden;
  closePlayerModals();
  notebookModal.hidden = !willOpen;
  if (willOpen) exitPointerLock();
}

function closePlayerModals() {
  inventoryModal.hidden = true;
  notebookModal.hidden = true;
  keys.clear();
}

function isUiModalOpen() {
  return !inventoryModal.hidden || !notebookModal.hidden;
}

function createPickupInteraction(item) {
  return {
    type: "pickup",
    range: PICKUP_RANGE,
    item,
    getPrompt: () => `Press E to pick up ${item.label}`,
    activate: () => {
      item.root.setEnabled(false);
      item.labelNode?.setEnabled(false);
    },
  };
}

function updateActiveInteraction() {
  if (!walkMode || isUiModalOpen()) {
    updateInteractionTooltip(null);
    return;
  }

  const ray = new B.Ray(
    walkCamera.position,
    walkCamera.getDirection(B.Axis.Z),
    PICKUP_RANGE,
  );
  const hit = scene.pickWithRay(ray, (mesh) =>
    Boolean(mesh.metadata?.interaction),
  );
  const interaction = hit?.pickedMesh?.metadata?.interaction ?? null;

  if (!hit?.hit || !interaction || hit.distance > interaction.range) {
    updateInteractionTooltip(null);
    return;
  }

  updateInteractionTooltip(interaction);
}

function updateInteractionTooltip(interaction) {
  activeInteraction = interaction;
  if (!interactionTooltip) return;

  if (!interaction) {
    interactionTooltip.hidden = true;
    interactionTooltip.textContent = "";
    return;
  }

  interactionTooltip.hidden = false;
  interactionTooltip.textContent =
    interaction.getPrompt?.() ?? interaction.prompt ?? "Press E";
}

function collectPickupInteraction(interaction) {
  const slotIndex = inventoryItems.findIndex((entry) => !entry);
  if (slotIndex === -1) {
    updateInteractionTooltip({ prompt: "Inventory full" });
    return false;
  }

  const item = interaction.item;
  inventoryItems[slotIndex] = {
    id: item.id,
    name: item.label,
    count: 1,
    portrait: createItemPortrait(item),
  };
  interaction.activate?.();
  renderInventoryGrid();
  return true;
}

function exitPointerLock() {
  if (document.pointerLockElement) {
    document.exitPointerLock?.();
  }
}

function createItemPortrait(item) {
  const portrait = document.createElement("canvas");
  portrait.width = 96;
  portrait.height = 96;
  const context = portrait.getContext("2d");
  const color = item.spec.swatch ?? "#8aa0ad";
  const shade = shadeHex(color, -36);
  const light = shadeHex(color, 34);

  context.clearRect(0, 0, portrait.width, portrait.height);
  context.save();
  context.translate(48, 50);
  context.rotate(-0.12);
  context.shadowColor = "rgba(0, 0, 0, 0.22)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 6;

  const id = item.id;
  if (id.includes("bottle")) {
    drawBottlePortrait(context, color, shade, light);
  } else if (id.includes("tank") || id.includes("canister")) {
    drawTankPortrait(context, color, shade, light);
  } else if (id.includes("crate")) {
    drawCratePortrait(context, color, shade, light);
  } else if (id.includes("helmet")) {
    drawHelmetPortrait(context, color, shade, light);
  } else if (id.includes("battery")) {
    drawBatteryPortrait(context, color, shade, light);
  } else if (id.includes("ration")) {
    drawRationPortrait(context, color, shade, light);
  } else {
    drawMachinePortrait(context, color, shade, light);
  }

  context.restore();
  return portrait.toDataURL("image/png");
}

function drawBottlePortrait(context, color, shade, light) {
  context.fillStyle = light;
  roundRect(context, -10, -36, 20, 9, 3);
  context.fill();
  context.fillStyle = color;
  roundRect(context, -13, -28, 26, 52, 9);
  context.fill();
  context.fillStyle = "rgba(255,255,255,0.46)";
  roundRect(context, -7, -20, 5, 35, 3);
  context.fill();
  context.fillStyle = shade;
  roundRect(context, 5, -21, 5, 38, 3);
  context.fill();
}

function drawTankPortrait(context, color, shade, light) {
  context.fillStyle = shade;
  roundRect(context, -20, -38, 40, 76, 14);
  context.fill();
  context.fillStyle = color;
  roundRect(context, -17, -35, 34, 70, 12);
  context.fill();
  context.fillStyle = light;
  context.fillRect(-15, -24, 30, 7);
  context.fillRect(-15, 17, 30, 7);
  context.fillStyle = "rgba(255,255,255,0.36)";
  roundRect(context, -11, -27, 7, 48, 4);
  context.fill();
}

function drawCratePortrait(context, color, shade, light) {
  context.fillStyle = color;
  roundRect(context, -34, -26, 68, 52, 6);
  context.fill();
  context.strokeStyle = shade;
  context.lineWidth = 7;
  context.strokeRect(-29, -21, 58, 42);
  context.beginPath();
  context.moveTo(-28, -20);
  context.lineTo(28, 20);
  context.moveTo(28, -20);
  context.lineTo(-28, 20);
  context.stroke();
  context.fillStyle = light;
  context.fillRect(-25, -18, 50, 4);
}

function drawHelmetPortrait(context, color, shade, light) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(0, -2, 31, Math.PI * 0.12, Math.PI * 1.88);
  context.closePath();
  context.fill();
  context.fillStyle = shade;
  roundRect(context, -25, -9, 50, 24, 10);
  context.fill();
  context.fillStyle = "rgba(148, 223, 255, 0.78)";
  roundRect(context, -17, -12, 34, 20, 8);
  context.fill();
  context.fillStyle = light;
  context.fillRect(-24, 18, 48, 6);
}

function drawBatteryPortrait(context, color, shade, light) {
  context.fillStyle = shade;
  roundRect(context, -31, -22, 62, 44, 6);
  context.fill();
  context.fillStyle = color;
  roundRect(context, -27, -18, 54, 36, 5);
  context.fill();
  context.fillStyle = light;
  context.fillRect(-18, -9, 27, 18);
  context.fillStyle = "#10151a";
  context.fillRect(12, -6, 5, 12);
  context.fillStyle = shade;
  context.fillRect(31, -9, 7, 18);
}

function drawRationPortrait(context, color, shade, light) {
  context.fillStyle = color;
  roundRect(context, -28, -24, 56, 48, 11);
  context.fill();
  context.strokeStyle = shade;
  context.lineWidth = 4;
  context.strokeRect(-20, -16, 40, 32);
  context.fillStyle = light;
  context.fillRect(-15, -8, 30, 5);
  context.fillRect(-15, 4, 20, 4);
}

function drawMachinePortrait(context, color, shade, light) {
  context.fillStyle = shade;
  roundRect(context, -33, -28, 66, 56, 7);
  context.fill();
  context.fillStyle = color;
  roundRect(context, -27, -22, 54, 44, 5);
  context.fill();
  context.fillStyle = light;
  context.fillRect(-19, -14, 38, 9);
  context.fillStyle = "rgba(16,21,26,0.32)";
  context.fillRect(-17, 2, 34, 12);
}

function shadeHex(hex, amount) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized,
    16,
  );
  const channel = (shift) =>
    Math.max(0, Math.min(255, ((value >> shift) & 255) + amount));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

function updateLooseItemPhysics(seconds) {
  for (const item of itemRecords) {
    if (
      !item.dynamic ||
      item.sleeping ||
      !item.root.isEnabled()
    ) {
      continue;
    }

    item.velocity.y -= ITEM_GRAVITY * seconds;
    item.root.position.y += item.velocity.y * seconds;

    const supportY = getSupportY(item);
    const bounds = getProjectedItemBounds(item, item.root.position);
    if (bounds.min.y <= supportY) {
      item.root.position.y += supportY - bounds.min.y;
      item.velocity.y = 0;
      item.sleeping = true;
      recaptureItemBounds(item);
    } else if (Math.abs(item.velocity.y) < ITEM_SLEEP_EPSILON) {
      item.sleeping = true;
      recaptureItemBounds(item);
    }
  }
}

function getSupportY(item) {
  const projected = getProjectedItemBounds(item, item.root.position);
  let supportY = STUDIO_BOUNDS.floorY;

  for (const other of itemRecords) {
    if (other === item || !other.root.isEnabled()) continue;
    const otherBounds = getMeshBounds(getRenderableMeshes(other.root));
    const horizontalOverlap =
      projected.max.x > otherBounds.min.x &&
      projected.min.x < otherBounds.max.x &&
      projected.max.z > otherBounds.min.z &&
      projected.min.z < otherBounds.max.z;
    const fallingOntoOther =
      projected.min.y >= otherBounds.max.y - 0.08 ||
      item.root.position.y >= otherBounds.max.y;
    if (horizontalOverlap && fallingOntoOther) {
      supportY = Math.max(supportY, otherBounds.max.y);
    }
  }

  return supportY;
}

function recaptureItemBounds(item) {
  item.root.computeWorldMatrix(true);
  const bounds = getMeshBounds(getRenderableMeshes(item.root));
  item.size = bounds.max.subtract(bounds.min);
  item.boundsOffsetMin = bounds.min.subtract(item.root.position);
  item.boundsOffsetMax = bounds.max.subtract(item.root.position);
}

function getProjectedItemBounds(item, position) {
  return {
    min: position.add(item.boundsOffsetMin),
    max: position.add(item.boundsOffsetMax),
  };
}

function boundsOverlap(a, b) {
  return (
    a.min.x < b.max.x &&
    a.max.x > b.min.x &&
    a.min.y < b.max.y &&
    a.max.y > b.min.y &&
    a.min.z < b.max.z &&
    a.max.z > b.min.z
  );
}

function setWalkMode(enabled, lockPointer = false) {
  if (walkMode === enabled) return;

  walkMode = enabled;
  walkToggle.setAttribute("aria-pressed", String(enabled));
  document.body.classList.toggle("walk-mode", enabled);
  keys.clear();

  if (enabled) {
    spinEnabled = false;
    spinToggle.setAttribute("aria-pressed", "false");
    labelRoot.setEnabled(false);
    labelsToggle.setAttribute("aria-pressed", "false");
    standInStudio();
    camera.detachControl(canvas);
    scene.activeCamera = walkCamera;
    walkCamera.attachControl(canvas, true);
    canvas.focus();
    if (lockPointer) requestPointerLock();
  } else {
    if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    walkCamera.detachControl(canvas);
    scene.activeCamera = camera;
    camera.attachControl(canvas, true);
    labelRoot.setEnabled(true);
    labelsToggle.setAttribute("aria-pressed", "true");
    frameHome();
  }

  updateReadout();
}

function requestPointerLock() {
  if (document.pointerLockElement === canvas) return;
  canvas.focus();
  const lockRequest = canvas.requestPointerLock?.();
  lockRequest?.catch?.((error) => {
    console.warn("Pointer lock is waiting for a direct canvas click.", error);
  });
}

function standInStudio() {
  playerPhysics.eyeHeight = getStandingEyeHeight();
  playerPhysics.platformEyeHeight = playerPhysics.eyeHeight;
  walkCamera.position = new B.Vector3(0.0, getPlayerEyeHeight(), -0.5);
  walkCamera.setTarget(new B.Vector3(0.0, getPlayerEyeHeight() - 0.12, 0.26));
  syncPlayerColliderToCamera();
  playerPhysics.verticalVelocity = 0;
  playerPhysics.grounded = true;
}

function frameHome() {
  setCameraView(-Math.PI * 0.3, Math.PI * 0.36, 9.1);
}

function setCameraView(alpha, beta, radius) {
  camera.setTarget(new B.Vector3(0, 1.18, 0));
  camera.alpha = alpha;
  camera.beta = beta;
  camera.radius = radius;
}

function updateReadout() {
  const meshes = scene.meshes.filter((mesh) => mesh.getTotalVertices() > 0);
  const triangles = meshes.reduce(
    (sum, mesh) => sum + Math.floor(mesh.getTotalIndices() / 3),
    0,
  );
  const mode = walkMode
    ? `Walk ${playerPhysics.grounded ? "grounded" : "air"}`
    : "Orbit";
  readout.textContent = `${mode} / Meshes ${meshes.length} / Tris ${triangles.toLocaleString()}`;
}

function makeMaterialsStudioReady(result) {
  const materials = [
    ...new Set(result.meshes.map((mesh) => mesh.material).filter(Boolean)),
  ];
  for (const material of materials) {
    material.backFaceCulling = false;
    material.twoSidedLighting = true;
    if ("environmentIntensity" in material) {
      material.environmentIntensity = Math.max(material.environmentIntensity ?? 0, 0.55);
    }
  }
}

function normalizeModel(root, maxDimension) {
  const meshes = getRenderableMeshes(root);
  if (!meshes.length) return;

  root.computeWorldMatrix(true);
  meshes.forEach((mesh) => mesh.computeWorldMatrix(true));
  const bounds = getMeshBounds(meshes);
  const center = bounds.min.add(bounds.max).scale(0.5);
  const size = bounds.max.subtract(bounds.min);
  const scale = maxDimension / Math.max(size.x, size.y, size.z, 0.0001);

  root.scaling.setAll(scale);
  root.position = center.scale(-scale);
  root.computeWorldMatrix(true);
  meshes.forEach((mesh) => {
    mesh.computeWorldMatrix(true);
    mesh.isPickable = true;
  });
}

function updatePlayerPhysics(deltaSeconds) {
  if (!walkMode) return;

  const seconds = Math.min(deltaSeconds, 0.05);
  const crouching = playerPhysics.grounded && isShiftHeld();
  const move = B.Vector3.Zero();
  const forward = walkCamera.getDirection(B.Axis.Z);
  const right = walkCamera.getDirection(B.Axis.X);
  forward.y = 0;
  right.y = 0;
  if (forward.lengthSquared() > 0) forward.normalize();
  if (right.lengthSquared() > 0) right.normalize();
  updateCrouch(seconds, crouching);

  if (keys.has("KeyW")) move.addInPlace(forward);
  if (keys.has("KeyS")) move.subtractInPlace(forward);
  if (keys.has("KeyD")) move.addInPlace(right);
  if (keys.has("KeyA")) move.subtractInPlace(right);

  if (move.lengthSquared() > 0) {
    const baseSpeed = isControlHeld() ? PLAYER_BOOST_SPEED : PLAYER_SPEED;
    const speed = crouching ? baseSpeed * CROUCH_SPEED_SCALE : baseSpeed;
    movePlayerHorizontally(move.normalize().scale(speed * seconds));
    constrainPlayerToStudio();
  }

  updateStudioGravity(seconds);
}

function updateStudioGravity(seconds) {
  if (keys.has("Space") && playerPhysics.grounded) {
    playerPhysics.verticalVelocity = STUDIO_BOUNDS.jumpSpeed;
    playerPhysics.grounded = false;
  }

  playerPhysics.verticalVelocity -= STUDIO_BOUNDS.gravity * seconds;
  movePlayerWithCollisions(
    new B.Vector3(0, playerPhysics.verticalVelocity * seconds, 0),
  );
  constrainPlayerToStudio();

  const eyeHeight = getPlayerEyeHeight();
  if (
    playerPhysics.verticalVelocity <= 0 &&
    walkCamera.position.y <= eyeHeight
  ) {
    walkCamera.position.y = eyeHeight;
    playerPhysics.verticalVelocity = 0;
    playerPhysics.grounded = true;
  } else {
    playerPhysics.grounded = false;
  }

  const ceilingEyeHeight = STUDIO_BOUNDS.ceilingY - STUDIO_BOUNDS.radius;
  if (walkCamera.position.y > ceilingEyeHeight) {
    walkCamera.position.y = ceilingEyeHeight;
    playerPhysics.verticalVelocity = Math.min(playerPhysics.verticalVelocity, 0);
  }
  syncPlayerColliderToCamera();
}

function movePlayerHorizontally(displacement) {
  if (displacement.lengthSquared() <= 0) return;

  if (canMoveHorizontally(displacement)) {
    movePlayerWithCollisions(displacement);
    return;
  }

  const xOnly = new B.Vector3(displacement.x, 0, 0);
  if (xOnly.lengthSquared() > 0 && canMoveHorizontally(xOnly)) {
    movePlayerWithCollisions(xOnly);
  }

  const zOnly = new B.Vector3(0, 0, displacement.z);
  if (zOnly.lengthSquared() > 0 && canMoveHorizontally(zOnly)) {
    movePlayerWithCollisions(zOnly);
  }
}

function canMoveHorizontally(displacement) {
  const distance = displacement.length();
  if (distance <= 0) return true;

  const direction = displacement.scale(1 / distance);
  const side = new B.Vector3(-direction.z, 0, direction.x);
  const eye = walkCamera.position;
  const castDistance = distance + STUDIO_BOUNDS.radius * 1.35;
  const playerHeight = getPlayerEyeHeight() - STUDIO_BOUNDS.floorY;
  const sampleHeights = [
    0,
    -playerHeight * 0.35,
    Math.min(
      playerHeight * 0.25,
      STUDIO_BOUNDS.ceilingY - eye.y - STUDIO_BOUNDS.radius,
    ),
  ];
  const sideOffsets = [
    0,
    -STUDIO_BOUNDS.radius * 0.85,
    STUDIO_BOUNDS.radius * 0.85,
  ];

  for (const height of sampleHeights) {
    for (const sideOffset of sideOffsets) {
      const origin = eye
        .add(new B.Vector3(0, height, 0))
        .add(side.scale(sideOffset));
      const ray = new B.Ray(origin, direction, castDistance);
      const hit = scene.pickWithRay(ray, (mesh) =>
        collisionMeshes.includes(mesh),
      );
      if (hit?.hit && hit.distance <= castDistance) return false;
    }
  }

  return true;
}

function movePlayerWithCollisions(displacement) {
  walkCamera.position.addInPlace(displacement);
  syncPlayerColliderToCamera();
}

function constrainPlayerToStudio() {
  const radius = STUDIO_BOUNDS.radius;
  walkCamera.position.x = Math.min(
    Math.max(walkCamera.position.x, STUDIO_BOUNDS.minX + radius),
    STUDIO_BOUNDS.maxX - radius,
  );
  walkCamera.position.z = Math.min(
    Math.max(walkCamera.position.z, STUDIO_BOUNDS.minZ + radius),
    STUDIO_BOUNDS.maxZ - radius,
  );
  walkCamera.position.y = Math.min(
    Math.max(walkCamera.position.y, getPlayerEyeHeight()),
    STUDIO_BOUNDS.ceilingY - radius,
  );
  syncPlayerColliderToCamera();
}

function syncPlayerColliderToCamera() {
  playerCollider.position.copyFrom(walkCamera.position);
}

function getPlayerEyeHeight() {
  return playerPhysics.eyeHeight ?? getStandingEyeHeight();
}

function getStandingEyeHeight() {
  return STUDIO_BOUNDS.floorY + STUDIO_BOUNDS.playerHeight;
}

function isShiftHeld() {
  return keys.has("ShiftLeft") || keys.has("ShiftRight");
}

function isControlHeld() {
  return keys.has("ControlLeft") || keys.has("ControlRight");
}

function updateCrouch(seconds, crouching) {
  const standingEyeHeight = getStandingEyeHeight();
  if (playerPhysics.platformEyeHeight !== standingEyeHeight) {
    playerPhysics.platformEyeHeight = standingEyeHeight;
    playerPhysics.eyeHeight = standingEyeHeight;
    if (playerPhysics.grounded) {
      walkCamera.position.y = standingEyeHeight;
    }
  }

  const standingHeight = standingEyeHeight - STUDIO_BOUNDS.floorY;
  const crouchEyeHeight = Math.max(
    STUDIO_BOUNDS.floorY + STUDIO_BOUNDS.radius * 2,
    STUDIO_BOUNDS.floorY + standingHeight * CROUCH_EYE_HEIGHT_SCALE,
  );
  const targetEyeHeight = crouching ? crouchEyeHeight : standingEyeHeight;
  const currentEyeHeight = playerPhysics.eyeHeight ?? standingEyeHeight;
  const blend = 1 - Math.exp(-CROUCH_TRANSITION_SPEED * seconds);

  playerPhysics.eyeHeight =
    currentEyeHeight + (targetEyeHeight - currentEyeHeight) * blend;
  if (playerPhysics.grounded) {
    walkCamera.position.y = playerPhysics.eyeHeight;
    syncPlayerColliderToCamera();
  }
}

function settleOnFloor(root, floorY) {
  root.computeWorldMatrix(true);
  const meshes = getRenderableMeshes(root);
  meshes.forEach((mesh) => mesh.computeWorldMatrix(true));
  const bounds = getMeshBounds(meshes);
  root.position.y += floorY - bounds.min.y;
}

function getMeshBounds(meshes) {
  const min = new B.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new B.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  for (const mesh of meshes) {
    const box = mesh.getBoundingInfo().boundingBox;
    min.minimizeInPlace(box.minimumWorld);
    max.maximizeInPlace(box.maximumWorld);
  }

  return { min, max };
}

function getRenderableMeshes(root) {
  return root.getChildMeshes(false).filter((mesh) => mesh.getTotalVertices() > 0);
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function showRuntimeError(error) {
  console.error(error);
  errorBox.hidden = false;
  errorBox.textContent =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
