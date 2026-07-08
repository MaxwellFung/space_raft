export async function loadSaveFile(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load save file ${path}: ${response.status}`);
  }
  return response.json();
}

export function applySaveToLevel(level, save) {
  const next = clone(level);
  next.save = {
    id: save.id,
    path: save.path,
  };

  if (save.spawn) {
    next.spawn = merge(next.spawn ?? {}, save.spawn);
  }
  if (save.player) {
    next.player = merge(next.player ?? {}, save.player);
  }
  if (save.debrisField && next.debrisField) {
    next.debrisField = applyTransformPatch(next.debrisField, save.debrisField);
  }
  if (save.platform && next.platform) {
    next.platform = applyPlatformPatch(next.platform, save.platform);
  }
  if (save.objects) {
    next.sprites = (next.sprites ?? []).map((sprite) => {
      const patch = save.objects[sprite.id];
      return patch ? applyTransformPatch(sprite, patch) : sprite;
    });
  }

  return next;
}

function applyPlatformPatch(platform, patch) {
  const next = merge(platform, patch);

  if (patch.modelRotationDegrees) {
    next.modelRotation = degreesToRadians(patch.modelRotationDegrees);
  }
  if (patch.modelYawDegrees !== undefined) {
    next.modelYawRadians = degreesToRadians(patch.modelYawDegrees);
  }
  if (patch.initialCameraYawDegrees !== undefined) {
    next.initialCameraYawRadians = degreesToRadians(patch.initialCameraYawDegrees);
  }
  if (patch.initialCameraRotationDegrees) {
    next.initialCameraRotation = degreesToRadians(
      patch.initialCameraRotationDegrees,
    );
  }
  if (patch.orbit) {
    next.orbit = merge(platform.orbit ?? {}, patch.orbit);
  }

  return next;
}

function applyTransformPatch(object, patch) {
  const next = merge(object, patch);
  if (patch.rotationDegrees) {
    next.rotation = degreesToRadians(patch.rotationDegrees);
  }
  return next;
}

function merge(base, patch) {
  const output = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      output[key] = merge(output[key] ?? {}, value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function degreesToRadians(value) {
  if (Array.isArray(value)) {
    return value.map((component) => degreesToRadians(component));
  }
  return value * Math.PI / 180;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
