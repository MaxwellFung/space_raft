const canvas = document.querySelector("#scene");
const engine = new BABYLON.Engine(canvas, true, {
  antialias: true,
  stencil: true,
  adaptToDeviceRatio: true,
  powerPreference: "high-performance",
});
const scene = new BABYLON.Scene(engine);

// One scene unit = one in-game kilometre.
const SUN_RADIUS = 1.2;
const PLAYER_SPEED = 0.5;
const PLAYER_BOOST_SPEED = 10;

scene.clearColor.set(0, 0, 0, 1);
scene.imageProcessingConfiguration.toneMappingEnabled = true;
scene.imageProcessingConfiguration.exposure = 0.9;

const camera = new BABYLON.UniversalCamera(
  "player-camera",
  new BABYLON.Vector3(0, 0, 6.5),
  scene,
);
camera.fov = Math.PI / 3;
camera.minZ = 0.00005;
camera.maxZ = 1000;
camera.speed = 0;
camera.angularSensibility = 2400;
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, true);
canvas.addEventListener("click", () => canvas.requestPointerLock?.());

const sunlight = new BABYLON.PointLight(
  "sunlight",
  BABYLON.Vector3.Zero(),
  scene,
);
sunlight.diffuse.set(1, 0.46, 0.16);
sunlight.specular.set(1, 0.72, 0.35);
sunlight.intensity = 14;
sunlight.range = 140;

BABYLON.Effect.ShadersStore.sunVertexShader = `
  precision highp float;
  attribute vec3 position, normal;
  uniform mat4 world, worldViewProjection;
  varying vec3 p, worldPosition, worldNormal;
  void main() {
    p = position;
    worldPosition = (world * vec4(position, 1.)).xyz;
    worldNormal = normalize(mat3(world) * normal);
    gl_Position = worldViewProjection * vec4(position, 1.);
  }`;

BABYLON.Effect.ShadersStore.sunFragmentShader = `
  precision highp float;
  varying vec3 p, worldPosition, worldNormal;
  uniform vec3 cameraPosition;
  uniform float time;

  float hash(vec3 x) {
    return fract(sin(dot(x, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3. - 2. * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1)), f.x), f.y), f.z);
  }
  float fbm(vec3 x) {
    float v = 0., a = .5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(x);
      x = x * 2.03 + vec3(17.1, 9.2, 13.7);
      a *= .5;
    }
    return v;
  }
  void main() {
    vec3 n = normalize(p);
    float t = time * .025;
    float warp = fbm(n * 2.6 + vec3(t, -t * .7, t * .4));
    float cells = fbm(n * 6. + warp * 2.4 + vec3(-t, t * .8, 0.));
    float detail = noise(n * 13. + cells * 1.5 + vec3(0., -t * 2., t));
    float heat = smoothstep(.32, .72, cells * .88 + detail * .12);
    float flare = smoothstep(.57, .76, cells + detail * .12);

    vec3 deep = vec3(1., .035, 0.);
    vec3 orange = vec3(1., .18, .006);
    vec3 hot = vec3(1., .56, .025);
    vec3 color = mix(deep, orange, heat);
    color = mix(color, hot, flare * .7);

    float facing = max(dot(worldNormal, normalize(cameraPosition - worldPosition)), 0.);
    color *= mix(.58, 1.2, pow(facing, .35));
    color += vec3(.8, .06, 0.) * pow(1. - facing, 3.);
    gl_FragColor = vec4(color, 1.);
  }`;

const sun = BABYLON.MeshBuilder.CreateSphere(
  "sun",
  { diameter: SUN_RADIUS * 2, segments: 128 },
  scene,
);
const sunMaterial = new BABYLON.ShaderMaterial("sun-material", scene, "sun", {
  attributes: ["position", "normal"],
  uniforms: ["world", "worldViewProjection", "cameraPosition", "time"],
});
sun.material = sunMaterial;

const glow = new BABYLON.GlowLayer("solar-corona", scene, {
  blurKernelSize: 128,
  mainTextureRatio: 0.5,
});
glow.intensity = 1.65;
glow.customEmissiveColorSelector = (mesh, _subMesh, _material, color) => {
  if (mesh === sun) color.set(1, 0.18, 0, 1);
  else color.set(0, 0, 0, 0);
};

let seed = 2300;
const random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

const starfield = new BABYLON.TransformNode("space-starfield", scene);
const addStars = (name, count, pointSize, brightness) => {
  const cloud = new BABYLON.PointsCloudSystem(name, pointSize, scene);
  cloud.addPoints(count, (star) => {
    const y = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radius = 160;
    const ring = Math.sqrt(1 - y * y);
    const tint = random();
    const color =
      tint < 0.06
        ? [0.42, 0.62, 1]
        : tint < 0.12
          ? [0.68, 0.84, 1]
          : tint < 0.18
            ? [1, 0.42, 0.28]
            : tint < 0.28
              ? [1, 0.78, 0.32]
              : [1, 1, 1];
    const light = brightness * (0.55 + random() * 0.45);
    star.position.set(
      radius * ring * Math.cos(angle),
      radius * y,
      radius * ring * Math.sin(angle),
    );
    star.color = new BABYLON.Color4(
      color[0] * light,
      color[1] * light,
      color[2] * light,
      1,
    );
  });
  cloud.buildMeshAsync().then((mesh) => {
    mesh.parent = starfield;
    mesh.isPickable = false;
  });
};
addStars("distant-stars", 1800, 1.15, 0.82);
addStars("bright-stars", 260, 1.9, 1);
addStars("near-stars", 35, 2.8, 1.15);

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

const movePlayer = (seconds) => {
  const forward = camera.getDirection(new BABYLON.Vector3(0, 0, 1));
  const right = camera.getDirection(new BABYLON.Vector3(1, 0, 0));
  const move = BABYLON.Vector3.Zero();

  if (keys.has("KeyW")) move.addInPlace(forward);
  if (keys.has("KeyS")) move.subtractInPlace(forward);
  if (keys.has("KeyD")) move.addInPlace(right);
  if (keys.has("KeyA")) move.subtractInPlace(right);
  if (keys.has("Space")) move.y += 1;
  if (keys.has("ShiftLeft") || keys.has("ShiftRight")) move.y -= 1;
  if (move.lengthSquared() === 0) return;

  const speed = keys.has("KeyE") ? PLAYER_BOOST_SPEED : PLAYER_SPEED;
  camera.position.addInPlace(move.normalize().scale(speed * seconds));
};

const start = performance.now();
let lastFrame = start;
engine.runRenderLoop(() => {
  const now = performance.now();
  const seconds = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  movePlayer(seconds);
  starfield.position.copyFrom(camera.position);
  sunMaterial.setFloat("time", (now - start) / 1000);
  sunMaterial.setVector3("cameraPosition", camera.position);
  scene.render();
});
addEventListener("resize", () => engine.resize());
