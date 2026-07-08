const previewCache = new Map();

export function createGlbModelPortrait(modelUrl, options = {}) {
  if (!modelUrl) return Promise.resolve(null);

  const key = `${modelUrl}:${JSON.stringify(options.rotation ?? [])}`;
  if (!previewCache.has(key)) {
    previewCache.set(key, renderGlbModelPortrait(modelUrl, options));
  }
  return previewCache.get(key);
}

async function renderGlbModelPortrait(modelUrl, options) {
  const B = window.BABYLON;
  if (!B) return null;

  const canvas = document.createElement("canvas");
  canvas.width = options.size ?? 128;
  canvas.height = options.size ?? 128;

  const engine = new B.Engine(canvas, true, {
    adaptToDeviceRatio: false,
    antialias: true,
    preserveDrawingBuffer: true,
    stencil: false,
  });
  engine.setHardwareScalingLevel(1);

  const scene = new B.Scene(engine);
  scene.clearColor = new B.Color4(0, 0, 0, 0);
  scene.environmentIntensity = 0.9;
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.exposure = 1.2;

  const camera = new B.ArcRotateCamera(
    "inventory-preview-camera",
    -Math.PI * 0.28,
    Math.PI * 0.36,
    3.2,
    B.Vector3.Zero(),
    scene,
  );
  camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;
  camera.orthoLeft = -0.9;
  camera.orthoRight = 0.9;
  camera.orthoTop = 0.9;
  camera.orthoBottom = -0.9;
  scene.activeCamera = camera;

  const fill = new B.HemisphericLight(
    "inventory-preview-fill",
    new B.Vector3(0, 1, 0),
    scene,
  );
  fill.intensity = 0.95;
  fill.groundColor = new B.Color3(0.25, 0.25, 0.28);

  const key = new B.DirectionalLight(
    "inventory-preview-key",
    new B.Vector3(-0.45, -0.7, -0.38),
    scene,
  );
  key.intensity = 1.35;

  try {
    const result = await B.SceneLoader.ImportMeshAsync("", "", modelUrl, scene);
    const root = new B.TransformNode("inventory-preview-root", scene);
    for (const node of [...result.meshes, ...result.transformNodes]) {
      if (!node.parent) node.parent = root;
    }

    for (const mesh of getRenderableMeshes(root)) {
      mesh.isPickable = false;
      mesh.computeWorldMatrix(true);
      if (mesh.material) {
        mesh.material.backFaceCulling = false;
        mesh.material.twoSidedLighting = true;
      }
    }

    normalizeModel(root, options.rotation);
    scene.render();
    scene.render();
    scene.render();
    return captureVisiblePreview(engine, canvas);
  } catch (error) {
    console.warn("Failed to render GLB inventory preview.", error);
    return null;
  } finally {
    scene.dispose();
    engine.dispose();
  }
}

function captureVisiblePreview(engine, canvas) {
  const gl = engine._gl;
  const pixels = new Uint8Array(canvas.width * canvas.height * 4);
  gl.readPixels(
    0,
    0,
    canvas.width,
    canvas.height,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels,
  );

  let visiblePixels = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    const brightness = pixels[index] + pixels[index + 1] + pixels[index + 2];
    if (alpha > 12 && brightness > 16) visiblePixels += 1;
  }

  const minimumVisiblePixels = canvas.width * canvas.height * 0.01;
  return visiblePixels >= minimumVisiblePixels
    ? canvas.toDataURL("image/png")
    : null;
}

function normalizeModel(root, rotation) {
  root.rotation = window.BABYLON.Vector3.FromArray(rotation ?? [0, 0, 0]);
  root.computeWorldMatrix(true);

  const meshes = getRenderableMeshes(root);
  if (!meshes.length) return;

  const bounds = getMeshBounds(meshes);
  const center = bounds.min.add(bounds.max).scale(0.5);
  const size = bounds.max.subtract(bounds.min);
  const scale = 1.35 / Math.max(size.x, size.y, size.z, 0.0001);

  root.scaling.setAll(scale);
  root.position.subtractInPlace(center.scale(scale));
  root.computeWorldMatrix(true);
}

function getRenderableMeshes(root) {
  return root
    .getChildMeshes(false)
    .filter((mesh) => mesh.isEnabled() && mesh.getTotalVertices() > 0);
}

function getMeshBounds(meshes) {
  const B = window.BABYLON;
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
