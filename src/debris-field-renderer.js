import { createNebula, sampleNebulaDensity } from "./nebula-renderer.js";
import { addPolySurfaceHologram } from "./poly-surface-hologram.js";

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
  const fabricatorSizedFragmentFraction = clamp01(
    field.fabricatorSizedFragmentFraction ?? 0,
  );
  const fabricatorMaxAsteroidRadius = field.fabricatorMaxAsteroidRadius ?? 0.11;
  const fabricatorMaxSizeMeters =
    (fabricatorMaxAsteroidRadius * metersPerWorldUnit * 3.5) / 1.55;
  const fabricatorFragmentSizes =
    field.fabricatorSizedFragmentSizeMeters ??
    [
      Math.max(0.35, fabricatorMaxSizeMeters * 0.28),
      Math.max(0.36, fabricatorMaxSizeMeters * 0.92),
    ];
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
  const opaqueRockFade = field.rockOpaqueFade ?? true;
  const fadeMinScale = opaqueRockFade ? (field.rockFadeMinScale ?? 0.12) : 0.72;
  const fieldCenter = B.Vector3.FromArray(field.position);
  const renderCenter = B.Vector3.Zero();
  const flowDirection = B.Vector3.Zero();
  const orbitRadial = B.Vector3.Zero();
  const orbitNormal = B.Vector3.Up();
  const scratchRockPosition = B.Vector3.Zero();
  const scratchWorldPosition = B.Vector3.Zero();
  let centerProvider = () => scene.activeCamera.globalPosition;
  let flowProvider = () => B.Axis.Z;
  let playerCollisionProvider = null;
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

      resolveRocksAgainstPlayer(seconds);
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
  root.setPlayerCollisionSource = (provider) => {
    playerCollisionProvider = typeof provider === "function" ? provider : null;
  };
  root.findAsteroidAlongRay = (ray, range = 2.8) =>
    findAsteroidAlongRay(ray, range);
  root.extractAsteroidsInSphere = (worldCenter, range, limit = 16) =>
    extractAsteroidsInSphere(worldCenter, range, limit);
  root.resolvePlayerCollisions = (seconds = 0) =>
    resolveRocksAgainstPlayer(seconds);
  root.takeAsteroid = (candidate) => takeAsteroid(candidate);

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

      const size = selectRockSize(random);
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
    const composition = createAsteroidComposition(random, sizeMeters, fragmentSizes);
    const color = createAsteroidCompositionColor(composition, random);
    rocks.push({
      material: options.material ?? groups.pick(random),
      composition,
      color,
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

  function selectRockSize(random) {
    if (random() < fabricatorSizedFragmentFraction) {
      const minSize = Math.min(
        fabricatorFragmentSizes[0] ?? 0.35,
        fabricatorMaxSizeMeters * 0.92,
      );
      const maxSize = Math.min(
        fabricatorFragmentSizes[1] ?? fabricatorMaxSizeMeters * 0.92,
        fabricatorMaxSizeMeters * 0.98,
      );
      return lerp(
        Math.max(0.1, minSize),
        Math.max(0.11, maxSize),
        random() ** 1.2,
      );
    }

    return lerp(fragmentSizes[0], fragmentSizes[1], random() ** 2);
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
        composition: rock.composition,
        color: rock.color,
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
        if ((rock.playerCollisionGraceSeconds ?? 0) <= 0) {
          rocks.splice(index, 1);
          continue;
        }
      }
      rock.playerCollisionGraceSeconds = Math.max(
        0,
        (rock.playerCollisionGraceSeconds ?? 0) - seconds,
      );
      if (position.lengthSquared() > renderDistance * renderDistance) {
        retiringRocks.push({
          material: rock.material,
          composition: rock.composition,
          color: rock.color,
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
      const rotation = getRockDisplayRotation(rock);
      const fadedScale = rock.scale.scale(lerp(fadeMinScale, 1, fade));
      pushInstance(
        matrices[rock.material],
        colors[rock.material],
        position,
        fadedScale,
        rotation,
        rock.color,
        opaqueRockFade ? 1 : fade,
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
      const fadedScale = rock.scale.scale(lerp(fadeMinScale, 1, fade));
      pushInstance(
        matrices[rock.material],
        colors[rock.material],
        position,
        fadedScale,
        rotation,
        rock.color,
        opaqueRockFade ? 1 : fade,
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

  function pushRockOutsideShipGraceBubble(rock, position) {
    if (shipGraceRadius <= 0) return;

    const minDistance = shipGraceRadius + rock.radius + 0.02;
    const distance = position.length();
    if (distance >= minDistance) return;

    let direction;
    if (distance > 0.0001) {
      direction = position.scale(1 / distance);
    } else if (flowDirection.lengthSquared() > 0.0001) {
      direction = flowDirection.clone().normalize();
    } else {
      direction = B.Axis.Z.clone();
    }

    position.copyFrom(direction.scale(minDistance));
    setRockBaseFromCurrentPosition(rock, position);
  }

  function setRockBaseFromCurrentPosition(rock, position) {
    rock.base.copyFrom(position);
    if (rock.age > 0) {
      rock.base.subtractInPlace(rock.relativeVelocity.scale(rock.age));
    }
  }

  function getRockPositionToRef(rock, target) {
    target.copyFrom(rock.relativeVelocity);
    target.scaleInPlace(rock.age);
    target.addInPlace(rock.base);
    return target;
  }

  function getRockDisplayRotation(rock) {
    return rock.rotation.multiply(
      B.Quaternion.RotationAxis(
        rock.spinAxis,
        simulationTime * rock.spinRate,
      ),
    );
  }

  function resolveRocksAgainstPlayer(seconds) {
    const source = playerCollisionProvider?.();
    if (!source?.capsuleStart || !source?.capsuleEnd) return;
    if (!Number.isFinite(source.radius)) return;

    const playerRadius = Math.max(0, source.radius);
    const skin = Math.max(0, source.skin ?? 0.01);
    const minRockRadius = Math.max(0, source.minRockRadius ?? 0);
    const playerPushFraction = clamp01(source.playerPushFraction ?? 0.7);
    const worldToLocal =
      source.worldToLocal ?? ((point) => point.subtract(renderCenter));
    const localToWorldVector =
      source.localToWorldVector ?? ((vector) => vector.clone());
    const capsuleStart = worldToLocal(source.capsuleStart);
    const capsuleEnd = worldToLocal(source.capsuleEnd);
    const capsuleDelta = capsuleEnd.subtract(capsuleStart);
    const capsuleLengthSquared = capsuleDelta.lengthSquared();

    for (const rock of rocks) {
      const position = getRockPositionToRef(rock, scratchRockPosition);
      const closest = getClosestPointOnSegmentToRef(
        position,
        capsuleStart,
        capsuleDelta,
        capsuleLengthSquared,
        scratchWorldPosition,
      );
      const delta = closest.subtract(position);
      const distance = delta.length();
      const normal = distance > 0.000001
        ? delta.scale(1 / distance)
        : B.Axis.Z.clone();
      const rockRadius = Math.max(rock.radius, minRockRadius);
      const minDistance = rockRadius + playerRadius + skin;
      const penetration = minDistance - distance;
      if (penetration <= 0) continue;

      const playerPush = normal.scale(penetration * playerPushFraction);
      const rockPush = normal.scale(-penetration * (1 - playerPushFraction));
      source.applyCorrection?.(localToWorldVector(playerPush), normal.clone());
      position.addInPlace(rockPush);
      setRockBaseFromCurrentPosition(rock, position);
      rock.playerCollisionGraceSeconds = Math.max(
        rock.playerCollisionGraceSeconds ?? 0,
        1.5,
      );

      const velocityDelta = normal.scale(
        Math.min(penetration / Math.max(seconds, 0.016), 1.2) * -0.18,
      );
      rock.relativeVelocity.addInPlace(velocityDelta);
    }
  }

  function getClosestPointOnSegmentToRef(
    point,
    start,
    delta,
    lengthSquared,
    target,
  ) {
    if (lengthSquared <= 0.000001) return target.copyFrom(start);

    const amount = clamp(
      B.Vector3.Dot(point.subtract(start), delta) / lengthSquared,
      0,
      1,
    );
    return target.copyFrom(start).addInPlace(delta.scale(amount));
  }

  function findAsteroidAlongRay(ray, range = 2.8) {
    if (!ray || !rocks.length) return null;

    const direction = ray.direction.clone();
    if (direction.lengthSquared() <= 0.000001) return null;
    direction.normalize();

    const origin = ray.origin.subtract(renderCenter);
    const maxDistance = Math.min(range, ray.length ?? range);
    let closest = null;
    for (const rock of rocks) {
      const position = getRockPositionToRef(rock, scratchRockPosition);
      const pickRadius = Math.max(rock.radius, field.rockPickupRadius ?? 0.22);
      const distance = intersectRaySphereDistance(
        origin,
        direction,
        position,
        pickRadius,
        maxDistance,
      );
      if (distance === null) continue;
      if (!closest || distance < closest.distance) {
        closest = {
          rock,
          distance,
          position: position.clone(),
        };
      }
    }
    return closest;
  }

  function takeAsteroid(candidate) {
    const rock = candidate?.rock;
    const index = rocks.indexOf(rock);
    if (index === -1) return null;

    return extractAsteroidAtIndex(index);
  }

  function extractAsteroidsInSphere(worldCenter, range, limit = 16) {
    if (!worldCenter || range <= 0 || limit <= 0) return [];

    const localCenter = worldCenter.subtract(renderCenter);
    const extracted = [];
    for (
      let index = rocks.length - 1;
      index >= 0 && extracted.length < limit;
      index -= 1
    ) {
      const rock = rocks[index];
      const position = getRockPositionToRef(rock, scratchRockPosition);
      const activationRadius = Math.max(rock.radius, field.rockPickupRadius ?? 0.22);
      const maxDistance = range + activationRadius;
      if (position.subtract(localCenter).lengthSquared() > maxDistance * maxDistance) {
        continue;
      }

      extracted.push(extractAsteroidAtIndex(index));
    }
    return extracted;
  }

  function extractAsteroidAtIndex(index) {
    const rock = rocks[index];
    const position = getRockPositionToRef(rock, scratchRockPosition).clone();
    const displayRotation = getRockDisplayRotation(rock).clone();
    rocks.splice(index, 1);
    return {
      sourceMesh: groups[rock.material],
      composition: rock.composition,
      color: rock.color,
      position: renderCenter.add(position),
      scale: rock.scale.clone(),
      rotation: displayRotation,
      radius: rock.radius,
      velocity: rock.relativeVelocity.clone(),
      angularVelocity: rock.spinAxis.scale(rock.spinRate),
    };
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

function intersectRaySphereDistance(
  origin,
  direction,
  center,
  radius,
  maxDistance,
) {
  const toCenter = center.subtract(origin);
  const projected = B.Vector3.Dot(toCenter, direction);
  if (projected < 0 || projected > maxDistance) return null;

  const closestDistanceSquared =
    toCenter.lengthSquared() - projected * projected;
  const radiusSquared = radius * radius;
  if (closestDistanceSquared > radiusSquared) return null;

  const halfChord = Math.sqrt(
    Math.max(radiusSquared - closestDistanceSquared, 0),
  );
  const hitDistance = Math.max(0, projected - halfChord);
  return hitDistance <= maxDistance ? hitDistance : null;
}

function createRockGroups(scene, field, runtimeSeed) {
  const families = [
    {
      name: "carbonaceous",
      color: [0.28, 0.27, 0.24],
      highlight: [0.58, 0.56, 0.5],
      metallic: 0.015,
      weight: 0.46,
    },
    {
      name: "basalt",
      color: [0.34, 0.33, 0.3],
      highlight: [0.66, 0.64, 0.58],
      metallic: 0.025,
      weight: 0.28,
    },
    {
      name: "silicate",
      color: [0.42, 0.405, 0.36],
      highlight: [0.78, 0.755, 0.68],
      metallic: 0.035,
      weight: 0.18,
    },
    {
      name: "fractured",
      color: [0.5, 0.48, 0.42],
      highlight: [0.9, 0.86, 0.76],
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
  mesh.hasVertexAlpha = !(field.rockOpaqueFade ?? true);

  const textures = createRockTextures(
    scene,
    `${field.id}-${name}`,
    seed,
    field,
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
  material.diffuseColor = B.Color3.White();
  material.diffuseTexture = textures.albedo;
  material.bumpTexture = textures.normal;
  material.bumpTexture.level = field.rockNormalStrength ?? 2.15;
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
  material.specularPower = field.rockSpecularPower ?? 18;
  const ambientLift = field.rockAmbientLift ?? 0.028;
  material.ambientColor = new B.Color3(
    ambientLift,
    ambientLift * 0.92,
    ambientLift * 0.78,
  );
  material.maxSimultaneousLights = 2;
  if (field.rockOpaqueFade ?? true) {
    material.transparencyMode = B.Material.MATERIAL_OPAQUE;
    material.alphaMode = B.Engine.ALPHA_DISABLE;
    material.needDepthPrePass = false;
    material.forceDepthWrite = true;
    material.disableDepthWrite = false;
  } else {
    material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
    material.alphaMode = B.Engine.ALPHA_COMBINE;
    material.needDepthPrePass = true;
  }
  mesh.material = material;
  addPolySurfaceHologram(mesh, scene);
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
  const axisE = randomDirection(random);
  const axisF = randomDirection(random);
  const craterCount = 22 + Math.floor(random() * 18);
  const craters = Array.from({ length: craterCount }, () => ({
    direction: randomDirection(random),
    radius: lerp(0.045, 0.32, random() ** 1.38),
    depth: lerp(0.018, 0.125, random() ** 0.9),
    rim: lerp(0.02, 0.075, random()),
  }));
  const chips = Array.from({ length: 5 + Math.floor(random() * 7) }, () => ({
    normal: randomDirection(random),
    offset: lerp(0.54, 0.92, random()),
    strength: lerp(0.035, 0.13, random()),
    edge: lerp(0.18, 0.38, random()),
  }));
  const ridges = Array.from({ length: 5 + Math.floor(random() * 6) }, () => ({
    normal: randomDirection(random),
    offset: lerp(-0.42, 0.42, random()),
    width: lerp(0.05, 0.16, random()),
    height: lerp(0.008, 0.032, random()),
  }));

  for (let index = 0; index < positions.length; index += 3) {
    const direction = new B.Vector3(
      positions[index],
      positions[index + 1],
      positions[index + 2],
    ).normalize();
    const facets =
      Math.pow(Math.abs(B.Vector3.Dot(direction, axisA)), 1.45) * 0.13 +
      Math.pow(Math.abs(B.Vector3.Dot(direction, axisB)), 1.7) * 0.105 +
      Math.pow(Math.abs(B.Vector3.Dot(direction, axisC)), 1.9) * 0.075 +
      Math.pow(Math.abs(B.Vector3.Dot(direction, axisD)), 1.3) * 0.055 -
      Math.pow(Math.abs(B.Vector3.Dot(direction, axisE)), 2.15) * 0.035 -
      Math.pow(Math.abs(B.Vector3.Dot(direction, axisF)), 1.6) * 0.025;
    const ridged =
      ridgedNoise(direction.x * 2.0 + seed * 0.001, direction.y * 2.0, direction.z * 2.0) * 0.155 +
      ridgedNoise(direction.x * 5.2, direction.y * 5.2 + seed * 0.002, direction.z * 5.2) * 0.075 +
      ridgedNoise(direction.x * 11.0 + seed * 0.004, direction.y * 11.0, direction.z * 11.0) * 0.025 +
      valueNoise3D(direction.x * 22.0, direction.y * 22.0, direction.z * 22.0 + seed) * 0.022;
    let amount = 0.82 + facets + ridged;
    for (const chip of chips) {
      const cut = B.Vector3.Dot(direction, chip.normal) - chip.offset;
      if (cut > 0) {
        amount -= smoothstep(0, chip.edge, cut) * chip.strength;
      }
    }
    for (const ridge of ridges) {
      const distance = Math.abs(B.Vector3.Dot(direction, ridge.normal) - ridge.offset);
      amount +=
        (1 - smoothstep(0, ridge.width, distance)) *
        ridge.height *
        (ridgedNoise(direction.x * 18.0, direction.y * 18.0, direction.z * 18.0 + seed) * 0.55 + 0.45);
    }
    for (const crater of craters) {
      const angularDistance = Math.acos(clamp(B.Vector3.Dot(direction, crater.direction), -1, 1));
      const depression = 1 - smoothstep(crater.radius * 0.18, crater.radius, angularDistance);
      const rim = smoothstep(crater.radius * 0.72, crater.radius, angularDistance) *
        (1 - smoothstep(crater.radius, crater.radius + crater.rim, angularDistance));
      amount -= depression * crater.depth;
      amount += rim * crater.depth * 0.34;
    }
    amount = clamp(amount, 0.58, 1.34);
    positions[index] = direction.x * amount;
    positions[index + 1] = direction.y * amount;
    positions[index + 2] = direction.z * amount;
  }
  roughAsteroidNormals(positions, normals, indices, seed);
  mesh.updateVerticesData(B.VertexBuffer.PositionKind, positions);
  mesh.updateVerticesData(B.VertexBuffer.NormalKind, normals);
}

function roughAsteroidNormals(positions, normals, indices, seed) {
  const computedNormals = new Array(normals.length).fill(0);
  B.VertexData.ComputeNormals(positions, indices, computedNormals);
  for (let index = 0; index < positions.length; index += 3) {
    const direction = new B.Vector3(
      positions[index],
      positions[index + 1],
      positions[index + 2],
    ).normalize();
    const surface = new B.Vector3(
      computedNormals[index],
      computedNormals[index + 1],
      computedNormals[index + 2],
    );
    if (surface.lengthSquared() <= 0.000001) {
      surface.copyFrom(direction);
    } else {
      surface.normalize();
    }
    const detail = new B.Vector3(
      valueNoise3D(direction.x * 17.0 + seed * 0.003, direction.y * 17.0, direction.z * 17.0) - 0.5,
      valueNoise3D(direction.x * 17.0, direction.y * 17.0 + seed * 0.004, direction.z * 17.0) - 0.5,
      valueNoise3D(direction.x * 17.0, direction.y * 17.0, direction.z * 17.0 + seed * 0.005) - 0.5,
    ).scaleInPlace(0.09);
    surface.scaleInPlace(0.5).addInPlace(direction.scale(0.5)).addInPlace(detail).normalize();
    normals[index] = surface.x;
    normals[index + 1] = surface.y;
    normals[index + 2] = surface.z;
  }
}

function createRockTextures(scene, name, seed, field = {}) {
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
  const colorLift = field.rockTextureColorLift ?? field.rockColorLift ?? 0.02;
  const veinCount = 5 + Math.floor(random() * 7);
  const veins = Array.from({ length: veinCount }, () => ({
    angle: random() * Math.PI * 2,
    offset: lerp(-0.9, 0.9, random()),
    width: lerp(0.006, 0.026, random()),
    strength: lerp(0.06, 0.24, random()),
  }));
  const craterCount = 64 + Math.floor(random() * 52);
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
        valueNoise3D(nx, ny, seed * 0.017) * 0.42 +
        valueNoise3D(nx * 2.9 + 19.7, ny * 2.9, seed * 0.031) * 0.25 +
        ridgedNoise(nx * 6.4, ny * 6.4, seed * 0.011) * 0.33;
      const pebble =
        ridgedNoise(nx * 22.0 + 4.0, ny * 22.0 - 8.0, seed * 0.023) * 0.38 +
        ridgedNoise(nx * 46.0 - 13.0, ny * 46.0 + 3.0, seed * 0.029) * 0.34 +
        valueNoise3D(nx * 92.0, ny * 92.0, seed * 0.037) * 0.28;
      const pits = ridgedNoise(nx * 18.0 + 4.0, ny * 18.0 - 8.0, seed * 0.023);
      const powder =
        valueNoise3D(nx * 130.0, ny * 130.0, seed * 0.041) * 0.5 +
        valueNoise3D(nx * 215.0 + 7.0, ny * 215.0 - 3.0, seed * 0.053) * 0.5;
      const microPits = Math.pow(
        clamp01(1 - ridgedNoise(nx * 74.0, ny * 74.0, seed * 0.061)),
        5.0,
      );
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
          0.64;
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
      const fleckNoise = valueNoise3D(nx * 58.0, ny * 58.0, seed * 0.07);
      const fleck = fleckNoise > 0.958 ? lerp(0.24, 0.62, fleckNoise) : 0;
      const shadowPits = Math.pow(clamp01(1 - pits), 3.0) * 0.26;
      const dustDark = microPits * 0.2 + (1 - powder) * 0.055;
      const amount = clamp01(
        0.36 +
        grain * 0.34 +
          pebble * 0.22 +
          powder * 0.16 +
          brightMineral * 0.35 +
          fleck * 0.45 +
          craterRim -
          craterShadow -
          shadowPits -
          dustDark -
          fractureDark,
      );
      const soot = clamp01(fractureDark + shadowPits + microPits * 0.55);
      const tone = lerp(0.44, 0.86, amount) + colorLift;
      const warmth = valueNoise3D(nx * 1.7 + 11.0, ny * 1.7 - 5.0, seed * 0.013);
      const color = [
        tone * lerp(0.95, 1.08, warmth) - soot * 0.075,
        tone * lerp(0.945, 1.035, warmth) - soot * 0.08,
        tone * lerp(0.91, 0.99, warmth) - soot * 0.085,
      ];
      const offset = (y * size + x) * 4;
      albedoImage.data[offset] = Math.round(clamp01(color[0]) * 255);
      albedoImage.data[offset + 1] = Math.round(clamp01(color[1]) * 255);
      albedoImage.data[offset + 2] = Math.round(clamp01(color[2]) * 255);
      albedoImage.data[offset + 3] = 255;
      heights[y * size + x] =
        grain * 0.18 +
        pebble * 0.16 +
        powder * 0.025 +
        brightMineral * 0.028 -
        fractureDark * 0.075 -
        microPits * 0.09 +
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
  const normalStrength = field.rockTextureNormalStrength ?? 10.5;
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

function createAsteroidComposition(random, sizeMeters, fragmentSizes) {
  const [minSize = 0.5, maxSize = 3] = fragmentSizes ?? [];
  const sizeRange = Math.max(maxSize - minSize, 0.0001);
  const sizeT = clamp01((sizeMeters - minSize) / sizeRange);
  const targetTotal = Math.max(1, Math.min(30, Math.round(lerp(2, 30, sizeT))));
  const weights = [
    random() ** 1.08 + 0.04,
    random() ** 1.18 + 0.04,
    random() ** 1.12 + 0.04,
  ];
  const values = [0, 0, 0];

  for (let unit = 0; unit < targetTotal; unit += 1) {
    const availableWeight = weights.reduce(
      (sum, weight, index) => sum + (values[index] < 10 ? weight : 0),
      0,
    );
    if (availableWeight <= 0) break;

    let cursor = random() * availableWeight;
    for (let index = 0; index < values.length; index += 1) {
      if (values[index] >= 10) continue;
      cursor -= weights[index];
      if (cursor <= 0) {
        values[index] += 1;
        break;
      }
    }
  }

  return {
    iron: values[0],
    copper: values[1],
    water: values[2],
  };
}

function createAsteroidCompositionColor(composition, random) {
  const normalized = normalizeAsteroidComposition(composition);
  const darkBasalt = [0.58, 0.56, 0.51];
  const warmChippedStone = [0.78, 0.75, 0.67];
  const paleRegolith = [0.9, 0.88, 0.82];
  const shade = lerp(0.88, 1.08, random());
  const soot = random() ** 3 * 0.12;
  return [
    (darkBasalt[0] * normalized.iron +
      warmChippedStone[0] * normalized.copper +
      paleRegolith[0] * normalized.water) * shade - soot,
    (darkBasalt[1] * normalized.iron +
      warmChippedStone[1] * normalized.copper +
      paleRegolith[1] * normalized.water) * shade - soot,
    (darkBasalt[2] * normalized.iron +
      warmChippedStone[2] * normalized.copper +
      paleRegolith[2] * normalized.water) * shade - soot,
  ];
}

function normalizeAsteroidComposition(composition) {
  const iron = Math.max(0, Number(composition?.iron) || 0);
  const copper = Math.max(0, Number(composition?.copper) || 0);
  const water = Math.max(0, Number(composition?.water) || 0);
  const total = iron + copper + water;
  if (total <= 0) {
    return { iron: 1 / 3, copper: 1 / 3, water: 1 / 3 };
  }
  return {
    iron: iron / total,
    copper: copper / total,
    water: water / total,
  };
}

function pushInstance(
  matrixTarget,
  colorTarget,
  position,
  scale,
  rotation,
  color,
  alpha,
) {
  const matrix = B.Matrix.Compose(scale, rotation, position);
  matrix.copyToArray(matrixTarget, matrixTarget.length);
  colorTarget.push(
    finiteColorComponent(color?.[0], 1),
    finiteColorComponent(color?.[1], 1),
    finiteColorComponent(color?.[2], 1),
    clamp01(alpha),
  );
}

function finiteColorComponent(value, fallback) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
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
  mesh.thinInstanceEnablePicking = true;
  mesh.thinInstanceSetBuffer(
    "color",
    colorBuffer,
    4,
    true,
  );
  mesh.thinInstanceRefreshBoundingInfo(true);

  const hologram = mesh.metadata?.polySurfaceHologram;
  if (hologram) {
    hologram.thinInstanceSetBuffer("matrix", matrixBuffer, 16, true);
    hologram.thinInstanceEnablePicking = true;
    hologram.thinInstanceSetBuffer("color", colorBuffer, 4, true);
    hologram.thinInstanceRefreshBoundingInfo(true);
    hologram.metadata = {
      ...(hologram.metadata ?? {}),
      hologramUsesThinInstances: true,
    };
  }
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
