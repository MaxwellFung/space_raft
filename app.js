import brownDwarfLevel from "./levels/brown_dwarf/level.js";
import { buildLevel } from "./src/level-system.js";

const B = window.BABYLON;
const canvas = document.querySelector("#sandbox");
const metrics = document.querySelector(".metrics");
const engine = new B.Engine(canvas, true, {
  antialias: true,
  adaptToDeviceRatio: true,
  powerPreference: "high-performance",
});
const scene = new B.Scene(engine);
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

scene.onBeforeRenderObservable.add(() => {
  const seconds = Math.min(engine.getDeltaTime() / 1000, 0.05);
  const move = B.Vector3.Zero();
  const forward = camera.getDirection(B.Axis.Z);
  const right = camera.getDirection(B.Axis.X);

  if (keys.has("KeyW")) move.addInPlace(forward);
  if (keys.has("KeyS")) move.subtractInPlace(forward);
  if (keys.has("KeyD")) move.addInPlace(right);
  if (keys.has("KeyA")) move.subtractInPlace(right);
  if (keys.has("Space")) move.y += 1;
  if (keys.has("ShiftLeft") || keys.has("ShiftRight")) move.y -= 1;

  if (move.lengthSquared() > 0) {
    const speed = keys.has("KeyE")
      ? brownDwarfLevel.player.boostSpeed
      : brownDwarfLevel.player.speed;
    camera.position.addInPlace(move.normalize().scale(speed * seconds));
  }

  level.starfield.position.copyFrom(camera.position);
});

engine.runRenderLoop(() => {
  const frame = performanceMonitor.beginFrame();
  scene.render();
  performanceMonitor.endFrame(frame);
});
addEventListener("resize", () => engine.resize());

function createPerformanceMonitor(engine, container) {
  const frameBudget = 1000 / 60;
  const fpsElement = container.querySelector("#metric-fps");
  const cpuElement = container.querySelector("#metric-cpu");
  const gpuElement = container.querySelector("#metric-gpu");
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
      frameNumber += 1;

      const now = performance.now();
      if (now - lastDisplayUpdate < 250) return;
      lastDisplayUpdate = now;

      const fps = Math.round(engine.getFps());
      const cpuPercent = Math.min((smoothedCpuMs / frameBudget) * 100, 999);
      fpsElement.textContent = `FPS ${fps}`;
      cpuElement.textContent =
        `CPU ${smoothedCpuMs.toFixed(1)}ms ${cpuPercent.toFixed(0)}%`;

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
