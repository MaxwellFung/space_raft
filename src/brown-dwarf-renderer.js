const B = window.BABYLON;

registerShader();

export function createBrownDwarf(scene, object, glow) {
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
    material.setFloat("time", performance.now() * 0.001);
    material.setVector3("cameraPosition", scene.activeCamera.position);
    body.rotation.y += scene.getEngine().getDeltaTime() * 0.000006;
  });

  return body;
}

function registerShader() {
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
      float shear =
        sin(latitude * 8.0) * 0.22 +
        sin(latitude * 17.0) * 0.055;

      vec3 rolling = rotateY(n, t * (0.55 + shear));
      vec3 counterRolling = rotateY(n, -t * (0.34 - shear * 0.45));
      vec3 slowFlow =
        rolling * vec3(2.8, 7.5, 2.8) +
        vec3(0.0, 0.0, t * 0.9);
      vec3 counterFlow =
        counterRolling * vec3(4.6, 10.5, 4.6) +
        vec3(7.0, t * 0.4, -t * 0.7);
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
      float swirl = sin(
        (rolling.x + rolling.z) * 5.0 +
        latitude * 15.0 +
        t * 2.1 +
        eddies * 4.0
      );
      float warp =
        (broadFlow - 0.5) * 0.22 +
        (counter - 0.5) * 0.12 +
        (curl - 0.5) * 0.09 +
        swirl * 0.035;

      float hot =
        band(latitude + warp, -0.18, 0.155, 0.06) * 0.95 +
        band(latitude + warp * 0.8, 0.10, 0.10, 0.045) * 1.15 +
        band(latitude + warp * 1.25, -0.58, 0.075, 0.035) * 0.7;
      hot *= smoothstep(
        0.22,
        0.9,
        eddies * 0.55 + curl * 0.42 + counter * 0.25
      );

      float dark =
        band(latitude + warp * 0.7, 0.36, 0.16, 0.055) +
        band(latitude + warp, -0.41, 0.12, 0.05) * 1.2;
      dark *= 0.78 + broadFlow * 0.4 + counter * 0.18;

      float cloud = fbm(
        rolling * vec3(10.0, 21.0, 10.0) +
        vec3(0.0, swirl * 0.8, t * 0.45)
      );
      float filament = fbm(
        counterRolling * vec3(18.0, 34.0, 18.0) +
        vec3(11.0, eddies, t * 0.35)
      );
      float streaks = smoothstep(
        0.34,
        0.9,
        cloud * 0.55 + filament * 0.45 + curl * 0.25
      );

      vec3 blackRed = vec3(0.012, 0.0015, 0.001);
      vec3 deepRed = vec3(0.20, 0.018, 0.008);
      vec3 ember = vec3(0.78, 0.12, 0.035);
      vec3 yellowHot = vec3(2.6, 1.08, 0.18);

      vec3 color = mix(blackRed, deepRed, 0.45 + streaks * 0.4);
      color = mix(
        color,
        ember,
        clamp(streaks * 0.45 - dark * 0.35, 0.0, 1.0)
      );
      color = mix(color, yellowHot, clamp(hot, 0.0, 1.0));
      color *= 1.0 - clamp(dark * 0.82, 0.0, 0.86);

      float facing = clamp(dot(worldNormal, viewDirection), 0.0, 1.0);
      float limb = smoothstep(0.0, 0.82, facing);
      color *= mix(0.08, 1.0, limb);
      color +=
        vec3(0.12, 0.018, 0.004) *
        pow(1.0 - facing, 2.4);

      gl_FragColor = vec4(color, 1.0);
    }
  `;
}
