import { createNebula, sampleNebulaDensity } from "./nebula-renderer.js";

const B = window.BABYLON;
const ROCK_TEXTURE_SIZE = 512;

export function createDebrisField(scene, debrisField, occluder) {
  const mist = createNebula(scene, debrisField, occluder);
  const rocks = createRockField(scene, debrisField);
  const light = createFragmentLight(
    scene,
    debrisField,
    occluder,
    rocks.getChildMeshes(false),
  );
  return { ...mist, rocks, light };
}

function createRockField(scene, field) {
  const root = new B.TransformNode(`${field.id}-rocks`, scene);
  root.alwaysSelectAsActiveMesh = true;

  const fragmentSizes = field.fragmentSizeMeters ?? [0.5, 3];
  const metersPerWorldUnit = field.metersPerWorldUnit ?? 8;
  const runtimeSeed = field.randomizeRocks === false
    ? "fixed"
    : createRuntimeSeed();
  const renderDistance = field.rockRenderDistance ?? 44;
  const fragmentCount = field.nearFragmentCount ?? 2600;
  const maxActiveRocks = field.maxActiveRocks ?? fragmentCount;
  const initialGraceRadius = field.initialRockGraceRadius ?? 0;
  const protectedSpawnRadius = field.protectedSpawnRadius ?? initialGraceRadius;
  const shipGraceRadius = field.shipGraceRadius ?? protectedSpawnRadius;
  const guaranteedFrontRock = field.guaranteedFrontRock ?? true;
  const guaranteedFrontRockDistance = field.guaranteedFrontRockDistance ?? 28;
  const guaranteedFrontRockSize =
    field.guaranteedFrontRockSizeMeters ??
    (fragmentSizes[0] + fragmentSizes[1]) * 0.32;
  const flowSpeed = field.nearRockFlowSpeed ?? 4.2;
  const clumpCount = field.rockClumpCount ?? 9;
  const clumpRadius = field.rockClumpRadius ?? 7;
  const clumpDistance = field.rockClumpDistance ?? renderDistance * 0.55;
  const stableDistance = field.rockStableDistance ?? renderDistance * 0.58;
  const fadeStart = field.rockFadeStart ?? renderDistance * 0.68;
  const fadeEnd = field.rockFadeEnd ?? renderDistance * 0.98;
  const densityFadeWidth = field.rockDensityFadeWidth ?? 0.18;
  const nearDensityBypassRadius = field.nearRockDensityBypassRadius ?? 0;
  const transitionSeconds = field.rockTransitionSeconds ?? 1.2;
  const coOrbitFraction = field.coOrbitFraction ?? 0.78;
  const relativeDriftSpeed = field.relativeDriftSpeed ?? flowSpeed * 0.08;
  const fastDriftSpeed = field.fastRelativeDriftSpeed ?? flowSpeed * 0.65;
  const interceptClumpCount = field.interceptClumpCount ?? 4;
  const interceptDistance = field.interceptClumpDistance ?? [8, 38];
  const densityUpdateInterval = Math.max(
    1,
    Math.round(field.rockDensityUpdateInterval ?? 6),
  );
  const fieldCenter = B.Vector3.FromArray(field.position);
  const renderCenter = B.Vector3.Zero();
  const flowDirection = B.Vector3.Zero();
  const orbitRadial = B.Vector3.Zero();
  const orbitNormal = B.Vector3.Up();
  const scratchRockPosition = B.Vector3.Zero();
  const scratchWorldPosition = B.Vector3.Zero();
  let centerProvider = () => scene.activeCamera.globalPosition;
  let flowProvider = () => B.Axis.Z;
  let lastCell = "";
  let simulationTime = 0;
  let asteroidFrame = 0;
  let seeded = false;
  const groups = createRockGroups(scene, field, runtimeSeed);
  const matrices = groups.map(() => []);
  const colors = groups.map(() => []);
  const rocks = [];
  const retiringRocks = [];
  let visibleRockInstances = 0;

  groups.forEach((mesh, index) => {
    mesh.parent = root;
    applyMatrices(mesh, matrices[index]);
  });

  scene.onBeforeRenderObservable.add(() => {
    profile(scene, "Asteroids", () => {
      const timeScale = scene.metadata?.timeScale ?? 1;
      const seconds =
        Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05) * timeScale;
      simulationTime += seconds;
      const center = centerProvider();
      renderCenter.copyFrom(center);
      root.position.copyFrom(renderCenter);
      flowDirection.copyFrom(flowProvider()).normalize();
      orbitRadial.copyFrom(renderCenter).subtractInPlace(fieldCenter);
      if (orbitRadial.lengthSquared() > 0.0001) {
        orbitRadial.normalize();
      } else {
        orbitRadial.copyFrom(B.Axis.X);
      }
      B.Vector3.CrossToRef(orbitRadial, flowDirection, orbitNormal);
      if (orbitNormal.lengthSquared() > 0.0001) {
        orbitNormal.normalize();
      } else {
        orbitNormal.copyFrom(B.Axis.Y);
      }
      const cell = makeCellKey(renderCenter, renderDistance * 0.38);
      if (cell !== lastCell) {
        lastCell = cell;
        regenerateRocks(cell);
      }

      updateRockMatrices(seconds);
      scene.metadata?.profiler?.setGpuWeight(
        "Asteroids",
        visibleRockInstances *
          ((field.rockMeshSubdivisions ?? 5) + 1) *
          0.06 +
          groups.length * 0.35,
      );
    });
  });

  root.setRenderCenter = (provider) => {
    centerProvider = provider;
  };
  root.setFlowDirection = (provider) => {
    flowProvider = provider;
  };

  return root;

  function regenerateRocks(cell) {
    const initialSeed = !seeded;
    retireOuterRocks();
    const random = createRandom(hashString(`${field.seed}:${runtimeSeed}:${cell}`));
    const densityThreshold = field.rockDensityThreshold ?? 0.08;
    const clumps = createClumps(
      random,
      clumpCount,
      clumpDistance,
      interceptClumpCount,
      interceptDistance,
    );
    if (initialSeed && guaranteedFrontRock) {
      const guaranteedFrontRockRadius =
        estimateRockWorldRadius(guaranteedFrontRockSize);
      const local = getCameraForwardLocal(
        Math.max(
          guaranteedFrontRockDistance,
          protectedSpawnRadius + guaranteedFrontRockRadius,
        ),
      );
      if (!isInsideProtectedSpawn(local, guaranteedFrontRockRadius)) {
        pushRock(
          local,
          guaranteedFrontRockSize,
          random,
          {
            relativeVelocity: B.Vector3.Zero(),
            material: groups.pick(random),
            ignoreDensity: true,
          },
        );
      }
    }
    for (let attempt = 0; attempt < fragmentCount; attempt += 1) {
      if (rocks.length >= maxActiveRocks) break;
      const clump = clumps[Math.floor(random() * clumps.length)];
      const local = clump
        .add(randomPointInSphere(random, clumpRadius * lerp(0.45, 1.35, random())));
      if (local.lengthSquared() > renderDistance * renderDistance) continue;
      if (!initialSeed && local.lengthSquared() < stableDistance * stableDistance) {
        continue;
      }
      const bypassDensity =
        nearDensityBypassRadius > 0 &&
        local.lengthSquared() < nearDensityBypassRadius * nearDensityBypassRadius;
      let density = 1;
      if (!bypassDensity) {
        const world = renderCenter.add(local);
        density = sampleDensityAtWorld(field, world, fieldCenter);
        if (density < densityThreshold) continue;

        const visibleDensity = (density - densityThreshold) /
          Math.max(1 - densityThreshold, 0.0001);
        const rockProbability = Math.pow(
          clamp01(visibleDensity * (field.rockDensityGain ?? 5.5)),
          field.rockDensityExponent ?? 1.35,
        );
        if (random() > rockProbability) {
          continue;
        }
      }

      const size = lerp(fragmentSizes[0], fragmentSizes[1], random() ** 2);
      const rockRadius = size / metersPerWorldUnit / 3.5;
      if (isInsideProtectedSpawn(local, rockRadius)) {
        continue;
      }
      pushRock(local, size, random, { ignoreDensity: bypassDensity });
    }
    seeded = true;
  }

  function pushRock(local, sizeMeters, random, options = {}) {
    const rockRadius = baseRockRadius(sizeMeters);
    rocks.push({
      material: options.material ?? groups.pick(random),
      base: local,
      relativeVelocity:
        options.relativeVelocity ?? createRelativeOrbitalVelocity(random),
      ignoreDensity: options.ignoreDensity ?? false,
      age: 0,
      spinAxis: randomDirection(random),
      spinRate: lerp(
        field.minSpinRadiansPerSecond ?? 0.015,
        field.maxSpinRadiansPerSecond ?? 0.09,
        random(),
      ) * (random() < 0.5 ? -1 : 1),
      scale: new B.Vector3(
        rockRadius * lerp(0.72, 1.08, random()),
        rockRadius * lerp(0.62, 0.96, random()),
        rockRadius * lerp(0.9, 1.48, random()),
      ),
      rotation: B.Quaternion.RotationYawPitchRoll(
        random() * Math.PI * 2,
        random() * Math.PI * 2,
        random() * Math.PI * 2,
      ),
      radius: estimateRockWorldRadius(sizeMeters),
      densityPhase: Math.floor(random() * densityUpdateInterval),
      cachedDensity: options.ignoreDensity ? 1 : undefined,
    });
  }

  function baseRockRadius(sizeMeters) {
    return sizeMeters / metersPerWorldUnit / 3.5;
  }

  function estimateRockWorldRadius(sizeMeters) {
    return baseRockRadius(sizeMeters) * 1.55;
  }

  function isInsideProtectedSpawn(local, rockRadius) {
    return (
      protectedSpawnRadius > 0 &&
      local.length() < protectedSpawnRadius + rockRadius
    );
  }

  function isInsideShipGraceBubble(local, rockRadius) {
    return shipGraceRadius > 0 && local.length() < shipGraceRadius + rockRadius;
  }

  function getCameraForwardLocal(distance) {
    const camera = scene.activeCamera;
    root.computeWorldMatrix(true);
    camera.parent?.computeWorldMatrix?.(true);
    camera.computeWorldMatrix(true);
    const cameraPosition = camera.globalPosition.clone();
    const forward = camera.getDirection(B.Axis.Z);
    if (forward.lengthSquared() < 0.0001) forward.copyFrom(B.Axis.Z);
    forward.normalize();
    return cameraPosition
      .subtract(renderCenter)
      .addInPlace(forward.scale(distance));
  }

  function retireOuterRocks() {
    for (let index = rocks.length - 1; index >= 0; index -= 1) {
      const rock = rocks[index];
      const position = getRockPositionToRef(rock, scratchRockPosition);
      if (position.lengthSquared() < stableDistance * stableDistance) {
        continue;
      }
      retiringRocks.push({
        material: rock.material,
        position: position.clone(),
        age: 0,
        spinAxis: rock.spinAxis,
        spinRate: rock.spinRate,
        scale: rock.scale,
        rotation: rock.rotation,
      });
      rocks.splice(index, 1);
    }
  }

  function updateRockMatrices(seconds) {
    asteroidFrame += 1;
    for (const matrixSet of matrices) matrixSet.length = 0;
    for (const colorSet of colors) colorSet.length = 0;
    const densityThreshold = field.rockDensityThreshold ?? 0.08;
    for (let index = rocks.length - 1; index >= 0; index -= 1) {
      const rock = rocks[index];
      rock.age += seconds;
      const position = getRockPositionToRef(rock, scratchRockPosition);
      if (isInsideShipGraceBubble(position, rock.radius)) {
        rocks.splice(index, 1);
        continue;
      }
      if (position.lengthSquared() > renderDistance * renderDistance) {
        retiringRocks.push({
          material: rock.material,
          position: position.clone(),
          age: 0,
          spinAxis: rock.spinAxis,
          spinRate: rock.spinRate,
          scale: rock.scale,
          rotation: rock.rotation,
        });
        rocks.splice(index, 1);
        continue;
      }
      let density = rock.cachedDensity ?? 1;
      if (
        !rock.ignoreDensity &&
        (
          rock.cachedDensity === undefined ||
          (asteroidFrame + rock.densityPhase) % densityUpdateInterval === 0
        )
      ) {
        scratchWorldPosition.copyFrom(renderCenter).addInPlace(position);
        density = sampleDensityAtWorld(field, scratchWorldPosition, fieldCenter);
        rock.cachedDensity = density;
      }
      if (!rock.ignoreDensity && density < densityThreshold) {
        continue;
      }
      const distanceFade = 1 - smoothstep(fadeStart, fadeEnd, position.length());
      const densityFade = rock.ignoreDensity
        ? 1
        : smoothstep(
            densityThreshold,
            densityThreshold + densityFadeWidth,
            density,
          );
      const birthFade = smoothstep(0, transitionSeconds, rock.age);
      const fade = clamp01(distanceFade * densityFade * birthFade);
      if (fade <= 0.015) continue;
      const rotation = rock.rotation.multiply(
        B.Quaternion.RotationAxis(
          rock.spinAxis,
          simulationTime * rock.spinRate,
        ),
      );
      const fadedScale = rock.scale.scale(lerp(0.72, 1, fade));
      pushInstance(
        matrices[rock.material],
        colors[rock.material],
        position,
        fadedScale,
        rotation,
        fade,
      );
    }
    for (let index = retiringRocks.length - 1; index >= 0; index -= 1) {
      const rock = retiringRocks[index];
      rock.age += seconds;
      if (rock.age >= transitionSeconds) {
        retiringRocks.splice(index, 1);
        continue;
      }
      const position = rock.position.clone();
      const distanceFade = 1 - smoothstep(fadeStart, fadeEnd, position.length());
      const deathFade = 1 - smoothstep(0, transitionSeconds, rock.age);
      const fade = clamp01(distanceFade * deathFade);
      if (fade <= 0.015) continue;
      const rotation = rock.rotation.multiply(
        B.Quaternion.RotationAxis(
          rock.spinAxis,
          simulationTime * rock.spinRate,
        ),
      );
      const fadedScale = rock.scale.scale(lerp(0.72, 1, fade));
      pushInstance(
        matrices[rock.material],
        colors[rock.material],
        position,
        fadedScale,
        rotation,
        fade,
      );
    }
    groups.forEach((mesh, index) =>
      applyInstanceBuffers(mesh, matrices[index], colors[index]),
    );
    visibleRockInstances = matrices.reduce(
      (sum, matrixSet) => sum + matrixSet.length / 16,
      0,
    );
  }

  function getRockPositionToRef(rock, target) {
    target.copyFrom(rock.relativeVelocity);
    target.scaleInPlace(rock.age);
    target.addInPlace(rock.base);
    return target;
  }

  function createRelativeOrbitalVelocity(random) {
    if (random() < coOrbitFraction) {
      const speed = lerp(
        relativeDriftSpeed * 0.18,
        relativeDriftSpeed,
        random() ** 1.8,
      );
      const shearDirection = random() < 0.5 ? -1 : 1;
      return flowDirection
        .scale(speed * shearDirection)
        .addInPlace(orbitRadial.scale(speed * lerp(-0.12, 0.12, random())))
        .addInPlace(orbitNormal.scale(speed * lerp(-0.08, 0.08, random())));
    }

    const speed = lerp(fastDriftSpeed * 0.45, fastDriftSpeed, random() ** 0.75);
    const shearDirection = random() < 0.5 ? -1 : 1;

    // Local Hill-frame approximation: small semi-major-axis differences show up
    // as steady tangential Kepler shear, while more eccentric/inclined fragments
    // cross the observer's path with stronger radial and vertical components.
    // No sinusoidal reversal, so rocks drift like real neighboring orbits
    // instead of bobbing back and forth.
    return flowDirection
      .scale(speed * shearDirection)
      .addInPlace(orbitRadial.scale(speed * lerp(-0.65, 0.65, random())))
      .addInPlace(orbitNormal.scale(speed * lerp(-0.42, 0.42, random())));
  }
}

function createClumps(
  random,
  count,
  radius,
  interceptCount,
  interceptDistance,
) {
  const clumps = [];
  for (let index = 0; index < interceptCount; index += 1) {
    clumps.push(
      randomDirection(random).scale(
        lerp(interceptDistance[0], interceptDistance[1], random()),
      ),
    );
  }
  for (let index = 0; index < count; index += 1) {
    clumps.push(randomPointInSphere(random, radius));
  }
  return clumps;
}

function createRockGroups(scene, field, runtimeSeed) {
  const families = [
    {
      name: "carbonaceous",
      color: [0.055, 0.052, 0.047],
      highlight: [0.18, 0.17, 0.15],
      metallic: 0.015,
      weight: 0.46,
    },
    {
      name: "basalt",
      color: [0.09, 0.083, 0.074],
      highlight: [0.25, 0.23, 0.2],
      metallic: 0.025,
      weight: 0.28,
    },
    {
      name: "silicate",
      color: [0.18, 0.15, 0.12],
      highlight: [0.44, 0.39, 0.32],
      metallic: 0.035,
      weight: 0.18,
    },
    {
      name: "fractured",
      color: [0.32, 0.3, 0.25],
      highlight: [0.72, 0.68, 0.58],
      metallic: 0.08,
      weight: 0.08,
    },
  ];
  const variantsPerFamily = field.rockVariantsPerFamily ?? 3;
  const groups = [];
  for (const family of families) {
    for (let variant = 0; variant < variantsPerFamily; variant += 1) {
      groups.push(
        createRockGroup(
          scene,
          field,
          `${family.name}-${variant + 1}`,
          family,
          hashString(`${field.seed}:${runtimeSeed}:${family.name}:${variant}`),
        ),
      );
    }
  }
  groups.pick = (random) => pickWeightedRockGroup(groups, families, variantsPerFamily, random);
  return groups;
}

function createRockGroup(scene, field, name, family, seed) {
  const mesh = B.MeshBuilder.CreateIcoSphere(
    `${field.id}-${name}`,
    {
      radius: 1,
      subdivisions: field.rockMeshSubdivisions ?? 5,
      flat: false,
      updatable: true,
    },
    scene,
  );
  sculptAsteroidMesh(mesh, seed);
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.useVertexColors = true;
  mesh.hasVertexAlpha = true;

  const textures = createRockTextures(
    scene,
    `${field.id}-${name}`,
    family,
    seed,
  );
  const textureRandom = createRandom(seed ^ 0x51ed270b);
  const textureTiling = field.rockTextureTiling ?? 3.25;
  const textureUScale = textureTiling * lerp(0.86, 1.18, textureRandom());
  const textureVScale = textureTiling * lerp(0.9, 1.14, textureRandom());
  for (const texture of [textures.albedo, textures.normal]) {
    texture.uScale = textureUScale;
    texture.vScale = textureVScale;
  }
  const material = new B.StandardMaterial(
    `${field.id}-${name}-material`,
    scene,
  );
  material.diffuseColor = B.Color3.FromArray(family.color);
  material.diffuseTexture = textures.albedo;
  material.bumpTexture = textures.normal;
  material.bumpTexture.level = field.rockNormalStrength ?? 1.35;
  material.invertNormalMapY = true;
  material.useParallax = field.rockUseParallax ?? false;
  material.useParallaxOcclusion =
    material.useParallax && (field.rockUseParallaxOcclusion ?? false);
  material.parallaxScaleBias = material.useParallax
    ? field.rockParallaxScaleBias ?? 0.018
    : 0;
  material.specularColor = new B.Color3(
    0.014 + family.metallic * 0.22,
    0.013 + family.metallic * 0.16,
    0.012 + family.metallic * 0.1,
  );
  material.specularPower = 42;
  material.ambientColor = new B.Color3(0.0025, 0.0023, 0.002);
  material.maxSimultaneousLights = 2;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  material.alphaMode = B.Engine.ALPHA_COMBINE;
  material.needDepthPrePass = true;
  mesh.material = material;
  return mesh;
}

function sculptAsteroidMesh(mesh, seed) {
  const positions = mesh.getVerticesData(B.VertexBuffer.PositionKind);
  const normals = mesh.getVerticesData(B.VertexBuffer.NormalKind);
  const indices = mesh.getIndices();
  if (!positions || !normals || !indices) return;

  const random = createRandom(seed);
  const axisA = randomDirection(random);
  const axisB = randomDirection(random);
  const axisC = randomDirection(random);
  const axisD = randomDirection(random);
  const craterCount = 16 + Math.floor(random() * 18);
  const craters = Array.from({ length: craterCount }, () => ({
    direction: randomDirection(random),
    radius: lerp(0.08, 0.38, random() ** 1.35),
    depth: lerp(0.025, 0.16, random()),
    rim: lerp(0.015, 0.065, random()),
  }));
  const chips = Array.from({ length: 5 + Math.floor(random() * 7) }, () => ({
    normal: randomDirection(random),
    offset: lerp(0.42, 0.86, random()),
    strength: lerp(0.05, 0.18, random()),
  }));

  for (let index = 0; index < positions.length; index += 3) {
    const direction = new B.Vector3(
      positions[index],
      positions[index + 1],
      positions[index + 2],
    ).normalize();
    const facets =
      Math.abs(B.Vector3.Dot(direction, axisA)) * 0.17 +
      Math.abs(B.Vector3.Dot(direction, axisB)) * 0.13 +
      Math.abs(B.Vector3.Dot(direction, axisC)) * 0.1 +
      Math.abs(B.Vector3.Dot(direction, axisD)) * 0.07;
    const ridged =
      ridgedNoise(direction.x * 2.5 + seed * 0.001, direction.y * 2.5, direction.z * 2.5) * 0.18 +
      ridgedNoise(direction.x * 7.4, direction.y * 7.4 + seed * 0.002, direction.z * 7.4) * 0.1 +
      valueNoise3D(direction.x * 18.0, direction.y * 18.0, direction.z * 18.0 + seed) * 0.045;
    let amount = 0.78 + facets + ridged;
    for (const chip of chips) {
      const cut = B.Vector3.Dot(direction, chip.normal) - chip.offset;
      if (cut > 0) {
        amount -= smoothstep(0, 0.22, cut) * chip.strength;
      }
    }
    for (const crater of craters) {
      const angularDistance = Math.acos(clamp(B.Vector3.Dot(direction, crater.direction), -1, 1));
      const depression = 1 - smoothstep(crater.radius * 0.3, crater.radius, angularDistance);
      const rim = smoothstep(crater.radius * 0.72, crater.radius, angularDistance) *
        (1 - smoothstep(crater.radius, crater.radius + crater.rim, angularDistance));
      amount -= depression * crater.depth;
      amount += rim * crater.depth * 0.58;
    }
    amount = clamp(amount, 0.46, 1.38);
    positions[index] = direction.x * amount;
    positions[index + 1] = direction.y * amount;
    positions[index + 2] = direction.z * amount;
  }
  smoothAsteroidNormals(positions, normals, seed);
  mesh.updateVerticesData(B.VertexBuffer.PositionKind, positions);
  mesh.updateVerticesData(B.VertexBuffer.NormalKind, normals);
}

function smoothAsteroidNormals(positions, normals, seed) {
  for (let index = 0; index < positions.length; index += 3) {
    const direction = new B.Vector3(
      positions[index],
      positions[index + 1],
      positions[index + 2],
    ).normalize();
    const detail = new B.Vector3(
      valueNoise3D(direction.x * 11.0 + seed * 0.003, direction.y * 11.0, direction.z * 11.0) - 0.5,
      valueNoise3D(direction.x * 11.0, direction.y * 11.0 + seed * 0.004, direction.z * 11.0) - 0.5,
      valueNoise3D(direction.x * 11.0, direction.y * 11.0, direction.z * 11.0 + seed * 0.005) - 0.5,
    ).scaleInPlace(0.12);
    direction.addInPlace(detail).normalize();
    normals[index] = direction.x;
    normals[index + 1] = direction.y;
    normals[index + 2] = direction.z;
  }
}

function createRockTextures(scene, name, family, seed) {
  const size = ROCK_TEXTURE_SIZE;
  const albedo = new B.DynamicTexture(
    `${name}-albedo`,
    { width: size, height: size },
    scene,
    true,
    B.Texture.TRILINEAR_SAMPLINGMODE,
  );
  const normal = new B.DynamicTexture(
    `${name}-normal`,
    { width: size, height: size },
    scene,
    true,
    B.Texture.TRILINEAR_SAMPLINGMODE,
  );
  const albedoContext = albedo.getContext();
  const normalContext = normal.getContext();
  const albedoImage = albedoContext.createImageData(size, size);
  const normalImage = normalContext.createImageData(size, size);
  const heights = new Float32Array(size * size);
  const random = createRandom(seed ^ 0x9e3779b9);
  const veinCount = 4 + Math.floor(random() * 7);
  const veins = Array.from({ length: veinCount }, () => ({
    angle: random() * Math.PI * 2,
    offset: lerp(-0.9, 0.9, random()),
    width: lerp(0.008, 0.026, random()),
    strength: lerp(0.08, 0.34, random()),
  }));
  const craterCount = 42 + Math.floor(random() * 44);
  const craters = Array.from({ length: craterCount }, () => ({
    u: random(),
    v: random(),
    radius: lerp(0.012, 0.075, random() ** 1.85),
    depth: lerp(0.05, 0.36, random() ** 0.65),
    rim: lerp(0.12, 0.34, random()),
  }));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const nx = u * 10.5;
      const ny = v * 10.5;
      const grain =
        valueNoise3D(nx, ny, seed * 0.017) * 0.48 +
        valueNoise3D(nx * 2.9 + 19.7, ny * 2.9, seed * 0.031) * 0.28 +
        ridgedNoise(nx * 6.4, ny * 6.4, seed * 0.011) * 0.24;
      const pebble =
        ridgedNoise(nx * 22.0 + 4.0, ny * 22.0 - 8.0, seed * 0.023) * 0.65 +
        valueNoise3D(nx * 48.0, ny * 48.0, seed * 0.037) * 0.35;
      const pits = ridgedNoise(nx * 18.0 + 4.0, ny * 18.0 - 8.0, seed * 0.023);
      let brightMineral = 0;
      let fractureDark = 0;
      for (const vein of veins) {
        const line =
          Math.cos(vein.angle) * (u - 0.5) +
          Math.sin(vein.angle) * (v - 0.5) -
          vein.offset * 0.35;
        const veinNoise = valueNoise3D(nx * 1.2, ny * 1.2, seed + vein.offset * 31);
        brightMineral +=
          (1 - smoothstep(0, vein.width, Math.abs(line + (veinNoise - 0.5) * 0.12))) *
          vein.strength;
        fractureDark +=
          (1 - smoothstep(vein.width * 0.45, vein.width * 2.2, Math.abs(line + (veinNoise - 0.5) * 0.08))) *
          vein.strength *
          0.46;
      }
      let craterShadow = 0;
      let craterRim = 0;
      let craterHeight = 0;
      for (const crater of craters) {
        const dx = wrappedDelta(u, crater.u);
        const dy = wrappedDelta(v, crater.v);
        const distance = Math.hypot(dx, dy);
        if (distance > crater.radius * (1 + crater.rim)) continue;
        const normalized = distance / Math.max(crater.radius, 0.0001);
        const bowl =
          (1 - smoothstep(0.15, 1.0, normalized)) *
          crater.depth;
        const rim =
          smoothstep(0.74, 1.0, normalized) *
          (1 - smoothstep(1.0, 1.0 + crater.rim, normalized)) *
          crater.depth *
          0.52;
        craterShadow += bowl * 0.72;
        craterRim += rim * 0.46;
        craterHeight += rim - bowl;
      }
      const fleck = valueNoise3D(nx * 42.0, ny * 42.0, seed * 0.07) > 0.952 ? 0.48 : 0;
      const shadowPits = Math.pow(clamp01(1 - pits), 3.0) * 0.2;
      const amount = clamp01(
        0.42 +
          grain * 0.42 +
          pebble * 0.16 +
          brightMineral +
          fleck +
          craterRim -
          craterShadow -
          shadowPits -
          fractureDark,
      );
      const warmShift = valueNoise3D(nx * 1.6 + 88.0, ny * 1.6, seed * 0.041);
      const base = family.color;
      const highlight = family.highlight;
      const color = [
        lerp(base[0], highlight[0], amount) * lerp(0.82, 1.12, warmShift),
        lerp(base[1], highlight[1], amount) * lerp(0.84, 1.08, warmShift),
        lerp(base[2], highlight[2], amount) * lerp(0.88, 1.04, warmShift),
      ];
      const offset = (y * size + x) * 4;
      albedoImage.data[offset] = Math.round(clamp01(color[0]) * 255);
      albedoImage.data[offset + 1] = Math.round(clamp01(color[1]) * 255);
      albedoImage.data[offset + 2] = Math.round(clamp01(color[2]) * 255);
      albedoImage.data[offset + 3] = 255;
      heights[y * size + x] =
        grain * 0.22 +
        pebble * 0.08 +
        brightMineral * 0.06 -
        fractureDark * 0.05 +
        craterHeight;
    }
  }

  let minimumHeight = Infinity;
  let maximumHeight = -Infinity;
  for (const height of heights) {
    minimumHeight = Math.min(minimumHeight, height);
    maximumHeight = Math.max(maximumHeight, height);
  }
  const heightRange = Math.max(maximumHeight - minimumHeight, 0.0001);
  const normalStrength = 8.5;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = heights[y * size + ((x - 1 + size) % size)];
      const right = heights[y * size + ((x + 1) % size)];
      const up = heights[((y - 1 + size) % size) * size + x];
      const down = heights[((y + 1) % size) * size + x];
      const dx = (right - left) * normalStrength;
      const dy = (down - up) * normalStrength;
      const length = Math.hypot(dx, dy, 1);
      const offset = (y * size + x) * 4;
      normalImage.data[offset] = Math.round((-dx / length * 0.5 + 0.5) * 255);
      normalImage.data[offset + 1] = Math.round((dy / length * 0.5 + 0.5) * 255);
      normalImage.data[offset + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      normalImage.data[offset + 3] = Math.round(
        clamp01((heights[y * size + x] - minimumHeight) / heightRange) * 255,
      );
    }
  }

  albedoContext.putImageData(albedoImage, 0, 0);
  normalContext.putImageData(normalImage, 0, 0);
  albedo.update();
  normal.update();
  normal.gammaSpace = false;
  for (const texture of [albedo, normal]) {
    texture.wrapU = B.Texture.WRAP_ADDRESSMODE;
    texture.wrapV = B.Texture.WRAP_ADDRESSMODE;
    texture.anisotropicFilteringLevel = 4;
  }
  return { albedo, normal };
}

function createFragmentLight(scene, field, occluder, rocks) {
  if (!field.allowRockLight) return null;

  const intensity = field.rockLightIntensity ?? 0;
  if (intensity <= 0) return null;

  const position = occluder?.position ?? [0, 0, 0];
  const light = new B.PointLight(
    `${field.id}-reflected-light`,
    B.Vector3.FromArray(position),
    scene,
  );
  light.diffuse = new B.Color3(1, 0.46, 0.18);
  light.specular = new B.Color3(1, 0.62, 0.3);
  light.intensity = intensity;
  light.range = field.radius * 1.65;
  light.radius = occluder ? occluder.radius * occluder.scale : 30;
  light.falloffType = B.Light.FALLOFF_STANDARD;
  light.includedOnlyMeshes = rocks;
  return light;
}

function pushInstance(matrixTarget, colorTarget, position, scale, rotation, alpha) {
  const matrix = B.Matrix.Compose(scale, rotation, position);
  matrix.copyToArray(matrixTarget, matrixTarget.length);
  colorTarget.push(1, 1, 1, clamp01(alpha));
}

function applyMatrices(mesh, matrices) {
  applyInstanceBuffers(mesh, matrices, []);
}

function applyInstanceBuffers(mesh, matrices, colors) {
  const hasInstances = matrices.length > 0;
  const matrixBuffer = hasInstances
    ? new Float32Array(matrices)
    : createHiddenInstanceMatrix();
  const colorBuffer = hasInstances
    ? new Float32Array(colors)
    : new Float32Array([1, 1, 1, 0]);

  mesh.thinInstanceSetBuffer(
    "matrix",
    matrixBuffer,
    16,
    true,
  );
  mesh.thinInstanceSetBuffer(
    "color",
    colorBuffer,
    4,
    true,
  );
  mesh.thinInstanceRefreshBoundingInfo(true);
}

function createHiddenInstanceMatrix() {
  const matrix = B.Matrix.Compose(
    new B.Vector3(0.0001, 0.0001, 0.0001),
    B.Quaternion.Identity(),
    new B.Vector3(0, -100000, 0),
  );
  const values = [];
  matrix.copyToArray(values, 0);
  return new Float32Array(values);
}

function sampleDensityAtWorld(field, world, fieldCenter) {
  const local = world.subtract(fieldCenter).scale(1 / field.radius);
  if (local.lengthSquared() > 1) return 0;
  return sampleNebulaDensity(field, local.x, local.y, local.z);
}

function randomPointInSphere(random, radius) {
  return randomDirection(random).scale(radius * random() ** (1 / 3));
}

function wrappedDelta(value, center) {
  let delta = value - center;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return delta;
}

function wrapVectorInSphere(position, radius) {
  const diameter = radius * 2;
  for (const axis of ["x", "y", "z"]) {
    if (position[axis] > radius) position[axis] -= diameter;
    if (position[axis] < -radius) position[axis] += diameter;
  }
  if (position.lengthSquared() > radius * radius) {
    position.normalize().scaleInPlace(radius * 0.98);
  }
}

function makeCellKey(position, cellSize) {
  return [
    Math.floor(position.x / cellSize),
    Math.floor(position.y / cellSize),
    Math.floor(position.z / cellSize),
  ].join(":");
}

function createRuntimeSeed() {
  const cryptoValues = new Uint32Array(2);
  globalThis.crypto?.getRandomValues?.(cryptoValues);
  return [
    Date.now().toString(36),
    Math.floor(Math.random() * 0xffffffff).toString(36),
    cryptoValues[0].toString(36),
    cryptoValues[1].toString(36),
  ].join(":");
}

function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickWeightedRockGroup(groups, families, variantsPerFamily, random) {
  const value = random();
  let total = 0;
  for (let familyIndex = 0; familyIndex < families.length; familyIndex += 1) {
    total += families[familyIndex].weight;
    if (value <= total) {
      return familyIndex * variantsPerFamily +
        Math.floor(random() * variantsPerFamily);
    }
  }
  return Math.max(groups.length - 1, 0);
}

function profile(scene, name, fn) {
  return scene.metadata?.profiler?.measure(name, fn) ?? fn();
}

function randomDirection(random) {
  const y = random() * 2 - 1;
  const angle = random() * Math.PI * 2;
  const ring = Math.sqrt(1 - y * y);
  return new B.Vector3(
    ring * Math.cos(angle),
    y,
    ring * Math.sin(angle),
  );
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function valueNoise3D(x, y, z) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = smoothNoiseFraction(x - xi);
  const yf = smoothNoiseFraction(y - yi);
  const zf = smoothNoiseFraction(z - zi);

  const x00 = lerp(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), xf);
  const x10 = lerp(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), xf);
  const x01 = lerp(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), xf);
  const x11 = lerp(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), xf);
  return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf);
}

function ridgedNoise(x, y, z) {
  return 1 - Math.abs(valueNoise3D(x, y, z) * 2 - 1);
}

function hash3(x, y, z) {
  let hash = 2166136261;
  hash ^= x | 0;
  hash = Math.imul(hash, 16777619);
  hash ^= y | 0;
  hash = Math.imul(hash, 16777619);
  hash ^= z | 0;
  hash = Math.imul(hash, 16777619);
  return (hash >>> 0) / 4294967295;
}

function smoothNoiseFraction(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function smoothstep(edge0, edge1, value) {
  const amount = clamp01((value - edge0) / Math.max(edge1 - edge0, 0.0001));
  return amount * amount * (3 - 2 * amount);
}
