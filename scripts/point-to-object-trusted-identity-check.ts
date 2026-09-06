import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // Let Node report the canonical resolution error below.
      }
    }
    return nextResolve(specifier, context);
  }
});

const {
  POINT_OBJECT_TRUSTED_IDENTITY_ANCHOR_MAX_DISTANCE_M,
  matchPointObjectTrustedIdentityAnchor,
  pointObjectIdentityEvidenceDescriptor,
  pointObjectLookupAssociation
} = await import("../src/lib/prototype/point-to-object-trusted-identity");

const dubaiAnchor = [55.271928, 25.20811] as const;

const closeCentroid = matchPointObjectTrustedIdentityAnchor({
  anchor: dubaiAnchor,
  centroid: [55.273, 25.20811],
  geometryContainsAnchor: false,
  boundingBox: null
});
assert.equal(closeCentroid.matched, true);
assert.equal(closeCentroid.basis, "centroid_within_tolerance");
assert.ok(closeCentroid.centroidDistanceM <= POINT_OBJECT_TRUSTED_IDENTITY_ANCHOR_MAX_DISTANCE_M);

const justInsideTolerance = matchPointObjectTrustedIdentityAnchor({
  anchor: [0, 0],
  centroid: [0, 0.0044],
  geometryContainsAnchor: false,
  boundingBox: null
});
assert.equal(justInsideTolerance.matched, true);
assert.ok((justInsideTolerance.centroidDistanceM ?? Infinity) <= POINT_OBJECT_TRUSTED_IDENTITY_ANCHOR_MAX_DISTANCE_M);

const justOutsideTolerance = matchPointObjectTrustedIdentityAnchor({
  anchor: [0, 0],
  centroid: [0, 0.0046],
  geometryContainsAnchor: false,
  boundingBox: null
});
assert.equal(justOutsideTolerance.matched, false, "An object beyond the 500 m cap must fail closed.");
assert.ok((justOutsideTolerance.centroidDistanceM ?? 0) > POINT_OBJECT_TRUSTED_IDENTITY_ANCHOR_MAX_DISTANCE_M);

const containingGeometry = matchPointObjectTrustedIdentityAnchor({
  anchor: dubaiAnchor,
  centroid: [55.30, 25.22],
  geometryContainsAnchor: true,
  boundingBox: null
});
assert.equal(containingGeometry.matched, true);
assert.equal(containingGeometry.basis, "geometry_contains_anchor");

const boundedObject = matchPointObjectTrustedIdentityAnchor({
  anchor: dubaiAnchor,
  centroid: [55.30, 25.22],
  geometryContainsAnchor: false,
  boundingBox: [25.2079, 25.2083, 55.2717, 55.2722]
});
assert.equal(boundedObject.matched, true);
assert.equal(boundedObject.basis, "bounded_bbox_within_tolerance");

const farAwayIdentity = matchPointObjectTrustedIdentityAnchor({
  anchor: dubaiAnchor,
  centroid: [103.851959, 1.29027],
  geometryContainsAnchor: false,
  boundingBox: [1.28, 1.30, 103.84, 103.86]
});
assert.equal(farAwayIdentity.matched, false);
assert.equal(farAwayIdentity.basis, null);
assert.ok((farAwayIdentity.centroidDistanceM ?? 0) > 5_000_000, "A cross-city exact identity must fail closed.");

const oversizedBoundingBox = matchPointObjectTrustedIdentityAnchor({
  anchor: dubaiAnchor,
  centroid: [56, 26],
  geometryContainsAnchor: false,
  boundingBox: [24, 27, 54, 57]
});
assert.equal(oversizedBoundingBox.matched, false, "A broad administrative bbox must not bypass object-level anchoring.");

assert.equal(pointObjectLookupAssociation("nominatim_lookup", true), "trusted_open_map_identity");
assert.equal(pointObjectLookupAssociation("nominatim_lookup", false), "trusted_open_map_identity");
assert.equal(pointObjectLookupAssociation("nominatim_reverse", true), "open_map_geometry_contains_point");

const exactEvidence = pointObjectIdentityEvidenceDescriptor("nominatim_lookup", "trusted_open_map_identity");
assert.match(exactEvidence.label, /exact Nominatim lookup/);
assert.match(exactEvidence.proofLimit, /exact OpenStreetMap identity/);
assert.doesNotMatch(exactEvidence.proofLimit, /Nominatim reverse/);

const reverseEvidence = pointObjectIdentityEvidenceDescriptor("nominatim_reverse", "reverse_nearest_indexed_object_not_point_in_polygon");
assert.match(reverseEvidence.proofLimit, /Nominatim reverse/);

console.log("Point-to-object trusted exact-identity anchor checks passed.");
