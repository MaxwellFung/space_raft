import {
  addPolySurfaceHolograms,
  isPolySurfaceHologram,
} from "./poly-surface-hologram.js";

const B = window.BABYLON;
const GRAVITATIONAL_CONSTANT = 6.6743e-11;
const JUPITER_MASS_KG = 1.89813e27;
const JUPITER_RADIUS_KM = 69911;
const DEFAULT_PLAYER_RADIUS_SCALE = 0.185;

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
  const externalDrift = B.Vector3.Zero();
  const externalVelocity = B.Vector3.Zero();
  const externalMaxSpeed = platform.externalMotionMaxSpeed ?? 1.15;
  const externalMaxOffset = platform.externalMotionMaxOffset ?? 12;
  const externalDamping = platform.externalMotionDamping ?? 0.86;
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

  const initialPlayerHeight =
    Number(platform.playerHeight) ||
    platform.eyeHeightMeters / metersPerWorldUnit;
  const initialPlayerRadius = getConfiguredPlayerRadius(
    platform,
    initialPlayerHeight,
    Math.min(width, depth) * 0.08,
  );
  const physics = {
    width,
    depth,
    minX: -width * 0.5,
    maxX: width * 0.5,
    minZ: -depth * 0.5,
    maxZ: depth * 0.5,
    floorY: 0,
    ceilingY: initialPlayerHeight + 1,
    playerHeight: initialPlayerHeight,
    eyeHeight: initialPlayerHeight,
    radius: initialPlayerRadius,
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
      updateExternalMotion(seconds);
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

  function updateExternalMotion(seconds) {
    if (seconds <= 0) return;

    if (externalVelocity.lengthSquared() > 0.0000001) {
      externalDrift.addInPlace(externalVelocity.scale(seconds));
      externalVelocity.scaleInPlace(Math.pow(externalDamping, seconds));
      if (externalVelocity.lengthSquared() < 0.000001) {
        externalVelocity.copyFromFloats(0, 0, 0);
      }
    }
    clampVectorLengthInPlace(externalDrift, externalMaxOffset);
  }

  function applyExternalImpulse(localDirection, impulse) {
    if (!localDirection || impulse <= 0) return;

    const direction = localDirection.clone();
    if (direction.lengthSquared() <= 0.000001) return;
    direction.normalize();

    root.computeWorldMatrix(true);
    const worldDirection = B.Vector3.TransformNormal(
      direction,
      root.getWorldMatrix(),
    );
    if (worldDirection.lengthSquared() <= 0.000001) return;
    worldDirection.normalize();

    externalVelocity.addInPlace(worldDirection.scale(impulse));
    clampVectorLengthInPlace(externalVelocity, externalMaxSpeed);
  }

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
    root.position.addInPlace(externalDrift);
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
    applyExternalImpulse,
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
    const provisionalEyeHeight = physics.eyeHeight;
    const cameraWasAtProvisionalSpawn = () =>
      Math.abs(camera.position.x) < 0.0001 &&
      Math.abs(camera.position.z) < 0.0001 &&
      Math.abs(camera.position.y - provisionalEyeHeight) < 0.0001;
    const modelUrl = platform.modelUrl ?? "./assets/ship.glb";
    const result = await B.SceneLoader.ImportMeshAsync("", "", modelUrl, scene);
    stopImportedShipAnimations(result);
    const importedNodes = [...result.meshes, ...result.transformNodes];
    for (const node of importedNodes) {
      if (!node.parent) node.parent = shipRoot;
    }
    hideConfiguredShipMeshes(result.meshes, platform);
    const authoredCollisionMeshes = configureAuthoredCollisionMeshes(
      result.meshes,
      platform,
    );
    physics.authoredCollisionMeshes = authoredCollisionMeshes;

    const doorInteraction = installShipDoorInteraction(
      scene,
      result.meshes,
      interactions,
      platform,
    );
    normalizeModel(shipRoot, platform.modelMaxSize ?? 3.3);
    applyModelRotation(shipRoot, platform);
    updatePhysicsFromShip(shipRoot, physics, platform);
    configureShipDoorPassage(scene, doorInteraction, physics, platform);
    if (
      !cameraWasAtProvisionalSpawn() &&
      shouldLiftCameraIntoPlatformInterior(platform)
    ) {
      liftCameraIntoPlatformInterior(camera, physics);
    }
    shipRoot.parent = root;
    createControlPanel(scene, root, platform.controlPanel, physics);
    await loadFloorProps(scene, root, platform, physics, interactions);
    shipRoot.metadata = {
      ...(shipRoot.metadata ?? {}),
      brownDwarfWindowShadows: createBrownDwarfWindowShadows(
        scene,
        platform,
        primary,
        root,
        shipRoot,
      ),
    };
    addPolySurfaceHolograms(shipRoot, scene);

    if (cameraWasAtProvisionalSpawn()) {
      camera.position.copyFrom(resolveInitialCameraPosition(physics, platform));
      applyPlatformInitialCameraRotation(camera, platform);
    }
  } catch (error) {
    console.error("Failed to load ship platform model.", error);
  }
}

function shouldLiftCameraIntoPlatformInterior(platform) {
  return !shouldSpawnPlayerUnderShip(platform);
}

function resolveInitialCameraPosition(physics, platform) {
  if (Array.isArray(platform.initialCameraPosition)) {
    return B.Vector3.FromArray(platform.initialCameraPosition);
  }
  if (shouldSpawnPlayerUnderShip(platform)) {
    return getUnderShipSpawnPosition(physics, platform);
  }
  return new B.Vector3(0, physics.eyeHeight, 0);
}

function shouldSpawnPlayerUnderShip(platform) {
  return platform.playerSpawnMode === "underShip";
}

function getUnderShipSpawnPosition(physics, platform) {
  const bounds = physics.bounds ?? physics.interiorBounds;
  const offset = B.Vector3.FromArray(platform.playerSpawnOffset ?? [0, 0, 0]);
  const center = bounds
    ? bounds.min.add(bounds.max).scale(0.5)
    : B.Vector3.Zero();
  const configuredClearance = Number(platform.playerSpawnClearance);
  const clearance =
    Number.isFinite(configuredClearance) && configuredClearance > 0
      ? configuredClearance
      : Math.max((physics.playerHeight ?? 0.75) * 0.65, 0.45);
  const undersideY = bounds?.min.y ?? (physics.floorY ?? 0);
  return new B.Vector3(
    center.x + offset.x,
    undersideY - clearance + offset.y,
    center.z + offset.z,
  );
}

function liftCameraIntoPlatformInterior(camera, physics) {
  const eyeHeight = physics.eyeHeight ?? 0;
  if (camera.position.y >= eyeHeight - 0.001) return;

  const radius = physics.radius ?? 0;
  const insideFootprint =
    camera.position.x >= (physics.minX ?? -Infinity) + radius &&
    camera.position.x <= (physics.maxX ?? Infinity) - radius &&
    camera.position.z >= (physics.minZ ?? -Infinity) + radius &&
    camera.position.z <= (physics.maxZ ?? Infinity) - radius;
  if (!insideFootprint) return;

  camera.position.y = eyeHeight;
}

function stopImportedShipAnimations(result) {
  for (const group of result.animationGroups ?? []) {
    group.stop?.();
    group.reset?.();
    group.pause?.();
  }
}

function hideConfiguredShipMeshes(meshes, platform) {
  const hiddenNames = platform.hiddenMeshNames ?? [];
  if (!hiddenNames.length) return;

  for (const mesh of meshes) {
    if (!hiddenNames.includes(mesh.name)) continue;
    mesh.setEnabled(false);
    mesh.isVisible = false;
    mesh.visibility = 0;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = {
      ...(mesh.metadata ?? {}),
      hiddenByPlatformConfig: true,
      excludeFromBounds: true,
      excludeFromCollision: true,
    };
  }
}

function installShipDoorInteraction(scene, meshes, interactions, platform) {
  const doorMesh = meshes.find(
    (mesh) =>
      !mesh.metadata?.authoredCollisionMesh &&
      /(^|[_-])door([_-]|$)/i.test(mesh.name ?? ""),
  );
  if (!doorMesh) return;

  const doorMeshParent = doorMesh.parent ?? null;
  const doorMeshName = getImportedDoorPartBaseName(doorMesh, doorMeshParent);
  const hinge = configureShipDoorHinge(scene, doorMesh, platform);
  attachShipDoorCompanionMeshes(
    meshes,
    hinge,
    platform,
    doorMeshName,
    doorMeshParent,
  );

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
  doorMesh.isPickable = false;
  doorMesh.metadata = {
    ...(doorMesh.metadata ?? {}),
    platformDoorInteraction: interaction,
  };
  interactions?.push(interaction);
  return interaction;
}

function getImportedDoorPartBaseName(mesh, parent) {
  const parentName = parent?.name ?? "";
  if (/(^|[_-])door([_-]|$)/i.test(parentName)) return parentName;
  return (mesh.name ?? "").replace(/[_ -]?primitive\d+$/i, "");
}

function attachShipDoorCompanionMeshes(
  meshes,
  hinge,
  platform,
  doorMeshName,
  doorMeshParent,
) {
  for (const mesh of meshes) {
    const name = mesh.name?.toLowerCase() ?? "";
    if (isImportedDoorPartMesh(mesh, doorMeshName, doorMeshParent)) {
      mesh.setParent(hinge);
      continue;
    }
    if (isConfiguredDoorCompanionMesh(mesh, platform)) {
      mesh.setParent(hinge);
      continue;
    }
    if (
      mesh.metadata?.authoredCollisionMesh &&
      isConfiguredDoorCollisionMesh(mesh, platform)
    ) {
      mesh.setParent(hinge);
      continue;
    }
    if (!/(door|hatch)/.test(name)) continue;
    if (
      !mesh.metadata?.authoredCollisionMesh &&
      !/(glass|handle)/.test(name)
    ) {
      continue;
    }
    mesh.setParent(hinge);
  }
}

function isImportedDoorPartMesh(mesh, doorMeshName, doorMeshParent) {
  if (!doorMeshName || mesh.metadata?.authoredCollisionMesh) return false;
  if (mesh.parent !== doorMeshParent) return false;
  const parentName = doorMeshParent?.name ?? "";
  if (/(^|[_-])door([_-]|$)/i.test(parentName)) return true;
  const name = mesh.name ?? "";
  return name === doorMeshName || name.startsWith(`${doorMeshName}_`);
}

function isConfiguredDoorCompanionMesh(mesh, platform) {
  const names = platform.doorCompanionMeshNames ?? [];
  if (names.some((name) => name === mesh.name)) return true;
  const pattern = platform.doorCompanionMeshPattern;
  return pattern ? new RegExp(pattern, "i").test(mesh.name ?? "") : false;
}

function isConfiguredDoorCollisionMesh(mesh, platform) {
  const names = platform.doorCollisionMeshNames ?? [];
  if (names.some((name) => name === mesh.name)) return true;
  const pattern = platform.doorCollisionMeshPattern;
  return pattern ? new RegExp(pattern, "i").test(mesh.name ?? "") : false;
}

function configureShipDoorHinge(scene, doorMesh, platform) {
  const parent = doorMesh.parent;
  doorMesh.computeWorldMatrix(true);
  const hingeEdge = platform.doorHingeEdge ?? "maxY";
  const hingeAxis = platform.doorHingeAxis ?? "z";
  const hingeFrame = getDoorHingeFrame(doorMesh, hingeEdge, hingeAxis);
  const doorAxes = getDoorHingeWorldAxes(doorMesh, hingeFrame);
  const bounds = doorMesh.getBoundingInfo().boundingBox;
  const min = bounds.minimum;
  const max = bounds.maximum;
  const localPivot = platform.doorHingePivot
    ? B.Vector3.FromArray(platform.doorHingePivot)
    : (hingeFrame?.localPivot?.clone() ??
      B.Vector3.FromArray(getDefaultDoorHingePivot(min, max, hingeEdge)));
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
    hinge.rotationQuaternion = quaternionFromAxes(
      B.Vector3.TransformNormal(doorAxes.x, inverseParent).normalize(),
      B.Vector3.TransformNormal(doorAxes.y, inverseParent).normalize(),
      B.Vector3.TransformNormal(doorAxes.z, inverseParent).normalize(),
    );
  } else {
    hinge.position.copyFrom(worldPivot);
    hinge.rotationQuaternion = quaternionFromAxes(
      doorAxes.x,
      doorAxes.y,
      doorAxes.z,
    );
  }
  doorMesh.setParent(hinge);
  hinge.metadata = {
    ...(hinge.metadata ?? {}),
    closedRotation: hinge.rotation.clone(),
    closedRotationQuaternion: hinge.rotationQuaternion?.clone?.(),
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

function getDoorHingeFrame(doorMesh, edge, hingeAxis) {
  const positions = doorMesh.getVerticesData(B.VertexBuffer.PositionKind);
  if (!positions) return null;

  doorMesh.computeWorldMatrix(true);
  const bounds = doorMesh.getBoundingInfo().boundingBox;
  const edgeConfig = getHingeEdgeConfig(edge);
  if (!edgeConfig) return null;

  const vertices = getMeshLocalVertices(positions);
  const min = bounds.minimum;
  const max = bounds.maximum;
  const spans = [
    max.x - min.x,
    max.y - min.y,
    max.z - min.z,
  ];
  const maxSpan = Math.max(...spans);
  const boundary =
    edgeConfig.side === "max" ? max[edgeConfig.key] : min[edgeConfig.key];
  let edgeVertices = getVerticesNearEdge(
    vertices,
    edgeConfig.key,
    boundary,
    Math.max(maxSpan * 0.01, 0.02),
  );
  if (edgeVertices.length < 2) {
    edgeVertices = getVerticesNearEdge(
      vertices,
      edgeConfig.key,
      boundary,
      Math.max(maxSpan * 0.05, 0.05),
    );
  }

  const pair = getFarthestPointPair(edgeVertices);
  if (!pair) return null;

  const edgeAxis = pair.end.subtract(pair.start);
  if (edgeAxis.lengthSquared() < 1e-6) return null;
  edgeAxis.normalize();

  const localPivot = pair.start.add(pair.end).scale(0.5);
  const localCenter = new B.Vector3(
    (min.x + max.x) * 0.5,
    (min.y + max.y) * 0.5,
    (min.z + max.z) * 0.5,
  );
  const swingAxis = getProjectedSwingAxis(
    localCenter.subtract(localPivot),
    edgeAxis,
  );
  if (!swingAxis) return null;

  return {
    localPivot,
    localAxes: getLocalHingeAxes(hingeAxis, edgeAxis, swingAxis),
  };
}

function getHingeEdgeConfig(edge) {
  const match = /^(min|max)([XYZ])$/.exec(edge ?? "");
  if (!match) return null;
  return {
    side: match[1],
    key: match[2].toLowerCase(),
  };
}

function getMeshLocalVertices(positions) {
  const vertices = [];
  for (let index = 0; index < positions.length; index += 3) {
    vertices.push(new B.Vector3(
      positions[index],
      positions[index + 1],
      positions[index + 2],
    ));
  }
  return vertices;
}

function getVerticesNearEdge(vertices, key, boundary, tolerance) {
  return vertices.filter(
    (vertex) => Math.abs(vertex[key] - boundary) <= tolerance,
  );
}

function getFarthestPointPair(vertices) {
  let best = null;
  let bestDistance = 0;
  for (let startIndex = 0; startIndex < vertices.length; startIndex += 1) {
    for (
      let endIndex = startIndex + 1;
      endIndex < vertices.length;
      endIndex += 1
    ) {
      const distance = B.Vector3.DistanceSquared(
        vertices[startIndex],
        vertices[endIndex],
      );
      if (distance > bestDistance) {
        bestDistance = distance;
        best = {
          start: vertices[startIndex],
          end: vertices[endIndex],
        };
      }
    }
  }
  return best;
}

function getProjectedSwingAxis(vector, hingeAxis) {
  const swingAxis = vector.subtract(
    hingeAxis.scale(B.Vector3.Dot(vector, hingeAxis)),
  );
  if (swingAxis.lengthSquared() < 1e-6) return null;
  return swingAxis.normalize();
}

function getLocalHingeAxes(axis, edgeAxis, swingAxis) {
  const hingeAxis = edgeAxis.clone().normalize();
  const swing = swingAxis.clone().normalize();
  const axisName = (axis ?? "z").toLowerCase();
  if (axisName === "x") {
    const x = hingeAxis;
    const z = B.Vector3.Cross(x, swing).normalize();
    const y = B.Vector3.Cross(z, x).normalize();
    return { x, y, z };
  }
  if (axisName === "y") {
    const y = hingeAxis;
    const x = B.Vector3.Cross(y, swing).normalize();
    const z = B.Vector3.Cross(x, y).normalize();
    return { x, y, z };
  }

  const z = hingeAxis;
  const y = B.Vector3.Cross(z, swing).normalize();
  const x = B.Vector3.Cross(y, z).normalize();
  return { x, y, z };
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
  const exteriorDepth =
    platform.doorExteriorDepth ??
    Math.max(radius * 6, physics.thickness ?? 0.35);
  const interiorDepth =
    platform.doorInteriorDepth ?? Math.max(radius * 4, 0.55);
  const collisionPadding = platform.doorCollisionPadding ?? radius * 1.15;
  const collisionVerticalPadding =
    platform.doorCollisionVerticalPadding ?? radius * 0.85;
  const collisionDepth =
    platform.doorCollisionDepth ?? Math.max(radius * 2.5, 0.28);
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
    collisionHalfWidth: frame.halfWidth + collisionPadding,
    collisionHalfHeight: frame.halfHeight + collisionVerticalPadding,
    collisionHalfDepth: collisionDepth,
    inwardDepth: interiorDepth,
    outwardDepth: exteriorDepth,
  };

  interaction.passage = passage;
  physics.doorPassages = [...(physics.doorPassages ?? []), passage];
  createShipDoorInteractionProxy(scene, interaction, passage, platform);
}

function color3FromOption(value, fallback) {
  if (value instanceof B.Color3) return value.clone();
  if (Array.isArray(value)) return B.Color3.FromArray(value);
  return B.Color3.FromArray(fallback);
}

function createShipDoorInteractionProxy(scene, interaction, passage, platform) {
  const proxyScale = platform.doorInteractionProxyScale ?? 1;
  const proxyWidthPadding = platform.doorInteractionProxyWidthPadding ?? 0;
  const proxyHeightPadding = platform.doorInteractionProxyHeightPadding ?? 0;
  const options = {
    width: passage.halfWidth * 2 * proxyScale + proxyWidthPadding,
    height: passage.halfHeight * 2 * proxyScale + proxyHeightPadding,
    depth: platform.doorInteractionProxyDepth ?? 0.08,
  };
  interaction.closedPromptProxy = createShipDoorPromptProxy(
    scene,
    interaction,
    passage,
    interaction.doorMesh?.parent?.parent,
    "closed",
    options,
  );
  interaction.openPromptProxy = createShipDoorPromptProxy(
    scene,
    interaction,
    passage,
    interaction.doorMesh?.parent,
    "open",
    options,
  );
  updateShipDoorPromptProxies(interaction);
}

function createShipDoorPromptProxy(
  scene,
  interaction,
  passage,
  parent,
  state,
  options,
) {
  const proxy = B.MeshBuilder.CreateBox(
    `${interaction.doorMesh?.name ?? "ship-door"}-${state}-interaction-proxy`,
    options,
    scene,
  );
  const material = new B.StandardMaterial(`${proxy.name}-material`, scene);
  material.alpha = 0;
  material.disableLighting = true;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  proxy.material = material;
  proxy.isPickable = true;
  proxy.checkCollisions = false;
  proxy.excludeFromDepthRenderer = true;
  proxy.metadata = {
    ...(proxy.metadata ?? {}),
    interaction,
    excludeFromCollision: true,
    platformDoorInteractionProxy: true,
    platformDoorInteractionState: state,
  };

  if (!parent) {
    proxy.position.copyFrom(passage.center);
    proxy.rotationQuaternion = quaternionFromAxes(
      passage.right,
      passage.up,
      passage.normal,
    );
    return proxy;
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
  return proxy;
}

function updateShipDoorPromptProxies(interaction) {
  setShipDoorPromptProxyEnabled(
    interaction.closedPromptProxy,
    !interaction.isOpen,
  );
  setShipDoorPromptProxyEnabled(interaction.openPromptProxy, interaction.isOpen);
}

function setShipDoorPromptProxyEnabled(proxy, enabled) {
  if (!proxy) return;
  proxy.setEnabled(enabled);
  proxy.isPickable = enabled;
}

function quaternionFromAxes(right, up, normal) {
  const matrix = B.Matrix.Identity();
  B.Matrix.FromXYZAxesToRef(right, up, normal, matrix);
  return B.Quaternion.FromRotationMatrix(matrix);
}

function getMeshWorldAxes(mesh) {
  mesh.computeWorldMatrix(true);
  const world = mesh.getWorldMatrix();
  return {
    x: B.Vector3.TransformNormal(B.Axis.X, world).normalize(),
    y: B.Vector3.TransformNormal(B.Axis.Y, world).normalize(),
    z: B.Vector3.TransformNormal(B.Axis.Z, world).normalize(),
  };
}

function getDoorHingeWorldAxes(mesh, hingeFrame) {
  if (!hingeFrame?.localAxes) return getMeshWorldAxes(mesh);

  mesh.computeWorldMatrix(true);
  const world = mesh.getWorldMatrix();
  return {
    x: B.Vector3.TransformNormal(hingeFrame.localAxes.x, world).normalize(),
    y: B.Vector3.TransformNormal(hingeFrame.localAxes.y, world).normalize(),
    z: B.Vector3.TransformNormal(hingeFrame.localAxes.z, world).normalize(),
  };
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

  const opening = !interaction.isOpen;
  const axis = platform.doorHingeAxis ?? "z";
  const openAngle = degreesToRadians(platform.doorOpenAngleDegrees ?? 105);
  const closedQuaternion =
    hinge.metadata?.closedRotationQuaternion?.clone?.() ??
    hinge.rotationQuaternion?.clone?.();
  if (closedQuaternion) {
    const openQuaternion = closedQuaternion.multiply(
      B.Quaternion.RotationAxis(getHingeAxisVector(axis), openAngle),
    );
    const targetQuaternion = opening ? openQuaternion : closedQuaternion;
    if (opening) {
      interaction.isOpen = true;
      updateShipDoorPromptProxies(interaction);
    }

    animateShipDoorQuaternion(
      scene,
      hinge,
      targetQuaternion,
      platform.doorAnimationSeconds ?? 0.75,
      () => {
        if (!opening) {
          interaction.isOpen = false;
          updateShipDoorPromptProxies(interaction);
        }
        interaction.isAnimating = false;
      },
    );
    interaction.isAnimating = true;
    return true;
  }

  const closedRotation =
    hinge.metadata?.closedRotation?.clone?.() ?? hinge.rotation.clone();
  const openRotation = closedRotation.clone();
  openRotation[axis] += openAngle;
  const targetRotation = opening ? openRotation : closedRotation;
  if (opening) {
    interaction.isOpen = true;
    updateShipDoorPromptProxies(interaction);
  }

  animateShipDoorRotation(
    scene,
    hinge,
    targetRotation,
    platform.doorAnimationSeconds ?? 0.75,
    () => {
      if (!opening) {
        interaction.isOpen = false;
        updateShipDoorPromptProxies(interaction);
      }
      interaction.isAnimating = false;
    },
  );
  interaction.isAnimating = true;
  return true;
}

function getHingeAxisVector(axis) {
  const axes = {
    x: B.Axis.X,
    y: B.Axis.Y,
    z: B.Axis.Z,
  };
  return axes[axis] ?? B.Axis.Z;
}

function animateShipDoorQuaternion(
  scene,
  hinge,
  targetQuaternion,
  duration,
  onDone,
) {
  if (!hinge.rotationQuaternion) {
    hinge.rotationQuaternion = B.Quaternion.FromEulerVector(hinge.rotation);
  }

  const startQuaternion = hinge.rotationQuaternion.clone();
  const secondsTotal = Math.max(duration, 0.01);
  let elapsed = 0;

  const observer = scene.onBeforeRenderObservable.add(() => {
    const seconds = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    elapsed += seconds;
    const amount = easeInOutCubic(Math.min(elapsed / secondsTotal, 1));
    B.Quaternion.SlerpToRef(
      startQuaternion,
      targetQuaternion,
      amount,
      hinge.rotationQuaternion,
    );
    hinge.computeWorldMatrix(true);

    if (elapsed >= secondsTotal) {
      hinge.rotationQuaternion.copyFrom(targetQuaternion);
      hinge.computeWorldMatrix(true);
      scene.onBeforeRenderObservable.remove(observer);
      onDone?.();
    }
  });
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
    return source.clone(`${name}-ship-metal-material`);
  }

  const material = new B.StandardMaterial(`${name}-material`, scene);
  material.diffuseColor = new B.Color3(0.18, 0.15, 0.12);
  material.specularColor = new B.Color3(0.55, 0.48, 0.36);
  material.specularPower = 48;
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
      mesh.checkCollisions = false;
      mesh.receiveShadows = true;
      mesh.metadata = {
        ...(mesh.metadata ?? {}),
        excludeFromBounds: false,
        excludeFromCollision: true,
        glbPickupLabel: prop.label ?? prop.id ?? "Item",
        glbPickupRange: prop.pickupRange ?? 1.65,
        glbPickupRoot: propRoot,
        glbPickupItem: createPickupItem(propRoot, prop),
      };
      mesh.showBoundingBox = Boolean(scene.metadata?.objectBoundsVisible);
    }
    addPolySurfaceHolograms(propRoot, scene);

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
    mesh.isPickable = true;
    mesh.checkCollisions = false;
  }
}

function updatePhysicsFromShip(root, physics, platform) {
  const meshes = getRenderableMeshes(root);
  if (!meshes.length) return;

  const bounds = getMeshBounds(meshes);
  const boundsMode = platform.physicsBoundsMode ?? "interior";
  const savedInterior =
    boundsMode === "model" ? null : getSavedPhysicsBounds(platform);
  const interior =
    boundsMode === "model"
      ? bounds
      : (savedInterior ??
        getInteriorBoundsFromModel(
          meshes,
          platform.physicsProbePosition ?? [0, 0, 0],
        ));
  const min = interior?.min ?? bounds.min;
  const max = interior?.max ?? bounds.max;
  const interiorSize = max.subtract(min);
  const floorY =
    getAuthoredFloorSurfaceY(physics.authoredCollisionMeshes, { min, max }, platform) ??
    resolveWalkableFloorY(
      meshes,
      { min, max },
      platform,
      Boolean(savedInterior),
    ) ??
    min.y;
  const ceilingY = max.y;
  const headroom = Math.max(ceilingY - floorY, 0.001);
  const configuredPlayerHeight = Number(platform.playerHeight);
  const playerHeight = Math.max(
    0.001,
    Number.isFinite(configuredPlayerHeight)
      ? configuredPlayerHeight
      : headroom * (platform.playerHeightScale ?? 0.82),
  );
  const radius = getConfiguredPlayerRadius(
    platform,
    playerHeight,
    Math.min(interiorSize.x, interiorSize.z) * 0.08,
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
  physics.eyeHeight = floorY + playerHeight + (platform.eyeHeightOffset ?? 0);
  physics.radius = radius;
  physics.bounds = bounds;
  physics.interiorBounds = { min: min.clone(), max: max.clone() };
}

function getConfiguredPlayerRadius(platform, playerHeight, fallbackRadius) {
  const configuredRadius = Number(platform.playerRadius);
  if (Number.isFinite(configuredRadius) && configuredRadius > 0) {
    return configuredRadius;
  }

  const radiusScale = Number(platform.playerRadiusScale);
  const scaledRadius =
    playerHeight *
    (Number.isFinite(radiusScale) && radiusScale > 0
      ? radiusScale
      : DEFAULT_PLAYER_RADIUS_SCALE);
  return Math.max(scaledRadius, fallbackRadius, 0.05);
}

function getSavedPhysicsBounds(platform) {
  const saved = platform.physicsBounds;
  if (!saved?.min || !saved?.max) return null;
  return {
    min: B.Vector3.FromArray(saved.min),
    max: B.Vector3.FromArray(saved.max),
  };
}

function getSavedPhysicsFloorY(platform) {
  const value = platform.physicsFloorY ?? platform.floorY;
  return Number.isFinite(value) ? value : null;
}

function resolveWalkableFloorY(
  meshes,
  interior,
  platform,
  hasExplicitInterior = false,
) {
  const saved = getSavedPhysicsFloorY(platform);
  if (saved !== null) return saved;
  if (hasExplicitInterior) return interior.min.y;

  return findWalkableFloorSurfaceY(meshes, interior, platform);
}

function getAuthoredFloorSurfaceY(meshes, interior, platform) {
  const floorMeshes = (meshes ?? []).filter(isAuthoredFloorMesh);
  if (!floorMeshes.length) return null;
  return findWalkableFloorSurfaceY(floorMeshes, interior, {
    ...platform,
    floorSurfaceMinAreaFraction: 0,
    floorSurfaceMinFootprintFraction: 0,
  });
}

function isAuthoredFloorMesh(mesh) {
  return /(^|[_-])floor([_.-]|$)/i.test(mesh.name ?? "");
}

function findWalkableFloorSurfaceY(meshes, interior, platform) {
  const spanY = interior.max.y - interior.min.y;
  if (spanY <= 0) return null;

  const minX = interior.min.x;
  const maxX = interior.max.x;
  const minZ = interior.min.z;
  const maxZ = interior.max.z;
  const footprintArea = Math.max((maxX - minX) * (maxZ - minZ), 0.0001);
  const binSize = platform.floorSurfaceBinSize ?? 0.025;
  const normalThreshold = platform.floorSurfaceNormalThreshold ?? 0.82;
  const maxFloorY =
    platform.floorSurfaceMaxY ??
    interior.min.y + spanY * (platform.floorSurfaceMaxHeightFraction ?? 0.96);
  const bins = new Map();

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
      const centroid = a.add(b).addInPlace(c).scaleInPlace(1 / 3);
      if (
        centroid.x < minX ||
        centroid.x > maxX ||
        centroid.z < minZ ||
        centroid.z > maxZ ||
        centroid.y < interior.min.y ||
        centroid.y > maxFloorY
      ) {
        continue;
      }

      const normal = B.Vector3.Cross(b.subtract(a), c.subtract(a));
      const area = normal.length() * 0.5;
      if (area <= 0.000001) continue;
      normal.scaleInPlace(1 / (area * 2));
      if (Math.abs(normal.y) < normalThreshold) continue;

      const key = Math.round(centroid.y / binSize);
      const bin = bins.get(key) ?? {
        weightedY: 0,
        area: 0,
        minY: Infinity,
        maxY: -Infinity,
      };
      bin.weightedY += centroid.y * area;
      bin.area += area;
      bin.minY = Math.min(bin.minY, centroid.y);
      bin.maxY = Math.max(bin.maxY, centroid.y);
      bins.set(key, bin);
    }
  }

  if (!bins.size) return null;

  const candidates = [...bins.values()]
    .map((bin) => ({
      y: bin.weightedY / bin.area,
      area: bin.area,
    }))
    .filter((candidate) => Number.isFinite(candidate.y));
  if (!candidates.length) return null;

  const largestArea = Math.max(...candidates.map((candidate) => candidate.area));
  const minimumArea = Math.max(
    footprintArea * (platform.floorSurfaceMinFootprintFraction ?? 0.002),
    largestArea * (platform.floorSurfaceMinAreaFraction ?? 0.18),
  );
  const viable = candidates
    .filter((candidate) => candidate.area >= minimumArea)
    .sort((a, b) => a.y - b.y);
  if (!viable.length) return null;

  return viable[viable.length - 1].y;
}

function createBrownDwarfWindowShadows(
  scene,
  platform,
  primary,
  platformRoot,
  shipRoot,
) {
  if (platform.brownDwarfWindowShadows === false) return null;

  const primaryLight = getPrimaryLight(scene, primary);
  if (!primaryLight) return null;

  const receiverMeshes = platformRoot.getChildMeshes(false).filter((mesh) =>
    isBrownDwarfWindowLightReceiver(mesh),
  );
  const casterMeshes = platformRoot.getChildMeshes(false).filter((mesh) =>
    isBrownDwarfWindowShadowCaster(mesh, platform),
  );
  if (!receiverMeshes.length || !casterMeshes.length) return null;

  excludeMeshesFromLight(primaryLight, receiverMeshes);

  const rayLight = new B.DirectionalLight(
    `${platform.id}-brown-dwarf-window-rays`,
    B.Vector3.Forward(),
    scene,
  );
  rayLight.diffuse =
    primaryLight.diffuse?.clone?.() ?? new B.Color3(1, 0.42, 0.16);
  rayLight.specular =
    primaryLight.specular?.clone?.() ?? new B.Color3(1, 0.52, 0.22);
  rayLight.intensity =
    platform.windowLightIntensity ??
    platform.brownDwarfWindowLightIntensity ??
    primaryLight.intensity;
  rayLight.includedOnlyMeshes = receiverMeshes;
  configureDirectionalShadowFrustum(rayLight, platform, shipRoot);

  const shadowGenerator = new B.ShadowGenerator(
    platform.windowShadowMapSize ?? platform.shadowMapSize ?? 2048,
    rayLight,
  );
  shadowGenerator.bias =
    platform.windowShadowBias ?? platform.shadowBias ?? 0.00025;
  shadowGenerator.normalBias =
    platform.windowShadowNormalBias ?? platform.shadowNormalBias ?? 0.006;
  shadowGenerator.usePercentageCloserFiltering = true;
  shadowGenerator.filteringQuality = B.ShadowGenerator.QUALITY_HIGH;
  shadowGenerator.transparencyShadow = false;
  shadowGenerator.forceBackFacesOnly =
    platform.windowShadowBackFacesOnly ?? false;

  for (const mesh of receiverMeshes) {
    mesh.receiveShadows = true;
  }
  for (const mesh of casterMeshes) {
    shadowGenerator.addShadowCaster(mesh);
  }

  const primaryPosition = B.Vector3.FromArray(primary?.position ?? [0, 0, 0]);
  const updateLight = () => {
    platformRoot.computeWorldMatrix(true);
    const toShip = platformRoot.getAbsolutePosition().subtract(primaryPosition);
    if (toShip.lengthSquared() < 0.000001) return;

    const direction = toShip.normalize();
    rayLight.direction.copyFrom(direction);
    rayLight.position.copyFrom(
      platformRoot.getAbsolutePosition().subtract(
        direction.scale(platform.windowShadowLightDistance ?? 18),
      ),
    );
  };
  updateLight();
  const observer = scene.onBeforeRenderObservable.add(updateLight);

  return {
    rayLight,
    shadowGenerator,
    dispose: () => {
      scene.onBeforeRenderObservable.remove(observer);
      shadowGenerator.dispose();
      rayLight.dispose();
    },
  };
}

function getPrimaryLight(scene, primary) {
  const primaryName = primary?.id ?? primary?.name ?? "central_brown_dwarf";
  return (
    primary?.metadata?.brownDwarfLight ??
    scene.getLightByName?.(`${primaryName}-light`) ??
    null
  );
}

function configureDirectionalShadowFrustum(light, platform, shipRoot) {
  const bounds = getMeshBounds(getRenderableMeshes(shipRoot));
  const size = Math.max(
    bounds.max.x - bounds.min.x,
    bounds.max.y - bounds.min.y,
    bounds.max.z - bounds.min.z,
    platform.windowShadowOrthoSize ?? 0,
  );
  const halfSize = Math.max(
    size * 0.68,
    platform.windowShadowMinOrthoSize ?? 1.8,
  );
  light.autoUpdateExtends = false;
  light.orthoLeft = -(platform.windowShadowOrthoLeft ?? halfSize);
  light.orthoRight = platform.windowShadowOrthoRight ?? halfSize;
  light.orthoBottom = -(platform.windowShadowOrthoBottom ?? halfSize);
  light.orthoTop = platform.windowShadowOrthoTop ?? halfSize;
  light.shadowMinZ = platform.windowShadowMinZ ?? 0.1;
  light.shadowMaxZ = platform.windowShadowMaxZ ?? halfSize * 5;
}

function isBrownDwarfWindowLightReceiver(mesh) {
  if (!mesh.isEnabled() || mesh.getTotalVertices() <= 0) return false;
  if (mesh.metadata?.excludeFromBounds) return false;
  if (isPolySurfaceHologram(mesh)) return false;
  return true;
}

function isBrownDwarfWindowShadowCaster(mesh, platform) {
  if (!mesh.isEnabled() || mesh.getTotalVertices() <= 0) return false;
  if (isIgnoredCollisionMesh(mesh, platform)) return false;
  if (mesh.metadata?.platformDoorInteractionProxy) return false;
  if (isTransparentWindowMesh(mesh)) return false;
  if (isInteriorLightMesh(mesh)) return false;
  if (mesh.metadata?.authoredCollisionMesh) return true;
  return isRenderableMesh(mesh);
}

function isTransparentWindowMesh(mesh) {
  const name = mesh.name?.toLowerCase() ?? "";
  const materialName = mesh.material?.name?.toLowerCase() ?? "";
  return (
    /(glass|window|transparent)/.test(name) ||
    /(glass|window|transparent)/.test(materialName) ||
    mesh.material?.needAlphaBlending?.() === true
  );
}

function isInteriorLightMesh(mesh) {
  const name = mesh.name?.toLowerCase() ?? "";
  const materialName = mesh.material?.name?.toLowerCase() ?? "";
  return (
    /(light|emissive|lamp)/.test(name) ||
    /(light|emissive|lamp)/.test(materialName)
  );
}

function excludeMeshesFromLight(light, meshes) {
  const excluded = new Set(light.excludedMeshes ?? []);
  for (const mesh of meshes) {
    excluded.add(mesh);
  }
  light.excludedMeshes = [...excluded];
}

function configureAuthoredCollisionMeshes(meshes, platform) {
  const collisionMeshes = [];
  for (const mesh of meshes) {
    if (!isAuthoredCollisionMeshName(mesh.name)) continue;
    mesh.isVisible = false;
    mesh.visibility = 0;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.showBoundingBox = false;
    mesh.metadata = {
      ...(mesh.metadata ?? {}),
      authoredCollisionMesh: true,
      excludeFromBounds: true,
      excludeFromCollision: false,
      originalMaterial: mesh.material ?? null,
      renderingGroupId: mesh.renderingGroupId ?? 0,
    };
    if (isIgnoredCollisionMesh(mesh, platform)) {
      mesh.metadata = {
        ...(mesh.metadata ?? {}),
        authoredCollisionMesh: false,
        ignoredAuthoredCollisionMesh: true,
        excludeFromCollision: true,
      };
      continue;
    }
    collisionMeshes.push(mesh);
  }
  return collisionMeshes;
}

function isAuthoredCollisionMeshName(name = "") {
  return /^(COL|UCX|UBX|UCP|USP)[_-]/i.test(name);
}

function isIgnoredCollisionMesh(mesh, platform) {
  return (platform.ignoredCollisionMeshNames ?? []).includes(mesh.name);
}

function getRenderableMeshes(root) {
  return root.getChildMeshes(false).filter(isRenderableMesh);
}

function isRenderableMesh(mesh) {
  return (
    mesh.isEnabled() &&
    mesh.getTotalVertices() > 0 &&
    !mesh.metadata?.excludeFromBounds &&
    !isPolySurfaceHologram(mesh)
  );
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

function clampVectorLengthInPlace(vector, maxLength) {
  const lengthSquared = vector.lengthSquared();
  if (lengthSquared <= maxLength * maxLength) return;
  vector.scaleInPlace(maxLength / Math.sqrt(lengthSquared));
}

function profile(scene, name, fn) {
  return scene.metadata?.profiler?.measure(name, fn) ?? fn();
}
