# DLD / Dubai Pulse QA Checklist v1

## Release identification

- [ ] Dataset ID matches the controlled catalogue.
- [ ] Provider is Dubai Land Department / approved Dubai data platform.
- [ ] Source update date is recorded.
- [ ] Retrieval timestamp is recorded.
- [ ] File name, byte size and SHA-256 are recorded.
- [ ] Source URI is stored as a hash or approved metadata reference.
- [ ] Rights receipt and terms reference are attached.
- [ ] Release remains quarantined before acceptance.

## Rights, access and privacy

- [ ] Commercial private persistence is permitted.
- [ ] Transformation is permitted.
- [ ] Internal aggregate scoring is permitted.
- [ ] Attribution requirements are recorded.
- [ ] Redistribution limitations are recorded.
- [ ] No CAPTCHA, WAF or access-control bypass was used.
- [ ] API credentials are stored only in the approved secret plane.
- [ ] PII/contact fields are classified.
- [ ] Product projections exclude phone, fax, email, webpage, person, tenant and other unnecessary identifiers.
- [ ] Raw files are in approved private custody.

## Schema and parsing

- [ ] UTF-8/BOM handling passes.
- [ ] Quoted delimiters and multiline quoted values parse correctly.
- [ ] Header normalization produces no duplicates.
- [ ] Row column counts reconcile.
- [ ] Primary/source-native keys are identified where available.
- [ ] Dates parse using documented source semantics.
- [ ] Amount and area units are documented.
- [ ] Boolean and enumeration values are mapped explicitly.
- [ ] Lookup tables reconcile with fact values.
- [ ] Unknown fields are quarantined, not silently discarded.

## Volume and completeness

- [ ] File byte size matches acquisition evidence.
- [ ] Row count reconciles with the source or provider estimate.
- [ ] Date range is plausible and complete for the release.
- [ ] Expected update cadence is recorded.
- [ ] Missingness by field is measured.
- [ ] Duplicate/revision behavior is measured.
- [ ] Area coverage and unknown-area rates are measured.
- [ ] No accidental sample fallback is present.

## Dataset-specific controls

### Transactions

- [ ] Sales, mortgage and other procedures are separated.
- [ ] Primary/secondary market mapping is validated.
- [ ] Amount and procedure-area outliers are reviewed.
- [ ] Off-plan/existing semantics are verified.
- [ ] No ownership/title conclusion is generated.

### Rent contracts

- [ ] New versus renewal is separated.
- [ ] Contract amount versus annualized amount is handled correctly.
- [ ] Multi-property/line-number duplication is reconciled.
- [ ] Tenant-related fields are excluded from Product projections.

### Projects

- [ ] Project/developer IDs are reconciled.
- [ ] Status and completion semantics are documented.
- [ ] Project revisions/duplicates are resolved.
- [ ] No guaranteed completion claim is generated.

### Valuation

- [ ] Internal/external valuation context is separated where available.
- [ ] Value and area units are verified.
- [ ] The feature is labelled valuation context, not certified GeoAI valuation.

### Land, buildings and units

- [ ] Source IDs are preserved.
- [ ] Area/unit/building relationships reconcile.
- [ ] Freehold and registration fields are treated as source context.
- [ ] No official parcel geometry is invented.
- [ ] No ownership verification is implied.

### Brokers, developers, offices, licenses and valuators

- [ ] Contact fields are excluded.
- [ ] License start/end dates are normalized.
- [ ] Active/inactive logic is versioned.
- [ ] Only counts/concentration/context aggregates are eligible for scoring.

## Aggregate feature QA

- [ ] Feature grain is explicit: area/month, project/snapshot or index/period.
- [ ] Aggregates reconcile to accepted restricted facts.
- [ ] Median/percentile method is documented and deterministic.
- [ ] Currency is AED.
- [ ] Area unit is explicit and consistently converted.
- [ ] Small-cell/privacy suppression is applied where required.
- [ ] Source release IDs are attached.
- [ ] Method version is attached.
- [ ] Freshness and confidence are attached.
- [ ] Stale/quarantined/revoked releases cannot update current features.

## Scoring and explainability

- [ ] Scenario-specific weights are approved.
- [ ] DLD signals do not replace planning, zoning, ownership, engineering or climate validation.
- [ ] Confidence is separate from opportunity/risk score.
- [ ] Missing coverage reduces confidence rather than fabricating values.
- [ ] Score regression tests pass.
- [ ] Top drivers and risks reference the same feature rows used in scoring.
- [ ] UI and report values use the same analysis envelope.
- [ ] Required caveat is displayed.

## Security and release

- [ ] Direct Data API access to raw/restricted tables is absent.
- [ ] RLS/ACL verification passes for anon, non-member and member personas.
- [ ] Raw storage paths are not returned by Product APIs.
- [ ] Secrets are absent from Git, logs and artifacts.
- [ ] Preview validation passes.
- [ ] Production migration/deployment/source activation has separate founder approval.
- [ ] Change Log, source registry, Project Hub and release note are synchronized.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
