const B = window.BABYLON;

export function replaceGlassWithClearMaterial(result, scene, options = {}) {
  const glassMaterial = createSpaceshipGlassMaterial(scene, options);
  const glassRenderingGroupId = options.glassRenderingGroupId ?? 4;
  scene.setRenderingAutoClearDepthStencil?.(
    glassRenderingGroupId,
    true,
    true,
    true,
  );

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
  glassMaterial.environmentIntensity =
    options.glassEnvironmentIntensity ?? 0.14;
  glassMaterial.microSurface = options.glassMicroSurface ?? 0.98;
  glassMaterial.emissiveColor = color3FromOption(
    options.glassSheenColor,
    [0.1, 0.16, 0.2],
  );
  glassMaterial.emissiveIntensity = options.glassSheenIntensity ?? 0.055;
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
  configureGlassSheen(glassMaterial, scene, options);

  return glassMaterial;
}

export function applySpaceshipGlassTreatment(
  mesh,
  glassMaterial,
  options = {},
) {
  mesh.material = glassMaterial;
  mesh.visibility = 1;
  mesh.hasVertexAlpha = false;
  mesh.excludeFromDepthRenderer = true;
  mesh.receiveShadows = false;
  mesh.renderingGroupId = options.glassRenderingGroupId ?? 4;
  mesh.alphaIndex = options.glassAlphaIndex ?? 1000;
  mesh.disableEdgesRendering?.();
  expandGlassSurface(mesh, options);

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

function expandGlassSurface(mesh, options) {
  const scale = options.glassSurfaceScale ?? 1;
  if (!Number.isFinite(scale) || Math.abs(scale - 1) < 0.0001) return;

  mesh.scaling = mesh.scaling.multiplyByFloats(scale, scale, scale);
  mesh.computeWorldMatrix(true);
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
    excludeFromCollision: true,
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

function configureGlassSheen(material, scene, options) {
  if (options.glassSheen === false) return;

  const texture = new B.DynamicTexture(
    "spaceship-glass-sheen-texture",
    { width: 512, height: 512 },
    scene,
    false,
  );
  const context = texture.getContext();
  context.clearRect(0, 0, 512, 512);

  const gradient = context.createLinearGradient(40, 0, 512, 420);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.34, "rgba(185,231,255,0.12)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.28)");
  gradient.addColorStop(0.48, "rgba(185,231,255,0.08)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);

  context.strokeStyle = "rgba(210,244,255,0.16)";
  context.lineWidth = 2;
  for (const offset of [-260, -80, 120, 310]) {
    context.beginPath();
    context.moveTo(offset, 512);
    context.lineTo(offset + 420, 0);
    context.stroke();
  }

  context.fillStyle = "rgba(255,255,255,0.12)";
  for (let index = 0; index < 34; index += 1) {
    const x = (index * 83) % 512;
    const y = (index * 137) % 512;
    context.fillRect(x, y, 1, 1);
  }

  texture.update(false);
  texture.wrapU = B.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = B.Texture.WRAP_ADDRESSMODE;
  texture.uScale = options.glassSheenUScale ?? 1.2;
  texture.vScale = options.glassSheenVScale ?? 1.2;
  material.emissiveTexture = texture;

  if (material.anisotropy) {
    material.anisotropy.isEnabled = true;
    material.anisotropy.intensity = options.glassAnisotropyIntensity ?? 0.55;
    material.anisotropy.angle = options.glassAnisotropyAngle ?? Math.PI * 0.18;
  }
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
