# Hosted development Auth acceptance — 19 September 2026

Status: scoped live PASS; not full product or pilot acceptance.

- Exact operator/application tree: `49885f1594c110627ad0d080f17b1c7d1cfec8a8`.
- Target: existing development `geoai-dev`, `pphdqkurxneyagvnnjdt` only.
- Root executed the independently reviewed operator once with the optional Preview seam disabled. Vercel was reporting an active deployment-trigger incident and the exact new Preview was still in its system build queue.
- Operator exit: 0, receipt schema `geoai.sprint10.hosted-auth-probe-receipt.v2`, PASS.

## Real evidence

Two new isolated synthetic users were created by the normal Admin API without transactional email. Each completed a primary password login, a second independent session, verified claims/user retrieval, and one active current-profile lookup. The two profiles were distinct. An anonymous current-profile call returned the required explicit authorization denial.

Retirement completed for both identities: two confirmed server-global revocations, rejection of all four refresh tokens, two long-duration Admin bans, two exact `user_banned` password denials, two successful empty current-profile responses for old JWTs, and two final future-ban read-backs. No user/profile was deleted. Existing customer/application records were not targeted.

Passwords, keys and session tokens remained in process memory. No secret values, raw SDK output or email addresses were recorded in this evidence. No provider call, OpenAI spend, source retrieval, project membership mutation, email delivery or Production change occurred.

## Not established

This run did **not** execute the browser Preview seam, tenant/project membership acceptance, cloud project storage, source retrieval, Analyse/Find/Compare/Create journeys, or email delivery/ownership. The synthetic identities are terminally retired and must not be reused. A later combined browser/provider test must create its own authorized fresh identities and bind the exact tested Preview SHA and global USD15 ledger.

The separate Preview `dpl_HcxkmwBkozt9ba7RSKw4UDf3kgtP` was created for the same SHA at `https://geoai-hksb2sqpz-geoaidev.vercel.app`. Project read-back confirmed the non-main candidate branch and Preview SSO protection; READY/runtime/browser acceptance was not yet observed. The published [Vercel incident status](https://www.vercel-status.com/) reported elevated deployment-trigger errors from 20:32 UTC on 18 September, with an update at 20:56 UTC. A platform queue is not product acceptance or a product defect.

## CI caveat

GitHub run `35395382742` at the same exact SHA passed the protected-browser and database jobs. The aggregate run failed at the documentation lifecycle inventory, which had not been regenerated after new scoped evidence files were added. Subsequent regeneration fixes that inventory, not the historical run. A fresh complete CI run is still required.
