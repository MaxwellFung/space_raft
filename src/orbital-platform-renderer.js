import {
  isSpaceshipGlassMaterial as isGlassMaterial,
  isSpaceshipGlassMesh as isGlassMesh,
  replaceGlassWithClearMaterial,
} from "./spaceship-glass.js";

const B = window.BABYLON;
const GRAVITATIONAL_CONSTANT = 6.6743e-11;
const JUPITER_MASS_KG = 1.89813e27;
const JUPITER_RADIUS_KM = 69911;

export function createOrbitalPlatform(scene, platform, primary) {
  const orbit = platform.orbit ?? {};
  const metersPerWorldUnit = platform.metersPerWorldUnit ?? 8;
  const width = platform.widthMeters / metersPerWorldUnit;
  const depth = platform.depthMeters / metersPerWorldUnit;
  const root = new B.TransformNode(platform.id, scene);
  const shipRoot = new B.TransformNode(`${platform.id}-ship`, scene);
  const interactions = [];

  const platformLight = createPlatformLight(
    scene,
    platform,
    root,
    metersPerWorldUnit,
  );

  const massKg = (primary?.metadata?.massJupiter ?? 30) * JUPITER_MASS_KG;
  const radiusKm = orbit.radiusKm ?? platform.orbitRadiusKm ?? 300000;
  const physicalRadiusMeters = radiusKm * 1000;
  const speedMps = Math.sqrt(
    (GRAVITATIONAL_CONSTANT * massKg) / physicalRadiusMeters,
  );
  const angularSpeed = speedMps / physicalRadiusMeters;
  const periodSeconds = (Math.PI * 2) / angularSpeed;
  const primaryPosition = B.Vector3.FromArray(primary?.position ?? [0, 0, 0]);
  const initialDirection = vectorFromArray(
    orbit.radialDirection ?? platform.initialDirection,
    [1, 0, 0],
  );
  const orbitNormal = vectorFromArray(orbit.normalDirection, [0, 1, 0]);
  const primaryRadiusJupiter = primary?.metadata?.radiusJupiter ?? 1;
  const primaryRenderRadius =
    primary?.getBoundingInfo?.().boundingSphere.radiusWorld ??
    primary?.scaling?.x ??
    primary?.scale ??
    1;
  const renderRadius =
    orbit.renderRadius ??
    platform.renderOrbitRadius ??
    (radiusKm / (primaryRadiusJupiter * JUPITER_RADIUS_KM)) *
      primaryRenderRadius;
  const tangent = B.Vector3.Zero();
  const fixedOrbit = orbit.fixed ?? platform.geostationary ?? false;
  const initialOrbitAngle =
    orbit.phaseRadians ?? degreesToRadians(orbit.phaseDegrees ?? 0);
  let orbitAngle = initialOrbitAngle;
  const lockOrientation = orbit.lockOrientation ?? false;
  const orbitGuide = createOrbitGuide(
    scene,
    orbit,
    primaryPosition,
    initialDirection,
    orbitNormal,
    renderRadius,
  );

  const physics = {
    width,
    depth,
    minX: -width * 0.5,
    maxX: width * 0.5,
    minZ: -depth * 0.5,
    maxZ: depth * 0.5,
    floorY: 0,
    ceilingY: platform.eyeHeightMeters / metersPerWorldUnit + 1,
    playerHeight: platform.eyeHeightMeters / metersPerWorldUnit,
    eyeHeight: platform.eyeHeightMeters / metersPerWorldUnit,
    radius: 0.05,
    gravity: platform.gravity ?? 20,
    jumpSpeed: platform.jumpSpeed ?? 5.4,
  };

  updateOrbit();
  scene.onBeforeRenderObservable.add(() => {
    profile(scene, "Platform", () => {
      const timeScale = scene.metadata?.timeScale ?? 1;
      const seconds = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
      if (!fixedOrbit) {
        orbitAngle =
          (orbitAngle + angularSpeed * seconds * timeScale) % (Math.PI * 2);
      }
      updateOrbit();
      scene.metadata?.profiler?.setGpuWeight("Platform", 1.1);
    });
  });

  const camera = scene.activeCamera;
  camera.parent = root;
  camera.position.set(0, physics.eyeHeight, 0);
  camera.rotation.set(0, platform.initialCameraYawRadians ?? 0, 0);

  loadShipModel(
    scene,
    platform,
    primary,
    root,
    shipRoot,
    physics,
    camera,
    interactions,
  );

  function updateOrbit() {
    if (orbit.enabled ?? true) {
      const radial = rotateAroundAxis(
        initialDirection,
        orbitNormal,
        orbitAngle,
      );
      tangent.copyFrom(B.Vector3.Cross(orbitNormal, radial)).normalize();
      root.position
        .copyFrom(primaryPosition)
        .addInPlace(radial.scale(renderRadius));
      if (lockOrientation) {
        const lockedRadial = rotateAroundAxis(
          initialDirection,
          orbitNormal,
          initialOrbitAngle,
        );
        const lockedTangent = B.Vector3.Cross(
          orbitNormal,
          lockedRadial,
        ).normalize();
        orientFromSave(root, lockedRadial, lockedTangent, orbitNormal, orbit);
      } else {
        orientFromSave(root, radial, tangent, orbitNormal, orbit);
      }
    } else {
      root.position.copyFrom(
        B.Vector3.FromArray(platform.position ?? [0, 0, 0]),
      );
      root.rotation = B.Vector3.FromArray(platform.rotation ?? [0, 0, 0]);
    }
  }

  return {
    root,
    deck: shipRoot,
    light: platformLight,
    orbit: {
      radiusKm,
      speedMps,
      periodSeconds,
      angularSpeed,
      tangent,
      guide: orbitGuide,
    },
    physics,
    interactions,
  };
}

function createOrbitGuide(
  scene,
  orbit,
  primaryPosition,
  radialDirection,
  normalDirection,
  radius,
) {
  if (orbit.showGuide !== true || radius <= 0) return null;

  const segments = orbit.guideSegments ?? 192;
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const radial = rotateAroundAxis(radialDirection, normalDirection, angle);
    points.push(primaryPosition.add(radial.scale(radius)));
  }

  const guide = B.MeshBuilder.CreateLines(
    orbit.guideName ?? "spacecraft-orbit-guide",
    {
      points,
      updatable: false,
    },
    scene,
  );
  guide.color = B.Color3.FromArray(orbit.guideColor ?? [1, 0.88, 0.05]);
  guide.alpha = orbit.guideAlpha ?? 0.95;
  guide.isPickable = false;
  guide.alwaysSelectAsActiveMesh = true;
  guide.renderingGroupId = orbit.guideRenderingGroupId ?? 1;
  return guide;
}

function createPlatformLight(scene, platform, root, metersPerWorldUnit) {
  if (!platform.allowLocalLights) return null;

  const intensity = platform.lightIntensity ?? 0;
  if (intensity <= 0) return null;

  const light = new B.PointLight(
    `${platform.id}-utility-light`,
    new B.Vector3(0, platform.lightHeightMeters / metersPerWorldUnit, 0),
    scene,
  );
  light.parent = root;
  light.diffuse = B.Color3.FromArray(platform.lightColor ?? [1.0, 0.78, 0.48]);
  light.specular = B.Color3.FromArray(
    platform.lightSpecular ?? [1.0, 0.58, 0.28],
  );
  light.intensity = intensity;
  light.range = (platform.lightRangeMeters ?? 42) / metersPerWorldUnit;
  return light;
}

function orientFromSave(root, radial, tangent, normal, orbit) {
  const up = resolveDirection(
    orbit.floorUp ?? "radial",
    radial,
    tangent,
    normal,
  );
  const forward = resolveDirection(
    orbit.forward ?? "prograde",
    radial,
    tangent,
    normal,
  );
  forward.subtractInPlace(up.scale(B.Vector3.Dot(forward, up)));
  if (forward.lengthSquared() < 0.0001) {
    forward.copyFrom(tangent);
  }
  forward.normalize();

  let right = B.Vector3.Cross(up, forward).normalize();
  const roll = orbit.rollRadians ?? degreesToRadians(orbit.rollDegrees ?? 0);
  if (Math.abs(roll) > 0.000001) {
    const rolledUp = rotateAroundAxis(up, forward, roll);
    up.copyFrom(rolledUp);
    right = B.Vector3.Cross(up, forward).normalize();
  }

  const rotation = matrixFromAxes(right, up, forward);

  root.rotationQuaternion = B.Quaternion.FromRotationMatrix(rotation);
  root.rotation.set(0, 0, 0);
}

async function loadShipModel(
  scene,
  platform,
  primary,
  root,
  shipRoot,
  physics,
  camera,
  interactions,
) {
  try {
    const modelUrl = platform.modelUrl ?? "./assets/ship.glb";
    const result = await B.SceneLoader.ImportMeshAsync("", "", modelUrl, scene);
    const importedNodes = [...result.meshes, ...result.transformNodes];
    for (const node of importedNodes) {
      if (!node.parent) node.parent = shipRoot;
    }

    makeMaterialsDoubleSided(result);
    forceOpaqueShipMaterials(result, platform);
    if (platform.transparentGlass) {
      replaceGlassWithClearMaterial(result, scene, platform);
    }
    normalizeModel(shipRoot, platform.modelMaxSize ?? 3.3);
    applyModelRotation(shipRoot, platform);
    updatePhysicsFromShip(shipRoot, physics, platform);
    shipRoot.parent = root;
    createControlPanel(scene, root, platform.controlPanel, physics);
    await loadFloorProps(scene, root, platform, physics, interactions);
    shipRoot.metadata = {
      ...(shipRoot.metadata ?? {}),
      brownDwarfWindowShadows: createBrownDwarfWindowShadows(
        scene,
        result,
        platform,
        primary,
      ),
    };

    camera.position.set(0, physics.eyeHeight, 0);
    camera.rotation.set(0, platform.initialCameraYawRadians ?? 0, 0);
  } catch (error) {
    console.error("Failed to load ship platform model.", error);
  }
}

function applyModelRotation(root, platform) {
  const rotation = platform.modelRotation ?? [
    0,
    platform.modelYawRadians ?? 0,
    0,
  ];
  root.rotation = B.Vector3.FromArray(rotation);
}

function createControlPanel(scene, platformRoot, panel, physics) {
  if (!panel) return null;

  const [width, height] = panel.size ?? [0.78, 0.46];
  const display = B.MeshBuilder.CreatePlane(
    panel.id ?? "control-panel",
    { width, height },
    scene,
  );
  const center = panel.center ?? [0, 0.62, 0];
  const wallOffset = panel.wallOffset ?? 0.02;
  const side = panel.position ?? "rightWall";
  const x =
    side === "leftWall"
      ? (physics.minX ?? -0.5) + wallOffset
      : (physics.maxX ?? 0.5) - wallOffset;

  display.parent = platformRoot;
  display.position.set(x, (physics.floorY ?? 0) + center[1], center[2] ?? 0);
  display.rotation.y = side === "leftWall" ? Math.PI / 2 : -Math.PI / 2;
  display.isPickable = false;
  display.renderingGroupId = 1;

  const texture = new B.DynamicTexture(
    `${display.name}-texture`,
    { width: 512, height: 320 },
    scene,
    true,
  );
  drawControlPanelTexture(texture, panel);
  if (panel.mirror) {
    texture.uScale = -1;
    texture.uOffset = 1;
  }

  const material = new B.StandardMaterial(`${display.name}-material`, scene);
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.emissiveColor = new B.Color3(1, 0.04, 0.02);
  material.specularColor = B.Color3.Black();
  material.disableLighting = true;
  material.backFaceCulling = false;
  display.material = material;

  const backing = B.MeshBuilder.CreatePlane(
    `${display.name}-backing`,
    { width: width * 1.08, height: height * 1.1 },
    scene,
  );
  backing.parent = platformRoot;
  backing.position.copyFrom(display.position);
  backing.position.x += side === "leftWall" ? -0.002 : 0.002;
  backing.rotation.copyFrom(display.rotation);
  backing.isPickable = false;
  backing.renderingGroupId = 0;

  const backingMaterial = new B.StandardMaterial(
    `${display.name}-backing-material`,
    scene,
  );
  backingMaterial.diffuseColor = new B.Color3(0.006, 0.004, 0.004);
  backingMaterial.emissiveColor = new B.Color3(0.015, 0, 0);
  backingMaterial.specularColor = B.Color3.Black();
  backingMaterial.backFaceCulling = false;
  backing.material = backingMaterial;

  createControlPanelBevels(
    scene,
    platformRoot,
    display,
    width,
    height,
    side,
    panel,
  );

  return display;
}

function createControlPanelBevels(
  scene,
  platformRoot,
  display,
  width,
  height,
  side,
  panel,
) {
  const bevelWidth = panel.bevelWidth ?? 0.05;
  const bevelDepth = panel.bevelDepth ?? 0.03;
  const material = new B.StandardMaterial(`${display.name}-bevel-material`, scene);
  material.diffuseColor = new B.Color3(0.035, 0.018, 0.015);
  material.emissiveColor = new B.Color3(0.05, 0.002, 0);
  material.specularColor = new B.Color3(0.18, 0.03, 0.02);
  material.backFaceCulling = false;

  const bars = [
    {
      name: "top",
      size: [width + bevelWidth * 2, bevelWidth, bevelDepth],
      offset: [0, height * 0.5 + bevelWidth * 0.5, 0],
    },
    {
      name: "bottom",
      size: [width + bevelWidth * 2, bevelWidth, bevelDepth],
      offset: [0, -height * 0.5 - bevelWidth * 0.5, 0],
    },
    {
      name: "left",
      size: [bevelWidth, height, bevelDepth],
      offset: [-width * 0.5 - bevelWidth * 0.5, 0, 0],
    },
    {
      name: "right",
      size: [bevelWidth, height, bevelDepth],
      offset: [width * 0.5 + bevelWidth * 0.5, 0, 0],
    },
  ];

  for (const bar of bars) {
    const mesh = B.MeshBuilder.CreateBox(
      `${display.name}-bevel-${bar.name}`,
      {
        width: bar.size[0],
        height: bar.size[1],
        depth: bar.size[2],
      },
      scene,
    );
    mesh.parent = platformRoot;
    mesh.position.copyFrom(display.position);
    mesh.rotation.copyFrom(display.rotation);
    mesh.translate(B.Axis.X, bar.offset[0], B.Space.LOCAL);
    mesh.translate(B.Axis.Y, bar.offset[1], B.Space.LOCAL);
    mesh.translate(
      B.Axis.Z,
      side === "leftWall" ? -bevelDepth * 0.35 : bevelDepth * 0.35,
      B.Space.LOCAL,
    );
    mesh.isPickable = false;
    mesh.renderingGroupId = display.renderingGroupId;
    mesh.material = material;
  }
}

function drawControlPanelTexture(texture, panel) {
  const context = texture.getContext();
  const levels = {
    oxygen: 40,
    fuel: 0,
    water: 30,
    power: 50,
    ...(panel.levels ?? {}),
  };
  const rows = [
    ["OXY", levels.oxygen],
    ["FUEL", levels.fuel],
    ["H2O", levels.water],
    ["PWR", levels.power],
  ];

  context.clearRect(0, 0, 512, 320);
  context.fillStyle = "#080101";
  context.fillRect(0, 0, 512, 320);
  context.strokeStyle = "rgba(255, 34, 20, 0.55)";
  context.lineWidth = 3;
  context.strokeRect(14, 14, 484, 292);

  context.shadowColor = "rgba(255, 24, 16, 0.95)";
  context.shadowBlur = 18;
  context.fillStyle = "#ff2118";
  context.textBaseline = "middle";
  context.font = "700 34px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillText(panel.title ?? "STATS", 34, 50);

  context.font = "700 40px ui-monospace, SFMono-Regular, Menlo, monospace";
  rows.forEach(([label, value], index) => {
    const y = 112 + index * 48;
    const percent = `${Math.round(value).toString().padStart(3, " ")}%`;
    context.fillText(label, 48, y);
    context.fillText(percent, 328, y);
    context.globalAlpha = 0.32;
    context.fillRect(154, y + 17, Math.max(0, Math.min(value, 100)) * 1.35, 5);
    context.globalAlpha = 1;
  });

  context.shadowBlur = 0;
  texture.update();
}

async function loadFloorProp(scene, platformRoot, prop, physics) {
  if (!prop?.modelUrl) return null;

  try {
    const result = await B.SceneLoader.ImportMeshAsync(
      "",
      "",
      prop.modelUrl,
      scene,
    );
    const propRoot = new B.TransformNode(prop.id ?? "floor-prop", scene);
    const importedNodes = [...result.meshes, ...result.transformNodes];
    for (const node of importedNodes) {
      if (!node.parent) node.parent = propRoot;
    }

    makeMaterialsDoubleSided(result);
    normalizeModel(propRoot, prop.maxSize ?? 0.5);
    propRoot.rotation = B.Vector3.FromArray(
      prop.rotation ?? degreesToRadians(prop.rotationDegrees ?? [0, 0, 0]),
    );
    propRoot.position.addInPlace(
      B.Vector3.FromArray(prop.position ?? [0, 0, 0]),
    );
    propRoot.computeWorldMatrix(true);
    const meshes = getRenderableMeshes(propRoot);
    for (const mesh of meshes) {
      mesh.computeWorldMatrix(true);
      mesh.isPickable = true;
      mesh.receiveShadows = true;
    }

    const bounds = getMeshBounds(getRenderableMeshes(propRoot));
    propRoot.position.y +=
      (physics.floorY ?? 0) - bounds.min.y + (prop.floorOffset ?? 0);
    if (prop.keepInside !== false) {
      nudgeFloorPropInside(propRoot, physics, prop.insidePadding ?? 0.04);
    }
    if (prop.snapTo) {
      snapFloorPropToInterior(
        propRoot,
        physics,
        prop.snapTo,
        prop.wallPadding ?? 0.05,
      );
      if (prop.keepInside !== false) {
        nudgeFloorPropInside(propRoot, physics, prop.insidePadding ?? 0.04);
      }
    }
    propRoot.parent = platformRoot;
    return propRoot;
  } catch (error) {
    console.error("Failed to load floor prop.", error);
    return null;
  }
}

async function loadFloorProps(
  scene,
  platformRoot,
  platform,
  physics,
  interactions,
) {
  const props = [
    platform.oxygenTank,
    ...(platform.floorProps ?? []),
  ].filter(Boolean);

  for (const prop of props) {
    const root = await loadFloorProp(scene, platformRoot, prop, physics);
    if (!root) continue;
    const interaction = createPickupInteraction(root, prop);
    interactions?.push(interaction);
    for (const mesh of getRenderableMeshes(root)) {
      mesh.metadata = {
        ...(mesh.metadata ?? {}),
        interaction,
      };
    }
  }
}

function createPickupInteraction(root, prop) {
  const name = prop.label ?? prop.id ?? "Item";
  return {
    type: "pickup",
    range: prop.pickupRange ?? 1.65,
    item: {
      id: prop.id ?? root.name,
      name,
      swatch: prop.swatch ?? "#8aa0ad",
    },
    getPrompt: () => `Press E to pick up ${name}`,
    activate: () => root.setEnabled(false),
  };
}

function snapFloorPropToInterior(root, physics, snapTo, padding) {
  const meshes = getRenderableMeshes(root);
  if (!meshes.length) return;

  const bounds = getMeshBounds(meshes);
  if (snapTo === "leftWall") {
    root.position.x += (physics.minX ?? bounds.min.x) + padding - bounds.min.x;
  } else if (snapTo === "rightWall") {
    root.position.x += (physics.maxX ?? bounds.max.x) - padding - bounds.max.x;
  } else if (snapTo === "frontWall") {
    root.position.z += (physics.minZ ?? bounds.min.z) + padding - bounds.min.z;
  } else if (snapTo === "backWall") {
    root.position.z += (physics.maxZ ?? bounds.max.z) - padding - bounds.max.z;
  }
}

function nudgeFloorPropInside(root, physics, padding) {
  const meshes = getRenderableMeshes(root);
  if (!meshes.length) return;

  const bounds = getMeshBounds(meshes);
  const minX = (physics.minX ?? bounds.min.x) + padding;
  const maxX = (physics.maxX ?? bounds.max.x) - padding;
  const minZ = (physics.minZ ?? bounds.min.z) + padding;
  const maxZ = (physics.maxZ ?? bounds.max.z) - padding;
  let offsetX = 0;
  let offsetZ = 0;

  if (bounds.min.x < minX) offsetX = minX - bounds.min.x;
  if (bounds.max.x > maxX) offsetX = maxX - bounds.max.x;
  if (bounds.min.z < minZ) offsetZ = minZ - bounds.min.z;
  if (bounds.max.z > maxZ) offsetZ = maxZ - bounds.max.z;

  root.position.x += offsetX;
  root.position.z += offsetZ;
}

function normalizeModel(root, maxDimension) {
  const meshes = getRenderableMeshes(root);
  if (!meshes.length) return;

  const bounds = getMeshBounds(meshes);
  const center = bounds.min.add(bounds.max).scale(0.5);
  const size = bounds.max.subtract(bounds.min);
  const scale = maxDimension / Math.max(size.x, size.y, size.z, 0.0001);

  root.scaling.setAll(scale);
  root.position = center.scale(-scale);
  root.computeWorldMatrix(true);
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    mesh.isPickable = !mesh.metadata?.glassThicknessShell;
  }
}

function updatePhysicsFromShip(root, physics, platform) {
  const meshes = getRenderableMeshes(root);
  if (!meshes.length) return;

  const bounds = getMeshBounds(meshes);
  const interior =
    getSavedPhysicsBounds(platform) ??
    getInteriorBoundsFromModel(
      meshes,
      platform.physicsProbePosition ?? [0, 0, 0],
    );
  const min = interior?.min ?? bounds.min;
  const max = interior?.max ?? bounds.max;
  const interiorSize = max.subtract(min);
  const floorY = min.y;
  const ceilingY = max.y;
  const playerHeight = 1.0;
  const radius = Math.max(
    Math.min(interiorSize.x, interiorSize.z) * 0.08,
    0.05,
  );

  physics.width = interiorSize.x;
  physics.depth = interiorSize.z;
  physics.minX = min.x;
  physics.maxX = max.x;
  physics.minZ = min.z;
  physics.maxZ = max.z;
  physics.floorY = floorY;
  physics.ceilingY = ceilingY;
  physics.playerHeight = playerHeight;
  physics.eyeHeight = floorY + playerHeight;
  physics.radius = radius;
  physics.collisionMeshes = meshes.filter(
    (mesh) => !mesh.metadata?.glassThicknessShell,
  );
}

function getSavedPhysicsBounds(platform) {
  const saved = platform.physicsBounds;
  if (!saved?.min || !saved?.max) return null;
  return {
    min: B.Vector3.FromArray(saved.min),
    max: B.Vector3.FromArray(saved.max),
  };
}

function createBrownDwarfWindowShadows(scene, result, platform, primary) {
  if (platform.brownDwarfWindowShadows === false) return null;

  const light = getPrimaryLight(scene, primary);
  if (!light) return null;

  const shadowGenerator = new B.ShadowGenerator(
    platform.shadowMapSize ?? 1024,
    light,
  );
  shadowGenerator.bias = platform.shadowBias ?? 0.0008;
  shadowGenerator.normalBias = platform.shadowNormalBias ?? 0.025;
  shadowGenerator.usePercentageCloserFiltering = true;
  shadowGenerator.filteringQuality = B.ShadowGenerator.QUALITY_MEDIUM;
  shadowGenerator.transparencyShadow = true;

  for (const mesh of result.meshes) {
    if (!isRenderableMesh(mesh)) continue;

    if (isGlassMesh(mesh)) {
      mesh.receiveShadows = false;
      continue;
    }

    mesh.receiveShadows = true;
    shadowGenerator.addShadowCaster(mesh);
  }

  return shadowGenerator;
}

function getPrimaryLight(scene, primary) {
  const primaryName = primary?.id ?? primary?.name ?? "central_brown_dwarf";
  return (
    primary?.metadata?.brownDwarfLight ??
    scene.getLightByName?.(`${primaryName}-light`) ??
    null
  );
}

function forceOpaqueShipMaterials(result, platform) {
  const materials = [
    ...new Set(result.meshes.map((mesh) => mesh.material).filter(Boolean)),
  ];

  for (const material of materials) {
    if (platform.transparentGlass && isGlassMaterial(material)) {
      continue;
    }

    material.alpha = 1;
    material.transparencyMode = B.Material.MATERIAL_OPAQUE;
    material.alphaMode = B.Engine.ALPHA_DISABLE;
    material.needDepthPrePass = false;
    material.disableDepthWrite = false;
    material.forceDepthWrite = true;
    if (material.emissiveColor) {
      material.emissiveColor = B.Color3.Black();
    }
    if ("ambientColor" in material) {
      material.ambientColor = B.Color3.Black();
    }
    if ("disableLighting" in material) {
      material.disableLighting = false;
    }
    if ("unlit" in material) {
      material.unlit = false;
    }
    if ("emissiveTexture" in material) {
      material.emissiveTexture = null;
    }
    if ("emissiveIntensity" in material) {
      material.emissiveIntensity = 0;
    }
    if ("useAlphaFromAlbedoTexture" in material) {
      material.useAlphaFromAlbedoTexture = false;
    }
    if ("useAlphaFromDiffuseTexture" in material) {
      material.useAlphaFromDiffuseTexture = false;
    }
    if ("opacityTexture" in material) {
      material.opacityTexture = null;
    }
    if (material.albedoTexture) {
      material.albedoTexture.hasAlpha = false;
    }
    if (material.diffuseTexture) {
      material.diffuseTexture.hasAlpha = false;
    }
  }
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

function getRenderableMeshes(root) {
  return root.getChildMeshes(false).filter(isRenderableMesh);
}

function isRenderableMesh(mesh) {
  return mesh.isEnabled() && mesh.getTotalVertices() > 0;
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

function getInteriorBoundsFromModel(meshes, probeArray) {
  const probe = B.Vector3.FromArray(probeArray);
  const axes = {
    minX: new B.Vector3(-1, 0, 0),
    maxX: new B.Vector3(1, 0, 0),
    minY: new B.Vector3(0, -1, 0),
    maxY: new B.Vector3(0, 1, 0),
    minZ: new B.Vector3(0, 0, -1),
    maxZ: new B.Vector3(0, 0, 1),
  };
  const hits = Object.fromEntries(
    Object.entries(axes).map(([key, direction]) => [
      key,
      nearestMeshIntersection(meshes, probe, direction),
    ]),
  );

  if (Object.values(hits).some((distance) => !Number.isFinite(distance))) {
    return null;
  }

  return {
    min: new B.Vector3(
      probe.x - hits.minX,
      probe.y - hits.minY,
      probe.z - hits.minZ,
    ),
    max: new B.Vector3(
      probe.x + hits.maxX,
      probe.y + hits.maxY,
      probe.z + hits.maxZ,
    ),
  };
}

function nearestMeshIntersection(meshes, origin, direction) {
  let nearest = Infinity;
  for (const mesh of meshes) {
    const positions = mesh.getVerticesData(B.VertexBuffer.PositionKind);
    if (!positions) continue;
    const indices = mesh.getIndices();
    mesh.computeWorldMatrix(true);
    const world = mesh.getWorldMatrix();

    const triangleCount = indices ? indices.length / 3 : positions.length / 9;
    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      const vertexIndexes = indices
        ? [
            indices[triangle * 3],
            indices[triangle * 3 + 1],
            indices[triangle * 3 + 2],
          ]
        : [triangle * 3, triangle * 3 + 1, triangle * 3 + 2];
      const a = transformedVertex(positions, vertexIndexes[0], world);
      const b = transformedVertex(positions, vertexIndexes[1], world);
      const c = transformedVertex(positions, vertexIndexes[2], world);
      const distance = rayTriangleDistance(origin, direction, a, b, c);
      if (distance > 0.0001 && distance < nearest) {
        nearest = distance;
      }
    }
  }
  return nearest;
}

function transformedVertex(positions, vertexIndex, world) {
  return B.Vector3.TransformCoordinates(
    new B.Vector3(
      positions[vertexIndex * 3],
      positions[vertexIndex * 3 + 1],
      positions[vertexIndex * 3 + 2],
    ),
    world,
  );
}

function rayTriangleDistance(origin, direction, a, b, c) {
  const epsilon = 0.0000001;
  const edge1 = b.subtract(a);
  const edge2 = c.subtract(a);
  const h = B.Vector3.Cross(direction, edge2);
  const determinant = B.Vector3.Dot(edge1, h);
  if (Math.abs(determinant) < epsilon) return Infinity;

  const inverseDeterminant = 1 / determinant;
  const s = origin.subtract(a);
  const u = inverseDeterminant * B.Vector3.Dot(s, h);
  if (u < 0 || u > 1) return Infinity;

  const q = B.Vector3.Cross(s, edge1);
  const v = inverseDeterminant * B.Vector3.Dot(direction, q);
  if (v < 0 || u + v > 1) return Infinity;

  const distance = inverseDeterminant * B.Vector3.Dot(edge2, q);
  return distance > epsilon ? distance : Infinity;
}

function matrixFromAxes(xAxis, yAxis, zAxis) {
  const matrix = B.Matrix.Identity();
  const values = matrix.m;
  values[0] = xAxis.x;
  values[1] = xAxis.y;
  values[2] = xAxis.z;
  values[3] = 0;
  values[4] = yAxis.x;
  values[5] = yAxis.y;
  values[6] = yAxis.z;
  values[7] = 0;
  values[8] = zAxis.x;
  values[9] = zAxis.y;
  values[10] = zAxis.z;
  values[11] = 0;
  values[12] = 0;
  values[13] = 0;
  values[14] = 0;
  values[15] = 1;
  return matrix;
}

function resolveDirection(value, radial, tangent, normal) {
  if (Array.isArray(value)) {
    return vectorFromArray(value, [0, 0, 1]);
  }

  switch (value) {
    case "radial":
    case "out":
      return radial.clone().normalize();
    case "nadir":
    case "down":
      return radial.scale(-1).normalize();
    case "prograde":
    case "forward":
      return tangent.clone().normalize();
    case "retrograde":
    case "back":
      return tangent.scale(-1).normalize();
    case "normal":
    case "north":
      return normal.clone().normalize();
    case "antinormal":
    case "south":
      return normal.scale(-1).normalize();
    default:
      return tangent.clone().normalize();
  }
}

function rotateAroundAxis(vector, axis, radians) {
  if (Math.abs(radians) < 0.000001) {
    return vector.clone().normalize();
  }
  const rotation = B.Matrix.RotationAxis(axis, radians);
  return B.Vector3.TransformNormal(vector, rotation).normalize();
}

function vectorFromArray(value, fallback) {
  const vector = B.Vector3.FromArray(value ?? fallback);
  if (vector.lengthSquared() < 0.0001) {
    return B.Vector3.FromArray(fallback).normalize();
  }
  return vector.normalize();
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function profile(scene, name, fn) {
  return scene.metadata?.profiler?.measure(name, fn) ?? fn();
}
