const B = window.BABYLON;
const HOLOGRAM_MATERIAL_NAME = "blue-poly-surface-hologram-material";

export function addPolySurfaceHologram(mesh, scene = mesh?.getScene?.()) {
  if (!mesh || !scene || isPolySurfaceHologram(mesh)) return null;
  if (mesh.metadata?.polySurfaceHologram || mesh.getTotalVertices?.() <= 0) {
    return mesh.metadata?.polySurfaceHologram ?? null;
  }

  const hologram = mesh.clone(
    `${mesh.name}-poly-surface-hologram`,
    mesh,
    true,
  );
  if (!hologram) return null;

  hologram.position.set(0, 0, 0);
  hologram.rotation.set(0, 0, 0);
  hologram.rotationQuaternion = B.Quaternion.Identity();
  hologram.scaling.setAll(1);
  hologram.material = getHologramMaterial(scene);
  hologram.isPickable = false;
  hologram.checkCollisions = false;
  hologram.receiveShadows = false;
  hologram.showBoundingBox = false;
  hologram.useVertexColors = false;
  hologram.hasVertexAlpha = false;
  hologram.alwaysSelectAsActiveMesh = true;
  hologram.renderingGroupId = Math.max(mesh.renderingGroupId ?? 0, 3);
  hologram.alphaIndex = (mesh.alphaIndex ?? 0) + 100;
  hologram.metadata = {
    excludeFromBounds: true,
    excludeFromCollision: true,
    isPolySurfaceHologram: true,
  };

  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    polySurfaceHologram: hologram,
  };
  return hologram;
}

export function addPolySurfaceHolograms(root, scene = root?.getScene?.()) {
  return root
    .getChildMeshes(false)
    .map((mesh) => addPolySurfaceHologram(mesh, scene))
    .filter(Boolean);
}

export function isPolySurfaceHologram(mesh) {
  return Boolean(mesh?.metadata?.isPolySurfaceHologram);
}

function getHologramMaterial(scene) {
  const existing = scene.getMaterialByName?.(HOLOGRAM_MATERIAL_NAME);
  if (existing) return existing;

  const material = new B.StandardMaterial(HOLOGRAM_MATERIAL_NAME, scene);
  material.diffuseColor = new B.Color3(0.05, 0.48, 1);
  material.emissiveColor = new B.Color3(0.0, 0.7, 1.7);
  material.specularColor = new B.Color3(0.2, 0.85, 1);
  material.alpha = 0.48;
  material.wireframe = true;
  material.disableLighting = true;
  material.backFaceCulling = false;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  material.alphaMode = B.Engine.ALPHA_ADD;
  material.needDepthPrePass = false;
  material.disableDepthWrite = true;
  return material;
}
