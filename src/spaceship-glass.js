const B = window.BABYLON;

export function replaceGlassWithClearMaterial(result, scene, options = {}) {
  const glassMaterial = createSpaceshipGlassMaterial(scene, options);

  for (const mesh of result.meshes) {
    if (isSpaceshipGlassMesh(mesh)) {
      applySpaceshipGlassTreatment(mesh, glassMaterial, options);
    }
  }
}

export function createSpaceshipGlassMaterial(scene, options = {}) {
  const glassMaterial = new B.PBRMaterial("thick-spaceship-glass", scene);
  const glassColor = color3FromOption(options.glassColor, [1.0, 0.82, 0.55]);

  glassMaterial.albedoColor = glassColor;
  glassMaterial.alpha = options.glassAlpha ?? 0.24;
  glassMaterial.metallic = 0;
  glassMaterial.roughness = options.glassRoughness ?? 0.018;
  glassMaterial.indexOfRefraction = options.glassIor ?? 1.49;
  glassMaterial.directIntensity = options.glassDirectIntensity ?? 0.62;
  glassMaterial.environmentIntensity = options.glassEnvironmentIntensity ?? 0.14;
  glassMaterial.microSurface = options.glassMicroSurface ?? 0.98;
  glassMaterial.emissiveColor = B.Color3.Black();
  glassMaterial.emissiveIntensity = 0;
  glassMaterial.backFaceCulling = false;
  glassMaterial.twoSidedLighting = true;
  glassMaterial.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  glassMaterial.alphaMode = B.Engine.ALPHA_COMBINE;
  glassMaterial.needDepthPrePass = false;
  glassMaterial.disableDepthWrite = true;
  glassMaterial.forceDepthWrite = false;

  if ("separateCullingPass" in glassMaterial) {
    glassMaterial.separateCullingPass = true;
  }

  configureClearCoat(glassMaterial, options);
  configureSubSurface(glassMaterial, glassColor, options);

  return glassMaterial;
}

export function applySpaceshipGlassTreatment(mesh, glassMaterial, options = {}) {
  mesh.material = glassMaterial;
  mesh.visibility = 1;
  mesh.hasVertexAlpha = false;
  mesh.excludeFromDepthRenderer = true;
  mesh.receiveShadows = false;
  mesh.renderingGroupId = options.glassRenderingGroupId ?? 4;
  mesh.alphaIndex = options.glassAlphaIndex ?? 1000;
  mesh.disableEdgesRendering?.();

  if (options.glassEdges === true && mesh.enableEdgesRendering) {
    const rimColor = color3FromOption(options.glassRimColor, [1, 0.72, 0.36]);
    mesh.enableEdgesRendering(options.glassEdgeEpsilon ?? 0.55, true);
    mesh.edgesWidth = options.glassEdgeWidth ?? 0.7;
    mesh.edgesColor = new B.Color4(
      rimColor.r,
      rimColor.g,
      rimColor.b,
      options.glassEdgeAlpha ?? 0.22,
    );
  }

  createGlassThicknessShell(mesh, glassMaterial, options);
}

export function isSpaceshipGlassMaterial(material) {
  const materialName = material?.name?.toLowerCase() ?? "";
  return (
    materialName.includes("glass") ||
    materialName.includes("window") ||
    materialName.includes("canopy")
  );
}

export function isSpaceshipGlassMesh(mesh) {
  const name = `${mesh.name} ${mesh.material?.name ?? ""}`.toLowerCase();
  return (
    name.includes("glass") || name.includes("window") || name.includes("canopy")
  );
}

function createGlassThicknessShell(mesh, glassMaterial, options) {
  const scale = options.glassThicknessScale ?? 0.996;
  if (!Number.isFinite(scale) || scale <= 0 || Math.abs(scale - 1) < 0.0001) {
    return null;
  }
  if (!mesh.clone) return null;

  const shellMaterial = glassMaterial.clone(
    `${mesh.name}-glass-thickness-material`,
  );
  shellMaterial.alpha =
    options.glassThicknessAlpha ?? Math.min(glassMaterial.alpha * 0.72, 0.18);
  shellMaterial.roughness = options.glassThicknessRoughness ?? 0.035;
  shellMaterial.microSurface = options.glassThicknessMicroSurface ?? 0.93;
  shellMaterial.needDepthPrePass = false;
  shellMaterial.disableDepthWrite = true;
  shellMaterial.forceDepthWrite = false;

  configureClearCoat(shellMaterial, {
    ...options,
    glassClearCoatIntensity: options.glassThicknessClearCoatIntensity ?? 0.55,
  });

  const shell = mesh.clone(`${mesh.name}-glass-thickness`, mesh.parent, true);
  if (!shell) return null;

  shell.material = shellMaterial;
  shell.isPickable = false;
  shell.checkCollisions = false;
  shell.receiveShadows = false;
  shell.visibility = 1;
  shell.hasVertexAlpha = false;
  shell.excludeFromDepthRenderer = true;
  shell.renderingGroupId = mesh.renderingGroupId;
  shell.alphaIndex = (mesh.alphaIndex ?? 0) - 1;
  shell.scaling = mesh.scaling.multiplyByFloats(scale, scale, scale);
  shell.disableEdgesRendering?.();
  shell.metadata = {
    ...(shell.metadata ?? {}),
    glassThicknessShell: true,
  };

  return shell;
}

function configureClearCoat(material, options) {
  if (!material.clearCoat) return;

  material.clearCoat.isEnabled = options.glassClearCoat !== false;
  material.clearCoat.intensity = options.glassClearCoatIntensity ?? 0.92;
  material.clearCoat.roughness = options.glassClearCoatRoughness ?? 0.025;
}

function configureSubSurface(material, glassColor, options) {
  if (!material.subSurface) return;

  material.subSurface.isRefractionEnabled = options.glassRefraction !== false;
  material.subSurface.tintColor = color3FromOption(
    options.glassTintColor,
    glassColor,
  );
  material.subSurface.tintColorAtDistance = options.glassTintDistance ?? 1.25;
  material.subSurface.minimumThickness = options.glassMinimumThickness ?? 0.12;
  material.subSurface.maximumThickness = options.glassMaximumThickness ?? 0.62;
  if ("indexOfRefraction" in material.subSurface) {
    material.subSurface.indexOfRefraction = options.glassIor ?? 1.49;
  }
  if ("volumeIndexOfRefraction" in material.subSurface) {
    material.subSurface.volumeIndexOfRefraction = options.glassIor ?? 1.49;
  }
  if ("useAlbedoToTintRefraction" in material.subSurface) {
    material.subSurface.useAlbedoToTintRefraction = true;
  }
}

function color3FromOption(value, fallback) {
  if (value instanceof B.Color3) return value.clone();
  if (Array.isArray(value)) return new B.Color3(value[0], value[1], value[2]);
  if (fallback instanceof B.Color3) return fallback.clone();
  return new B.Color3(fallback[0], fallback[1], fallback[2]);
}
