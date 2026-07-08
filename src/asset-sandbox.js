import brownDwarfLevel from "../levels/brown_dwarf/level.js";
import { replaceGlassWithClearMaterial } from "./spaceship-glass.js";

const B = window.BABYLON;
const MODEL_FILE = "assets/ship.glb";
const MODEL_URL = `./${MODEL_FILE.split("/").map(encodeURIComponent).join("/")}`;
const PLAYER_HEIGHT_SCALE = 0.8;

const canvas = document.querySelector("#asset-canvas");
const errorBox = document.querySelector("#runtime-error");
const gridToggle = document.querySelector("#grid-toggle");
const axesToggle = document.querySelector("#axes-toggle");
const frameButton = document.querySelector("#frame-button");
const insideToggle = document.querySelector("#inside-toggle");
const meshCount = document.querySelector("#mesh-count");
const materialList = document.querySelector("#material-list");
const walkSpeedInput = document.querySelector("#walk-speed");
const walkSpeedOutput = document.querySelector("#walk-speed-output");
const physicsStatus = document.querySelector("#physics-status");
const perfFps = document.querySelector("#perf-fps");
const perfFrame = document.querySelector("#perf-frame");
const perfCpu = document.querySelector("#perf-cpu");
const perfGpu = document.querySelector("#perf-gpu");
const perfMeshes = document.querySelector("#perf-meshes");
const perfTris = document.querySelector("#perf-tris");
const perfMaterials = document.querySelector("#perf-materials");
const perfTextures = document.querySelector("#perf-textures");
const startInside = new URLSearchParams(location.search).has("inside");

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
scene.collisionsEnabled = true;
scene.clearColor = color4FromHex(brownDwarfLevel.sky.background[0], 1);
scene.environmentIntensity = 0.86;
scene.imageProcessingConfiguration.toneMappingEnabled = true;
scene.imageProcessingConfiguration.exposure = 1.08;
scene.imageProcessingConfiguration.contrast = 1.08;
const starfield = createStarfield(scene, brownDwarfLevel.sky);

const engineInstrumentation = B.EngineInstrumentation
  ? new B.EngineInstrumentation(engine)
  : null;
if (engineInstrumentation) {
  engineInstrumentation.captureGPUFrameTime = true;
}

const camera = new B.ArcRotateCamera(
  "asset-camera",
  -Math.PI * 0.36,
  Math.PI * 0.34,
  5.2,
  B.Vector3.Zero(),
  scene,
);
camera.lowerRadiusLimit = 0.8;
camera.upperRadiusLimit = 80;
camera.wheelDeltaPercentage = 0.02;
camera.panningSensibility = 120;
camera.attachControl(canvas, true);
scene.activeCamera = camera;

const interiorCamera = new B.UniversalCamera(
  "ship-interior-camera",
  new B.Vector3(0, 0, 0),
  scene,
);
interiorCamera.minZ = 0.01;
interiorCamera.fov = Math.PI * 0.48;
interiorCamera.speed = 0;
interiorCamera.angularSensibility = 600;
interiorCamera.inertia = 0.32;
interiorCamera.checkCollisions = true;
interiorCamera.keysUp = [];
interiorCamera.keysDown = [];
interiorCamera.keysLeft = [];
interiorCamera.keysRight = [];

const keyLight = new B.DirectionalLight(
  "asset-key-light",
  new B.Vector3(-0.35, -0.85, -0.36),
  scene,
);
keyLight.intensity = 1.9;
keyLight.diffuse = new B.Color3(1.0, 0.94, 0.82);

const rimLight = new B.DirectionalLight(
  "asset-rim-light",
  new B.Vector3(0.58, -0.28, 0.76),
  scene,
);
rimLight.intensity = 0.82;
rimLight.diffuse = new B.Color3(0.48, 0.68, 1.0);

const fillLight = new B.HemisphericLight(
  "asset-fill-light",
  new B.Vector3(0, 1, 0),
  scene,
);
fillLight.intensity = 0.52;
fillLight.diffuse = new B.Color3(0.56, 0.7, 0.82);
fillLight.groundColor = new B.Color3(0.09, 0.07, 0.06);

const assetRoot = new B.TransformNode("asset-root", scene);
const modelRoot = new B.TransformNode("glb-model-root", scene);
modelRoot.parent = assetRoot;

const grid = createGridLines(scene, "asset-grid", 8, 8, 36);
grid.setEnabled(false);
const axes = createAxes(scene, "asset-axes", 1.4);
axes.setEnabled(false);
const playerCollider = B.MeshBuilder.CreateSphere(
  "player-collider",
  { diameter: 1, segments: 8 },
  scene,
);
playerCollider.isVisible = false;
playerCollider.isPickable = false;
playerCollider.checkCollisions = true;

let insideMode = false;
const keys = new Set();
const playerPhysics = {
  verticalVelocity: 0,
  grounded: false,
  platform: null,
};

setStatus("Loading GLB...");
loadModel();

gridToggle.addEventListener("click", () => {
  const enabled = !grid.isEnabled();
  grid.setEnabled(enabled);
  gridToggle.setAttribute("aria-pressed", String(enabled));
});

axesToggle.addEventListener("click", () => {
  const enabled = !axes.isEnabled();
  axes.setEnabled(enabled);
  axesToggle.setAttribute("aria-pressed", String(enabled));
});

frameButton.addEventListener("click", () => {
  if (insideMode) {
    standInsideShip();
  } else {
    frameScene();
  }
});

insideToggle.addEventListener("click", () => {
  setInsideMode(!insideMode, true);
});

canvas.addEventListener("click", () => {
  if (insideMode) requestCameraPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  document.body.classList.toggle(
    "pointer-locked",
    document.pointerLockElement === canvas,
  );
  updatePhysicsStatus();
});

walkSpeedInput.addEventListener("input", () => {
  updatePhysicsStatus();
});

addEventListener("keydown", (event) => {
  if (!insideMode) return;
  if (
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "Space",
      "ShiftLeft",
      "ShiftRight",
      "KeyE",
    ].includes(event.code)
  ) {
    event.preventDefault();
    keys.add(event.code);
  }
});

addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

if (startInside) {
  setInsideMode(true);
}

let lastPerfUpdate = 0;
let lastCpuRenderMs = 0;
engine.runRenderLoop(() => {
  const cpuStart = performance.now();
  updatePlayerPhysics(engine.getDeltaTime() / 1000);
  starfield.position.copyFrom(scene.activeCamera.globalPosition);
  scene.render();
  lastCpuRenderMs = performance.now() - cpuStart;

  const now = performance.now();
  if (now - lastPerfUpdate > 250) {
    updatePerformanceStats();
    lastPerfUpdate = now;
  }
});

addEventListener("resize", () => engine.resize());

async function loadModel() {
  try {
    if (!B.SceneLoader) {
      throw new Error("Babylon SceneLoader is unavailable.");
    }

    const result = await B.SceneLoader.ImportMeshAsync(
      "",
      "",
      MODEL_URL,
      scene,
    );
    const importedNodes = [...result.meshes, ...result.transformNodes];
    for (const node of importedNodes) {
      if (!node.parent) {
        node.parent = modelRoot;
      }
    }

    makeMaterialsDoubleSided(result);
    replaceGlassWithClearMaterial(result, scene, {
      ...brownDwarfLevel.platform,
      glassColor: [0.82, 0.96, 1],
      glassRimColor: [0.6, 0.86, 1],
      glassAlpha: 0.27,
      glassDirectIntensity: 0.48,
      glassEnvironmentIntensity: 1.15,
      glassThicknessAlpha: 0.16,
    });
    enableMeshCollisions(result);
    normalizeModel(modelRoot);
    configurePlayerPhysics();
    frameScene();
    updateMeshCount();
    populateMaterialList(result);
    setStatus(`${MODEL_FILE}`);
    updatePerformanceStats();
    if (insideMode) {
      standInsideShip();
    }
  } catch (error) {
    showRuntimeError(error);
  }
}

function setInsideMode(enabled, lockPointer = false) {
  insideMode = enabled;
  insideToggle.setAttribute("aria-pressed", String(enabled));
  document.body.classList.toggle("inside-mode", enabled);
  keys.clear();

  if (enabled) {
    standInsideShip();
    camera.detachControl(canvas);
    scene.activeCamera = interiorCamera;
    interiorCamera.attachControl(canvas, true);
    canvas.focus();
    if (lockPointer) requestCameraPointerLock();
  } else {
    if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    interiorCamera.detachControl(canvas);
    scene.activeCamera = camera;
    camera.attachControl(canvas, true);
    frameScene();
  }
}

function requestCameraPointerLock() {
  if (document.pointerLockElement === canvas) return;
  canvas.focus();
  const lockRequest = canvas.requestPointerLock?.();
  lockRequest?.catch?.((error) => {
    console.warn("Pointer lock is waiting for a direct canvas click.", error);
  });
}

function standInsideShip() {
  const platformPhysics = configurePlayerPhysics();
  if (!platformPhysics) return;

  const meshes = getRenderableMeshes(assetRoot);
  const bounds = platformPhysics.bounds;
  const center = bounds.min.add(bounds.max).scale(0.5);
  const size = bounds.max.subtract(bounds.min);
  const glassCenter =
    getNamedMeshCenter(meshes, ["glass", "window"]) ??
    center.add(new B.Vector3(0, size.y * 0.05, -size.z * 0.42));
  interiorCamera.position = new B.Vector3(
    center.x,
    platformPhysics.eyeHeight,
    center.z,
  );
  syncPlayerColliderToCamera();
  playerPhysics.verticalVelocity = 0;
  playerPhysics.grounded = true;
  interiorCamera.setTarget(glassCenter.add(new B.Vector3(0, size.y * 0.02, 0)));
  updatePhysicsStatus();
}

function configurePlayerPhysics() {
  const meshes = getRenderableMeshes(assetRoot);
  if (!meshes.length) return null;

  const bounds = getMeshBounds(meshes);
  const size = bounds.max.subtract(bounds.min);
  const floorY = findFloorY(bounds) ?? bounds.min.y;
  const ceilingY = findCeilingY(bounds) ?? bounds.max.y;
  const interiorHeight = Math.max(ceilingY - floorY, size.y, 0.001);
  const center = bounds.min.add(bounds.max).scale(0.5);
  const playerHeight = Math.min(
    interiorHeight * 0.5 * PLAYER_HEIGHT_SCALE,
    interiorHeight * 0.58,
  );
  const radius = Math.max(Math.min(size.x, size.z) * 0.055, 0.05);
  const ellipsoid = new B.Vector3(radius, radius, radius);
  interiorCamera.ellipsoid = ellipsoid.clone();
  interiorCamera.ellipsoidOffset = B.Vector3.Zero();
  playerCollider.ellipsoid = ellipsoid.clone();
  playerCollider.ellipsoidOffset = B.Vector3.Zero();

  playerPhysics.platform = {
    bounds,
    centerX: center.x,
    centerZ: center.z,
    width: size.x,
    depth: size.z,
    radius,
    floorY,
    ceilingY,
    playerHeight,
    eyeHeight: floorY + playerHeight,
    gravity: 20,
    jumpSpeed: 5.4,
  };
  updatePhysicsStatus();
  return playerPhysics.platform;
}

function updatePlayerPhysics(deltaSeconds) {
  if (!insideMode) return;

  const seconds = Math.min(deltaSeconds, 0.05);
  const platformPhysics = playerPhysics.platform;
  const move = B.Vector3.Zero();
  const forward = interiorCamera.getDirection(B.Axis.Z);
  const right = interiorCamera.getDirection(B.Axis.X);

  if (platformPhysics) {
    forward.y = 0;
    right.y = 0;
    if (forward.lengthSquared() > 0) forward.normalize();
    if (right.lengthSquared() > 0) right.normalize();
  }

  if (keys.has("KeyW")) move.addInPlace(forward);
  if (keys.has("KeyS")) move.subtractInPlace(forward);
  if (keys.has("KeyD")) move.addInPlace(right);
  if (keys.has("KeyA")) move.subtractInPlace(right);

  if (move.lengthSquared() > 0) {
    const speed = keys.has("KeyE")
      ? Number(walkSpeedInput.value) * 2.4
      : Number(walkSpeedInput.value);
    movePlayerHorizontally(
      move.normalize().scale(speed * seconds),
      platformPhysics,
    );
    clampPlayerToCapsule(platformPhysics);
  }
  if (platformPhysics) {
    updatePlatformGravity(platformPhysics, seconds);
  }

  updatePhysicsStatus();
}

function updatePlatformGravity(platform, seconds) {
  const halfWidth = platform.width * 0.5;
  const halfDepth = platform.depth * 0.5;
  const overDeck =
    Math.abs(interiorCamera.position.x - platform.centerX) <= halfWidth &&
    Math.abs(interiorCamera.position.z - platform.centerZ) <= halfDepth;

  if (keys.has("Space") && playerPhysics.grounded) {
    playerPhysics.verticalVelocity = platform.jumpSpeed;
    playerPhysics.grounded = false;
  }

  playerPhysics.verticalVelocity -= platform.gravity * seconds;
  movePlayerWithCollisions(
    new B.Vector3(0, playerPhysics.verticalVelocity * seconds, 0),
  );
  clampPlayerToCapsule(platform);

  if (
    overDeck &&
    playerPhysics.verticalVelocity <= 0 &&
    interiorCamera.position.y <= platform.eyeHeight
  ) {
    interiorCamera.position.y = platform.eyeHeight;
    playerPhysics.verticalVelocity = 0;
    playerPhysics.grounded = true;
  } else {
    playerPhysics.grounded = false;
  }

  const ceilingEyeHeight = platform.ceilingY - platform.radius;
  if (interiorCamera.position.y > ceilingEyeHeight) {
    interiorCamera.position.y = ceilingEyeHeight;
    playerPhysics.verticalVelocity = Math.min(
      playerPhysics.verticalVelocity,
      0,
    );
  }
}

function clampPlayerToCapsule(platform) {
  if (!platform) return;
  const min = platform.bounds.min;
  const max = platform.bounds.max;
  const radius = platform.radius;

  interiorCamera.position.x = Math.min(
    Math.max(interiorCamera.position.x, min.x + radius),
    max.x - radius,
  );
  interiorCamera.position.z = Math.min(
    Math.max(interiorCamera.position.z, min.z + radius),
    max.z - radius,
  );
  interiorCamera.position.y = Math.min(
    Math.max(interiorCamera.position.y, platform.eyeHeight),
    platform.ceilingY - radius,
  );
  syncPlayerColliderToCamera();
}

function movePlayerWithCollisions(displacement) {
  if (typeof playerCollider.moveWithCollisions === "function") {
    syncPlayerColliderToCamera();
    playerCollider.moveWithCollisions(displacement);
    interiorCamera.position.copyFrom(playerCollider.position);
  } else {
    interiorCamera.position.addInPlace(displacement);
    syncPlayerColliderToCamera();
  }
}

function syncPlayerColliderToCamera() {
  playerCollider.position.copyFrom(interiorCamera.position);
}

function movePlayerHorizontally(displacement, platform) {
  if (!platform || displacement.lengthSquared() <= 0) return;

  if (canMoveHorizontally(displacement, platform)) {
    movePlayerWithCollisions(displacement);
    return;
  }

  const xOnly = new B.Vector3(displacement.x, 0, 0);
  if (xOnly.lengthSquared() > 0 && canMoveHorizontally(xOnly, platform)) {
    movePlayerWithCollisions(xOnly);
  }

  const zOnly = new B.Vector3(0, 0, displacement.z);
  if (zOnly.lengthSquared() > 0 && canMoveHorizontally(zOnly, platform)) {
    movePlayerWithCollisions(zOnly);
  }
}

function canMoveHorizontally(displacement, platform) {
  const distance = displacement.length();
  if (distance <= 0) return true;

  const direction = displacement.scale(1 / distance);
  const side = new B.Vector3(-direction.z, 0, direction.x);
  const eye = interiorCamera.position;
  const castDistance = distance + platform.radius * 1.35;
  const sampleHeights = [
    0,
    -platform.playerHeight * 0.35,
    Math.min(
      platform.playerHeight * 0.35,
      platform.ceilingY - eye.y - platform.radius,
    ),
  ];
  const sideOffsets = [0, -platform.radius * 0.85, platform.radius * 0.85];

  for (const height of sampleHeights) {
    for (const sideOffset of sideOffsets) {
      const origin = eye
        .add(new B.Vector3(0, height, 0))
        .add(side.scale(sideOffset));
      const ray = new B.Ray(origin, direction, castDistance);
      const hit = scene.pickWithRay(ray, isModelMesh);
      if (hit?.hit && hit.distance <= castDistance) return false;
    }
  }

  return true;
}

function findFloorY(bounds) {
  const origin = new B.Vector3(
    (bounds.min.x + bounds.max.x) * 0.5,
    bounds.min.y - 0.05,
    (bounds.min.z + bounds.max.z) * 0.5,
  );
  const ray = new B.Ray(
    origin,
    B.Vector3.Up(),
    bounds.max.y - bounds.min.y + 0.1,
  );
  const hit = scene.pickWithRay(ray, isModelMesh);
  return hit?.hit ? hit.pickedPoint.y : null;
}

function findCeilingY(bounds) {
  const origin = new B.Vector3(
    (bounds.min.x + bounds.max.x) * 0.5,
    bounds.max.y + 0.05,
    (bounds.min.z + bounds.max.z) * 0.5,
  );
  const ray = new B.Ray(
    origin,
    B.Vector3.Down(),
    bounds.max.y - bounds.min.y + 0.1,
  );
  const hit = scene.pickWithRay(ray, isModelMesh);
  return hit?.hit ? hit.pickedPoint.y : null;
}

function isModelMesh(mesh) {
  return (
    mesh &&
    mesh.parent !== null &&
    mesh.name !== "asset-grid" &&
    mesh.name !== "asset-axes"
  );
}

function updatePhysicsStatus() {
  walkSpeedOutput.textContent = Number(walkSpeedInput.value).toFixed(2);
  const lockStatus = insideMode
    ? document.pointerLockElement === canvas
      ? "locked"
      : "click canvas"
    : "idle";
  physicsStatus.textContent = playerPhysics.platform
    ? `Player ${playerPhysics.platform.playerHeight.toFixed(2)}u · ${
        playerPhysics.grounded ? "grounded" : "air"
      } · ${lockStatus}`
    : "Physics idle";
}

function normalizeModel(root) {
  const meshes = getRenderableMeshes(root);
  if (!meshes.length) return;

  const bounds = getMeshBounds(meshes);
  const center = bounds.min.add(bounds.max).scale(0.5);
  const size = bounds.max.subtract(bounds.min);
  const maxSize = Math.max(size.x, size.y, size.z, 0.0001);
  const scale = 3.3 / maxSize;

  root.position = center.negate();
  root.scaling.setAll(scale);
  root.computeWorldMatrix(true);
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
  }
}

function frameScene() {
  const meshes = getRenderableMeshes(assetRoot);
  if (!meshes.length) {
    camera.setTarget(B.Vector3.Zero());
    camera.radius = 5.2;
    return;
  }

  const bounds = getMeshBounds(meshes);
  const center = bounds.min.add(bounds.max).scale(0.5);
  const size = bounds.max.subtract(bounds.min);
  const radius = Math.max(size.length() * 1.18, 4.2);

  camera.setTarget(center);
  camera.radius = radius;
  camera.lowerRadiusLimit = Math.max(radius * 0.16, 0.35);
  camera.upperRadiusLimit = Math.max(radius * 8, 12);
}

function getRenderableMeshes(root) {
  return root
    .getChildMeshes(false)
    .filter((mesh) => mesh.isEnabled() && mesh.getTotalVertices() > 0);
}

function getMeshBounds(meshes) {
  const min = new B.Vector3(Infinity, Infinity, Infinity);
  const max = new B.Vector3(-Infinity, -Infinity, -Infinity);

  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    min.minimizeInPlace(box.minimumWorld);
    max.maximizeInPlace(box.maximumWorld);
  }

  return { min, max };
}

function getNamedMeshCenter(meshes, needles) {
  const mesh = meshes.find((candidate) => {
    const name =
      `${candidate.name} ${candidate.material?.name ?? ""}`.toLowerCase();
    return needles.some((needle) => name.includes(needle));
  });
  if (!mesh) return null;

  const bounds = getMeshBounds([mesh]);
  return bounds.min.add(bounds.max).scale(0.5);
}

function makeMaterialsDoubleSided(result) {
  const materials = [
    ...new Set(result.meshes.map((mesh) => mesh.material).filter(Boolean)),
  ];
  for (const material of materials) {
    material.backFaceCulling = false;
    material.twoSidedLighting = true;
  }
}

function enableMeshCollisions(result) {
  for (const mesh of result.meshes) {
    if (mesh.getTotalVertices() > 0) {
      mesh.checkCollisions = true;
      mesh.isPickable = true;
    }
  }
}

function createStarfield(scene, sky) {
  const random = createRandom(sky.seed);
  const root = new B.TransformNode("asset-starfield", scene);

  for (const layer of sky.starLayers) {
    const cloud = new B.PointsCloudSystem(
      `asset-${layer.name ?? "stars"}`,
      layer.pointSize,
      scene,
    );
    cloud.addPoints(layer.count, (star) => {
      const y = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const ring = Math.sqrt(1 - y * y);
      const tint = random();
      const base =
        tint < 0.06
          ? [0.42, 0.62, 1]
          : tint < 0.12
            ? [0.68, 0.84, 1]
            : tint < 0.18
              ? [1, 0.42, 0.28]
              : tint < 0.28
                ? [1, 0.78, 0.32]
                : [1, 1, 1];
      const light = layer.brightness * (0.5 + random() * 0.4);

      star.position.set(
        sky.radius * ring * Math.cos(angle),
        sky.radius * y,
        sky.radius * ring * Math.sin(angle),
      );
      star.color = new B.Color4(
        base[0] * light,
        base[1] * light,
        base[2] * light,
        1,
      );
    });

    cloud.buildMeshAsync().then((mesh) => {
      mesh.parent = root;
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      mesh.alwaysSelectAsActiveMesh = true;
      mesh.infiniteDistance = true;
    });
  }

  return root;
}

function createRandom(seed) {
  let state = seed;
  return () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function color4FromHex(hex, alpha) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return new B.Color4(
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
    alpha,
  );
}

function populateMaterialList(result) {
  const materials = [
    ...new Set(result.meshes.map((mesh) => mesh.material).filter(Boolean)),
  ];
  materialList.replaceChildren();

  const header = document.createElement("span");
  header.style.setProperty("--swatch", "#79d7ff");
  header.textContent = `Loaded ${result.meshes.length} meshes, ${materials.length} materials`;
  materialList.append(header);

  for (const material of materials) {
    const swatch =
      material.diffuseColor ?? material.albedoColor ?? material.emissiveColor;
    const item = document.createElement("span");
    item.style.setProperty("--swatch", colorToHex(swatch));
    item.textContent = material.name || material.id || "Unnamed material";
    materialList.append(item);
  }
}

function updateMeshCount() {
  const renderableMeshes = getRenderableMeshes(assetRoot);
  meshCount.textContent = `Meshes ${renderableMeshes.length}`;
}

function updatePerformanceStats() {
  const fps = engine.getFps();
  const frameMs = fps > 0 ? 1000 / fps : 0;
  const renderableMeshes = getRenderableMeshes(assetRoot);
  const triangles = renderableMeshes.reduce(
    (total, mesh) => total + mesh.getTotalIndices() / 3,
    0,
  );
  const gpuMs = getGpuFrameMs();
  const cpuPercent =
    frameMs > 0 ? Math.min((lastCpuRenderMs / frameMs) * 100, 999) : 0;
  const gpuPercent =
    gpuMs !== null && frameMs > 0
      ? Math.min((gpuMs / frameMs) * 100, 999)
      : null;

  perfFps.textContent = String(Math.round(fps));
  perfFrame.textContent = `${frameMs.toFixed(1)} ms`;
  perfCpu.textContent = `${cpuPercent.toFixed(0)}%`;
  perfGpu.textContent =
    gpuPercent === null ? "n/a" : `${gpuPercent.toFixed(0)}%`;
  perfMeshes.textContent = String(renderableMeshes.length);
  perfTris.textContent = formatNumber(Math.round(triangles));
  perfMaterials.textContent = String(scene.materials.length);
  perfTextures.textContent = String(scene.textures.length);
}

function getGpuFrameMs() {
  const counter = engineInstrumentation?.gpuFrameTimeCounter;
  if (!counter || !Number.isFinite(counter.current) || counter.current <= 0)
    return null;
  return counter.current / 1000000;
}

function createGridLines(scene, name, size, divisions, subdivisions) {
  const lines = [];
  const half = size / 2;
  const step = size / subdivisions;

  for (let i = 0; i <= subdivisions; i += 1) {
    const p = -half + i * step;
    const primary =
      Math.abs(p) < 0.0001 || i % Math.max(1, subdivisions / divisions) === 0;
    const color = primary
      ? new B.Color4(0.32, 0.44, 0.5, 0.55)
      : new B.Color4(0.17, 0.23, 0.27, 0.34);

    lines.push({
      points: [new B.Vector3(-half, -0.02, p), new B.Vector3(half, -0.02, p)],
      colors: [color, color],
    });
    lines.push({
      points: [new B.Vector3(p, -0.02, -half), new B.Vector3(p, -0.02, half)],
      colors: [color, color],
    });
  }

  return B.MeshBuilder.CreateLineSystem(name, { lines }, scene);
}

function createAxes(scene, name, length) {
  const axis = B.MeshBuilder.CreateLineSystem(
    name,
    {
      lines: [
        [B.Vector3.Zero(), new B.Vector3(length, 0, 0)],
        [B.Vector3.Zero(), new B.Vector3(0, length, 0)],
        [B.Vector3.Zero(), new B.Vector3(0, 0, length)],
      ],
      colors: [
        [new B.Color4(1, 0.22, 0.16, 1), new B.Color4(1, 0.22, 0.16, 1)],
        [new B.Color4(0.24, 1, 0.36, 1), new B.Color4(0.24, 1, 0.36, 1)],
        [new B.Color4(0.24, 0.55, 1, 1), new B.Color4(0.24, 0.55, 1, 1)],
      ],
    },
    scene,
  );
  axis.isPickable = false;
  return axis;
}

function setStatus(label) {
  const first =
    materialList.querySelector("span") ?? document.createElement("span");
  first.style.setProperty("--swatch", "#79d7ff");
  first.textContent = label;
  if (!first.parentNode) materialList.append(first);
}

function showRuntimeError(error) {
  const message = error?.stack ?? error?.message ?? String(error);
  errorBox.hidden = false;
  errorBox.textContent = message;
  console.error(error);
}

function colorToHex(color) {
  if (!color) return "#8a9190";
  const toByte = (value) => Math.round(Math.min(Math.max(value, 0), 1) * 255);
  return `#${[color.r, color.g, color.b]
    .map((value) => toByte(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}
