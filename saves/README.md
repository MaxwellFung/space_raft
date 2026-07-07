# Save Files

Run a save with:

```text
http://127.0.0.1:5500/index.html?save=./saves/brown-dwarf-default.json
```

If no `save` query parameter is provided, the app loads
`./saves/brown-dwarf-default.json`.

Useful spatial controls:

- `objects.<id>.position`: world position.
- `objects.<id>.rotationDegrees`: world `[x, y, z]` rotation in degrees.
- `debrisField.position` / `debrisField.rotationDegrees`: nebula/debris transform.
- `debrisField.rockRenderDistance`: radius of the local asteroid render ball
  around the ship.
- `debrisField.nearFragmentCount` / `debrisField.maxActiveRocks`: asteroid
  density budget inside that ball.
- `debrisField.shipGraceRadius`: no-rock bubble around the ship.
- `debrisField.rockFadeStart` / `debrisField.rockFadeEnd`: fade shell near the
  edge of the render ball.
- `platform.modelRotationDegrees`: rotation of the imported ship model inside the
  platform frame.
- `platform.physicsBounds`: optional explicit local collision bounds, with
  `{ "min": [x, y, z], "max": [x, y, z] }`.
- `platform.physicsProbePosition`: optional local point used to raycast toward
  the actual model walls/floor/ceiling for player bounds.
- `platform.orbit.fixed`: `true` for geostationary/station-kept, `false` to move.
- `platform.orbit.lockOrientation`: when `true`, the ship moves along the orbit
  while keeping its initial attitude instead of rotating to face radial/prograde.
- `platform.orbit.renderRadius`: visual orbit radius in world units.
- `platform.orbit.radiusKm`: physical orbit radius used for speed/HUD.
- `platform.orbit.radialDirection`: direction from the brown dwarf to the ship.
- `platform.orbit.normalDirection`: orbit axis. `[0, 1, 0]` is an equatorial orbit.
- `platform.orbit.phaseDegrees`: starting phase around `normalDirection`.
- `platform.orbit.rollDegrees`: rolls the whole platform around its local
  forward/prograde axis.
- `platform.orbit.floorUp`: usually `"radial"` so ship floor-down points toward
  the brown dwarf.
- `platform.orbit.forward`: usually `"prograde"` so local forward follows orbit
  motion.
- `platform.orbit.showGuide` / `guideColor` / `guideAlpha`: yellow orbit line.

Direction keywords: `"radial"`, `"nadir"`, `"prograde"`, `"retrograde"`,
`"normal"`, `"antinormal"`, or a raw vector like `[0, 0, 1]`.
