const B = window.BABYLON;
const GRAVITATIONAL_CONSTANT = 6.6743e-11;
const JUPITER_MASS_KG = 1.89813e27;
const JUPITER_RADIUS_KM = 69911;

export function createOrbitalPlatform(
  scene,
  platform,
  primary,
  fragmentLight,
) {
  const metersPerWorldUnit = platform.metersPerWorldUnit ?? 8;
  const width = platform.widthMeters / metersPerWorldUnit;
  const depth = platform.depthMeters / metersPerWorldUnit;
  const thickness = platform.thicknessMeters / metersPerWorldUnit;
  const root = new B.TransformNode(platform.id, scene);
  const deck = B.MeshBuilder.CreateBox(
    `${platform.id}-deck`,
    { width, depth, height: thickness },
    scene,
  );
  deck.parent = root;
  deck.position.y = -thickness * 0.5;
  deck.isPickable = false;

  const material = new B.StandardMaterial(`${platform.id}-material`, scene);
  material.diffuseColor = new B.Color3(0.12, 0.135, 0.15);
  material.specularColor = new B.Color3(0.34, 0.2, 0.1);
  material.specularPower = 18;
  deck.material = material;

  const platformLight = new B.PointLight(
    `${platform.id}-utility-light`,
    new B.Vector3(0, platform.lightHeightMeters / metersPerWorldUnit, 0),
    scene,
  );
  platformLight.parent = root;
  platformLight.diffuse = B.Color3.FromArray(
    platform.lightColor ?? [1.0, 0.78, 0.48],
  );
  platformLight.specular = B.Color3.FromArray(
    platform.lightSpecular ?? [1.0, 0.58, 0.28],
  );
  platformLight.intensity = platform.lightIntensity ?? 1.9;
  platformLight.range = (platform.lightRangeMeters ?? 42) / metersPerWorldUnit;

  if (fragmentLight) {
    fragmentLight.includedOnlyMeshes = [
      ...fragmentLight.includedOnlyMeshes,
      deck,
    ];
  }

  const massKg =
    (primary?.metadata?.massJupiter ?? 30) * JUPITER_MASS_KG;
  const physicalRadiusMeters = platform.orbitRadiusKm * 1000;
  const speedMps = Math.sqrt(
    (GRAVITATIONAL_CONSTANT * massKg) / physicalRadiusMeters,
  );
  const angularSpeed = speedMps / physicalRadiusMeters;
  const periodSeconds = (Math.PI * 2) / angularSpeed;
  const primaryPosition = B.Vector3.FromArray(
    primary?.position ?? [0, 0, 0],
  );
  const initialDirection = B.Vector3.FromArray(
    platform.initialDirection ?? [1, 0, 0],
  ).normalize();
  const planeTangent = B.Vector3.Cross(B.Axis.Y, initialDirection);
  if (planeTangent.lengthSquared() < 0.0001) {
    planeTangent.copyFrom(B.Axis.Z);
  } else {
    planeTangent.normalize();
  }
  const primaryRadiusJupiter = primary?.metadata?.radiusJupiter ?? 1;
  const renderRadius =
    platform.renderOrbitRadius ??
    (platform.orbitRadiusKm / (primaryRadiusJupiter * JUPITER_RADIUS_KM)) *
      primary.scale;
  const tangent = B.Vector3.Zero();
  let orbitAngle = 0;

  updateOrbit();
  scene.onBeforeRenderObservable.add(() => {
    const timeScale = scene.metadata?.timeScale ?? 1;
    const seconds = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    orbitAngle =
      (orbitAngle +
        angularSpeed * seconds * timeScale) %
      (Math.PI * 2);
    updateOrbit();
  });

  const camera = scene.activeCamera;
  camera.parent = root;
  camera.position.set(
    0,
    platform.eyeHeightMeters / metersPerWorldUnit,
    0,
  );
  aimCameraAtPrimary();

  function updateOrbit() {
    const radial = initialDirection
      .scale(Math.cos(orbitAngle))
      .addInPlace(planeTangent.scale(Math.sin(orbitAngle)));
    tangent.copyFrom(initialDirection).scaleInPlace(-Math.sin(orbitAngle));
    tangent.addInPlace(planeTangent.scale(Math.cos(orbitAngle))).normalize();
    root.position.copyFrom(primaryPosition).addInPlace(
      radial.scale(renderRadius),
    );
    root.rotation.y = -Math.atan2(radial.z, radial.x);
  }

  function aimCameraAtPrimary() {
    root.computeWorldMatrix(true);
    const inverseRoot = root.getWorldMatrix().clone().invert();
    const localPrimary = B.Vector3.TransformCoordinates(
      primaryPosition,
      inverseRoot,
    );
    camera.setTarget(localPrimary);
  }

  return {
    root,
    deck,
    light: platformLight,
    orbit: {
      radiusKm: platform.orbitRadiusKm,
      speedMps,
      periodSeconds,
      angularSpeed,
      tangent,
    },
    physics: {
      width,
      depth,
      eyeHeight: platform.eyeHeightMeters / metersPerWorldUnit,
      gravity: platform.gravity ?? 20,
      jumpSpeed: platform.jumpSpeed ?? 5.4,
    },
  };
}
