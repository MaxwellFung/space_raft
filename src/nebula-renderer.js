const B = window.BABYLON;
const COLOR_RANGE = 3;
const MAX_MARCH_STEPS = 24;

registerShaders();

export function createNebula(scene, nebula, occluder) {
  const camera = scene.activeCamera;
  const engine = scene.getEngine();
  const root = new B.TransformNode(nebula.id, scene);
  root.position = B.Vector3.FromArray(nebula.position);
  root.rotation = B.Vector3.FromArray(nebula.rotation ?? [0, 0, 0]);
  root.scaling.setAll(nebula.radius);

  const volume = createVolumeTextures(scene, nebula);
  const renderScale = nebula.renderScale ?? 0.5;
  const targets = [
    createTarget(scene, nebula, renderScale, 0),
    createTarget(scene, nebula, renderScale, 1),
  ];
  const inverseWorld = B.Matrix.Identity();
  const cameraForward = B.Vector3.Zero();
  const cameraRight = B.Vector3.Zero();
  const cameraUp = B.Vector3.Zero();
  const previousForward = B.Vector3.Zero();
  const previousRight = B.Vector3.Zero();
  const previousUp = B.Vector3.Zero();
  const occluderPosition = occluder
    ? B.Vector3.FromArray(occluder.position)
    : B.Vector3.Zero();
  const occluderRadius = occluder
    ? occluder.radius * occluder.scale
    : 0;
  const localOccluderPosition = B.Vector3.Zero();
  let latest = targets[0];
  let writeIndex = 1;
  let historyValid = false;
  let frameIndex = 0;
  const baseUpdateInterval = Math.max(1, Math.round(nebula.updateInterval ?? 2));
  const fullRateAngularDelta = nebula.fullRateAngularDelta ?? 0.012;
  let updateInterval = baseUpdateInterval;
  let marchSteps = nebula.marchSteps ?? 20;
  let lastQualityUpdate = 0;
  let scaledTime = 0;
  let previousRootRotationY = root.rotation.y;
  const maxHistoryVolumeAngularDelta =
    nebula.maxHistoryVolumeAngularDelta ?? 0.000001;

  for (const target of targets) {
    target.setTexture("volumeSampler", volume.detail);
    target.setTexture("occupancySampler", volume.occupancy);
    target.setFloat("density", nebula.density ?? 0.82);
    target.setFloat("absorption", nebula.absorption ?? 1.45);
    target.setFloat("innerVoid", nebula.innerVoid ?? 0.34);
    target.setFloat("emissionStrength", nebula.emissionStrength ?? 0.62);
    target.setFloat("anisotropy", nebula.anisotropy ?? 0.34);
    target.setFloat("colorRange", COLOR_RANGE);
  }

  const composite = createComposite(
    scene,
    camera,
    () => latest,
    occluderPosition,
    occluderRadius,
  );

  scene.onBeforeRenderObservable.add(() => {
    profile(scene, "Nebula", () => {
      const timeScale = scene.metadata?.timeScale ?? 1;
      const seconds = Math.min(engine.getDeltaTime() / 1000, 0.05);
      scaledTime += seconds * timeScale;
      root.rotation.y += seconds * timeScale * 0.0016;
      frameIndex += 1;
      updateAdaptiveQuality();
      camera.getDirectionToRef(B.Axis.Z, cameraForward);
      camera.getDirectionToRef(B.Axis.X, cameraRight);
      camera.getDirectionToRef(B.Axis.Y, cameraUp);
      const directionDot = Math.min(
        Math.max(B.Vector3.Dot(cameraForward, previousForward), -1),
        1,
      );
      const angularDelta = historyValid
        ? Math.acos(directionDot)
        : Number.POSITIVE_INFINITY;
      const fullRate = !historyValid || angularDelta > fullRateAngularDelta;
      const cadence = fullRate ? 1 : updateInterval;
      updateGpuWeight(cadence);
      if (!fullRate && frameIndex % updateInterval !== 0) return;

      root.computeWorldMatrix(true);
      inverseWorld.copyFrom(root.getWorldMatrix()).invert();
      B.Vector3.TransformCoordinatesToRef(
        occluderPosition,
        inverseWorld,
        localOccluderPosition,
      );

      const target = targets[writeIndex];
      const history = latest;
      const volumeAngularDelta = Math.abs(root.rotation.y - previousRootRotationY);
      const historyUsable =
        historyValid && volumeAngularDelta <= maxHistoryVolumeAngularDelta;
      target.setTexture("historySampler", history);
      target.setMatrix("invWorld", inverseWorld);
      target.setVector3("cameraPosition", camera.globalPosition);
      target.setVector3("cameraForward", cameraForward);
      target.setVector3("cameraRight", cameraRight);
      target.setVector3("cameraUp", cameraUp);
      target.setVector3("previousForward", previousForward);
      target.setVector3("previousRight", previousRight);
      target.setVector3("previousUp", previousUp);
      target.setVector3("occluderPosition", localOccluderPosition);
      target.setFloat(
        "occluderRadius",
        occluderRadius / Math.max(nebula.radius, 0.0001),
      );
      target.setFloat("tanHalfFov", Math.tan(camera.fov * 0.5));
      target.setFloat("aspect", engine.getAspectRatio(camera));
      target.setFloat("previousTanHalfFov", Math.tan(camera.fov * 0.5));
      target.setFloat("previousAspect", engine.getAspectRatio(camera));
      target.setFloat("time", scaledTime);
      target.setFloat("frameIndex", frameIndex % 64);
      target.setFloat("marchSteps", marchSteps);
      target.setFloat(
        "historyWeight",
        historyUsable ? (nebula.temporalBlend ?? 0.82) : 0,
      );
      if (!target.isReady()) {
        const compilationError = target.getEffect()?.getCompilationError();
        if (compilationError) console.error(compilationError);
        return;
      }
      target.render();

      latest = target;
      writeIndex = 1 - writeIndex;
      previousForward.copyFrom(cameraForward);
      previousRight.copyFrom(cameraRight);
      previousUp.copyFrom(cameraUp);
      previousRootRotationY = root.rotation.y;
      historyValid = true;
    });
  });

  engine.onResizeObservable.add(() => {
    const size = getTargetSize(engine, renderScale);
    for (const target of targets) target.resize(size, false);
    historyValid = false;
  });

  function updateAdaptiveQuality() {
    const now = performance.now();
    if (now - lastQualityUpdate < 750) return;
    lastQualityUpdate = now;

    const gpuMs = engine.metadata?.performance?.gpuMs;
    if (!nebula.adaptiveQuality || !Number.isFinite(gpuMs)) return;

    const targetSteps = nebula.marchSteps ?? 20;
    const minimumSteps = nebula.minimumMarchSteps ?? 12;
    if (gpuMs > 19) {
      marchSteps = minimumSteps;
      updateInterval = Math.max(baseUpdateInterval, 3);
    } else if (gpuMs > 14.5) {
      marchSteps = Math.max(minimumSteps, targetSteps - 4);
      updateInterval = Math.max(baseUpdateInterval, 2);
    } else {
      marchSteps = targetSteps;
      updateInterval = baseUpdateInterval;
    }
  }

  function updateGpuWeight(cadence) {
    scene.metadata?.profiler?.setGpuWeight(
      "Nebula",
      (
        engine.getRenderWidth() *
        engine.getRenderHeight() *
        renderScale *
        renderScale *
        marchSteps *
        0.000015
      ) / Math.max(cadence, 1),
    );
  }

  return { root, composite, targets, volume };
}

function createTarget(scene, nebula, renderScale, index) {
  const target = new B.ProceduralTexture(
    `${nebula.id}-volume-${index}`,
    getTargetSize(scene.getEngine(), renderScale),
    "nebulaVolume",
    scene,
    null,
    false,
    false,
    B.Engine.TEXTURETYPE_UNSIGNED_BYTE,
  );
  target.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  target.updateSamplingMode(B.Texture.BILINEAR_SAMPLINGMODE);
  target.wrapU = B.Texture.CLAMP_ADDRESSMODE;
  target.wrapV = B.Texture.CLAMP_ADDRESSMODE;
  target.gammaSpace = false;
  return target;
}

function getTargetSize(engine, scale) {
  return {
    width: Math.max(1, Math.round(engine.getRenderWidth() * scale)),
    height: Math.max(1, Math.round(engine.getRenderHeight() * scale)),
  };
}

function createComposite(
  scene,
  camera,
  getNebulaTexture,
  occluderPosition,
  occluderRadius,
) {
  const engine = scene.getEngine();
  const depthRenderer = scene.enableDepthRenderer(camera, false);
  const depthMap = depthRenderer.getDepthMap();
  const cameraForward = B.Vector3.Zero();
  const cameraRight = B.Vector3.Zero();
  const cameraUp = B.Vector3.Zero();
  const postProcess = new B.PostProcess(
    "nebula-composite",
    "nebulaComposite",
    [
      "cameraPosition",
      "cameraForward",
      "cameraRight",
      "cameraUp",
      "tanHalfFov",
      "aspect",
      "nebulaTexelSize",
      "occluderPosition",
      "occluderRadius",
    ],
    ["nebulaSampler", "depthSampler"],
    1,
    camera,
    B.Texture.BILINEAR_SAMPLINGMODE,
    engine,
    false,
  );

  postProcess.onApply = (effect) => {
    const texture = getNebulaTexture();
    const size = texture.getSize();
    camera.getDirectionToRef(B.Axis.Z, cameraForward);
    camera.getDirectionToRef(B.Axis.X, cameraRight);
    camera.getDirectionToRef(B.Axis.Y, cameraUp);
    effect.setTexture("nebulaSampler", texture);
    effect.setTexture("depthSampler", depthMap);
    effect.setVector3("cameraPosition", camera.globalPosition);
    effect.setVector3("cameraForward", cameraForward);
    effect.setVector3("cameraRight", cameraRight);
    effect.setVector3("cameraUp", cameraUp);
    effect.setFloat("tanHalfFov", Math.tan(camera.fov * 0.5));
    effect.setFloat("aspect", engine.getAspectRatio(camera));
    effect.setVector2(
      "nebulaTexelSize",
      new B.Vector2(1 / size.width, 1 / size.height),
    );
    effect.setVector3("occluderPosition", occluderPosition);
    effect.setFloat("occluderRadius", occluderRadius);
  };

  return postProcess;
}

function createVolumeTextures(scene, nebula) {
  const resolution = nebula.volumeResolution ?? 40;
  const voxelCount = resolution ** 3;
  const detailData = new Uint8Array(voxelCount * 4);
  const densities = new Float32Array(voxelCount);
  const seed = nebula.seed ?? 1;
  const innerVoid = nebula.innerVoid ?? 0.34;
  const outerSoftness = nebula.outerSoftness ?? 0.24;

  for (let z = 0; z < resolution; z += 1) {
    const pz = (z / (resolution - 1)) * 2 - 1;
    for (let y = 0; y < resolution; y += 1) {
      const py = (y / (resolution - 1)) * 2 - 1;
      for (let x = 0; x < resolution; x += 1) {
        const px = (x / (resolution - 1)) * 2 - 1;
        const medium = sampleMediumData(
          px,
          py,
          pz,
          seed,
          innerVoid,
          outerSoftness,
          nebula,
        );
        const density =
          Math.max(0, medium.coarse - (1 - medium.erosion) * 0.12) *
          (nebula.density ?? 0.82);
        const color = prelightColor(px, py, pz, medium, density, nebula);
        const voxel = x + y * resolution + z * resolution * resolution;
        const index = voxel * 4;
        densities[voxel] = density;
        detailData[index] = Math.round(clamp01(color[0] / COLOR_RANGE) * 255);
        detailData[index + 1] = Math.round(
          clamp01(color[1] / COLOR_RANGE) * 255,
        );
        detailData[index + 2] = Math.round(
          clamp01(color[2] / COLOR_RANGE) * 255,
        );
        detailData[index + 3] = Math.round(clamp01(density) * 255);
      }
    }
  }

  const occupancyResolution = nebula.occupancyResolution ?? 10;
  const occupancyData = createOccupancyData(
    densities,
    resolution,
    occupancyResolution,
  );
  const detail = new B.RawTexture3D(
    detailData,
    resolution,
    resolution,
    resolution,
    B.Engine.TEXTUREFORMAT_RGBA,
    scene,
    false,
    false,
    B.Texture.TRILINEAR_SAMPLINGMODE,
    B.Engine.TEXTURETYPE_UNSIGNED_BYTE,
  );
  const occupancy = new B.RawTexture3D(
    occupancyData,
    occupancyResolution,
    occupancyResolution,
    occupancyResolution,
    B.Engine.TEXTUREFORMAT_RGBA,
    scene,
    false,
    false,
    B.Texture.NEAREST_SAMPLINGMODE,
    B.Engine.TEXTURETYPE_UNSIGNED_BYTE,
  );

  for (const texture of [detail, occupancy]) {
    texture.wrapU = B.Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = B.Texture.CLAMP_ADDRESSMODE;
    texture.wrapR = B.Texture.CLAMP_ADDRESSMODE;
    texture.gammaSpace = false;
  }
  detail.name = `${nebula.id}-prelit-volume`;
  occupancy.name = `${nebula.id}-occupancy`;
  return { detail, occupancy };
}

export function sampleNebulaDensity(nebula, px, py, pz) {
  const medium = sampleMediumData(
    px,
    py,
    pz,
    nebula.seed ?? 1,
    nebula.innerVoid ?? 0.34,
    nebula.outerSoftness ?? 0.24,
    nebula,
  );
  return (
    Math.max(0, medium.coarse - (1 - medium.erosion) * 0.12) *
    (nebula.density ?? 0.82)
  );
}

function sampleMediumData(
  px,
  py,
  pz,
  seed,
  innerVoid,
  outerSoftness,
  nebula = {},
) {
  const radius = Math.hypot(px, py, pz);
  const outer = 1 - smoothStep(1 - outerSoftness, 1, radius);
  const innerSoftness = nebula.innerSoftness ?? 0.18;
  const inner = smoothStep(innerVoid, innerVoid + innerSoftness, radius);
  const voidStrength = nebula.voidStrength ?? 0;
  const voidScale = nebula.voidScale ?? 1.6;
  const voidThreshold = nebula.voidThreshold ?? 0.52;
  const voidSoftness = nebula.voidSoftness ?? 0.16;
  const voidNoise = valueFbm(
    px * voidScale + 11.8,
    py * voidScale - 4.6,
    pz * voidScale + 2.9,
    seed + 151,
    2,
  );
  const voidMask = smoothStep(
    voidThreshold,
    voidThreshold + voidSoftness,
    voidNoise,
  );
  const envelope = outer * inner * lerp(1 - voidStrength, 1, voidMask);
  const macro = valueFbm(px * 1.15, py * 1.15, pz * 1.15, seed, 3);
  const detail = valueFbm(
    px * 3.1 + 7.2,
    py * 3.1 - 3.4,
    pz * 3.1 + 1.8,
    seed + 31,
    2,
  );
  const ridgeNoise = valueFbm(
    px * 5.4 - 2.1,
    py * 5.4 + 6.7,
    pz * 5.4 - 4.3,
    seed + 79,
    2,
  );
  const ridge = 1 - Math.abs(ridgeNoise * 2 - 1);
  const directionLength = Math.max(radius, 0.0001);
  const directionalLobes = Math.max(
    0,
    (px / directionLength) * 0.72 + (py / directionLength) * 0.22,
    (-px / directionLength) * 0.58 + (pz / directionLength) * 0.52,
    (py / directionLength) * 0.46 - (pz / directionLength) * 0.7,
  );
  const coarse = clamp01(
    (macro * 0.62 +
      detail * 0.28 +
      ridge * 0.22 +
      directionalLobes * 0.18 -
      0.67) *
      4.5 *
      envelope,
  );
  return {
    coarse,
    erosion: clamp01(detail * 0.82 + ridge * 0.18),
    emission: clamp01(
      coarse * smoothStep(0.42, 0.92, ridge * 0.82 + macro * 0.18),
    ),
    dust: clamp01(
      coarse * smoothStep(0.36, 0.88, 1 - detail * 0.72 + ridge * 0.18),
    ),
  };
}

function prelightColor(px, py, pz, medium, density, nebula) {
  const cool = nebula.coolColor ?? [0.14, 0.22, 0.82];
  const violet = nebula.violetColor ?? [0.42, 0.12, 0.72];
  const warm = nebula.warmColor ?? [1.15, 0.16, 0.035];
  const hot = nebula.hotColor ?? [1.95, 0.58, 0.1];
  const core = nebula.coreColor ?? [2.2, 1.65, 1.15];
  const dustColor = nebula.dustColor ?? [0.02, 0.006, 0.012];
  const emissionStrength = nebula.emissionStrength ?? 0.62;
  const absorption = nebula.absorption ?? 1.45;
  const innerVoid = nebula.innerVoid ?? 0.34;
  const radius = Math.hypot(px, py, pz);
  const lightTransmittance = Math.exp(
    -density * absorption * Math.max(0, radius - innerVoid),
  );
  const centerGlow = 1 - smoothStep(0.2, 0.86, radius);
  const assumedLight = lightTransmittance * (0.29 + centerGlow * 0.24);
  const roseField = Math.sin(px * 3.2 + py * 1.7 - pz * 2.4) * 0.5 + 0.5;
  const violetField =
    Math.sin(px * 1.5 - py * 3.6 + pz * 2.1 + 1.8) * 0.5 + 0.5;
  const tealField =
    Math.sin(-px * 2.7 + py * 2.2 + pz * 1.4 - 0.7) * 0.5 + 0.5;
  const roseMask = smoothStep(
    0.3,
    0.82,
    roseField * 0.65 + medium.erosion * 0.5,
  );
  const violetMask = smoothStep(
    0.42,
    0.88,
    violetField * 0.56 +
      medium.erosion * 0.38 +
      medium.emission * 0.18,
  );
  const tealMask = smoothStep(
    0.38,
    0.86,
    tealField * 0.72 + (1 - medium.erosion) * 0.34,
  );
  const coralMask = smoothStep(
    0.38,
    0.92,
    medium.emission * 0.82 + medium.erosion * 0.3,
  );
  const tealZone = smoothStep(
    -0.28,
    0.72,
    -px * 1.08 - py * 0.24 + pz * 0.18,
  );
  const roseZone = smoothStep(
    -0.32,
    0.76,
    px * 0.82 + py * 0.14 - pz * 0.24,
  );
  const violetZone = smoothStep(
    -0.36,
    0.7,
    -px * 0.22 + py * 0.9 + pz * 0.32,
  );
  const tealWeight =
    Math.pow(Math.max(tealMask, 0.08), 1.9) *
    (0.35 + tealZone * 3.2) *
    (1 - medium.emission * 0.38);
  const violetWeight =
    Math.pow(Math.max(violetMask, 0.05), 2) * (0.42 + violetZone * 1.7);
  const roseWeight =
    Math.pow(Math.max(roseMask, 0.04), 2.15) * (0.35 + roseZone * 2.1);
  const coralWeight = Math.pow(Math.max(coralMask, 0.03), 2.3);
  const weightSum =
    tealWeight + violetWeight + roseWeight + coralWeight + 0.0001;
  const color = [0, 1, 2].map(
    (channel) =>
      (cool[channel] * tealWeight +
        violet[channel] * violetWeight +
        warm[channel] * roseWeight +
        hot[channel] * coralWeight) /
      weightSum,
  );

  for (let channel = 0; channel < 3; channel += 1) {
    color[channel] = lerp(
      color[channel],
      dustColor[channel],
      medium.dust * 0.68,
    );
    color[channel] *=
      0.22 + assumedLight * (0.54 + medium.erosion * 0.3);
    color[channel] +=
      (cool[channel] * tealWeight +
        violet[channel] * violetWeight +
        warm[channel] * roseWeight) *
      medium.coarse *
      emissionStrength *
      0.24;
    color[channel] +=
      cool[channel] * tealZone * medium.coarse * emissionStrength * 0.34;
    color[channel] +=
      violet[channel] * violetZone * medium.coarse * emissionStrength * 0.18;
    color[channel] +=
      hot[channel] *
      medium.emission *
      emissionStrength *
      (0.2 + assumedLight * 0.72);
  }

  const coreA =
    1 - smoothStep(0.08, 0.38, Math.hypot(px - 0.16, py - 0.08, pz + 0.08));
  const coreB =
    1 - smoothStep(0.06, 0.3, Math.hypot(px + 0.32, py - 0.16, pz - 0.2));
  const coreMask =
    Math.pow(clamp01(medium.emission), 1.45) *
    (0.34 + Math.max(coreA, coreB) * 1.2);
  for (let channel = 0; channel < 3; channel += 1) {
    color[channel] += core[channel] * coreMask * emissionStrength * 1.8;
  }

  const ionizedGas =
    tealZone * smoothStep(0.08, 0.54, medium.coarse);
  for (let channel = 0; channel < 3; channel += 1) {
    color[channel] = lerp(
      color[channel],
      cool[channel] * (0.28 + assumedLight * 0.72),
      ionizedGas * 0.72,
    );
  }

  const luminance =
    color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
  for (let channel = 0; channel < 3; channel += 1) {
    color[channel] =
      Math.max(0, lerp(luminance, color[channel], 1.22)) *
      (0.48 + density * 1.08);
  }
  return color;
}

function createOccupancyData(densities, resolution, coarseResolution) {
  const data = new Uint8Array(coarseResolution ** 3 * 4);
  const scale = resolution / coarseResolution;
  for (let z = 0; z < coarseResolution; z += 1) {
    for (let y = 0; y < coarseResolution; y += 1) {
      for (let x = 0; x < coarseResolution; x += 1) {
        const x0 = Math.floor(x * scale);
        const y0 = Math.floor(y * scale);
        const z0 = Math.floor(z * scale);
        const x1 = Math.min(resolution, Math.ceil((x + 1) * scale) + 1);
        const y1 = Math.min(resolution, Math.ceil((y + 1) * scale) + 1);
        const z1 = Math.min(resolution, Math.ceil((z + 1) * scale) + 1);
        let maximum = 0;
        for (let dz = z0; dz < z1; dz += 1) {
          for (let dy = y0; dy < y1; dy += 1) {
            for (let dx = x0; dx < x1; dx += 1) {
              maximum = Math.max(
                maximum,
                densities[dx + dy * resolution + dz * resolution * resolution],
              );
            }
          }
        }
        const index =
          (x + y * coarseResolution + z * coarseResolution ** 2) * 4;
        data[index + 3] = Math.round(clamp01(maximum) * 255);
      }
    }
  }
  return data;
}

function valueFbm(x, y, z, seed, octaves) {
  let value = 0;
  let amplitude = 0.5;
  let totalAmplitude = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    value += valueNoise3(x, y, z, seed + octave * 1013) * amplitude;
    totalAmplitude += amplitude;
    x = x * 2.03 + 17.2;
    y = y * 2.03 + 9.1;
    z = z * 2.03 + 13.7;
    amplitude *= 0.52;
  }
  return value / totalAmplitude;
}

function valueNoise3(x, y, z, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smoothCurve(x - ix);
  const fy = smoothCurve(y - iy);
  const fz = smoothCurve(z - iz);
  const x00 = lerp(hashGrid(ix, iy, iz, seed), hashGrid(ix + 1, iy, iz, seed), fx);
  const x10 = lerp(hashGrid(ix, iy + 1, iz, seed), hashGrid(ix + 1, iy + 1, iz, seed), fx);
  const x01 = lerp(hashGrid(ix, iy, iz + 1, seed), hashGrid(ix + 1, iy, iz + 1, seed), fx);
  const x11 = lerp(
    hashGrid(ix, iy + 1, iz + 1, seed),
    hashGrid(ix + 1, iy + 1, iz + 1, seed),
    fx,
  );
  return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
}

function hashGrid(x, y, z, seed) {
  let value =
    Math.imul(x, 73856093) ^
    Math.imul(y, 19349663) ^
    Math.imul(z, 83492791) ^
    seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smoothCurve(value) {
  return value * value * (3 - 2 * value);
}

function smoothStep(edge0, edge1, value) {
  const amount = clamp01((value - edge0) / (edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function profile(scene, name, fn) {
  return scene.metadata?.profiler?.measure(name, fn) ?? fn();
}

function registerShaders() {
  B.Effect.ShadersStore.nebulaVolumeFragmentShader = `
    precision highp float;
    precision highp sampler3D;

    uniform sampler2D historySampler;
    uniform sampler3D volumeSampler;
    uniform sampler3D occupancySampler;
    uniform mat4 invWorld;
    uniform vec3 cameraPosition;
    uniform vec3 cameraForward;
    uniform vec3 cameraRight;
    uniform vec3 cameraUp;
    uniform vec3 previousForward;
    uniform vec3 previousRight;
    uniform vec3 previousUp;
    uniform vec3 occluderPosition;
    uniform float occluderRadius;
    uniform float tanHalfFov;
    uniform float aspect;
    uniform float previousTanHalfFov;
    uniform float previousAspect;
    uniform float time;
    uniform float frameIndex;
    uniform float marchSteps;
    uniform float historyWeight;
    uniform float density;
    uniform float absorption;
    uniform float innerVoid;
    uniform float emissionStrength;
    uniform float anisotropy;
    uniform float colorRange;

    varying vec2 vUV;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    bool raySphere(
      vec3 ro,
      vec3 rd,
      vec3 center,
      float radius,
      out float t0,
      out float t1
    ) {
      vec3 offset = ro - center;
      float b = dot(offset, rd);
      float c = dot(offset, offset) - radius * radius;
      float h = b * b - c;
      if (h < 0.0) return false;
      h = sqrt(h);
      t0 = -b - h;
      t1 = -b + h;
      return true;
    }

    float hgPhase(float cosTheta, float g) {
      float g2 = g * g;
      float base = max(0.0001, 1.0 + g2 - 2.0 * g * cosTheta);
      return (1.0 - g2) / (12.5663706 * base * sqrt(base));
    }

    vec2 reprojectDirection(vec3 direction) {
      float forward = dot(direction, previousForward);
      if (forward <= 0.001) return vec2(-1.0);
      vec2 ndc = vec2(
        dot(direction, previousRight) /
          (forward * previousTanHalfFov * previousAspect),
        dot(direction, previousUp) / (forward * previousTanHalfFov)
      );
      return ndc * 0.5 + 0.5;
    }

    void main() {
      vec2 ndc = vUV * 2.0 - 1.0;
      vec3 rdWorld = normalize(
        cameraForward +
        cameraRight * ndc.x * aspect * tanHalfFov +
        cameraUp * ndc.y * tanHalfFov
      );
      vec3 ro = (invWorld * vec4(cameraPosition, 1.0)).xyz;
      vec3 localDirection = (invWorld * vec4(rdWorld, 0.0)).xyz;
      vec3 rd = normalize(localDirection);
      float tEnter;
      float tExit;
      if (!raySphere(ro, rd, vec3(0.0), 1.0, tEnter, tExit)) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
      tEnter = max(tEnter, 0.0);

      float objectEnter;
      float objectExit;
      if (
        occluderRadius > 0.0 &&
        raySphere(
          ro,
          rd,
          occluderPosition,
          occluderRadius,
          objectEnter,
          objectExit
        ) &&
        objectEnter > tEnter
      ) {
        tExit = min(tExit, objectEnter);
      }

      float totalLength = max(0.0, tExit - tEnter);
      float stepLength = totalLength / max(marchSteps, 1.0);
      float jitter = hash12(gl_FragCoord.xy + vec2(frameIndex * 17.0, 7.0));
      float travel = tEnter + stepLength * jitter;
      vec3 scattering = vec3(0.0);
      float transmittance = 1.0;

      for (int i = 0; i < ${MAX_MARCH_STEPS}; i++) {
        if (
          float(i) >= marchSteps ||
          travel >= tExit ||
          transmittance < 0.03
        ) break;

        vec3 p = ro + rd * travel;
        vec3 uvw = p * 0.5 + 0.5;
        float occupied = texture(occupancySampler, uvw).a;
        if (occupied < 0.008) {
          travel += stepLength * 3.5;
          continue;
        }

        vec4 medium = texture(volumeSampler, uvw);
        float localDensity = medium.a;
        if (localDensity > 0.002) {
          vec3 lightDirection = normalize(-p);
          float pathLength = max(0.0, length(p) - innerVoid);
          float opticalDepth =
            localDensity * absorption * pathLength * (0.9 + occupied * 0.7);
          float lightTransmittance = exp(-opticalDepth);
          float phase = hgPhase(dot(rd, lightDirection), anisotropy);
          float centerGlow = 1.0 - smoothstep(0.2, 0.86, length(p));
          float lightAmount =
            lightTransmittance *
            (0.22 + phase * 1.8 + centerGlow * 0.28);
          vec3 sampleColor =
            medium.rgb *
            colorRange *
            (0.84 + lightAmount * 0.24 + emissionStrength * 0.02);
          float alpha =
            1.0 - exp(-localDensity * absorption * stepLength);
          scattering += transmittance * sampleColor * alpha;
          transmittance *= 1.0 - alpha;
        }
        travel += stepLength;
      }

      vec4 current = vec4(scattering, transmittance);
      vec2 historyUV = reprojectDirection(rdWorld);
      bool validHistory =
        historyUV.x > 0.0 &&
        historyUV.y > 0.0 &&
        historyUV.x < 1.0 &&
        historyUV.y < 1.0;
      if (validHistory && historyWeight > 0.0) {
        vec4 history = texture2D(historySampler, historyUV);
        float difference = length(history.rgb - current.rgb);
        float blend =
          historyWeight *
          (1.0 - smoothstep(0.08, 0.7, difference));
        current = mix(current, history, blend);
      }
      gl_FragColor = current;
    }
  `;

  B.Effect.ShadersStore.nebulaCompositeFragmentShader = `
    precision highp float;

    uniform sampler2D textureSampler;
    uniform sampler2D nebulaSampler;
    uniform sampler2D depthSampler;
    uniform vec3 cameraPosition;
    uniform vec3 cameraForward;
    uniform vec3 cameraRight;
    uniform vec3 cameraUp;
    uniform float tanHalfFov;
    uniform float aspect;
    uniform vec2 nebulaTexelSize;
    uniform vec3 occluderPosition;
    uniform float occluderRadius;

    varying vec2 vUV;

    vec3 rayDirection(vec2 uv) {
      vec2 ndc = uv * 2.0 - 1.0;
      return normalize(
        cameraForward +
        cameraRight * ndc.x * aspect * tanHalfFov +
        cameraUp * ndc.y * tanHalfFov
      );
    }

    bool hitsOccluder(vec2 uv) {
      vec3 rd = rayDirection(uv);
      vec3 offset = cameraPosition - occluderPosition;
      float b = dot(offset, rd);
      float c = dot(offset, offset) - occluderRadius * occluderRadius;
      return b * b - c >= 0.0 && -b > 0.0;
    }

    bool hasOpaqueSceneDepth(vec2 uv) {
      return texture2D(depthSampler, uv).r < 0.999;
    }

    vec4 edgeAwareNebula() {
      vec3 toObject = occluderPosition - cameraPosition;
      vec3 rd = rayDirection(vUV);
      float closest = length(cross(normalize(toObject), rd)) * length(toObject);
      float edgeWidth =
        length(toObject) * tanHalfFov * nebulaTexelSize.y * 3.0;
      if (abs(closest - occluderRadius) > edgeWidth) {
        return texture2D(nebulaSampler, vUV);
      }

      vec2 pixel = vUV / nebulaTexelSize - 0.5;
      vec2 base = floor(pixel);
      vec2 fraction = fract(pixel);
      float currentMask = hitsOccluder(vUV) ? 1.0 : 0.0;
      vec4 result = vec4(0.0);
      float totalWeight = 0.0;

      for (int y = 0; y < 2; y++) {
        for (int x = 0; x < 2; x++) {
          vec2 corner = vec2(float(x), float(y));
          vec2 sampleUV = (base + corner + 0.5) * nebulaTexelSize;
          float sampleMask = hitsOccluder(sampleUV) ? 1.0 : 0.0;
          vec2 axisWeight = 1.0 - abs(corner - fraction);
          float weight =
            axisWeight.x *
            axisWeight.y *
            (1.0 - step(0.5, abs(sampleMask - currentMask)));
          result += texture2D(nebulaSampler, sampleUV) * weight;
          totalWeight += weight;
        }
      }
      return totalWeight > 0.001
        ? result / totalWeight
        : texture2D(nebulaSampler, vUV);
    }

    void main() {
      vec4 sceneColor = texture2D(textureSampler, vUV);
      if (hasOpaqueSceneDepth(vUV)) {
        gl_FragColor = sceneColor;
        return;
      }

      vec4 nebula = edgeAwareNebula();
      gl_FragColor = vec4(
        sceneColor.rgb * nebula.a + nebula.rgb,
        sceneColor.a
      );
    }
  `;
}
