import { createBrownDwarf } from "./brown-dwarf-renderer.js";
import { createBrownDwarfImpacts } from "./brown-dwarf-impact-renderer.js";
import { createDebrisField } from "./debris-field-renderer.js";
import { createOrbitalPlatform } from "./orbital-platform-renderer.js";

const B = window.BABYLON;

export function buildLevel(scene, level) {
  const starAmbient = level.lighting?.starAmbient ?? 0;
  if (level.lighting?.allowAmbientLight && starAmbient > 0) {
    const starlight = new B.HemisphericLight(
      "starlight",
      B.Vector3.Up(),
      scene,
    );
    starlight.diffuse = new B.Color3(0.08, 0.1, 0.14);
    starlight.groundColor = B.Color3.Black();
    starlight.intensity = starAmbient;
  }

  const glow = new B.GlowLayer("hot-region-glow", scene, {
    blurKernelSize: 128,
    mainTextureRatio: 0.5,
  });
  glow.intensity = 0.95;

  const definitions = expandObjects(level);
  const objects = definitions.map((object) =>
    createObject(scene, object, glow),
  );
  const occluder = definitions.find(
    (object) => object.shape === "brownDwarf",
  );
  const primaryMesh = objects.find(Boolean);

  const debrisField = level.debrisField
    ? createDebrisField(scene, level.debrisField, occluder)
    : null;
  const impacts = level.brownDwarfImpacts && occluder
    ? createBrownDwarfImpacts(
        scene,
        level.brownDwarfImpacts,
        occluder,
        primaryMesh,
        glow,
      )
    : null;
  const platform = level.platform
    ? createOrbitalPlatform(
      scene,
      level.platform,
      occluder,
    )
    : null;
  if (debrisField?.rocks && platform) {
    debrisField.rocks.setRenderCenter(() => platform.root.position);
    debrisField.rocks.setFlowDirection(() => platform.orbit.tangent);
  }

  return {
    starfield: createStarfield(scene, level.sky),
    debrisField,
    impacts,
    platform,
    objects,
    primaryMesh,
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
  if (object.shape === "brownDwarf") {
    return createBrownDwarf(scene, object, glow);
  }
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
        tint < 0.14
          ? [0.48, 0.66, 1.0]
          : tint < 0.28
            ? [0.64, 0.92, 1.0]
            : tint < 0.4
              ? [0.64, 1.0, 0.86]
              : tint < 0.53
                ? [1.0, 0.72, 0.42]
                : tint < 0.65
                  ? [1.0, 0.48, 0.34]
                  : tint < 0.75
                    ? [0.88, 0.58, 1.0]
                    : [1.0, 0.98, 0.9];
      const light = layer.brightness * (0.58 + random() * 0.46);

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

function createRandom(seed) {
  let state = seed;
  return () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}
