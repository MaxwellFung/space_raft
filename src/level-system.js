import { createNebula as createOptimizedNebula } from "./nebula-renderer.js";

const B = window.BABYLON;

registerBrownDwarfShader();

export function buildLevel(scene, level) {
  const starlight = new B.HemisphericLight("starlight", B.Vector3.Up(), scene);
  starlight.diffuse = new B.Color3(0.08, 0.1, 0.14);
  starlight.groundColor = B.Color3.Black();
  starlight.intensity = level.lighting?.starAmbient ?? 0.012;

  const glow = new B.GlowLayer("hot-region-glow", scene, {
    blurKernelSize: 128,
    mainTextureRatio: 0.5,
  });
  glow.intensity = 0.95;

  const objectDefinitions = expandObjects(level);
  const objects = objectDefinitions.map((object) =>
    createObject(scene, object, glow),
  );
  const occluder = objectDefinitions.find(
    (object) => object.shape === "brownDwarf",
  );

  return {
    starfield: createStarfield(scene, level.sky),
    nebula: level.nebula
      ? createOptimizedNebula(scene, level.nebula, occluder)
      : null,
    objects,
  };
}

function expandObjects(level) {
  return (level.sprites ?? []).map((sprite) => ({
    ...(level.spriteTypes[sprite.type] ?? {}),
    ...sprite,
    metadata: {
      ...(level.spriteTypes[sprite.type]?.metadata ?? {}),
      ...(sprite.metadata ?? {}),
    },
  }));
}

function createObject(scene, object, glow) {
  if (object.shape === "brownDwarf")
    return createBrownDwarf(scene, object, glow);
  return null;
}

function createStarfield(scene, sky) {
  const random = createRandom(sky.seed);
  const root = new B.TransformNode("starfield", scene);

  for (const layer of sky.starLayers) {
    const cloud = new B.PointsCloudSystem(layer.name, layer.pointSize, scene);

    cloud.addPoints(layer.count, (star) => {
      const y = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const ring = Math.sqrt(1 - y * y);
      const tint = random();
      const base =
        tint < 0.06
          ? [0.42, 0.62, 1]
          : tint < 0.12
            ? [0.68, 0.84, 1]
            : tint < 0.18
              ? [1, 0.42, 0.28]
              : tint < 0.28
                ? [1, 0.78, 0.32]
                : [1, 1, 1];
      const light = layer.brightness * (0.5 + random() * 0.4);

      star.position.set(
        sky.radius * ring * Math.cos(angle),
        sky.radius * y,
        sky.radius * ring * Math.sin(angle),
      );
      star.color = new B.Color4(
        base[0] * light,
        base[1] * light,
        base[2] * light,
        1,
      );
    });

    cloud.buildMeshAsync().then((mesh) => {
      mesh.parent = root;
      mesh.isPickable = false;
      mesh.alwaysSelectAsActiveMesh = true;
    });
  }

  return root;
}

function createNebula(scene, nebula) {
  const camera = scene.activeCamera;
  const engine = scene.getEngine();
  const root = new B.TransformNode(nebula.id, scene);
  root.position = B.Vector3.FromArray(nebula.position);
  root.rotation = B.Vector3.FromArray(nebula.rotation ?? [0, 0, 0]);
  root.scaling.setAll(nebula.radius);

  const volumeTexture = createNebulaVolumeTexture(scene, nebula);
  const depthRenderer = scene.enableDepthRenderer(
    camera,
    true,
    false,
    B.Texture.NEAREST_SAMPLINGMODE,
  );
  const inverseWorld = B.Matrix.Identity();
  const cameraForward = B.Vector3.Zero();
  const cameraRight = B.Vector3.Zero();
  const cameraUp = B.Vector3.Zero();
  const coolColor = B.Color3.FromArray(
    nebula.coolColor ?? [0.14, 0.22, 0.82],
  );
  const warmColor = B.Color3.FromArray(
    nebula.warmColor ?? [1.15, 0.16, 0.035],
  );
  const violetColor = B.Color3.FromArray(
    nebula.violetColor ?? [0.42, 0.12, 0.72],
  );
  const hotColor = B.Color3.FromArray(
    nebula.hotColor ?? [1.95, 0.58, 0.1],
  );
  const coreColor = B.Color3.FromArray(
    nebula.coreColor ?? [2.2, 1.65, 1.15],
  );
  const dustColor = B.Color3.FromArray(
    nebula.dustColor ?? [0.02, 0.006, 0.012],
  );

  const postProcess = new B.PostProcess(
    `${nebula.id}-post-process`,
    "nebula",
    [
      "invWorld",
      "cameraPosition",
      "cameraForward",
      "cameraRight",
      "cameraUp",
      "tanHalfFov",
      "aspect",
      "nearZ",
      "farZ",
      "time",
      "density",
      "absorption",
      "innerVoid",
      "emissionStrength",
      "anisotropy",
      "atlasColumns",
      "atlasRows",
      "volumeResolution",
      "coolColor",
      "warmColor",
      "violetColor",
      "hotColor",
      "coreColor",
      "dustColor",
    ],
    ["depthSampler", "volumeSampler"],
    nebula.renderScale ?? 0.5,
    camera,
    B.Texture.BILINEAR_SAMPLINGMODE,
    engine,
    false,
  );

  postProcess.onApply = (effect) => {
    root.computeWorldMatrix(true);
    inverseWorld.copyFrom(root.getWorldMatrix());
    inverseWorld.invert();
    camera.getDirectionToRef(B.Axis.Z, cameraForward);
    camera.getDirectionToRef(B.Axis.X, cameraRight);
    camera.getDirectionToRef(B.Axis.Y, cameraUp);

    effect.setMatrix("invWorld", inverseWorld);
    effect.setVector3("cameraPosition", camera.position);
    effect.setVector3("cameraForward", cameraForward);
    effect.setVector3("cameraRight", cameraRight);
    effect.setVector3("cameraUp", cameraUp);
    effect.setFloat("tanHalfFov", Math.tan(camera.fov * 0.5));
    effect.setFloat("aspect", engine.getAspectRatio(camera));
    effect.setFloat("nearZ", camera.minZ);
    effect.setFloat("farZ", camera.maxZ);
    effect.setFloat("time", performance.now() * 0.001);
    effect.setFloat("density", nebula.density ?? 0.82);
    effect.setFloat("absorption", nebula.absorption ?? 1.45);
    effect.setFloat("innerVoid", nebula.innerVoid ?? 0.34);
    effect.setFloat("emissionStrength", nebula.emissionStrength ?? 0.62);
    effect.setFloat("anisotropy", nebula.anisotropy ?? 0.34);
    effect.setFloat("atlasColumns", volumeTexture.metadata.columns);
    effect.setFloat("atlasRows", volumeTexture.metadata.rows);
    effect.setFloat("volumeResolution", volumeTexture.metadata.resolution);
    effect.setColor3("coolColor", coolColor);
    effect.setColor3("warmColor", warmColor);
    effect.setColor3("violetColor", violetColor);
    effect.setColor3("hotColor", hotColor);
    effect.setColor3("coreColor", coreColor);
    effect.setColor3("dustColor", dustColor);
    effect.setTexture("depthSampler", depthRenderer.getDepthMap());
    effect.setTexture("volumeSampler", volumeTexture);
  };

  scene.onBeforeRenderObservable.add(() => {
    root.rotation.y += scene.getEngine().getDeltaTime() * 0.0000016;
  });

  return { root, postProcess, volumeTexture };
}

function createNebulaVolumeTexture(scene, nebula) {
  const resolution = nebula.volumeResolution ?? 40;
  const columns = Math.ceil(Math.sqrt(resolution));
  const rows = Math.ceil(resolution / columns);
  const width = columns * resolution;
  const height = rows * resolution;
  const data = new Uint8Array(width * height * 4);
  const seed = nebula.seed ?? 1;
  const innerVoid = nebula.innerVoid ?? 0.34;
  const outerSoftness = nebula.outerSoftness ?? 0.24;

  for (let z = 0; z < resolution; z += 1) {
    const pz = (z / (resolution - 1)) * 2 - 1;
    const tileX = z % columns;
    const tileY = Math.floor(z / columns);

    for (let y = 0; y < resolution; y += 1) {
      const py = (y / (resolution - 1)) * 2 - 1;

      for (let x = 0; x < resolution; x += 1) {
        const px = (x / (resolution - 1)) * 2 - 1;
        const radius = Math.hypot(px, py, pz);
        const outer = 1 - smoothStep(1 - outerSoftness, 1, radius);
        const inner = smoothStep(innerVoid, innerVoid + 0.18, radius);
        const envelope = outer * inner;

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
          px / directionLength * 0.72 + py / directionLength * 0.22,
          -px / directionLength * 0.58 + pz / directionLength * 0.52,
          py / directionLength * 0.46 - pz / directionLength * 0.7,
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
        const erosion = clamp01(detail * 0.82 + ridge * 0.18);
        const emission = clamp01(
          coarse * smoothStep(0.42, 0.92, ridge * 0.82 + macro * 0.18),
        );
        const dust = clamp01(
          coarse * smoothStep(0.36, 0.88, 1 - detail * 0.72 + ridge * 0.18),
        );

        const atlasX = tileX * resolution + x;
        const atlasY = tileY * resolution + y;
        const index = (atlasY * width + atlasX) * 4;

        data[index] = Math.round(coarse * 255);
        data[index + 1] = Math.round(erosion * 255);
        data[index + 2] = Math.round(emission * 255);
        data[index + 3] = Math.round(dust * 255);
      }
    }
  }

  const texture = new B.RawTexture(
    data,
    width,
    height,
    B.Engine.TEXTUREFORMAT_RGBA,
    scene,
    false,
    false,
    B.Texture.BILINEAR_SAMPLINGMODE,
  );

  texture.name = `${nebula.id}-volume-atlas`;
  texture.wrapU = B.Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = B.Texture.CLAMP_ADDRESSMODE;
  texture.gammaSpace = false;
  texture.metadata = { columns, rows, resolution };
  return texture;
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
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function createBrownDwarf(scene, object, glow) {
  const diameter = object.radius * object.scale * 2;
  const body = B.MeshBuilder.CreateSphere(
    object.id,
    { diameter, segments: 160 },
    scene,
  );
  body.position = B.Vector3.FromArray(object.position);
  body.rotation.y = object.rotation ?? 0;

  const material = new B.ShaderMaterial(
    `${object.id}-material`,
    scene,
    "brownDwarf",
    {
      attributes: ["position", "normal"],
      uniforms: ["world", "worldViewProjection", "time", "cameraPosition"],
    },
  );
  material.backFaceCulling = true;
  body.material = material;

  glow.addIncludedOnlyMesh(body);

  scene.onBeforeRenderObservable.add(() => {
    const seconds = performance.now() * 0.001;
    material.setFloat("time", seconds);
    material.setVector3("cameraPosition", scene.activeCamera.position);
    body.rotation.y += scene.getEngine().getDeltaTime() * 0.000006;
  });

  return body;
}

function registerNebulaShader() {
  B.Effect.ShadersStore.nebulaFragmentShader = `
    precision highp float;

    uniform sampler2D textureSampler;
    uniform sampler2D depthSampler;
    uniform sampler2D volumeSampler;

    uniform mat4 invWorld;
    uniform vec3 cameraPosition;
    uniform vec3 cameraForward;
    uniform vec3 cameraRight;
    uniform vec3 cameraUp;
    uniform float tanHalfFov;
    uniform float aspect;
    uniform float nearZ;
    uniform float farZ;
    uniform float time;
    uniform float density;
    uniform float absorption;
    uniform float innerVoid;
    uniform float emissionStrength;
    uniform float anisotropy;
    uniform float atlasColumns;
    uniform float atlasRows;
    uniform float volumeResolution;
    uniform vec3 coolColor;
    uniform vec3 warmColor;
    uniform vec3 violetColor;
    uniform vec3 hotColor;
    uniform vec3 coreColor;
    uniform vec3 dustColor;

    varying vec2 vUV;

    vec3 rotateY(vec3 p, float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
    }

    vec2 atlasUV(vec2 xy, float slice) {
      float tileX = mod(slice, atlasColumns);
      float tileY = floor(slice / atlasColumns);
      vec2 localUV = (xy * (volumeResolution - 1.0) + 0.5) / volumeResolution;
      return (vec2(tileX, tileY) + localUV) / vec2(atlasColumns, atlasRows);
    }

    vec4 sampleVolume(vec3 p) {
      vec3 uvw = p * 0.5 + 0.5;
      if (
        any(lessThan(uvw, vec3(0.0))) ||
        any(greaterThan(uvw, vec3(1.0)))
      ) {
        return vec4(0.0);
      }

      float z = uvw.z * (volumeResolution - 1.0);
      float z0 = floor(z);
      float z1 = min(z0 + 1.0, volumeResolution - 1.0);
      vec4 a = texture2D(volumeSampler, atlasUV(uvw.xy, z0));
      vec4 b = texture2D(volumeSampler, atlasUV(uvw.xy, z1));
      return mix(a, b, fract(z));
    }

    vec4 sampleMedium(vec3 p) {
      vec3 q = rotateY(p, time * 0.006);
      q += vec3(
        sin(q.y * 7.0 + time * 0.035),
        sin(q.z * 6.0 - time * 0.028),
        sin(q.x * 7.5 + time * 0.024)
      ) * 0.012;
      return sampleVolume(q);
    }

    float mediumDensity(vec4 medium) {
      float erosion = (1.0 - medium.g) * 0.12;
      return max(0.0, medium.r - erosion) * density;
    }

    float hgPhase(float cosTheta, float g) {
      float g2 = g * g;
      float denom = pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
      return (1.0 - g2) / max(0.0001, 12.5663706 * denom);
    }

    float approximateLightTransmittance(vec3 p, vec4 medium) {
      float pathLength = max(0.0, length(p) - innerVoid);
      float opticalDepth =
        (medium.r * 0.72 + medium.a * 1.45) *
        density *
        absorption *
        pathLength;
      return exp(-opticalDepth);
    }

    vec3 sampleColor(
      vec3 p,
      vec4 medium,
      float localDensity,
      float lightAmount
    ) {
      float roseField =
        sin(p.x * 3.2 + p.y * 1.7 - p.z * 2.4) * 0.5 + 0.5;
      float violetField =
        sin(p.x * 1.5 - p.y * 3.6 + p.z * 2.1 + 1.8) * 0.5 + 0.5;
      float tealField =
        sin(-p.x * 2.7 + p.y * 2.2 + p.z * 1.4 - 0.7) * 0.5 + 0.5;
      float roseMask = smoothstep(0.3, 0.82, roseField * 0.65 + medium.g * 0.5);
      float violetMask = smoothstep(
        0.42,
        0.88,
        violetField * 0.56 + medium.g * 0.38 + medium.b * 0.18
      );
      float tealMask = smoothstep(
        0.38,
        0.86,
        tealField * 0.72 + (1.0 - medium.g) * 0.34
      );
      float coralMask = smoothstep(0.38, 0.92, medium.b * 0.82 + medium.g * 0.3);
      float coreLobeA =
        1.0 - smoothstep(0.08, 0.38, length(p - vec3(0.16, 0.08, -0.08)));
      float coreLobeB =
        1.0 - smoothstep(0.06, 0.3, length(p - vec3(-0.32, 0.16, 0.2)));
      float coreMask =
        pow(clamp(medium.b, 0.0, 1.0), 1.45) *
        (0.34 + max(coreLobeA, coreLobeB) * 1.2);

      float tealZone = smoothstep(
        -0.28,
        0.72,
        -p.x * 1.08 - p.y * 0.24 + p.z * 0.18
      );
      float roseZone = smoothstep(
        -0.32,
        0.76,
        p.x * 0.82 + p.y * 0.14 - p.z * 0.24
      );
      float violetZone = smoothstep(
        -0.36,
        0.7,
        -p.x * 0.22 + p.y * 0.9 + p.z * 0.32
      );

      float tealWeight =
        pow(max(tealMask, 0.08), 1.9) *
        (0.35 + tealZone * 3.2) *
        (1.0 - medium.b * 0.38);
      float violetWeight =
        pow(max(violetMask, 0.05), 2.0) *
        (0.42 + violetZone * 1.7);
      float roseWeight =
        pow(max(roseMask, 0.04), 2.15) *
        (0.35 + roseZone * 2.1);
      float coralWeight = pow(max(coralMask, 0.03), 2.3);
      float weightSum =
        tealWeight + violetWeight + roseWeight + coralWeight + 0.0001;
      vec3 color =
        (
          coolColor * tealWeight +
          violetColor * violetWeight +
          warmColor * roseWeight +
          hotColor * coralWeight
        ) / weightSum;

      color = mix(color, dustColor, medium.a * 0.68);
      color *= 0.22 + lightAmount * (0.54 + medium.g * 0.3);
      color +=
        (
          coolColor * tealWeight +
          violetColor * violetWeight +
          warmColor * roseWeight
        ) * medium.r * emissionStrength * 0.24;
      color += coolColor * tealZone * medium.r * emissionStrength * 0.34;
      color +=
        violetColor * violetZone * medium.r * emissionStrength * 0.18;
      color += hotColor * medium.b * emissionStrength * (0.2 + lightAmount * 0.72);
      color +=
        coreColor *
        max(coreMask, smoothstep(0.68, 0.98, medium.b) * 0.22) *
        emissionStrength *
        1.8;
      float ionizedGas = tealZone * smoothstep(0.08, 0.54, medium.r);
      color = mix(
        color,
        coolColor * (0.28 + lightAmount * 0.72),
        ionizedGas * 0.72
      );
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = max(vec3(0.0), mix(vec3(luminance), color, 1.22));
      return color * (0.48 + localDensity * 1.08);
    }

    bool raySphere(vec3 ro, vec3 rd, out float t0, out float t1) {
      float b = dot(ro, rd);
      float c = dot(ro, ro) - 1.0;
      float h = b * b - c;
      if (h < 0.0) return false;
      h = sqrt(h);
      t0 = -b - h;
      t1 = -b + h;
      return true;
    }

    void main() {
      vec4 sceneColor = texture2D(textureSampler, vUV);
      vec2 ndc = vUV * 2.0 - 1.0;
      vec3 rdWorld = normalize(
        cameraForward +
        cameraRight * ndc.x * aspect * tanHalfFov +
        cameraUp * ndc.y * tanHalfFov
      );
      vec3 ro = (invWorld * vec4(cameraPosition, 1.0)).xyz;
      vec3 localDirection = (invWorld * vec4(rdWorld, 0.0)).xyz;
      float localPerWorld = length(localDirection);
      vec3 rd = localDirection / max(localPerWorld, 0.00001);

      float t0;
      float t1;
      if (!raySphere(ro, rd, t0, t1)) {
        gl_FragColor = sceneColor;
        return;
      }

      float tEnter = max(t0, 0.0);
      float tExit = t1;
      float sceneDepth = texture2D(depthSampler, vUV).r;
      float viewDepth =
        nearZ * farZ / max(0.0001, farZ - sceneDepth * (farZ - nearZ));
      float rayDepth =
        viewDepth / max(0.001, dot(rdWorld, cameraForward));
      tExit = min(tExit, rayDepth * localPerWorld);

      if (tExit <= tEnter) {
        gl_FragColor = sceneColor;
        return;
      }

      float totalLen = tExit - tEnter;
      float stepLen = max(totalLen / 40.0, 0.014);

      vec3 accum = vec3(0.0);
      float transmittance = 1.0;
      float travel = tEnter + stepLen * 0.5;

      for (int i = 0; i < 40; i++) {
        if (travel >= tExit || transmittance < 0.03) break;

        vec3 p = ro + rd * travel;
        vec4 medium = sampleMedium(p);

        float d = mediumDensity(medium);
        if (d > 0.002) {
          vec3 lightDir = normalize(-p);
          float lightTr = approximateLightTransmittance(p, medium);
          float phase = hgPhase(dot(rd, lightDir), anisotropy);
          float centerGlow = 1.0 - smoothstep(0.2, 0.86, length(p));
          float lightAmount =
            lightTr * (0.18 + phase * 2.0 + centerGlow * 0.24);

          vec3 sampleCol = sampleColor(p, medium, d, lightAmount);

          float extinction = d * absorption * stepLen;
          float alpha = 1.0 - exp(-extinction);

          accum += transmittance * sampleCol * alpha;
          transmittance *= (1.0 - alpha);
        }

        travel += stepLen;
      }

      gl_FragColor = vec4(
        sceneColor.rgb * transmittance + accum,
        sceneColor.a
      );
    }
  `;
}

function registerBrownDwarfShader() {
  B.Effect.ShadersStore.brownDwarfVertexShader = `
    precision highp float;

    attribute vec3 position;
    attribute vec3 normal;

    uniform mat4 world;
    uniform mat4 worldViewProjection;

    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      vec4 worldPosition = world * vec4(position, 1.0);
      vPosition = position;
      vWorldPosition = worldPosition.xyz;
      vNormal = normalize(mat3(world) * normal);
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  B.Effect.ShadersStore.brownDwarfFragmentShader = `
    precision highp float;

    uniform float time;
    uniform vec3 cameraPosition;

    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    float hash(vec3 p) {
      return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
    }

    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(
          mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
          f.y
        ),
        mix(
          mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
          f.y
        ),
        f.z
      );
    }

    float fbm(vec3 p) {
      float value = 0.0;
      float amplitude = 0.5;

      for (int i = 0; i < 5; i++) {
        value += noise(p) * amplitude;
        p = p * 2.04 + vec3(19.2, 7.1, 11.7);
        amplitude *= 0.5;
      }

      return value;
    }

    float band(float lat, float center, float width, float edge) {
      return 1.0 - smoothstep(width - edge, width, abs(lat - center));
    }

    vec3 rotateY(vec3 p, float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
    }

    void main() {
      vec3 n = normalize(vPosition);
      vec3 worldNormal = normalize(vNormal);
      vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

      float latitude = asin(clamp(n.y, -1.0, 1.0));
      float t = time * 0.018;
      float shear = sin(latitude * 8.0) * 0.22 + sin(latitude * 17.0) * 0.055;

      vec3 rolling = rotateY(n, t * (0.55 + shear));
      vec3 counterRolling = rotateY(n, -t * (0.34 - shear * 0.45));
      vec3 slowFlow = rolling * vec3(2.8, 7.5, 2.8) + vec3(0.0, 0.0, t * 0.9);
      vec3 counterFlow = counterRolling * vec3(4.6, 10.5, 4.6) + vec3(7.0, t * 0.4, -t * 0.7);
      float broadFlow = fbm(slowFlow);
      float counter = fbm(counterFlow);
      float eddies = fbm(vec3(
        rolling.x * 8.0 + sin(latitude * 10.0 + t * 1.7) * 0.55,
        latitude * 18.0 + cos(rolling.z * 7.0 - t * 1.3) * 0.35,
        rolling.z * 8.0 + t * 1.2
      ));
      float curl = fbm(vec3(
        counterRolling.x * 11.5 + (broadFlow - 0.5) * 3.2 - t * 0.8,
        latitude * 24.0 + (counter - 0.5) * 2.8 + t * 0.55,
        counterRolling.z * 11.5 + t * 0.65
      ));
      float swirl = sin((rolling.x + rolling.z) * 5.0 + latitude * 15.0 + t * 2.1 + eddies * 4.0);
      float warp =
        (broadFlow - 0.5) * 0.22 +
        (counter - 0.5) * 0.12 +
        (curl - 0.5) * 0.09 +
        swirl * 0.035;

      float hot =
        band(latitude + warp, -0.18, 0.155, 0.06) * 0.95 +
        band(latitude + warp * 0.8, 0.10, 0.10, 0.045) * 1.15 +
        band(latitude + warp * 1.25, -0.58, 0.075, 0.035) * 0.7;
      hot *= smoothstep(0.22, 0.9, eddies * 0.55 + curl * 0.42 + counter * 0.25);

      float dark =
        band(latitude + warp * 0.7, 0.36, 0.16, 0.055) +
        band(latitude + warp, -0.41, 0.12, 0.05) * 1.2;
      dark *= 0.78 + broadFlow * 0.4 + counter * 0.18;

      float cloud = fbm(rolling * vec3(10.0, 21.0, 10.0) + vec3(0.0, swirl * 0.8, t * 0.45));
      float filament = fbm(counterRolling * vec3(18.0, 34.0, 18.0) + vec3(11.0, eddies, t * 0.35));
      float streaks = smoothstep(0.34, 0.9, cloud * 0.55 + filament * 0.45 + curl * 0.25);

      vec3 blackRed = vec3(0.012, 0.0015, 0.001);
      vec3 deepRed = vec3(0.20, 0.018, 0.008);
      vec3 ember = vec3(0.78, 0.12, 0.035);
      vec3 yellowHot = vec3(2.6, 1.08, 0.18);

      vec3 color = mix(blackRed, deepRed, 0.45 + streaks * 0.4);
      color = mix(color, ember, clamp(streaks * 0.45 - dark * 0.35, 0.0, 1.0));
      color = mix(color, yellowHot, clamp(hot, 0.0, 1.0));
      color *= 1.0 - clamp(dark * 0.82, 0.0, 0.86);

      float facing = clamp(dot(worldNormal, viewDirection), 0.0, 1.0);
      float limb = smoothstep(0.0, 0.82, facing);
      color *= mix(0.08, 1.0, limb);
      color += vec3(0.12, 0.018, 0.004) * pow(1.0 - facing, 2.4);

      gl_FragColor = vec4(color, 1.0);
    }
  `;
}

function createRandom(seed) {
  let state = seed;
  return () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}

const brownDwarf = {
  id: "brown_dwarf",
  name: "Brown Dwarf",
  description: "A solitary dim brown dwarf in deep space.",

  spawn: {
    position: [0, 0, -130],
    target: [0, 0, 0],
  },

  player: {
    speed: 12,
    boostSpeed: 42,
  },

  lighting: {
    starAmbient: 0,
  },

  sky: {
    seed: 2300,
    radius: 900,
    background: ["#02040b", "#000000"],
    starLayers: [
      { count: 1800, pointSize: 1.0, brightness: 0.42 },
      { count: 260, pointSize: 1.5, brightness: 0.62 },
      { count: 35, pointSize: 2.2, brightness: 0.8 },
    ],
  },

  nebula: {
    id: "brown_dwarf_orange_nebula",
    seed: 23017,
    position: [0, 0, 0],
    rotation: [0.08, -0.35, 0.12],
    radius: 90,
    segments: 40,
    density: 0.82,
    absorption: 1.45,
    emissionStrength: 0.62,
    anisotropy: 0.34,
    stepScale: 0.72,
    innerVoid: 0.34,
    outerSoftness: 0.24,
    warpStrength: 0.22,
    coolColor: [0.14, 0.22, 0.82],
    warmColor: [1.15, 0.16, 0.035],
    hotColor: [1.95, 0.58, 0.1],
    dustColor: [0.02, 0.006, 0.012],
  },

  spriteTypes: {
    brownDwarf: {
      shape: "brownDwarf",
      radius: 1,
      color: [150, 72, 45],
      glow: 0.35,
      metadata: {
        massJupiter: 30,
        radiusJupiter: 1,
        estimatedTemperatureK: 950,
        spectralStyle: "cool T-type",
        atmosphere:
          "Dim near-visible glow, methane absorption, and patchy sulfide/silicate cloud bands.",
      },
    },
  },

  sprites: [
    {
      id: "central_brown_dwarf",
      type: "brownDwarf",
      position: [0, 0, 0],
      scale: 30,
      rotation: -0.08,
      lightIntensity: 1.9,
      lightRange: 650,
      tags: ["star", "brown_dwarf", "navigation_anchor"],
    },
  ],
  structureTypes: {},
  structures: [],
  signals: [],
};

export default brownDwarf;
