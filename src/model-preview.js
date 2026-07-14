const previewCache = new Map();
const PREVIEW_FILL_SIZE = 1.68;

export function createGlbModelPortrait(modelUrl, options = {}) {
  if (!modelUrl) return Promise.resolve(null);

  const key = createPreviewCacheKey(modelUrl, options);
  if (!previewCache.has(key)) {
    previewCache.set(key, renderGlbModelPortrait(modelUrl, options));
  }
  return previewCache.get(key);
}

export function createMeshModelPortrait(key, createPreviewMesh, options = {}) {
  if (!key || typeof createPreviewMesh !== "function") {
    return Promise.resolve(null);
  }

  const cacheKey = createPreviewCacheKey(`mesh:${key}`, options);
  if (!previewCache.has(cacheKey)) {
    previewCache.set(
      cacheKey,
      renderMeshModelPortrait(createPreviewMesh, options),
    );
  }
  return previewCache.get(cacheKey);
}

function createPreviewCacheKey(key, options) {
  return [
    key,
    JSON.stringify(options.rotation ?? []),
  ].join(":");
}

async function renderGlbModelPortrait(modelUrl, options) {
  return renderModelPortraitScene(options, async (scene, root) => {
    const B = window.BABYLON;
    const result = await B.SceneLoader.ImportMeshAsync("", "", modelUrl, scene);
    for (const node of [...result.meshes, ...result.transformNodes]) {
      if (!node.parent) node.parent = root;
    }
  });
}

async function renderMeshModelPortrait(createPreviewMesh, options) {
  return renderModelPortraitScene(options, async (scene, root, B) => {
    const result = await createPreviewMesh(scene, B);
    const nodes = Array.isArray(result) ? result : [result].filter(Boolean);
    for (const node of nodes) {
      if (!node.parent) node.parent = root;
    }
  });
}

async function renderModelPortraitScene(options, populateScene) {
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
  scene.clearColor = new B.Color4(0, 0, 0, 1);
  scene.ambientColor = new B.Color3(0.72, 0.72, 0.72);
  scene.environmentIntensity = 1.2;
  scene.imageProcessingConfiguration.toneMappingEnabled = false;
  scene.imageProcessingConfiguration.exposure = 1.25;

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
  fill.intensity = 1.45;
  fill.groundColor = new B.Color3(0.55, 0.55, 0.58);

  const key = new B.DirectionalLight(
    "inventory-preview-key",
    new B.Vector3(-0.45, -0.7, -0.38),
    scene,
  );
  key.intensity = 1.75;

  const front = new B.DirectionalLight(
    "inventory-preview-front",
    new B.Vector3(0.08, -0.22, 1),
    scene,
  );
  front.intensity = 1.15;

  try {
    const root = new B.TransformNode("inventory-preview-root", scene);
    await populateScene(scene, root, B);

    for (const mesh of getRenderableMeshes(root)) {
      mesh.isPickable = false;
      mesh.computeWorldMatrix(true);
      if (mesh.material) {
        preparePreviewMaterial(mesh.material);
      }
    }

    normalizeModel(root, options.rotation);
    await scene.whenReadyAsync?.();
    scene.render();
    scene.render();
    scene.render();
    return captureVisiblePreview(engine, scene, canvas);
  } catch (error) {
    console.warn("Failed to render inventory model preview.", error);
    return null;
  } finally {
    scene.dispose();
    engine.dispose();
  }
}

function captureVisiblePreview(engine, scene, canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const darkPixels = renderAndReadPixels(engine, scene, canvas, [0, 0, 0, 1]);
  const lightPixels = renderAndReadPixels(engine, scene, canvas, [1, 1, 1, 1]);

  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const context = output.getContext("2d");
  const image = context.createImageData(width, height);
  let visiblePixels = 0;

  for (let y = 0; y < height; y += 1) {
    const sourceY = height - y - 1;
    for (let x = 0; x < width; x += 1) {
      const source = (sourceY * width + x) * 4;
      const target = (y * width + x) * 4;
      const alpha = getDualMatteAlpha(darkPixels, lightPixels, source);
      if (alpha > 12) visiblePixels += 1;

      image.data[target] = unpremultiplyChannel(darkPixels[source], alpha);
      image.data[target + 1] = unpremultiplyChannel(
        darkPixels[source + 1],
        alpha,
      );
      image.data[target + 2] = unpremultiplyChannel(
        darkPixels[source + 2],
        alpha,
      );
      image.data[target + 3] = alpha;
    }
  }

  const minimumVisiblePixels = width * height * 0.004;
  return visiblePixels >= minimumVisiblePixels
    ? (context.putImageData(image, 0, 0), output.toDataURL("image/png"))
    : null;
}

function renderAndReadPixels(engine, scene, canvas, clearColor) {
  const B = window.BABYLON;
  scene.clearColor = new B.Color4(...clearColor);
  scene.render();

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
  return pixels;
}

function getDualMatteAlpha(darkPixels, lightPixels, index) {
  const backgroundBlend = Math.max(
    lightPixels[index] - darkPixels[index],
    lightPixels[index + 1] - darkPixels[index + 1],
    lightPixels[index + 2] - darkPixels[index + 2],
  );
  const alpha = 255 - Math.max(0, Math.min(255, backgroundBlend));
  return alpha < 8 ? 0 : alpha;
}

function unpremultiplyChannel(value, alpha) {
  const amount = alpha / 255;
  if (amount <= 0.01) return 0;
  return Math.max(0, Math.min(255, value / amount));
}

function preparePreviewMaterial(material) {
  material.backFaceCulling = false;
  material.twoSidedLighting = true;
  if ("disableLighting" in material) material.disableLighting = false;
  if ("unlit" in material) material.unlit = false;
  if ("emissiveColor" in material) {
    material.emissiveColor.set(0, 0, 0);
  }
  if ("emissiveTexture" in material) material.emissiveTexture = null;
  if ("metallic" in material) {
    material.metallic = Math.min(material.metallic ?? 0.48, 0.48);
  }
  if ("roughness" in material) {
    material.roughness = Math.min(material.roughness ?? 0.5, 0.5);
  }
  if ("environmentIntensity" in material) material.environmentIntensity = 1.35;
  if ("directIntensity" in material) material.directIntensity = 1.35;
}

function normalizeModel(root, rotation) {
  root.rotation = window.BABYLON.Vector3.FromArray(rotation ?? [0, 0, 0]);
  root.computeWorldMatrix(true);

  const meshes = getRenderableMeshes(root);
  if (!meshes.length) return;

  const bounds = getMeshBounds(meshes);
  const center = bounds.min.add(bounds.max).scale(0.5);
  const size = bounds.max.subtract(bounds.min);
  const scale = PREVIEW_FILL_SIZE / Math.max(size.x, size.y, size.z, 0.0001);

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
