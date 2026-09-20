import { QUALITY20_AMENDMENT, QUALITY20_CASES, loadQuality20Selection, quality20ApprovalSuffix, quality20RequestKey } from "../tests/e2e/helpers/quality20-frozen-case.ts";

// This CLI never loads credentials, the spend ledger, browser, API client or network.
if (process.argv[2] === "--template") {
  console.log(JSON.stringify({ schemaVersion: "geoai.quality20.frozen-cases.v1", amendment: QUALITY20_AMENDMENT,
    frozenAt: null, execution: { commit: null, origin: null, deploymentId: null },
    cases: QUALITY20_CASES.map(({ id }) => ({ id, binding: null })) }, null, 2));
} else if (process.argv[2] === "--validate") {
  try {
    const selection = loadQuality20Selection(process.env, process.env.GEOAI_SPRINT10_LIVE_SCOPE, {
      commit: process.env.GEOAI_SPRINT10_LIVE_EXPECTED_COMMIT_SHA,
      origin: process.env.GEOAI_SPRINT10_LIVE_PREVIEW_URL
    });
    if (!selection) throw new Error("A quality20 scope is required.");
    console.log(JSON.stringify({ status: "BOUND_NOT_RUN", caseId: selection.definition.id, scope: selection.definition.scope,
      manifestSha256: selection.manifestSha256, approvalSuffix: quality20ApprovalSuffix(selection),
      requestKey: selection.definition.scope === "quality20-find" ? null : quality20RequestKey(selection, selection.definition.scope === "quality20-create" ? "create" : "ai") }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
} else { console.error("Use --template or --validate. Neither command executes live QA."); process.exitCode = 1; }
