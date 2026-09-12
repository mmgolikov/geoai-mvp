import { expect, test } from "@playwright/test";
import { findRestoreNavigationTarget, isCompletedNavigationCamera, matchesRestoredFindViewport, sameFindBounds } from "../../src/lib/prototype/point-to-object-find-viewport";
import type { PointObjectFindBounds } from "../../src/lib/prototype/point-to-object-find-contract";

test("Find restore ignores intermediate/resize bounds, accepts only matching navigation, then detects user movement", () => {
  const query: PointObjectFindBounds = [55.2707600611711, 25.20708560469292, 55.27303993883396, 25.209114387591754];
  const intermediate: PointObjectFindBounds = [55.26966293974647, 25.20614241218388, 55.27443684790833, 25.210390539241644];
  const final: PointObjectFindBounds = [55.270522848465646, 25.206874515513405, 55.27327715153842, 25.209325472888523];
  let pending: { bounds: PointObjectFindBounds; requestId: string } | null = { bounds: query, requestId: "restore-find-bounds:saved-1" };
  const originalQuery = [...query];
  expect(matchesRestoredFindViewport(intermediate, pending)).toBe(false);
  expect(matchesRestoredFindViewport(intermediate, pending, "different-request")).toBe(false);
  expect(matchesRestoredFindViewport(final, pending, pending.requestId)).toBe(true);
  const restoredViewport = final;
  pending = null;
  expect(sameFindBounds(final, restoredViewport)).toBe(true);
  const panned: PointObjectFindBounds = [final[0] + .002, final[1], final[2] + .002, final[3]];
  expect(matchesRestoredFindViewport(panned, pending)).toBe(false);
  expect(sameFindBounds(panned, restoredViewport) || sameFindBounds(panned, query)).toBe(false);
  expect(query).toEqual(originalQuery);
});

test("Find restore keeps spatial containment and bounded-area guards even for matching request", () => {
  const pending = { bounds: [1, 1, 2, 2] as PointObjectFindBounds, requestId: "restore" };
  expect(matchesRestoredFindViewport([1.1, 1, 2, 2], pending, "restore")).toBe(false);
  expect(matchesRestoredFindViewport([-10, -10, 10, 10], pending, "restore")).toBe(false);
});

test("interrupted tagged moveend cannot accept an intermediate camera as completed restore", () => {
  const pending = { bounds: [1, 1, 2, 2] as PointObjectFindBounds, requestId: "restore" };
  const expected = { center: [1.5, 1.5] as [number, number], zoom: 10, bearing: 0, pitch: 0 };
  const interrupted = { center: [1.6, 1.5] as [number, number], zoom: 9.5, bearing: 0, pitch: 0 };
  const propagatedId = isCompletedNavigationCamera(interrupted, expected) ? pending.requestId : undefined;
  expect(propagatedId).toBeUndefined();
  expect(matchesRestoredFindViewport([.5, .5, 2.5, 2.5], pending, propagatedId)).toBe(false);
  expect(isCompletedNavigationCamera(expected, expected)).toBe(true);
  expect(isCompletedNavigationCamera({ ...expected, zoom: 9.99 }, expected)).toBe(false);
  expect(isCompletedNavigationCamera({ ...expected, pitch: 15 }, expected)).toBe(false);
  expect(isCompletedNavigationCamera(expected)).toBe(false);
});

test("empty Find restoration fits immutable query bounds without inventing a selection", () => {
  const bounds: PointObjectFindBounds = [55.27, 25.20, 55.28, 25.21];
  const navigation = findRestoreNavigationTarget(bounds, "empty-find");
  expect(navigation).toEqual({ requestId: "restore-find-bounds:empty-find", longitude: 55.275000000000006, latitude: 25.205, boundingBox: [25.20, 25.21, 55.27, 55.28], selectAfterNavigation: false, viewMode: "2d" });
  expect(navigation).not.toHaveProperty("expectedSourceFeatureId");
  expect(bounds).toEqual([55.27, 25.20, 55.28, 25.21]);
});
