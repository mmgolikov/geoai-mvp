# PILOT-001 Pilot Readiness Checklist

Status: Review source artifact  
Owner: GeoAI Product / Delivery  
Confluence target: 08.01 Pilot Readiness Checklist

## Purpose

Define the checklist that must pass before GeoAI is described as pilot-ready for a specific client or scenario.

## Checklist

| Area | Requirement | Status source |
|---|---|---|
| Product flow | Map-first and criteria-first flows work end to end | Wireflows and QA |
| Project state | Projects, analyses and reports are isolated | Project QA |
| Data sources | Source register and confidence labels are visible | Source Confidence Rules |
| Evidence | Evidence lineage is traceable to source metadata or user input | DATA-LINEAGE-001 |
| Reports | Report snapshot matches dashboard | RPT-001 |
| Database | Supabase schema and seed state are reviewed | PR #47, ERD-001 |
| Auth | Auth mode and access model are verified | Access tests |
| RLS | Row-level policies are tested | DB review |
| Storage | Buckets, policies and signed URLs are verified | Storage evidence |
| Design | Founder-approved design handoff exists | PR #42 or successor |
| Security | No secrets or unsupported security claims | SEC-001 |
| Governance | Release note, risk log and rollback point are current | QA-001 |

## Readiness rule

Pilot readiness is scenario-specific. A demo can be stable while the product is still not pilot-ready.

## Mandatory caveat

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
