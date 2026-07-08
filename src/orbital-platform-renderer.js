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
  applyPlatformInitialCameraRotation(camera, platform);

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

    const doorInteraction = installShipDoorInteraction(
      scene,
      result.meshes,
      interactions,
      platform,
    );
    makeMaterialsDoubleSided(result);
    forceOpaqueShipMaterials(result, platform);
    if (platform.transparentGlass) {
      replaceGlassWithClearMaterial(result, scene, platform);
    }
    normalizeModel(shipRoot, platform.modelMaxSize ?? 3.3);
    applyModelRotation(shipRoot, platform);
    updatePhysicsFromShip(shipRoot, physics, platform);
    configureShipDoorPassage(scene, doorInteraction, physics, platform);
    shipRoot.parent = root;
    createControlPanel(scene, root, platform.controlPanel, physics);
    createHelmetHook(scene, root, platform.helmetHook, physics, interactions);
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
    applyPlatformInitialCameraRotation(camera, platform);
  } catch (error) {
    console.error("Failed to load ship platform model.", error);
  }
}

function installShipDoorInteraction(scene, meshes, interactions, platform) {
  const doorMesh = meshes.find((mesh) =>
    /(^|[_-])door([_-]|$)/i.test(mesh.name ?? ""),
  );
  if (!doorMesh) return;

  const hinge = configureShipDoorHinge(scene, doorMesh, platform);

  const interaction = {
    type: "ship-door",
    range: platform.doorRange ?? 1.8,
    isOpen: false,
    isAnimating: false,
    doorMesh,
    doorAnimationSeconds: platform.doorAnimationSeconds ?? 0.75,
    getPrompt: () =>
      interaction.isOpen ? "Press E to close hatch" : "Press E to open hatch",
    activate: () => toggleShipDoor(scene, hinge, interaction, platform),
  };
  doorMesh.isPickable = true;
  doorMesh.metadata = {
    ...(doorMesh.metadata ?? {}),
    interaction,
    platformDoorCollision: interaction,
  };
  interactions?.push(interaction);
  return interaction;
}

function configureShipDoorHinge(scene, doorMesh, platform) {
  const parent = doorMesh.parent;
  doorMesh.computeWorldMatrix(true);
  const bounds = doorMesh.getBoundingInfo().boundingBox;
  const min = bounds.minimum;
  const max = bounds.maximum;
  const localPivot = B.Vector3.FromArray(
    platform.doorHingePivot ??
      getDefaultDoorHingePivot(min, max, platform.doorHingeEdge ?? "maxY"),
  );
  const worldPivot = B.Vector3.TransformCoordinates(
    localPivot,
    doorMesh.getWorldMatrix(),
  );
  const hinge = new B.TransformNode(`${doorMesh.name}-hinge`, scene);
  hinge.parent = parent;
  if (parent) {
    parent.computeWorldMatrix(true);
    const inverseParent = parent.getWorldMatrix().clone().invert();
    hinge.position.copyFrom(
      B.Vector3.TransformCoordinates(worldPivot, inverseParent),
    );
  } else {
    hinge.position.copyFrom(worldPivot);
  }
  doorMesh.setParent(hinge);
  hinge.metadata = {
    ...(hinge.metadata ?? {}),
    closedRotation: hinge.rotation.clone(),
  };
  return hinge;
}

function getDefaultDoorHingePivot(min, max, edge) {
  const centerX = (min.x + max.x) * 0.5;
  const centerY = (min.y + max.y) * 0.5;
  const centerZ = (min.z + max.z) * 0.5;
  const pivots = {
    minX: [min.x, centerY, centerZ],
    maxX: [max.x, centerY, centerZ],
    minY: [centerX, min.y, centerZ],
    maxY: [centerX, max.y, centerZ],
    minZ: [centerX, centerY, min.z],
    maxZ: [centerX, centerY, max.z],
  };
  return pivots[edge] ?? pivots.maxY;
}

function configureShipDoorPassage(scene, interaction, physics, platform) {
  const doorMesh = interaction?.doorMesh;
  if (!doorMesh) return;

  const frame = getDoorPassageFrame(doorMesh, physics);
  if (!frame) return;

  const radius = physics.radius ?? 0.05;
  const padding = platform.doorPassagePadding ?? radius * 2.2;
  const verticalPadding =
    platform.doorPassageVerticalPadding ?? Math.max(radius * 4, 0.6);
  const exteriorDepth = platform.doorExteriorDepth ?? Infinity;
  const interiorDepth =
    platform.doorInteriorDepth ?? Math.max(radius * 4, 0.55);
  const passage = {
    oriented: true,
    interaction,
    center: frame.center,
    right: frame.right,
    up: frame.up,
    normal: frame.normal,
    halfWidth: frame.halfWidth + padding,
    halfHeight: Math.max(
      frame.halfHeight + verticalPadding,
      ((physics.ceilingY ?? frame.center.y) - (physics.floorY ?? frame.center.y)) *
        0.5,
    ),
    inwardDepth: interiorDepth,
    outwardDepth: exteriorDepth,
  };

  interaction.passage = passage;
  physics.doorPassages = [...(physics.doorPassages ?? []), passage];
  createShipDoorGlassPane(scene, interaction, frame, platform);
  createShipDoorInteractionProxy(scene, interaction, passage);
}

function createShipDoorGlassPane(scene, interaction, frame, platform) {
  if (platform.doorGlass === false) return;

  const doorMesh = interaction.doorMesh;
  const hinge = doorMesh?.parent;
  const width = frame.halfWidth * 2 * (platform.doorGlassWidthScale ?? 0.58);
  const height = frame.halfHeight * 2 * (platform.doorGlassHeightScale ?? 0.62);
  if (!hinge || width <= 0 || height <= 0) return;

  const pane = B.MeshBuilder.CreatePlane(
    `${doorMesh.name}-hatch-glass`,
    {
      width,
      height,
      sideOrientation: B.Mesh.DOUBLESIDE,
    },
    scene,
  );
  const material = createShipDoorGlassMaterial(scene, platform, pane.name);
  pane.material = material;
  pane.isPickable = true;
  pane.checkCollisions = false;
  pane.receiveShadows = false;
  pane.excludeFromDepthRenderer = true;
  pane.renderingGroupId = platform.glassRenderingGroupId ?? 4;
  pane.alphaIndex = (platform.glassAlphaIndex ?? 1000) + 2;
  pane.metadata = {
    ...(pane.metadata ?? {}),
    interaction,
    platformDoorGlass: true,
  };

  hinge.computeWorldMatrix(true);
  const inverseHinge = hinge.getWorldMatrix().clone().invert();
  pane.parent = hinge;
  pane.position.copyFrom(
    B.Vector3.TransformCoordinates(
      frame.center.add(frame.normal.scale(platform.doorGlassOffset ?? 0.012)),
      inverseHinge,
    ),
  );
  pane.rotationQuaternion = quaternionFromAxes(
    B.Vector3.TransformNormal(frame.right, inverseHinge).normalize(),
    B.Vector3.TransformNormal(frame.up, inverseHinge).normalize(),
    B.Vector3.TransformNormal(frame.normal, inverseHinge).normalize(),
  );
}

function createShipDoorGlassMaterial(scene, platform, name) {
  const material = new B.PBRMaterial(`${name}-material`, scene);
  material.albedoColor = color3FromOption(
    platform.doorGlassColor ?? platform.glassColor,
    [0.76, 0.93, 1.0],
  );
  material.alpha =
    platform.doorGlassAlpha ?? Math.max(platform.glassAlpha ?? 0.32, 0.38);
  material.metallic = 0;
  material.roughness = platform.glassRoughness ?? 0.045;
  material.microSurface = platform.glassMicroSurface ?? 0.96;
  material.directIntensity = platform.glassDirectIntensity ?? 0.84;
  material.environmentIntensity = platform.glassEnvironmentIntensity ?? 0.58;
  material.emissiveColor = color3FromOption(
    platform.glassSheenColor,
    [0.08, 0.15, 0.19],
  );
  material.emissiveIntensity = platform.doorGlassSheenIntensity ?? 0.12;
  material.backFaceCulling = false;
  material.twoSidedLighting = true;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  material.alphaMode = B.Engine.ALPHA_COMBINE;
  material.needDepthPrePass = false;
  material.disableDepthWrite = true;
  material.forceDepthWrite = false;
  if (material.clearCoat) {
    material.clearCoat.isEnabled = true;
    material.clearCoat.intensity = 0.92;
    material.clearCoat.roughness = 0.025;
  }
  return material;
}

function color3FromOption(value, fallback) {
  if (value instanceof B.Color3) return value.clone();
  if (Array.isArray(value)) return B.Color3.FromArray(value);
  return B.Color3.FromArray(fallback);
}

function createShipDoorInteractionProxy(scene, interaction, passage) {
  const parent =
    interaction.doorMesh?.parent?.parent ?? interaction.doorMesh?.parent;
  const proxy = B.MeshBuilder.CreateBox(
    `${interaction.doorMesh?.name ?? "ship-door"}-interaction-proxy`,
    {
      width: passage.halfWidth * 2,
      height: passage.halfHeight * 2,
      depth: 0.08,
    },
    scene,
  );
  const material = new B.StandardMaterial(`${proxy.name}-material`, scene);
  material.alpha = 0;
  material.disableLighting = true;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  proxy.material = material;
  proxy.isPickable = true;
  proxy.checkCollisions = false;
  proxy.visibility = 0;
  proxy.excludeFromDepthRenderer = true;
  proxy.metadata = {
    ...(proxy.metadata ?? {}),
    interaction,
    platformDoorInteractionProxy: true,
  };

  if (!parent) {
    proxy.position.copyFrom(passage.center);
    proxy.rotationQuaternion = quaternionFromAxes(
      passage.right,
      passage.up,
      passage.normal,
    );
    return;
  }

  parent.computeWorldMatrix(true);
  const inverseParent = parent.getWorldMatrix().clone().invert();
  proxy.parent = parent;
  proxy.position.copyFrom(
    B.Vector3.TransformCoordinates(passage.center, inverseParent),
  );
  proxy.rotationQuaternion = quaternionFromAxes(
    B.Vector3.TransformNormal(passage.right, inverseParent).normalize(),
    B.Vector3.TransformNormal(passage.up, inverseParent).normalize(),
    B.Vector3.TransformNormal(passage.normal, inverseParent).normalize(),
  );
}

function quaternionFromAxes(right, up, normal) {
  const matrix = B.Matrix.Identity();
  B.Matrix.FromXYZAxesToRef(right, up, normal, matrix);
  return B.Quaternion.FromRotationMatrix(matrix);
}

function getDoorPassageFrame(doorMesh, physics) {
  const vertices = getMeshWorldVertices(doorMesh);
  if (!vertices.length) return null;

  doorMesh.computeWorldMatrix(true);
  const world = doorMesh.getWorldMatrix();
  const axes = [B.Axis.X, B.Axis.Y, B.Axis.Z].map((axis) =>
    B.Vector3.TransformNormal(axis, world).normalize(),
  );
  const projections = axes.map((axis) => getProjectionRange(vertices, axis));
  const normalIndex = projections
    .map((range, index) => ({ index, span: range.max - range.min }))
    .sort((a, b) => a.span - b.span)[0].index;
  const tangentIndexes = [0, 1, 2].filter((index) => index !== normalIndex);
  const upIndex =
    Math.abs(B.Vector3.Dot(axes[tangentIndexes[0]], B.Axis.Y)) >
    Math.abs(B.Vector3.Dot(axes[tangentIndexes[1]], B.Axis.Y))
      ? tangentIndexes[0]
      : tangentIndexes[1];
  const rightIndex = tangentIndexes.find((index) => index !== upIndex);

  let normal = axes[normalIndex].clone();
  const normalMid =
    (projections[normalIndex].min + projections[normalIndex].max) * 0.5;
  const upMid = (projections[upIndex].min + projections[upIndex].max) * 0.5;
  const rightMid =
    (projections[rightIndex].min + projections[rightIndex].max) * 0.5;
  const center = axes[normalIndex]
    .scale(normalMid)
    .add(axes[upIndex].scale(upMid))
    .add(axes[rightIndex].scale(rightMid));
  const platformCenter = new B.Vector3(
    ((physics.minX ?? center.x) + (physics.maxX ?? center.x)) * 0.5,
    center.y,
    ((physics.minZ ?? center.z) + (physics.maxZ ?? center.z)) * 0.5,
  );

  if (B.Vector3.Dot(normal, center.subtract(platformCenter)) < 0) {
    normal = normal.scale(-1);
  }

  return {
    center,
    right: axes[rightIndex],
    up: axes[upIndex],
    normal,
    halfWidth:
      (projections[rightIndex].max - projections[rightIndex].min) * 0.5,
    halfHeight: (projections[upIndex].max - projections[upIndex].min) * 0.5,
  };
}

function getMeshWorldVertices(mesh) {
  const positions = mesh.getVerticesData(B.VertexBuffer.PositionKind);
  if (!positions) return [];

  mesh.computeWorldMatrix(true);
  const world = mesh.getWorldMatrix();
  const vertices = [];
  for (let index = 0; index < positions.length / 3; index += 1) {
    vertices.push(transformedVertex(positions, index, world));
  }
  return vertices;
}

function getProjectionRange(points, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    const projection = B.Vector3.Dot(point, axis);
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  }
  return { min, max };
}

function toggleShipDoor(scene, hinge, interaction, platform) {
  if (interaction.isAnimating) return false;

  const closedRotation =
    hinge.metadata?.closedRotation?.clone?.() ?? hinge.rotation.clone();
  const opening = !interaction.isOpen;
  const axis = platform.doorHingeAxis ?? "z";
  const openAngle = degreesToRadians(platform.doorOpenAngleDegrees ?? 105);
  const openRotation = closedRotation.clone();
  openRotation[axis] += openAngle;
  const targetRotation = opening ? openRotation : closedRotation;
  if (opening) interaction.isOpen = true;

  animateShipDoorRotation(
    scene,
    hinge,
    targetRotation,
    platform.doorAnimationSeconds ?? 0.75,
    () => {
      if (!opening) interaction.isOpen = false;
      interaction.isAnimating = false;
    },
  );
  interaction.isAnimating = true;
  return true;
}

function animateShipDoorRotation(scene, hinge, targetRotation, duration, onDone) {
  const startRotation = hinge.rotation.clone();
  const secondsTotal = Math.max(duration, 0.01);
  let elapsed = 0;

  const observer = scene.onBeforeRenderObservable.add(() => {
    const seconds = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    elapsed += seconds;
    const amount = easeInOutCubic(Math.min(elapsed / secondsTotal, 1));
    hinge.rotation.x = B.Scalar.Lerp(startRotation.x, targetRotation.x, amount);
    hinge.rotation.y = B.Scalar.Lerp(startRotation.y, targetRotation.y, amount);
    hinge.rotation.z = B.Scalar.Lerp(startRotation.z, targetRotation.z, amount);
    hinge.computeWorldMatrix(true);

    if (elapsed >= secondsTotal) {
      hinge.rotation.copyFrom(targetRotation);
      hinge.computeWorldMatrix(true);
      scene.onBeforeRenderObservable.remove(observer);
      onDone?.();
    }
  });
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function applyPlatformInitialCameraRotation(camera, platform) {
  const rotation = platform.initialCameraRotation;
  if (Array.isArray(rotation)) {
    camera.rotation = B.Vector3.FromArray(rotation);
    return;
  }
  camera.rotation.set(0, platform.initialCameraYawRadians ?? 0, 0);
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

function createHelmetHook(
  scene,
  platformRoot,
  hookConfig = {},
  physics,
  interactions,
) {
  const hook = {
    wall: "frontWall",
    center: [0, 0.86, 0],
    wallOffset: 0.035,
    ...(hookConfig ?? {}),
  };
  if (hook.enabled === false) return null;

  const root = new B.TransformNode(hook.id ?? "helmet-hook", scene);
  root.parent = platformRoot;

  const wallOffset = hook.wallOffset ?? 0.035;
  const center = hook.center ?? [0, 0.86, 0];
  const position = resolveWallPoint(physics, hook.wall, center, wallOffset);
  const outward = wallOutwardDirection(hook.wall);
  const inward = outward.scale(-1);
  root.position.copyFrom(position);
  root.rotation.y = wallYaw(hook.wall);

  const material = createHelmetHookMaterial(scene, root.name, hook);

  const hookLength = hook.length ?? 0.2;
  const pegRadius = hook.pegRadius ?? 0.017;
  const lipHeight = hook.lipHeight ?? 0.105;
  const hookPath = createHookTubePath(hookLength, lipHeight);
  const hookTip = hookPath[hookPath.length - 1];

  const base = B.MeshBuilder.CreateCylinder(
    `${root.name}-base`,
    { diameter: 0.14, height: 0.018, tessellation: 28 },
    scene,
  );
  base.rotation.x = Math.PI / 2;

  const tube = B.MeshBuilder.CreateTube(
    `${root.name}-tube`,
    {
      path: hookPath,
      radius: pegRadius,
      tessellation: 18,
      cap: B.Mesh.CAP_ALL,
    },
    scene,
  );

  const knob = B.MeshBuilder.CreateSphere(
    `${root.name}-knob`,
    { diameter: pegRadius * 2.55, segments: 16 },
    scene,
  );
  knob.position.copyFrom(hookTip);

  const hookMesh = mergeHookParts(scene, root, [base, tube, knob], material);
  createHookRopeBundle(scene, root, hook, hookLength, pegRadius);

  const mountPoint = new B.TransformNode(`${root.name}-mount-point`, scene);
  mountPoint.parent = platformRoot;
  mountPoint.position.copyFrom(position.add(inward.scale(hookLength + 0.04)));
  mountPoint.position.y += hook.mountYOffset ?? -0.015;
  mountPoint.rotation.y = wallYaw(hook.wall);

  const tetherAnchor = new B.TransformNode(`${root.name}-tether-anchor`, scene);
  tetherAnchor.parent = platformRoot;
  tetherAnchor.position.copyFrom(
    position.add(inward.scale(Math.max(pegRadius * 2.2, 0.04))),
  );
  tetherAnchor.position.y += 0.012;

  const interaction = {
    type: "helmet-hook",
    range: hook.range ?? 1.75,
    hookRoot: root,
    mountPoint,
    tetherAnchor,
    tetherLength: hook.tetherLength ?? 4.7,
    mountedRoot: null,
    mountedItem: null,
    initialMountedItem: hook.initialMountedItem
      ? {
          ...hook.initialMountedItem,
          name:
            hook.initialMountedItem.name ??
            hook.initialMountedItem.label ??
            "Helmet",
        }
      : null,
    getPrompt: () => "Press E to mount helmet",
  };

  hookMesh.isPickable = true;
  hookMesh.metadata = {
    ...(hookMesh.metadata ?? {}),
    interaction,
  };
  interactions?.push(interaction);
  return root;
}

function createHookTubePath(length, lipHeight) {
  const bendDepth = Math.min(length * 0.28, 0.055);
  const straightDepth = Math.max(length - bendDepth, length * 0.55);
  return [
    new B.Vector3(0, 0, 0),
    new B.Vector3(0, 0, -straightDepth * 0.45),
    new B.Vector3(0, 0, -straightDepth),
    new B.Vector3(0, lipHeight * 0.16, -straightDepth - bendDepth * 0.56),
    new B.Vector3(0, lipHeight * 0.46, -length),
    new B.Vector3(0, lipHeight, -length),
  ];
}

function createHookRopeBundle(scene, root, hook, hookLength, pegRadius) {
  const rope = {
    enabled: true,
    loops: 3,
    loopRadiusX: 0.102,
    loopRadiusY: 0.145,
    tubeRadius: 0.0105,
    strandCount: 2,
    strandRadius: 0.00125,
    ...(hook.rope ?? {}),
  };
  if (rope.enabled === false) return null;

  const rootNode = new B.TransformNode(`${root.name}-rope-bundle`, scene);
  rootNode.parent = root;

  const material = createRopeMaterial(scene, root.name, rope);
  const strandMaterial = createRopeStrandMaterial(scene, root.name, rope);
  const loopCount = Math.max(1, Math.round(rope.loops));
  const ropeDepth = -(rope.depth ?? Math.min(hookLength * 0.58, 0.135));
  const centerY = rope.centerY ?? -0.05;
  const baseRadiusX = rope.loopRadiusX;
  const baseRadiusY = rope.loopRadiusY;

  for (let loop = 0; loop < loopCount; loop += 1) {
    const loopT = loopCount === 1 ? 0 : loop / (loopCount - 1);
    const xOffset = (loopT - 0.5) * (rope.bundleWidth ?? 0.034);
    const zOffset = (loopT - 0.5) * (rope.bundleDepth ?? 0.036);
    const path = createRopeLoopPath({
      centerX: xOffset,
      centerY: centerY - loop * 0.004,
      centerZ: ropeDepth + zOffset,
      radiusX: baseRadiusX * (1 - loop * 0.035),
      radiusY: baseRadiusY * (1 - loop * 0.025),
      points: 72,
      wobble: 0.004 + loop * 0.001,
      seed: loop * 1.73,
    });

    const core = B.MeshBuilder.CreateTube(
      `${root.name}-rope-loop-${loop + 1}`,
      {
        path,
        radius: rope.tubeRadius,
        tessellation: 12,
        cap: B.Mesh.CAP_ALL,
      },
      scene,
    );
    core.parent = rootNode;
    core.material = material;
    core.receiveShadows = true;
    core.isPickable = false;

    for (let strand = 0; strand < rope.strandCount; strand += 1) {
      const strandPath = createRopeStrandPath(
        path,
        new B.Vector3(xOffset, centerY - loop * 0.004, ropeDepth + zOffset),
        rope.tubeRadius * 1.06,
        strand,
        rope,
      );
      const strandMesh = B.MeshBuilder.CreateTube(
        `${root.name}-rope-strand-${loop + 1}-${strand + 1}`,
        {
          path: strandPath,
          radius: rope.strandRadius,
          tessellation: 5,
          cap: B.Mesh.CAP_ALL,
        },
        scene,
      );
      strandMesh.parent = rootNode;
      strandMesh.material = strandMaterial;
      strandMesh.receiveShadows = true;
      strandMesh.isPickable = false;
    }
  }

  const neckPath = [
    new B.Vector3(0, 0.012, -Math.max(pegRadius * 2.2, 0.038)),
    new B.Vector3(0, -0.006, ropeDepth + 0.02),
    new B.Vector3(0, centerY + baseRadiusY * 0.84, ropeDepth),
  ];
  const neck = B.MeshBuilder.CreateTube(
    `${root.name}-rope-over-hook`,
    {
      path: neckPath,
      radius: rope.tubeRadius * 0.96,
      tessellation: 12,
      cap: B.Mesh.CAP_ALL,
    },
    scene,
  );
  neck.parent = rootNode;
  neck.material = material;
  neck.receiveShadows = true;
  neck.isPickable = false;

  return rootNode;
}

function createRopeLoopPath({
  centerX,
  centerY,
  centerZ,
  radiusX,
  radiusY,
  points,
  wobble,
  seed,
}) {
  const path = [];
  for (let index = 0; index <= points; index += 1) {
    const t = (index / points) * Math.PI * 2;
    const fiberWobble =
      Math.sin(t * 5 + seed) * wobble +
      Math.sin(t * 11 + seed * 0.7) * wobble * 0.45;
    path.push(
      new B.Vector3(
        centerX + Math.cos(t) * (radiusX + fiberWobble),
        centerY + Math.sin(t) * (radiusY + fiberWobble * 0.65),
        centerZ + Math.sin(t * 2 + seed) * wobble * 0.6,
      ),
    );
  }
  return path;
}

function createRopeStrandPath(path, center, radius, strandIndex, rope) {
  const strandPath = [];
  const strandCount = Math.max(1, rope.strandCount ?? 2);
  const twistCount = rope.twistCount ?? 0;
  const phase = (strandIndex / strandCount) * Math.PI * 2;
  const zAxis = new B.Vector3(0, 0, 1);

  for (let index = 0; index < path.length; index += 1) {
    const point = path[index];
    const radial = point.subtract(center);
    radial.z = 0;
    if (radial.lengthSquared() < 0.000001) {
      radial.set(1, 0, 0);
    } else {
      radial.normalize();
    }

    const t = index / Math.max(path.length - 1, 1);
    const twist = t * Math.PI * 2 * twistCount + phase;
    strandPath.push(
      point
        .add(radial.scale(Math.cos(twist) * radius))
        .add(zAxis.scale(Math.sin(twist) * radius)),
    );
  }

  return strandPath;
}

function createRopeMaterial(scene, name, rope) {
  const material = new B.PBRMaterial(`${name}-tether-fabric-material`, scene);
  material.albedoColor = B.Color3.FromArray(rope.color ?? [1.0, 0.74, 0.12]);
  material.albedoTexture = createTetherFabricTexture(
    scene,
    `${name}-yellow-tether-weave`,
  );
  material.metallic = 0;
  material.roughness = rope.roughness ?? 0.88;
  material.environmentIntensity = rope.environmentIntensity ?? 0.5;
  material.directIntensity = rope.directIntensity ?? 0.82;
  material.backFaceCulling = true;
  return material;
}

function createRopeStrandMaterial(scene, name, rope) {
  const material = new B.StandardMaterial(
    `${name}-tether-seam-material`,
    scene,
  );
  material.diffuseColor = B.Color3.FromArray(
    rope.strandColor ?? [0.28, 0.2, 0.06],
  );
  material.specularColor = new B.Color3(0.04, 0.035, 0.025);
  material.specularPower = 5;
  return material;
}

function createTetherFabricTexture(scene, name) {
  const texture = new B.DynamicTexture(
    name,
    { width: 192, height: 48 },
    scene,
    false,
  );
  const context = texture.getContext();
  context.fillStyle = "#f3b51c";
  context.fillRect(0, 0, 192, 48);

  for (let y = 0; y < 48; y += 2) {
    const light = 18 + Math.sin(y * 0.55) * 8;
    context.fillStyle = `rgba(${255}, ${196 + light}, ${48 + light * 0.32}, 0.32)`;
    context.fillRect(0, y, 192, 1);
  }

  for (let x = 0; x < 192; x += 6) {
    context.fillStyle = "rgba(255, 238, 152, 0.18)";
    context.fillRect(x, 0, 2, 48);
  }

  for (let x = -48; x < 240; x += 12) {
    context.strokeStyle = "rgba(255, 238, 150, 0.38)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, 48);
    context.lineTo(x + 58, 0);
    context.stroke();
  }

  context.fillStyle = "rgba(64, 44, 12, 0.78)";
  context.fillRect(0, 5, 192, 2);
  context.fillRect(0, 41, 192, 2);
  context.strokeStyle = "rgba(255, 232, 130, 0.6)";
  context.setLineDash([4, 5]);
  for (const y of [9, 37]) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(192, y);
    context.stroke();
  }
  context.setLineDash([]);

  texture.update(false);
  texture.uScale = 5.5;
  texture.vScale = 1.0;
  texture.wrapU = B.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = B.Texture.WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 4;
  return texture;
}

function mergeHookParts(scene, root, parts, material) {
  for (const part of parts) {
    part.bakeCurrentTransformIntoVertices();
    part.position.set(0, 0, 0);
    part.rotation.set(0, 0, 0);
    part.scaling.setAll(1);
  }

  const merged = B.Mesh.MergeMeshes(parts, true, true, undefined, false, true);
  merged.name = `${root.name}-mesh`;
  merged.parent = root;
  merged.material = material;
  merged.receiveShadows = true;
  return merged;
}

function createHelmetHookMaterial(scene, name, hook) {
  if (hook.textureBasePath) {
    return createTexturedHelmetHookMaterial(scene, name, hook);
  }

  const preferredNames = [
    hook.materialName,
    "ship_hull_2",
    "ship_hull_1",
  ].filter(Boolean);
  const source =
    preferredNames
      .map((materialName) => scene.getMaterialByName?.(materialName))
      .find(Boolean) ??
    scene.materials?.find((material) =>
      /ship[_-]?hull/i.test(material.name ?? ""),
    );

  if (source?.clone) {
    const material = source.clone(`${name}-ship-metal-material`);
    if ("alpha" in material) material.alpha = 1;
    if ("transparencyMode" in material) {
      material.transparencyMode = B.Material.MATERIAL_OPAQUE;
    }
    if ("forceDepthWrite" in material) material.forceDepthWrite = true;
    return material;
  }

  const material = new B.StandardMaterial(`${name}-material`, scene);
  material.diffuseColor = new B.Color3(0.18, 0.15, 0.12);
  material.specularColor = new B.Color3(0.55, 0.48, 0.36);
  material.specularPower = 48;
  return material;
}

function createTexturedHelmetHookMaterial(scene, name, hook) {
  const basePath = hook.textureBasePath;
  const material = new B.PBRMaterial(`${name}-textured-metal-material`, scene);
  const albedoTexture = new B.Texture(`${basePath}_Color.jpg`, scene);
  const normalTexture = new B.Texture(`${basePath}_NormalGL.jpg`, scene);
  const metalnessTexture = new B.Texture(`${basePath}_Metalness.jpg`, scene);
  const textureScale = hook.textureScale ?? 1;

  for (const texture of [albedoTexture, normalTexture, metalnessTexture]) {
    texture.uScale = textureScale;
    texture.vScale = textureScale;
    texture.wrapU = B.Texture.WRAP_ADDRESSMODE;
    texture.wrapV = B.Texture.WRAP_ADDRESSMODE;
  }

  material.albedoTexture = albedoTexture;
  material.bumpTexture = normalTexture;
  material.metallicTexture = metalnessTexture;
  material.useMetallnessFromMetallicTextureBlue = true;
  material.useRoughnessFromMetallicTextureGreen = false;
  material.albedoColor = B.Color3.FromArray(hook.tintColor ?? [1, 1, 1]);
  material.metallic = hook.metallic ?? 0.75;
  material.roughness = hook.roughness ?? 0.7;
  material.environmentIntensity = hook.environmentIntensity ?? 0.55;
  material.directIntensity = hook.directIntensity ?? 0.85;
  material.forceDepthWrite = true;
  material.backFaceCulling = true;
  return material;
}

function resolveWallPoint(physics, wall, center, wallOffset) {
  const floorY = physics.floorY ?? 0;
  const x = center[0] ?? 0;
  const y = floorY + (center[1] ?? 0.86);
  const z = center[2] ?? 0;

  if (wall === "backWall") {
    return new B.Vector3(x, y, (physics.minZ ?? -0.5) + wallOffset);
  }
  if (wall === "leftWall") {
    return new B.Vector3((physics.minX ?? -0.5) + wallOffset, y, z);
  }
  if (wall === "rightWall") {
    return new B.Vector3((physics.maxX ?? 0.5) - wallOffset, y, z);
  }
  return new B.Vector3(x, y, (physics.maxZ ?? 0.5) - wallOffset);
}

function wallOutwardDirection(wall) {
  if (wall === "backWall") return new B.Vector3(0, 0, -1);
  if (wall === "leftWall") return new B.Vector3(-1, 0, 0);
  if (wall === "rightWall") return new B.Vector3(1, 0, 0);
  return new B.Vector3(0, 0, 1);
}

function wallYaw(wall) {
  if (wall === "backWall") return Math.PI;
  if (wall === "leftWall") return -Math.PI / 2;
  if (wall === "rightWall") return Math.PI / 2;
  return 0;
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
  const material = new B.StandardMaterial(
    `${display.name}-bevel-material`,
    scene,
  );
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
      prop.rotation ??
        vectorDegreesToRadians(prop.rotationDegrees ?? [0, 0, 0]),
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
      mesh.metadata = {
        ...(mesh.metadata ?? {}),
        glbPickupLabel: prop.label ?? prop.id ?? "Item",
        glbPickupRange: prop.pickupRange ?? 1.65,
        glbPickupRoot: propRoot,
        glbPickupItem: createPickupItem(propRoot, prop),
      };
      mesh.showBoundingBox = Boolean(scene.metadata?.objectBoundsVisible);
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
  const props = [platform.oxygenTank, ...(platform.floorProps ?? [])].filter(
    (prop) => Boolean(prop) && !isSavedPickupCollected(platform, prop),
  );

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
  const interaction = {
    type: "pickup",
    rootId: prop.id ?? root.name,
    range: prop.pickupRange ?? 1.65,
    item: createPickupItem(root, prop),
    getPrompt: () => `Press E to pick up ${name}`,
    activate: () => deactivatePickupRoot(root, interaction),
  };
  return interaction;
}

function isSavedPickupCollected(platform, prop) {
  return (platform.collectedPickupIds ?? []).includes(prop.id);
}

function deactivatePickupRoot(root, interaction) {
  if (!root || interaction.collected) return;

  interaction.collected = true;
  for (const mesh of getRenderableMeshes(root)) {
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.showBoundingBox = false;
    if (mesh.metadata) {
      delete mesh.metadata.interaction;
      delete mesh.metadata.glbPickupLabel;
      delete mesh.metadata.glbPickupRange;
      delete mesh.metadata.glbPickupRoot;
      delete mesh.metadata.glbPickupItem;
    }
  }

  root.setEnabled(false);
  root.dispose(false, false);
}

function createPickupItem(root, prop) {
  return {
    id: prop.id ?? root.name,
    name: prop.label ?? prop.id ?? "Item",
    swatch: prop.swatch ?? "#8aa0ad",
    modelUrl: prop.modelUrl,
    maxSize: prop.maxSize,
    floorOffset: prop.floorOffset,
    rotation:
      prop.rotation ??
      vectorDegreesToRadians(prop.rotationDegrees ?? [0, 0, 0]),
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

function vectorDegreesToRadians(degrees) {
  return degrees.map(degreesToRadians);
}

function profile(scene, name, fn) {
  return scene.metadata?.profiler?.measure(name, fn) ?? fn();
}
