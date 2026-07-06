import { createNebula, sampleNebulaDensity } from "./nebula-renderer.js";

const B = window.BABYLON;

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
  const renderDistance = field.rockRenderDistance ?? 44;
  const fragmentCount = field.nearFragmentCount ?? 2600;
  const flowSpeed = field.nearRockFlowSpeed ?? 4.2;
  const clumpCount = field.rockClumpCount ?? 9;
  const clumpRadius = field.rockClumpRadius ?? 7;
  const driftSpan = field.nearRockDriftSpan ?? clumpRadius * 0.9;
  const fadeStart = field.rockFadeStart ?? renderDistance * 0.68;
  const fadeEnd = field.rockFadeEnd ?? renderDistance * 0.98;
  const densityFadeWidth = field.rockDensityFadeWidth ?? 0.18;
  const transitionSeconds = field.rockTransitionSeconds ?? 1.2;
  const interceptClumpCount = field.interceptClumpCount ?? 4;
  const interceptDistance = field.interceptClumpDistance ?? [8, 38];
  const fieldCenter = B.Vector3.FromArray(field.position);
  const renderCenter = B.Vector3.Zero();
  const flowDirection = B.Vector3.Zero();
  let centerProvider = () => scene.activeCamera.globalPosition;
  let flowProvider = () => B.Axis.Z;
  let lastCell = "";
  let flowOffset = 0;
  let simulationTime = 0;
  const groups = createRockGroups(scene, field);
  const matrices = groups.map(() => []);
  const colors = groups.map(() => []);
  const rocks = [];
  const retiringRocks = [];

  groups.forEach((mesh, index) => {
    mesh.parent = root;
    applyMatrices(mesh, matrices[index]);
  });

  scene.onBeforeRenderObservable.add(() => {
    const timeScale = scene.metadata?.timeScale ?? 1;
    const seconds =
      Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05) * timeScale;
    simulationTime += seconds;
    const center = centerProvider();
    renderCenter.copyFrom(center);
    root.position.copyFrom(renderCenter);
    flowDirection.copyFrom(flowProvider()).normalize();
    const cell = makeCellKey(renderCenter, renderDistance * 0.38);
    if (cell !== lastCell) {
      lastCell = cell;
      regenerateRocks(cell);
    }

    flowOffset = (flowOffset + flowSpeed * seconds) % (driftSpan * 2);
    updateRockMatrices(seconds);
  });

  root.setRenderCenter = (provider) => {
    centerProvider = provider;
  };
  root.setFlowDirection = (provider) => {
    flowProvider = provider;
  };

  return root;

  function regenerateRocks(cell) {
    retireCurrentRocks();
    rocks.length = 0;
    const random = createRandom(hashString(`${field.seed}:${cell}`));
    const densityThreshold = field.rockDensityThreshold ?? 0.08;
    const clumps = createClumps(
      random,
      clumpCount,
      renderDistance * 0.86,
      interceptClumpCount,
      interceptDistance,
    );
    for (let attempt = 0; attempt < fragmentCount; attempt += 1) {
      const clump = clumps[Math.floor(random() * clumps.length)];
      const local = clump
        .add(randomPointInSphere(random, clumpRadius * lerp(0.45, 1.35, random())));
      if (local.lengthSquared() > renderDistance * renderDistance) continue;
      const world = renderCenter.add(local);
      const density = sampleDensityAtWorld(field, world, fieldCenter);
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

      const size = lerp(fragmentSizes[0], fragmentSizes[1], random() ** 2);
      const rockRadius = size / metersPerWorldUnit / 3.5;
      rocks.push({
        material: groups.pick(random),
        base: local,
        drift: random() * driftSpan * 2,
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
      });
    }
  }

  function retireCurrentRocks() {
    for (const rock of rocks) {
      const position = getRockPosition(rock);
      retiringRocks.push({
        material: rock.material,
        position,
        age: 0,
        spinAxis: rock.spinAxis,
        spinRate: rock.spinRate,
        scale: rock.scale,
        rotation: rock.rotation,
      });
    }
  }

  function updateRockMatrices(seconds) {
    for (const matrixSet of matrices) matrixSet.length = 0;
    for (const colorSet of colors) colorSet.length = 0;
    const densityThreshold = field.rockDensityThreshold ?? 0.08;
    for (const rock of rocks) {
      rock.age += seconds;
      const position = getRockPosition(rock);
      wrapVectorInSphere(position, renderDistance);
      const world = renderCenter.add(position);
      const density = sampleDensityAtWorld(field, world, fieldCenter);
      if (density < densityThreshold) {
        continue;
      }
      const distanceFade = 1 - smoothstep(fadeStart, fadeEnd, position.length());
      const densityFade = smoothstep(
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
      wrapVectorInSphere(position, renderDistance);
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
  }

  function getRockPosition(rock) {
    return rock.base.add(
      flowDirection.scale(((rock.drift + flowOffset) % (driftSpan * 2)) - driftSpan),
    );
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

function createRockGroups(scene, field) {
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
          hashString(`${field.seed}:${family.name}:${variant}`),
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
      subdivisions: field.rockMeshSubdivisions ?? 3,
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

  const material = new B.StandardMaterial(
    `${field.id}-${name}-material`,
    scene,
  );
  material.diffuseColor = B.Color3.FromArray(family.color);
  material.diffuseTexture = createRockTexture(scene, `${field.id}-${name}-texture`, family, seed);
  material.specularColor = new B.Color3(
    0.028 + family.metallic * 0.5,
    0.026 + family.metallic * 0.34,
    0.022 + family.metallic * 0.22,
  );
  material.specularPower = 18;
  material.ambientColor = new B.Color3(0.006, 0.005, 0.004);
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
  const craterCount = 8 + Math.floor(random() * 9);
  const craters = Array.from({ length: craterCount }, () => ({
    direction: randomDirection(random),
    radius: lerp(0.18, 0.42, random()),
    depth: lerp(0.06, 0.18, random()),
    rim: lerp(0.025, 0.08, random()),
  }));

  for (let index = 0; index < positions.length; index += 3) {
    const direction = new B.Vector3(
      positions[index],
      positions[index + 1],
      positions[index + 2],
    ).normalize();
    const facets =
      Math.abs(B.Vector3.Dot(direction, axisA)) * 0.13 +
      Math.abs(B.Vector3.Dot(direction, axisB)) * 0.09 +
      Math.abs(B.Vector3.Dot(direction, axisC)) * 0.07;
    const ridged =
      ridgedNoise(direction.x * 3.1 + seed * 0.001, direction.y * 3.1, direction.z * 3.1) * 0.16 +
      ridgedNoise(direction.x * 7.6, direction.y * 7.6 + seed * 0.002, direction.z * 7.6) * 0.07 +
      valueNoise3D(direction.x * 15.0, direction.y * 15.0, direction.z * 15.0 + seed) * 0.035;
    let amount = 0.82 + facets + ridged;
    for (const crater of craters) {
      const angularDistance = Math.acos(clamp(B.Vector3.Dot(direction, crater.direction), -1, 1));
      const depression = 1 - smoothstep(crater.radius * 0.3, crater.radius, angularDistance);
      const rim = smoothstep(crater.radius * 0.72, crater.radius, angularDistance) *
        (1 - smoothstep(crater.radius, crater.radius + crater.rim, angularDistance));
      amount -= depression * crater.depth;
      amount += rim * crater.depth * 0.42;
    }
    amount = clamp(amount, 0.54, 1.34);
    positions[index] = direction.x * amount;
    positions[index + 1] = direction.y * amount;
    positions[index + 2] = direction.z * amount;
  }
  B.VertexData.ComputeNormals(positions, indices, normals);
  mesh.updateVerticesData(B.VertexBuffer.PositionKind, positions);
  mesh.updateVerticesData(B.VertexBuffer.NormalKind, normals);
}

function createRockTexture(scene, name, family, seed) {
  const size = 256;
  const texture = new B.DynamicTexture(
    name,
    { width: size, height: size },
    scene,
    false,
  );
  const context = texture.getContext();
  const image = context.createImageData(size, size);
  const random = createRandom(seed ^ 0x9e3779b9);
  const veinCount = 4 + Math.floor(random() * 7);
  const veins = Array.from({ length: veinCount }, () => ({
    angle: random() * Math.PI * 2,
    offset: lerp(-0.9, 0.9, random()),
    width: lerp(0.008, 0.026, random()),
    strength: lerp(0.08, 0.34, random()),
  }));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const nx = u * 7.5;
      const ny = v * 7.5;
      const grain =
        valueNoise3D(nx, ny, seed * 0.017) * 0.58 +
        valueNoise3D(nx * 2.7 + 19.7, ny * 2.7, seed * 0.031) * 0.28 +
        ridgedNoise(nx * 5.5, ny * 5.5, seed * 0.011) * 0.14;
      const pits = ridgedNoise(nx * 12.0 + 4.0, ny * 12.0 - 8.0, seed * 0.023);
      let brightMineral = 0;
      for (const vein of veins) {
        const line =
          Math.cos(vein.angle) * (u - 0.5) +
          Math.sin(vein.angle) * (v - 0.5) -
          vein.offset * 0.35;
        const veinNoise = valueNoise3D(nx * 1.2, ny * 1.2, seed + vein.offset * 31);
        brightMineral +=
          (1 - smoothstep(0, vein.width, Math.abs(line + (veinNoise - 0.5) * 0.12))) *
          vein.strength;
      }
      const fleck = valueNoise3D(nx * 34.0, ny * 34.0, seed * 0.07) > 0.935 ? 0.42 : 0;
      const shadowPits = Math.pow(clamp01(1 - pits), 3.0) * 0.26;
      const amount = clamp01(0.52 + grain * 0.5 + brightMineral + fleck - shadowPits);
      const warmShift = valueNoise3D(nx * 1.6 + 88.0, ny * 1.6, seed * 0.041);
      const base = family.color;
      const highlight = family.highlight;
      const color = [
        lerp(base[0], highlight[0], amount) * lerp(0.82, 1.12, warmShift),
        lerp(base[1], highlight[1], amount) * lerp(0.84, 1.08, warmShift),
        lerp(base[2], highlight[2], amount) * lerp(0.88, 1.04, warmShift),
      ];
      const offset = (y * size + x) * 4;
      image.data[offset] = Math.round(clamp01(color[0]) * 255);
      image.data[offset + 1] = Math.round(clamp01(color[1]) * 255);
      image.data[offset + 2] = Math.round(clamp01(color[2]) * 255);
      image.data[offset + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  texture.update();
  return texture;
}

function createFragmentLight(scene, field, occluder, rocks) {
  const position = occluder?.position ?? [0, 0, 0];
  const light = new B.PointLight(
    `${field.id}-reflected-light`,
    B.Vector3.FromArray(position),
    scene,
  );
  light.diffuse = new B.Color3(1, 0.46, 0.18);
  light.specular = new B.Color3(1, 0.62, 0.3);
  light.intensity = field.rockLightIntensity ?? 5.5;
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
  mesh.thinInstanceSetBuffer(
    "matrix",
    new Float32Array(matrices),
    16,
    true,
  );
  mesh.thinInstanceSetBuffer(
    "color",
    new Float32Array(colors),
    4,
    true,
  );
  mesh.thinInstanceRefreshBoundingInfo(true);
}

function sampleDensityAtWorld(field, world, fieldCenter) {
  const local = world.subtract(fieldCenter).scale(1 / field.radius);
  if (local.lengthSquared() > 1) return 0;
  return sampleNebulaDensity(field, local.x, local.y, local.z);
}

function randomPointInSphere(random, radius) {
  return randomDirection(random).scale(radius * random() ** (1 / 3));
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
