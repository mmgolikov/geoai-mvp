import assert from "node:assert/strict";

// @ts-expect-error Node's strip-types runner requires the physical .ts suffix; production imports remain extensionless.
import { POINT_OBJECT_WIKIDATA_ENDPOINT, PointObjectWikidataAdapter, type ResolvePointObjectWikidataInput } from "../src/lib/prototype/point-to-object-wikidata-contract.ts";

const GREGORIAN = "http://www.wikidata.org/entity/Q1985727";
const EARTH = "http://www.wikidata.org/entity/Q2";
const METRE = "http://www.wikidata.org/entity/Q11573";

function entityValue(entityId: string) {
  return { type: "wikibase-entityid", value: { id: entityId } };
}

function coordinateValue(longitude: number, latitude: number, precision: number | null = 0.0001) {
  return { type: "globecoordinate", value: { longitude, latitude, altitude: null, precision, globe: EARTH } };
}

function timeValue(time: string, precision: number) {
  return { type: "time", value: { time, precision, calendarmodel: GREGORIAN, before: 0, after: 0, timezone: 0 } };
}

function quantityValue(amount: string, unit: string) {
  return { type: "quantity", value: { amount, unit } };
}

function claim(property: string, id: string, dataValue: unknown, options: { rank?: string; qualifiers?: unknown; snaktype?: string } = {}) {
  const value: Record<string, unknown> = {
    id,
    type: "statement",
    rank: options.rank ?? "normal",
    mainsnak: { property, snaktype: options.snaktype ?? "value", datavalue: dataValue }
  };
  if (options.qualifiers !== undefined) value.qualifiers = options.qualifiers;
  return value;
}

function payload(
  qid: string,
  longitude = 55.2708,
  latitude = 25.2048,
  overrides: Record<string, unknown[]> = {}
) {
  return {
    entities: {
      [qid]: {
        id: qid,
        lastrevid: 123456,
        modified: "2026-08-31T12:00:00Z",
        labels: {
          en: { language: "en", value: "Bounded test hotel" },
          ru: { language: "ru", value: "Тестовый отель" },
          ar: { language: "ar", value: "ignored" }
        },
        claims: {
          P31: [claim("P31", `${qid}$P31`, entityValue("Q27686"))],
          P625: [claim("P625", `${qid}$P625`, coordinateValue(longitude, latitude))],
          P17: [claim("P17", `${qid}$P17`, entityValue("Q878"))],
          P571: [
            claim("P571", `${qid}$YEAR`, timeValue("+1999-00-00T00:00:00Z", 9)),
            claim("P571", `${qid}$DAY`, timeValue("+2010-06-23T00:00:00Z", 11)),
            claim("P571", `${qid}$BAD-PRECISION`, timeValue("+2010-06-23T00:00:00Z", 8)),
            claim("P571", `${qid}$BAD-MONTH`, timeValue("+2010-13-00T00:00:00Z", 10)),
            claim("P571", `${qid}$BAD-DAY`, timeValue("+2010-02-30T00:00:00Z", 11)),
            claim("P571", `${qid}$BCE`, timeValue("-0044-03-15T00:00:00Z", 11))
          ],
          P2048: [
            claim("P2048", `${qid}$HEIGHT`, quantityValue("+321.4", METRE)),
            claim("P2048", `${qid}$QUALIFIED`, quantityValue("+200", METRE), { qualifiers: { P518: [{}] } }),
            claim("P2048", `${qid}$DEPRECATED`, quantityValue("+999", METRE), { rank: "deprecated" }),
            claim("P2048", `${qid}$UNKNOWN-UNIT`, quantityValue("+100", "http://www.wikidata.org/entity/Q999")),
            claim("P2048", `${qid}$NOVALUE`, quantityValue("+100", METRE), { snaktype: "novalue" })
          ],
          P1101: [claim("P1101", `${qid}$FLOORS`, quantityValue("+68", "1"))],
          ...overrides
        }
      }
    }
  };
}

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  const text = JSON.stringify(value);
  return new Response(text, { status: 200, headers: { "content-type": "application/json", ...init.headers }, ...init });
}

function baseInput(qid: string | null = "Q1001"): ResolvePointObjectWikidataInput {
  return {
    qid,
    osmSourceFeatureId: "way/1001",
    osmGeometryHash: "a".repeat(64),
    osmGeometry: { type: "Point", coordinates: [55.2708, 25.2048] },
    osmCentroid: [55.2708, 25.2048],
    osmFeatureClass: "tourism:hotel",
    osmTags: { "tag.tourism": "hotel", "tag.wikidata": qid ?? "" },
    expectedCountryCode: "ae"
  };
}

async function run(): Promise<void> {
  let noQidCalls = 0;
  const noQidAdapter = new PointObjectWikidataAdapter({ fetchImpl: (async () => {
    noQidCalls += 1;
    return jsonResponse({});
  }) as typeof fetch });
  assert.deepEqual(await noQidAdapter.resolve(baseInput(null)), { status: "not_requested_no_qid", linkedEntity: null, reason: null });
  assert.equal(noQidCalls, 0, "A subject without an exact QID must make zero Wikidata requests.");

  let now = Date.parse("2026-09-06T09:00:00.000Z");
  let calls = 0;
  const adapter = new PointObjectWikidataAdapter({
    now: () => now,
    fetchImpl: (async (url, init) => {
      calls += 1;
      assert.equal(new URL(String(url)).origin + new URL(String(url)).pathname, POINT_OBJECT_WIKIDATA_ENDPOINT);
      assert.equal(init?.redirect, "error");
      assert.equal((init?.headers as Record<string, string>)["User-Agent"].includes("GeoAI-PointToObject-Preview"), true);
      return jsonResponse(payload("Q1001"));
    }) as typeof fetch
  });
  const first = await adapter.resolve(baseInput());
  assert.equal(first.status, "available");
  assert.equal(calls, 1);
  if (first.status !== "available") throw new Error("unreachable");
  assert.deepEqual(first.linkedEntity.statements.filter((item) => item.propertyId === "P571").map((item) => item.value), [
    { kind: "time", time: "+1999-00-00T00:00:00Z", precision: 9, calendarModel: GREGORIAN },
    { kind: "time", time: "+2010-06-23T00:00:00Z", precision: 11, calendarModel: GREGORIAN }
  ], "Real Wikibase four-digit positive years must pass while invalid precision/date/BCE values fail closed.");
  assert.equal(first.linkedEntity.statements.filter((item) => item.propertyId === "P2048").length, 1,
    "Qualified, deprecated, novalue and unknown-unit height claims must be omitted.");
  assert.equal(first.linkedEntity.source.entityModifiedAt, "2026-08-31T12:00:00.000Z");
  const acquiredAt = first.linkedEntity.source.acquiredAt;
  now += 60_000;
  const secondSubject = await adapter.resolve({ ...baseInput(), osmSourceFeatureId: "way/other", osmGeometryHash: "b".repeat(64), osmCentroid: [55.29, 25.22] });
  assert.equal(secondSubject.status, "identity_rejected", "A cached entity snapshot must be re-bound to every OSM subject.");
  assert.equal(secondSubject.reason, "node_or_complex_coordinate_mismatch");
  assert.equal(calls, 1, "The sanitized QID snapshot may be cached without caching an earlier subject identity decision.");
  const cached = await adapter.resolve(baseInput());
  assert.equal(cached.status, "available");
  if (cached.status !== "available") throw new Error("unreachable");
  assert.equal(cached.linkedEntity.source.acquiredAt, acquiredAt, "A cache hit must preserve the actual acquisition timestamp.");

  const concave = new PointObjectWikidataAdapter({ fetchImpl: (async () => jsonResponse(payload("Q1002", 55.006, 25.006))) as typeof fetch });
  const concaveResult = await concave.resolve({
    ...baseInput("Q1002"),
    osmSourceFeatureId: "way/1002",
    osmGeometry: { type: "Polygon", coordinates: [[[55, 25], [55.01, 25], [55.01, 25.002], [55.002, 25.002], [55.002, 25.01], [55, 25.01], [55, 25]]] },
    osmCentroid: [55.003, 25.003]
  });
  assert.equal(concaveResult.status, "identity_rejected");
  assert.equal(concaveResult.reason, "polygon_coordinate_mismatch", "A coordinate in a concave bbox notch must not pass polygon identity.");

  const coordinateConflict = new PointObjectWikidataAdapter({ fetchImpl: (async () => jsonResponse(payload("Q1003", 55.2708, 25.2048, {
    P625: [
      claim("P625", "Q1003$P625-A", coordinateValue(55.2708, 25.2048)),
      claim("P625", "Q1003$P625-B", coordinateValue(55.2718, 25.2058))
    ]
  }))) as typeof fetch });
  const coordinateConflictResult = await coordinateConflict.resolve(baseInput("Q1003"));
  assert.equal(coordinateConflictResult.status, "identity_rejected");
  assert.equal(coordinateConflictResult.reason, "coordinate_missing_or_conflicting");

  for (const [qid, precision] of [["Q1013", 1], ["Q1014", null], ["Q1017", 0], ["Q1018", 1 / 3600 * 1.01]] as const) {
    const coarseCoordinate = new PointObjectWikidataAdapter({ fetchImpl: (async () => jsonResponse(payload(qid, 55.2708, 25.2048, {
      P625: [claim("P625", `${qid}$P625`, coordinateValue(55.2708, 25.2048, precision))]
    }))) as typeof fetch });
    const coarseResult = await coarseCoordinate.resolve(baseInput(qid));
    assert.equal(coarseResult.status, "identity_rejected");
    assert.equal(coarseResult.reason, "coordinate_precision_insufficient",
      "A coarse or unknown P625 precision must not prove a 20 m/250 m identity join.");
  }

  // Public P625 observations on 2026-09-05: Q62939 revision 2532273591 and
  // Q548679 revision 2518380772 both use the canonical one-arcsecond resolution.
  // Geometry is an OSM observation; other payload facts below remain synthetic.
  const arcsecond = 1 / 3600;
  const burjGeometry = { type: "Polygon" as const, coordinates: [[
    [55.1848041, 25.1416843], [55.1853083, 25.1408904], [55.1853994, 25.140913],
    [55.1854852, 25.140949], [55.185563, 25.1409976], [55.1856308, 25.1410572],
    [55.1856867, 25.1411263], [55.1857289, 25.1412028], [55.1857565, 25.1412847],
    [55.1857685, 25.1413695], [55.1857647, 25.1414551], [55.1848041, 25.1416843]
  ]] };
  const burjAdapter = new PointObjectWikidataAdapter({ fetchImpl: (async () => jsonResponse(payload("Q62939", 55.18527777777778, 25.14138888888889, {
    P625: [claim("P625", "Q62939$P625", coordinateValue(55.18527777777778, 25.14138888888889, arcsecond))]
  }))) as typeof fetch });
  assert.equal((await burjAdapter.resolve({ ...baseInput("Q62939"), osmSourceFeatureId: "way/12700546", osmGeometry: burjGeometry,
    osmCentroid: [55.1853967, 25.1413271] })).status, "available", "Canonical arcsecond coordinates with interior clearance should enrich an exact QID.");

  const square = { type: "Polygon" as const, coordinates: [[[55, 25], [55.002, 25], [55.002, 25.002], [55, 25.002], [55, 25]]] };
  for (const [qid, longitude, latitude, geometry, centroid, expected] of [
    ["Q1020", 55.001, 25.001, square, [55.001, 25.001], "available"],
    ["Q1021", 54.99995, 25.001, square, [55.001, 25.001], "identity_rejected"],
    ["Q1022", 55.001, 25.001, { ...square, coordinates: [...square.coordinates, [[55.0008, 25.0008], [55.0012, 25.0008], [55.0012, 25.0012], [55.0008, 25.0012], [55.0008, 25.0008]]] }, [55.001, 25.001], "identity_rejected"],
    ["Q1023", 55, 25.002, { type: "Point" as const, coordinates: [55, 25] }, [55, 25], "available"],
    ["Q1024", 55, 25.0021, { type: "Point" as const, coordinates: [55, 25] }, [55, 25], "identity_rejected"],
    ["Q548679", 103.86, 1.2825, { type: "Point" as const, coordinates: [103.8587, 1.283] }, [103.8587, 1.283], "available"]
  ] as const) {
    const resolutionAdapter = new PointObjectWikidataAdapter({ fetchImpl: (async () => jsonResponse(payload(qid, longitude, latitude, {
      P625: [claim("P625", `${qid}$P625`, coordinateValue(longitude, latitude, arcsecond))],
      ...(qid === "Q548679" ? { P17: [claim("P17", `${qid}$P17`, entityValue("Q334"))] } : {})
    }))) as typeof fetch });
    const result = await resolutionAdapter.resolve({ ...baseInput(qid), osmGeometry: geometry, osmCentroid: centroid, expectedCountryCode: qid === "Q548679" ? "sg" : "ae" });
    assert.equal(result.status, expected, `${qid}: resolution envelope must consume, not expand, the existing spatial tolerance.`);
  }

  const countryConflict = new PointObjectWikidataAdapter({ fetchImpl: (async () => jsonResponse(payload("Q1004", 55.2708, 25.2048, {
    P17: [claim("P17", "Q1004$P17-A", entityValue("Q878")), claim("P17", "Q1004$P17-B", entityValue("Q334"))]
  }))) as typeof fetch });
  const countryConflictResult = await countryConflict.resolve(baseInput("Q1004"));
  assert.equal(countryConflictResult.status, "identity_rejected");
  assert.equal(countryConflictResult.reason, "country_mismatch");

  const preferredTypeAdapter = new PointObjectWikidataAdapter({ fetchImpl: (async () => jsonResponse(payload("Q1015", 55.2708, 25.2048, {
    P31: [
      claim("P31", "Q1015$NORMAL-HOTEL", entityValue("Q27686")),
      claim("P31", "Q1015$PREFERRED-CITY", entityValue("Q515"), { rank: "preferred" })
    ]
  }))) as typeof fetch });
  assert.deepEqual(await preferredTypeAdapter.resolve(baseInput("Q1015")), {
    status: "identity_rejected", linkedEntity: null, reason: "type_mismatch_or_unsupported"
  }, "A lower-rank compatible type must not override an incompatible preferred P31 statement.");

  const conflictingPreferredTypeAdapter = new PointObjectWikidataAdapter({ fetchImpl: (async () => jsonResponse(payload("Q1016", 55.2708, 25.2048, {
    P31: [
      claim("P31", "Q1016$PREFERRED-HOTEL", entityValue("Q27686"), { rank: "preferred" }),
      claim("P31", "Q1016$PREFERRED-BUILDING", entityValue("Q41176"), { rank: "preferred" })
    ]
  }))) as typeof fetch });
  assert.equal((await conflictingPreferredTypeAdapter.resolve(baseInput("Q1016"))).reason, "type_mismatch_or_unsupported",
    "Different preferred P31 classes must fail closed even when both are broadly compatible.");

  const singaporeAdapter = new PointObjectWikidataAdapter({ fetchImpl: (async () => jsonResponse(payload("Q1005", 103.8519, 1.2903, {
    P17: [claim("P17", "Q1005$P17", entityValue("Q334"))],
    P31: [claim("P31", "Q1005$P31", entityValue("Q41176"))]
  }))) as typeof fetch });
  const singapore = await singaporeAdapter.resolve({
    ...baseInput("Q1005"), osmSourceFeatureId: "node/1005", osmGeometryHash: null,
    osmGeometry: { type: "Point", coordinates: [103.8519, 1.2903] }, osmCentroid: [103.8519, 1.2903],
    osmFeatureClass: "building", osmTags: { "tag.building": "yes", "tag.wikidata": "Q1005" }, expectedCountryCode: "sg"
  });
  assert.equal(singapore.status, "available", "A matching Singapore building node/complex may pass only the bounded linked-entity check.");

  for (const [status, response, expectedReason] of [
    [429, jsonResponse({}, { status: 429 }), "rate_limited_or_maxlag"],
    [200, jsonResponse({ error: { code: "maxlag" } }), "rate_limited_or_maxlag"],
    [200, new Response("{}", { headers: { "content-length": String(256 * 1024 + 1) } }), "response_too_large"]
  ] as const) {
    const failureAdapter = new PointObjectWikidataAdapter({ fetchImpl: (async () => response) as typeof fetch });
    const result = await failureAdapter.resolve(baseInput(`Q${status}99`));
    assert.equal(result.status, "unavailable");
    assert.equal(result.reason, expectedReason);
  }
  const timeoutAdapter = new PointObjectWikidataAdapter({ fetchImpl: (async () => { throw new DOMException("timeout", "TimeoutError"); }) as typeof fetch });
  assert.equal((await timeoutAdapter.resolve(baseInput("Q9001"))).reason, "request_failed");
  const deadlineAdapter = new PointObjectWikidataAdapter({ now: () => 10_000, fetchImpl: (async () => jsonResponse({})) as typeof fetch });
  assert.equal((await deadlineAdapter.resolve({ ...baseInput("Q9002"), deadlineAtMs: 10_020 })).reason, "deadline_exhausted");

  let inflightCalls = 0;
  const inflight = new PointObjectWikidataAdapter({ fetchImpl: (async () => {
    inflightCalls += 1;
    await Promise.resolve();
    return jsonResponse(payload("Q9003"));
  }) as typeof fetch });
  const [inflightA, inflightB] = await Promise.all([inflight.resolve(baseInput("Q9003")), inflight.resolve(baseInput("Q9003"))]);
  assert.equal(inflightA.status, "available");
  assert.equal(inflightB.status, "available");
  assert.equal(inflightCalls, 1, "Concurrent requests for one QID must coalesce.");

  let releaseShared!: () => void;
  const heldShared = new Promise<void>((resolve) => { releaseShared = resolve; });
  const sharedDeadline = new PointObjectWikidataAdapter({ fetchImpl: (async () => {
    await heldShared;
    return jsonResponse(payload("Q9004"));
  }) as typeof fetch });
  const longCaller = sharedDeadline.resolve(baseInput("Q9004"));
  await Promise.resolve();
  const shortCaller = sharedDeadline.resolve({ ...baseInput("Q9004"), deadlineAtMs: Date.now() + 10 });
  setTimeout(releaseShared, 80);
  const [longResult, shortResult] = await Promise.all([longCaller, shortCaller]);
  assert.equal(longResult.status, "available");
  assert.deepEqual(shortResult, { status: "unavailable", linkedEntity: null, reason: "deadline_exhausted" },
    "A short coalesced caller must time out without cancelling the longer caller's shared fetch.");

  let concurrent = 0;
  let maxConcurrent = 0;
  let serialCalls = 0;
  const serialAdapter = new PointObjectWikidataAdapter({ fetchImpl: (async (url) => {
    serialCalls += 1;
    concurrent += 1;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    await new Promise((resolve) => setTimeout(resolve, 40));
    concurrent -= 1;
    const qid = new URL(String(url)).searchParams.get("ids")!;
    return jsonResponse(payload(qid));
  }) as typeof fetch });
  const [serialA, serialB] = await Promise.all([
    serialAdapter.resolve(baseInput("Q9005")),
    serialAdapter.resolve(baseInput("Q9006"))
  ]);
  assert.equal(serialA.status, "available");
  assert.equal(serialB.status, "available");
  assert.equal(maxConcurrent, 1, "Different QIDs must use a serial external dispatch queue.");
  assert.equal(serialCalls, 2);

  let releaseQueue!: () => void;
  const heldQueue = new Promise<void>((resolve) => { releaseQueue = resolve; });
  const fetchedQids: string[] = [];
  const expiringQueue = new PointObjectWikidataAdapter({ fetchImpl: (async (url) => {
    const qid = new URL(String(url)).searchParams.get("ids")!;
    fetchedQids.push(qid);
    if (qid === "Q9007") await heldQueue;
    return jsonResponse(payload(qid));
  }) as typeof fetch });
  const queueLeader = expiringQueue.resolve(baseInput("Q9007"));
  await Promise.resolve();
  const expiredQueued = expiringQueue.resolve({ ...baseInput("Q9008"), deadlineAtMs: Date.now() + 15 });
  setTimeout(releaseQueue, 60);
  const [queueLeaderResult, expiredQueueResult] = await Promise.all([queueLeader, expiredQueued]);
  assert.equal(queueLeaderResult.status, "available");
  assert.deepEqual(expiredQueueResult, { status: "unavailable", linkedEntity: null, reason: "deadline_exhausted" });
  assert.deepEqual(fetchedQids, ["Q9007"], "An expired queued QID must not start an external fetch.");

  console.log("point-to-object-wikidata-check: PASS (precision, rank, serial queue, caller deadlines, identity, dates, cache and failure controls)");
}

await run();
