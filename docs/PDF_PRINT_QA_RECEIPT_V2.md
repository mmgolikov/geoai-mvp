# GeoAI PDF / Print QA Receipt v2

Status: Active print-QA contract
Last verified: 2026-07-21
Owner: GeoAI QA
Authority: Permanent physical Chromium PDF evidence requirements for CR 09.23
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [System Stabilization Audit v2](SYSTEM_STABILIZATION_AUDIT_V2_2026_07_21.md) · [QA Checklist](qa-checklist.md)

## Physical Evidence Contract

The permanent Quality Gate starts the built application and runs `scripts/pdf-print-evidence.mjs`. It prints six fixtures in A4 and Letter, producing twelve physical PDFs:

- seeded analysis and seeded comparison;
- long-title analysis and long-title comparison;
- long source-lineage/evidence analysis;
- empty/partial evidence analysis.

Every artifact includes all page PNG rasters, extracted text, `pdf-print-manifest.json`, Markdown summary, browser console log and Next.js application log. The manifest records report ID, fixture, format, page count/dimensions, bytes, SHA-256, text/raster paths, blank/clipping/overflow/orphan/card-split/map/table/text/page-number checks and limitations.

## Blocking Assertions

CI fails if a PDF is absent/empty, page count is outside its declared range, a trailing page is blank, screen navigation leaks into the print body, text is clipped, cards lose `break-inside: avoid`, map/table leaves page bounds, comparison is unreadable, required identity/timestamp/classification/caveat/lineage/attribution text is absent, page numbering is absent, or the captured Marina image is not embedded in analysis PDFs.

## Fixture Boundary

Long and partial fixtures modify only the already rendered seeded report DOM inside the isolated Chromium process. No public fixture API, live source, Supabase write, secret or Production-only map service is introduced.

## Current Limitation

The Product print stylesheet does not provide intrinsic page numbers across every browser Print dialog. The evidence harness supplies deterministic Chromium footer numbering, and printer/PDF-viewer variation remains a documented limitation. Physical CI evidence is not a certification for every printer or assistive PDF viewer.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
