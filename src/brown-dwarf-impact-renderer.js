const B = window.BABYLON;

export function createBrownDwarfImpacts(scene, config, primary, primaryMesh, glow) {
  const root = new B.TransformNode(`${config.id ?? "brown-dwarf"}-impacts`, scene);
  const random = createRandom(config.seed ?? 9182);
  const rotatingPrimary = primaryMesh?.getWorldMatrix ? primaryMesh : null;
  const center = rotatingPrimary
    ? B.Vector3.Zero()
    : B.Vector3.FromArray(primary.position ?? [0, 0, 0]);
  const radius = (primary.radius ?? 1) * (primary.scale ?? 1);
  const spawnRate = config.spawnRatePerSecond ?? 2.8;
  const maxImpacts = config.maxImpacts ?? 90;
  const showEntryTrails = config.showEntryTrails ?? false;
  const showImpactCores = config.showImpactCores ?? true;
  const showImpactBlooms = config.showImpactBlooms ?? true;
  const showAtmosphericScars = config.showAtmosphericScars ?? true;
  const sizePower = config.sizePower ?? 2.8;
  const surfaceLift = config.surfaceLift ?? 0.36;
  const timeScaleInfluence = config.timeScaleInfluence ?? 0.45;
  const trailTexture = createStreakTexture(scene, `${root.name}-trail-texture`);

  if (rotatingPrimary) {
    root.parent = rotatingPrimary;
  }
  const flashTexture = createRadialTexture(scene, `${root.name}-flash-texture`, {
    inner: [255, 245, 205, 255],
    mid: [255, 114, 22, 210],
    outer: [255, 54, 8, 0],
  });
  const impactBloomTexture = createImpactSplatTexture(
    scene,
    `${root.name}-impact-bloom-texture`,
    {
      hot: [255, 188, 74, 230],
      warm: [230, 86, 24, 165],
      smoke: [78, 23, 9, 60],
    },
  );
  const scarTexture = createImpactSplatTexture(
    scene,
    `${root.name}-impact-scar-texture`,
    {
      hot: [74, 22, 6, 120],
      warm: [34, 10, 4, 150],
      smoke: [0, 0, 0, 175],
    },
  );

  const trailMesh = createImpactPlane(
    scene,
    `${root.name}-entry-streak`,
    createImpactMaterial(scene, `${root.name}-entry-material`, trailTexture, {
      emissive: [3.8, 1.2, 0.18],
      additive: true,
    }),
    root,
  );
  const flashMesh = createImpactPlane(
    scene,
    `${root.name}-surface-flash`,
    createImpactMaterial(scene, `${root.name}-flash-material`, flashTexture, {
      emissive: [5.0, 1.7, 0.34],
      additive: true,
    }),
    root,
  );
  const plumeMesh = createImpactPlane(
    scene,
    `${root.name}-impact-bloom`,
    createImpactMaterial(scene, `${root.name}-impact-bloom-material`, impactBloomTexture, {
      emissive: [2.1, 0.58, 0.12],
      additive: true,
    }),
    root,
  );
  const scarMesh = createImpactPlane(
    scene,
    `${root.name}-atmospheric-scar`,
    createImpactMaterial(scene, `${root.name}-scar-material`, scarTexture, {
      emissive: [0, 0, 0],
      additive: false,
    }),
    root,
  );

  glow?.addIncludedOnlyMesh(trailMesh);
  glow?.addIncludedOnlyMesh(flashMesh);
  glow?.addIncludedOnlyMesh(plumeMesh);

  const impacts = [];
  const initialImpactCount = config.initialImpactCount ?? Math.ceil(spawnRate * 4);
  let spawnAccumulator = 0;
  let simulationTime = 0;

  for (let index = 0; index < Math.min(initialImpactCount, maxImpacts); index += 1) {
    const impact = createImpact(random);
    impact.age = random() * (impact.entrySeconds + impact.scarSeconds * 0.62);
    impacts.push(impact);
  }

  scene.onBeforeRenderObservable.add(() => {
    profile(scene, "Impacts", () => {
      const rawSeconds = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
      const sceneTimeScale = scene.metadata?.timeScale ?? 1;
      const seconds = rawSeconds * lerp(1, sceneTimeScale, timeScaleInfluence);
      simulationTime += seconds;
      spawnAccumulator += seconds * spawnRate;

      while (spawnAccumulator >= 1 && impacts.length < maxImpacts) {
        spawnAccumulator -= 1;
        impacts.push(createImpact(random));
      }
      if (impacts.length < Math.min(maxImpacts, spawnRate * 2)) {
        impacts.push(createImpact(random));
      }

      updateImpacts(seconds);
    });
  });

  return root;

  function createImpact(random) {
    const direction = randomSurfaceDirection(
      random,
      scene,
      center,
      rotatingPrimary,
    );
    const size = lerp(
      config.sizeRange?.[0] ?? 0.75,
      config.sizeRange?.[1] ?? 2.6,
      random() ** sizePower,
    );
    const entryHeight = lerp(
      config.entryHeightRange?.[0] ?? 10,
      config.entryHeightRange?.[1] ?? 34,
      random(),
    );
    const entrySeconds = showEntryTrails
      ? lerp(
          config.entrySecondsRange?.[0] ?? 0.45,
          config.entrySecondsRange?.[1] ?? 1.25,
          random(),
        )
      : 0;
    const plumeSeconds = lerp(
      config.plumeSecondsRange?.[0] ?? 1.0,
      config.plumeSecondsRange?.[1] ?? 2.2,
      random(),
    );
    const scarSeconds = lerp(
      config.scarSecondsRange?.[0] ?? 3.5,
      config.scarSecondsRange?.[1] ?? 7.0,
      random(),
    );

    return {
      age: random() < 0.35 ? random() * entrySeconds : 0,
      direction,
      twist: random() * Math.PI * 2,
      stretch: lerp(0.86, 1.22, random()),
      size,
      entryHeight,
      entrySeconds,
      plumeSeconds,
      scarSeconds,
      trailLength: entryHeight * lerp(0.22, 0.42, random()),
      surfaceJitter: lerp(-0.35, 0.35, random()),
    };
  }

  function updateImpacts(seconds) {
    const trailMatrices = [];
    const trailColors = [];
    const flashMatrices = [];
    const flashColors = [];
    const plumeMatrices = [];
    const plumeColors = [];
    const scarMatrices = [];
    const scarColors = [];

    for (let index = impacts.length - 1; index >= 0; index -= 1) {
      const impact = impacts[index];
      impact.age += seconds;
      const surface = center.add(impact.direction.scale(radius + impact.surfaceJitter));
      const entryAge = Math.min(impact.age, impact.entrySeconds);
      const afterImpact = impact.age - impact.entrySeconds;
      const facing = cameraFacing(
        impact.direction,
        scene,
        center,
        rotatingPrimary,
      );

      if (showEntryTrails && facing > 0.02 && impact.age < impact.entrySeconds) {
        const entryT = clamp01(entryAge / impact.entrySeconds);
        const remainingHeight = impact.entryHeight * (1 - entryT);
        const length = impact.trailLength * (0.45 + entryT * 0.55);
        const altitude = remainingHeight + length * 0.55;
        const position = center.add(impact.direction.scale(radius + altitude));
        const alpha = smoothstep(0, 0.18, entryT) * (1 - smoothstep(0.76, 1, entryT)) * facing;
        pushBillboard(
          trailMatrices,
          trailColors,
          position,
          impact.direction,
          new B.Vector3(impact.size * 0.32, length, 1),
          impact.twist,
          [1, 0.58, 0.14, alpha],
          scene,
          rotatingPrimary,
        );
      }

      if (afterImpact >= 0 && afterImpact < impact.plumeSeconds) {
        const plumeT = clamp01(afterImpact / impact.plumeSeconds);
        const coreAlpha = showImpactCores
          ? (1 - smoothstep(0.08, 0.62, plumeT)) * facing * 0.95
          : 0;
        if (showImpactCores && coreAlpha > 0.01) {
          pushSurfaceDisc(
            flashMatrices,
            flashColors,
            surface.add(impact.direction.scale(surfaceLift)),
            impact.direction,
            new B.Vector3(
              impact.size * lerp(0.24, 0.5, Math.sqrt(plumeT)),
              impact.size * lerp(0.22, 0.46, Math.sqrt(plumeT)),
              1,
            ),
            impact.twist + plumeT * 1.8,
            [1, 0.68, 0.24, coreAlpha],
          );
        }

        const bloomAlpha = showImpactBlooms
          ? smoothstep(0.02, 0.2, plumeT) *
            (1 - smoothstep(0.62, 1, plumeT)) *
            facing *
            0.68
          : 0;
        if (showImpactBlooms && bloomAlpha > 0.01) {
          pushSurfaceDisc(
            plumeMatrices,
            plumeColors,
            surface.add(impact.direction.scale(surfaceLift * 1.08)),
            impact.direction,
            new B.Vector3(
              impact.size * impact.stretch * lerp(0.7, 1.72, Math.sqrt(plumeT)),
              impact.size * lerp(0.62, 1.55, Math.sqrt(plumeT)),
              1,
            ),
            impact.twist + plumeT * 0.22,
            [1, 0.42, 0.12, bloomAlpha],
          );
        }

      }

      if (
        showAtmosphericScars &&
        afterImpact >= 0 &&
        afterImpact < impact.scarSeconds
      ) {
        const scarT = clamp01(afterImpact / impact.scarSeconds);
        const scarAlpha =
          smoothstep(0.0, 0.12, scarT) *
          (1 - smoothstep(0.36, 1, scarT)) *
          facing *
          0.18;
        if (scarAlpha > 0.01) {
          pushSurfaceDisc(
            scarMatrices,
            scarColors,
            surface.add(impact.direction.scale(surfaceLift * 0.82)),
            impact.direction,
            new B.Vector3(
              impact.size * impact.stretch * lerp(0.74, 1.4, scarT),
              impact.size * lerp(0.68, 1.22, scarT),
              1,
            ),
            impact.twist + scarT * 0.08,
            [0.08, 0.026, 0.008, scarAlpha],
          );
        }
      }

      if (impact.age > impact.entrySeconds + impact.scarSeconds) {
        impacts.splice(index, 1);
      }
    }

    applyInstanceBuffers(trailMesh, trailMatrices, trailColors);
    applyInstanceBuffers(flashMesh, flashMatrices, flashColors);
    applyInstanceBuffers(plumeMesh, plumeMatrices, plumeColors);
    applyInstanceBuffers(scarMesh, scarMatrices, scarColors);
    scene.metadata?.profiler?.setGpuWeight(
      "Impacts",
      (trailMatrices.length +
        flashMatrices.length +
        plumeMatrices.length +
        scarMatrices.length) /
        16 *
        0.12 +
        0.5,
    );
  }

  function pushSurfaceDisc(matrices, colors, position, normal, size, twist, color) {
    const scale = typeof size === "number" ? new B.Vector3(size, size, 1) : size;
    const rotation = rotationFromNormal(normal, twist);
    pushInstance(matrices, colors, position, scale, rotation, color);
  }

  function pushBillboard(
    matrices,
    colors,
    position,
    normal,
    scale,
    twist,
    color,
    scene,
    rotatingPrimary,
  ) {
    const cameraPosition = worldToLocal(
      scene.activeCamera.globalPosition,
      rotatingPrimary,
    );
    const toCamera = cameraPosition.subtract(position).normalize();
    const radial = normal.normalize();
    const side = B.Vector3.Cross(radial, toCamera);
    if (side.lengthSquared() < 0.0001) {
      pushSurfaceDisc(matrices, colors, position, normal, scale.y, twist, color);
      return;
    }
    side.normalize();
    const up = B.Vector3.Cross(toCamera, side).normalize();
    const base = matrixFromAxes(side, up, toCamera);
    const rotation = B.Quaternion.FromRotationMatrix(base).multiply(
      B.Quaternion.RotationAxis(toCamera, twist),
    );
    pushInstance(matrices, colors, position, scale, rotation, color);
  }
}

function createImpactPlane(scene, name, material, parent) {
  const mesh = B.MeshBuilder.CreatePlane(
    name,
    { size: 1, sideOrientation: B.Mesh.DOUBLESIDE },
    scene,
  );
  mesh.parent = parent;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.useVertexColors = true;
  mesh.hasVertexAlpha = true;
  mesh.material = material;
  applyInstanceBuffers(mesh, [], []);
  return mesh;
}

function createImpactMaterial(scene, name, texture, options) {
  const material = new B.StandardMaterial(name, scene);
  material.diffuseColor = B.Color3.Black();
  material.emissiveColor = B.Color3.FromArray(options.emissive);
  material.emissiveTexture = texture;
  material.opacityTexture = texture;
  material.disableLighting = true;
  material.backFaceCulling = false;
  material.useAlphaFromDiffuseTexture = true;
  material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  material.disableDepthWrite = true;
  material.alphaMode = options.additive
    ? B.Engine.ALPHA_ADD
    : B.Engine.ALPHA_COMBINE;
  material.needDepthPrePass = false;
  return material;
}

function createRadialTexture(scene, name, colors) {
  const size = 96;
  const texture = new B.DynamicTexture(name, { width: size, height: size }, scene, false);
  const context = texture.getContext();
  const gradient = context.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, rgba(colors.inner));
  gradient.addColorStop(0.28, rgba(colors.mid));
  gradient.addColorStop(1, rgba(colors.outer));
  context.clearRect(0, 0, size, size);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.hasAlpha = true;
  texture.update();
  return texture;
}

function createImpactSplatTexture(scene, name, colors) {
  const size = 128;
  const texture = new B.DynamicTexture(name, { width: size, height: size }, scene, false);
  const context = texture.getContext();
  const center = size * 0.5;
  const image = context.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5 - center) / center;
      const dy = (y + 0.5 - center) / center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const lobes =
        0.15 * Math.sin(angle * 3.0 + 0.8) +
        0.1 * Math.sin(angle * 5.0 - 1.4) +
        0.07 * Math.sin(angle * 9.0 + 2.1);
      const fan = Math.max(0, Math.cos(angle - 0.7));
      const brokenRadius = 0.68 + lobes + fan * 0.18;
      const body = (1 - smoothstep(brokenRadius * 0.38, brokenRadius, distance));
      const core = 1 - smoothstep(0.0, 0.22 + fan * 0.06, distance);
      const smokyLip = smoothstep(brokenRadius * 0.46, brokenRadius * 0.86, distance) *
        (1 - smoothstep(brokenRadius * 0.82, brokenRadius * 1.08, distance));
      const turbulence =
        0.72 +
        0.18 * Math.sin(x * 0.31 + y * 0.17) +
        0.1 * Math.sin(x * 0.11 - y * 0.29);
      const heat = clamp01(core * 1.25 + body * 0.32);
      const smoke = clamp01(smokyLip * 0.9 + body * 0.24);
      const alpha = clamp01((body * 0.72 + core * 0.4 + smokyLip * 0.34) * turbulence);
      const offset = (y * size + x) * 4;
      image.data[offset] = Math.round(lerp(colors.smoke[0], lerp(colors.warm[0], colors.hot[0], heat), body));
      image.data[offset + 1] = Math.round(lerp(colors.smoke[1], lerp(colors.warm[1], colors.hot[1], heat), body));
      image.data[offset + 2] = Math.round(lerp(colors.smoke[2], lerp(colors.warm[2], colors.hot[2], heat), body));
      image.data[offset + 3] = Math.round(alpha * lerp(colors.smoke[3], colors.hot[3], heat) * clamp01(0.5 + smoke));
    }
  }

  context.putImageData(image, 0, 0);
  texture.hasAlpha = true;
  texture.update();
  return texture;
}

function createRingTexture(scene, name) {
  const size = 128;
  const texture = new B.DynamicTexture(name, { width: size, height: size }, scene, false);
  const context = texture.getContext();
  const center = size * 0.5;
  const image = context.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5 - center) / center;
      const dy = (y + 0.5 - center) / center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const ring = smoothstep(0.52, 0.64, distance) *
        (1 - smoothstep(0.66, 0.86, distance));
      const innerHeat = (1 - smoothstep(0.08, 0.46, distance)) * 0.34;
      const alpha = clamp01(ring * 0.82 + innerHeat * 0.28);
      const offset = (y * size + x) * 4;
      image.data[offset] = 255;
      image.data[offset + 1] = 130;
      image.data[offset + 2] = 34;
      image.data[offset + 3] = Math.round(alpha * 255);
    }
  }

  context.putImageData(image, 0, 0);
  texture.hasAlpha = true;
  texture.update();
  return texture;
}

function createStreakTexture(scene, name) {
  const width = 32;
  const height = 128;
  const texture = new B.DynamicTexture(name, { width, height }, scene, false);
  const context = texture.getContext();
  const horizontal = context.createLinearGradient(0, 0, width, 0);
  horizontal.addColorStop(0, "rgba(255, 255, 255, 0)");
  horizontal.addColorStop(0.5, "rgba(255, 245, 206, 1)");
  horizontal.addColorStop(1, "rgba(255, 255, 255, 0)");
  const vertical = context.createLinearGradient(0, 0, 0, height);
  vertical.addColorStop(0, "rgba(255, 255, 255, 0)");
  vertical.addColorStop(0.25, "rgba(255, 160, 45, 0.85)");
  vertical.addColorStop(0.8, "rgba(255, 68, 10, 0.42)");
  vertical.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.clearRect(0, 0, width, height);
  context.fillStyle = horizontal;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "multiply";
  context.fillStyle = vertical;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";
  texture.hasAlpha = true;
  texture.update();
  return texture;
}

function pushInstance(matrices, colors, position, scale, rotation, color) {
  const matrix = B.Matrix.Compose(scale, rotation, position);
  matrix.copyToArray(matrices, matrices.length);
  colors.push(color[0], color[1], color[2], clamp01(color[3]));
}

function applyInstanceBuffers(mesh, matrices, colors) {
  mesh.thinInstanceSetBuffer("matrix", new Float32Array(matrices), 16, true);
  mesh.thinInstanceSetBuffer("color", new Float32Array(colors), 4, true);
  mesh.thinInstanceRefreshBoundingInfo(true);
}

function randomSurfaceDirection(random, scene, center, rotatingPrimary) {
  const cameraPosition = worldToLocal(
    scene.activeCamera.globalPosition,
    rotatingPrimary,
  );
  const toCamera = cameraPosition.subtract(center).normalize();
  let direction = randomDirection(random);
  if (random() < 0.82 && B.Vector3.Dot(direction, toCamera) < 0.05) {
    direction = direction.subtract(toCamera.scale(2 * B.Vector3.Dot(direction, toCamera))).normalize();
  }
  return direction;
}

function cameraFacing(normal, scene, center, rotatingPrimary) {
  const cameraPosition = worldToLocal(
    scene.activeCamera.globalPosition,
    rotatingPrimary,
  );
  const toCamera = cameraPosition.subtract(center).normalize();
  return clamp01((B.Vector3.Dot(normal, toCamera) + 0.14) / 1.14);
}

function worldToLocal(position, rotatingPrimary) {
  if (!rotatingPrimary) return position.clone();
  const inverse = rotatingPrimary.getWorldMatrix().clone().invert();
  return B.Vector3.TransformCoordinates(position, inverse);
}

function rotationFromNormal(normal, twist) {
  const from = B.Axis.Z;
  const to = normal.normalize();
  const dot = clamp(B.Vector3.Dot(from, to), -1, 1);
  let base;
  if (dot > 0.9999) {
    base = B.Quaternion.Identity();
  } else if (dot < -0.9999) {
    base = B.Quaternion.RotationAxis(B.Axis.X, Math.PI);
  } else {
    const axis = B.Vector3.Cross(from, to).normalize();
    base = B.Quaternion.RotationAxis(axis, Math.acos(dot));
  }
  return B.Quaternion.RotationAxis(to, twist).multiply(base);
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

function rgba(color) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function smoothstep(edge0, edge1, value) {
  const amount = clamp01((value - edge0) / Math.max(edge1 - edge0, 0.0001));
  return amount * amount * (3 - 2 * amount);
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function clamp01(value) {
  return clamp(value, 0, 1);
}
