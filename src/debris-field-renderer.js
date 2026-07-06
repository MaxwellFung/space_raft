import { createNebula } from "./nebula-renderer.js";

// The debris field intentionally inherits the archived nebula's volumetric
// shape, texture generation, temporal sampling, and performance profile.
export function createDebrisField(scene, debrisField, occluder) {
  return createNebula(scene, debrisField, occluder);
}
