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

  return {
    starfield: createStarfield(scene, level.sky),
    objects: expandObjects(level).map((object) => createObject(scene, object, glow)),
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
  if (object.shape === "brownDwarf") return createBrownDwarf(scene, object, glow);
  if (object.shape === "habitablePlanet") return createHabitablePlanet(scene, object);
  if (object.shape === "debrisSwarms") return createDebrisSwarms(scene, object);
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

  const light = new B.PointLight(`${object.id}-light`, body.position, scene);
  light.diffuse = new B.Color3(1, 0.28, 0.05);
  light.specular = new B.Color3(0.25, 0.05, 0.01);
  light.intensity = object.lightIntensity ?? 1.7;
  light.range = object.lightRange ?? diameter * 10;

  scene.onBeforeRenderObservable.add(() => {
    const seconds = performance.now() * 0.001;
    material.setFloat("time", seconds);
    material.setVector3("cameraPosition", scene.activeCamera.position);
    body.rotation.y += scene.getEngine().getDeltaTime() * 0.000006;
  });

  return body;
}

function createHabitablePlanet(scene, object) {
  const diameter = object.radius * object.scale * 2;
  const planet = B.MeshBuilder.CreateSphere(
    object.id,
    { diameter, segments: 64 },
    scene,
  );
  planet.position = B.Vector3.FromArray(object.position);

  const material = new B.StandardMaterial(`${object.id}-material`, scene);
  material.diffuseTexture = createHabitablePlanetTexture(scene, object);
  material.specularColor = new B.Color3(0.05, 0.06, 0.07);
  material.emissiveColor = new B.Color3(0.006, 0.008, 0.01);
  planet.material = material;

  scene.onBeforeRenderObservable.add(() => {
    planet.rotation.y += scene.getEngine().getDeltaTime() * 0.00002;
  });

  return planet;
}

function createHabitablePlanetTexture(scene, object) {
  const texture = new B.DynamicTexture(
    `${object.id}-texture`,
    { width: 512, height: 256 },
    scene,
    false,
  );
  const ctx = texture.getContext();

  const ocean = ctx.createLinearGradient(0, 0, 0, 256);
  ocean.addColorStop(0, "#07101c");
  ocean.addColorStop(0.5, "#11304a");
  ocean.addColorStop(1, "#070b12");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 34; i += 1) {
    const x = (i * 83) % 512;
    const y = 32 + ((i * 47) % 184);
    const land = i % 3 === 0 ? "42, 76, 54" : "74, 82, 56";
    ctx.fillStyle = `rgba(${land}, 0.72)`;
    ctx.beginPath();
    ctx.ellipse(x, y, 18 + (i % 7) * 7, 7 + (i % 5) * 5, i * 0.41, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 22; i += 1) {
    const x = (i * 131) % 512;
    const y = 25 + ((i * 29) % 205);
    ctx.strokeStyle = "rgba(220, 232, 232, 0.28)";
    ctx.lineWidth = 2 + (i % 3);
    ctx.beginPath();
    ctx.ellipse(x, y, 42 + (i % 6) * 9, 4 + (i % 4), i * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  texture.update();
  return texture;
}

function createDebrisSwarms(scene, object) {
  const random = createRandom(object.seed ?? 1);
  const center = B.Vector3.FromArray(object.position);
  const root = new B.TransformNode(object.id, scene);
  const rockMaterial = new B.StandardMaterial(`${object.id}-rock-material`, scene);
  const laneMaterial = new B.StandardMaterial(`${object.id}-lane-material`, scene);
  const swarms = [];

  rockMaterial.diffuseColor = new B.Color3(0.3, 0.25, 0.22);
  rockMaterial.specularColor = new B.Color3(0.025, 0.02, 0.018);
  laneMaterial.emissiveColor = new B.Color3(0.42, 0.15, 0.04);
  laneMaterial.diffuseColor = new B.Color3(0.28, 0.12, 0.05);
  laneMaterial.alpha = 0.24;
  laneMaterial.disableLighting = true;

  for (let index = 0; index < object.swarmCount; index += 1) {
    const swarm = createDebrisSwarm(scene, object, index, random, rockMaterial, laneMaterial);
    swarm.root.parent = root;
    swarms.push(swarm);
  }

  scene.onBeforeRenderObservable.add(() => {
    const seconds = scene.getEngine().getDeltaTime() / 1000;
    const cameraPosition = scene.activeCamera.position;

    for (const swarm of swarms) {
      swarm.phase += swarm.speed * seconds;
      swarm.root.position.copyFrom(
        center
          .add(swarm.u.scale(Math.cos(swarm.phase) * swarm.radius))
          .addInPlace(swarm.v.scale(Math.sin(swarm.phase) * swarm.radius * swarm.eccentricity))
          .addInPlace(swarm.normal.scale(Math.sin(swarm.phase * 1.7) * swarm.verticalDrift)),
      );
      swarm.root.rotation.y += seconds * swarm.tumble;
      swarm.root.rotation.x += seconds * swarm.tumble * 0.37;

      const distance = B.Vector3.Distance(cameraPosition, swarm.root.position);
      if (swarm.dustMesh) swarm.dustMesh.setEnabled(distance < object.farRenderDistance);
      swarm.rockMesh.setEnabled(distance < object.nearRenderDistance);
    }
  });

  return root;
}

function createDebrisSwarm(scene, object, index, random, rockMaterial, laneMaterial) {
  const normal = randomUnitVector(random);
  const reference = Math.abs(B.Vector3.Dot(normal, B.Axis.Y)) > 0.82
    ? B.Axis.X
    : B.Axis.Y;
  const u = B.Vector3.Cross(normal, reference).normalize();
  const v = B.Vector3.Cross(normal, u).normalize();
  const root = new B.TransformNode(`${object.id}-swarm-${index}`, scene);
  const radius = object.orbitRadiusMin + random() * (object.orbitRadiusMax - object.orbitRadiusMin);
  const eccentricity = 0.55 + random() * 0.55;
  const arcLength = object.arcLengthMin + random() * (object.arcLengthMax - object.arcLengthMin);
  const arcStart = random() * Math.PI * 2;
  const lanes = createSwarmLanes(scene, object, index, random, laneMaterial, {
    normal,
    u,
    v,
    radius,
    eccentricity,
    arcStart,
    arcLength,
  });
  const swarm = {
    root,
    normal,
    u,
    v,
    radius,
    eccentricity,
    phase: random() * Math.PI * 2,
    speed: 0.0025 + random() * 0.007,
    tumble: (random() - 0.5) * 0.08,
    verticalDrift: 16 + random() * 72,
    dustMesh: lanes,
    rockMesh: createSwarmRocks(scene, object, random, rockMaterial, {
      u,
      v,
      normal,
      radius,
      eccentricity,
      arcStart,
      arcLength,
    }),
  };

  lanes.parent = root;
  swarm.rockMesh.parent = root;
  swarm.rockMesh.setEnabled(false);

  return swarm;
}

function createSwarmLanes(scene, object, index, random, material, stream) {
  const root = new B.TransformNode(`${object.id}-lanes-${index}`, scene);

  for (let lane = 0; lane < object.lanesPerSwarm; lane += 1) {
    const offset = (lane - (object.lanesPerSwarm - 1) * 0.5) * object.laneWidth;
    const path = createArcPath(stream, {
      arcStart: stream.arcStart + (random() - 0.5) * 0.12,
      arcLength: stream.arcLength * (0.82 + random() * 0.36),
      radiusOffset: offset + (random() - 0.5) * object.laneWidth,
      planeOffset: (random() - 0.5) * object.laneWidth * 1.4,
      wobble: 3 + random() * 8,
      samples: 46,
    });
    const laneMesh = B.MeshBuilder.CreateTube(
      `${object.id}-lane-${index}-${lane}`,
      {
        path,
        radius: object.laneThickness * (0.65 + random() * 0.8),
        tessellation: 5,
        cap: B.Mesh.NO_CAP,
      },
      scene,
    );

    laneMesh.material = material;
    laneMesh.isPickable = false;
    laneMesh.parent = root;
  }

  return root;
}

function createSwarmRocks(scene, object, random, material, stream) {
  const source = B.MeshBuilder.CreateSphere(
    `${object.id}-rock-source`,
    { diameter: 1, segments: 4 },
    scene,
  );
  const sps = new B.SolidParticleSystem(`${object.id}-rocks`, scene, {
    updatable: false,
  });

  sps.addShape(source, object.rocksPerSwarm, {
    positionFunction: (particle) => {
      const scale =
        object.minRockScale +
        random() ** 2.2 * (object.maxRockScale - object.minRockScale);
      const warmth = 0.45 + random() * 0.4;

      particle.position = randomOnArc(random, stream, {
        radiusJitter: object.laneWidth * 2.5,
        planeJitter: object.laneWidth * 1.8,
      });
      particle.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
      particle.scale.set(
        scale * (0.7 + random() * 0.8),
        scale * (0.5 + random() * 0.7),
        scale * (0.75 + random() * 1.1),
      );
      particle.color = new B.Color4(
        0.34 * warmth,
        0.29 * warmth,
        0.25 * warmth,
        1,
      );
    },
  });

  const mesh = sps.buildMesh();
  mesh.material = material;
  mesh.isPickable = false;
  source.dispose();
  return mesh;
}

function createArcPath(stream, options) {
  return Array.from({ length: options.samples }, (_unused, sample) => {
    const t = sample / (options.samples - 1);
    const angle = options.arcStart + options.arcLength * t;
    const wobble = Math.sin(t * Math.PI * 2.0 + options.arcStart * 1.7) * options.wobble;
    const radius = stream.radius + options.radiusOffset + wobble;
    const planeOffset =
      options.planeOffset +
      Math.sin(t * Math.PI * 3.0 + stream.arcStart) * options.wobble * 0.45;

    return stream.u
      .scale(Math.cos(angle) * radius)
      .addInPlace(stream.v.scale(Math.sin(angle) * radius * stream.eccentricity))
      .addInPlace(stream.normal.scale(planeOffset));
  });
}

function randomOnArc(random, stream, options) {
  const angle = stream.arcStart + stream.arcLength * random();
  const radius = stream.radius + (random() - 0.5) * options.radiusJitter;
  const planeOffset = (random() - 0.5) * options.planeJitter;

  return stream.u
    .scale(Math.cos(angle) * radius)
    .addInPlace(stream.v.scale(Math.sin(angle) * radius * stream.eccentricity))
    .addInPlace(stream.normal.scale(planeOffset));
}

function randomUnitVector(random) {
  const y = random() * 2 - 1;
  const angle = random() * Math.PI * 2;
  const ring = Math.sqrt(1 - y * y);

  return new B.Vector3(
    ring * Math.cos(angle),
    y,
    ring * Math.sin(angle),
  );
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
