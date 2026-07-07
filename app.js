import brownDwarfLevel from "./levels/brown_dwarf/level.js";
import { buildLevel } from "./src/level-system.js";

const B = window.BABYLON;
const canvas = document.querySelector("#sandbox");
const metrics = document.querySelector(".metrics");
const hud = document.querySelector(".hud");
const backgroundMusic = createBackgroundMusic("./background.mp3");

addEventListener("error", (event) => showRuntimeError(event.error ?? event.message));
addEventListener("unhandledrejection", (event) =>
  showRuntimeError(event.reason),
);

const engine = new B.Engine(canvas, true, {
  antialias: true,
  adaptToDeviceRatio: false,
  powerPreference: "high-performance",
});
engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, 1.5));
engine.metadata = { performance: {} };
const scene = new B.Scene(engine);
scene.metadata = {
  timeScale: 1,
  profiler: createAssetProfiler(),
};
const performanceMonitor = createPerformanceMonitor(engine, metrics);

scene.clearColor.set(0, 0, 0, 1);
scene.imageProcessingConfiguration.toneMappingEnabled = true;
scene.imageProcessingConfiguration.exposure = 0.9;

const camera = new B.UniversalCamera(
  "player-camera",
  B.Vector3.FromArray(brownDwarfLevel.spawn.position),
  scene,
);
camera.fov = Math.PI / 3;
camera.minZ = 0.05;
camera.maxZ = 3000;
camera.speed = 0;
camera.angularSensibility = 5200;
camera.inertia = 0.18;
camera.setTarget(B.Vector3.FromArray(brownDwarfLevel.spawn.target));
camera.attachControl(canvas, true);

canvas.addEventListener("click", () => canvas.requestPointerLock?.());
installBackgroundMusicUnlock(backgroundMusic);

const keys = new Set();
const movementKeys = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyE",
]);

addEventListener("keydown", (event) => {
  if (movementKeys.has(event.code)) event.preventDefault();
  keys.add(event.code);
});
addEventListener("keyup", (event) => keys.delete(event.code));

const level = buildLevel(scene, brownDwarfLevel);
const playerPhysics = {
  verticalVelocity: 0,
  grounded: Boolean(level.platform),
};
const timeSpeeds = [0, 0.25, 1, 4, 16, 64];
let timeSpeedIndex = 2;
let flyMode = false;
if (level.platform) {
  const orbit = level.platform.orbit;
  const orbitStatus = document.createElement("span");
  orbitStatus.textContent =
    `Orbit ${(orbit.speedMps / 1000).toFixed(1)} km/s · ` +
    `${orbit.radiusKm.toLocaleString()} km`;
  hud.append(orbitStatus);
}
const timeButton = createHudButton();
const flyButton = createHudButton();
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
hud.append(timeButton, flyButton);
updateHudButtons();

scene.onBeforeRenderObservable.add(() => {
  scene.metadata.profiler.measure("Player", () => {
    const seconds = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const platformPhysics = level.platform?.physics;
    const move = B.Vector3.Zero();
    const forward = camera.getDirection(B.Axis.Z);
    const right = camera.getDirection(B.Axis.X);

    if (camera.parent) {
      const inverseParent = camera.parent
        .getWorldMatrix()
        .clone()
        .invert();
      B.Vector3.TransformNormalToRef(forward, inverseParent, forward);
      B.Vector3.TransformNormalToRef(right, inverseParent, right);
    }
    if (platformPhysics && !flyMode) {
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
      if (keys.has("ShiftLeft") || keys.has("ShiftRight")) move.y -= 1;
    } else if (flyMode) {
      if (keys.has("Space")) move.y += 1;
      if (keys.has("ShiftLeft") || keys.has("ShiftRight")) move.y -= 1;
    }

    if (move.lengthSquared() > 0) {
      const speed = keys.has("KeyE")
        ? brownDwarfLevel.player.boostSpeed
        : brownDwarfLevel.player.speed;
      camera.position.addInPlace(move.normalize().scale(speed * seconds));
    }
    if (platformPhysics && !flyMode) {
      updatePlatformGravity(platformPhysics, seconds);
    }

    level.starfield.position.copyFrom(camera.globalPosition);
    scene.metadata.profiler.setGpuWeight("Starfield", 1.8);
    scene.metadata.profiler.setGpuWeight("Platform", level.platform ? 0.8 : 0);
  });
});

engine.runRenderLoop(() => {
  const frame = performanceMonitor.beginFrame();
  scene.render();
  performanceMonitor.endFrame(frame);
});
addEventListener("resize", () => engine.resize());

function showRuntimeError(error) {
  const message = error?.stack ?? error?.message ?? String(error);
  metrics.textContent = `Render error: ${message}`;
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
    audio.play()
      .then(() => {
        starting = false;
        started = true;
        for (const eventName of events) removeEventListener(eventName, start);
      })
      .catch((error) => {
        starting = false;
        console.warn("Background music is waiting for user interaction.", error);
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

function updatePlatformGravity(platform, seconds) {
  const halfWidth = platform.width * 0.5;
  const halfDepth = platform.depth * 0.5;
  const overDeck =
    Math.abs(camera.position.x) <= halfWidth &&
    Math.abs(camera.position.z) <= halfDepth;

  if (keys.has("Space") && playerPhysics.grounded) {
    playerPhysics.verticalVelocity = platform.jumpSpeed;
    playerPhysics.grounded = false;
  }

  playerPhysics.verticalVelocity -= platform.gravity * seconds;
  camera.position.y += playerPhysics.verticalVelocity * seconds;

  if (
    overDeck &&
    playerPhysics.verticalVelocity <= 0 &&
    camera.position.y <= platform.eyeHeight
  ) {
    camera.position.y = platform.eyeHeight;
    playerPhysics.verticalVelocity = 0;
    playerPhysics.grounded = true;
  } else {
    playerPhysics.grounded = false;
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
      const measured = [...smoothedCpu.entries()]
        .filter(([, milliseconds]) => milliseconds > 0.002);
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
        rows.push({ name: "Render/other", percent: (other / denominator) * 100 });
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
    if (!timerExtension || frameNumber % 4 !== 0 || pendingQueries.length >= 4) {
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
      cpuElement.textContent =
        `CPU ${smoothedCpuMs.toFixed(1)}ms ${cpuPercent.toFixed(0)}%`;
      const profiler = engine.scenes[0]?.metadata?.profiler;
      if (profiler && cpuBreakdownElement && gpuBreakdownElement) {
        cpuBreakdownElement.textContent =
          `CPU parts ${formatBreakdown(profiler.getCpuBreakdown(smoothedCpuMs))}`;
        gpuBreakdownElement.textContent =
          `GPU est ${formatBreakdown(profiler.getGpuBreakdown())}`;
      }

      if (smoothedGpuMs === null) {
        gpuElement.textContent = "GPU n/a";
      } else {
        const gpuPercent = Math.min((smoothedGpuMs / frameBudget) * 100, 999);
        gpuElement.textContent =
          `GPU ${smoothedGpuMs.toFixed(1)}ms ${gpuPercent.toFixed(0)}%`;
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
