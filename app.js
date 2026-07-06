import brownDwarfLevel from "./levels/brown_dwarf/level.js";
import { buildLevel } from "./src/level-system.js";

const B = window.BABYLON;
const canvas = document.querySelector("#sandbox");
const engine = new B.Engine(canvas, true, {
  antialias: true,
  adaptToDeviceRatio: true,
  powerPreference: "high-performance",
});
const scene = new B.Scene(engine);

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

engine.runRenderLoop(() => scene.render());
addEventListener("resize", () => engine.resize());
