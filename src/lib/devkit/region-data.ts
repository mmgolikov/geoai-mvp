import type { RegionalRulePack } from "./region-rules";

/** Frozen researcher-authored metadata, primary links and own checklists only.
 * No raw forms/PDFs/terms text, network adapter, source rights grant or plot applicability.
 * Input versions, dates and exact SHA-256 are recorded below, not treated as source authenticity. */
export const DEVKIT_REGIONAL_DATA_PROVENANCE = [
  {
    "owner": "uae_1",
    "market": "dubai",
    "inputSchema": "geoai.region-procedures/0.1",
    "packageVersion": "2026-10-22.bounded-1",
    "inputStatus": "BOUNDED_RESEARCH_COMPLETE_WITH_GAPS",
    "checkedOn": "2026-10-22",
    "sourceSha256": "d78723d9689d15ef2a42cab3eae8ecc4deb9af47f1b24c74d99a6cec88465837",
    "registrySha256": null,
    "rules": 20,
    "sources": 49,
    "sourceRecordDates": "Retained from researcher records; not independently fetched by evidence_1.",
    "readback": "REGIONAL_RESULT.md bounded research with explicit gaps"
  },
  {
    "owner": "moscow_1",
    "market": "moscow",
    "inputSchema": "geoai.region-procedures/1.0",
    "packageVersion": "1.0.0-research",
    "inputStatus": "READY_FOR_REVIEW_NOT_INTEGRATED",
    "checkedOn": "2026-10-22",
    "sourceSha256": "b32fbce94ac1be0cdf0ebecb4fd241e155eac8c1327df95fe2dd89fbe3279b0d",
    "registrySha256": "a6dc68e89bd277ff214572f5e19908ab8756f76cc73392892b0cf890ae180df7",
    "rules": 10,
    "sources": 20,
    "sourceRecordDates": "Retained from researcher records; not independently fetched by evidence_1.",
    "readback": "verification-result.json PASS 28 checks; handoff-receipt.json READY"
  }
] as const;

const DUBAI: RegionalRulePack = {
  "version": "DEVKIT_REGIONAL_RULES_V1",
  "inputSchema": "geoai.region-procedures/0.1",
  "packageVersion": "2026-10-22.bounded-1",
  "jurisdiction": "AE-DU",
  "inputStatus": "BOUNDED_RESEARCH_COMPLETE_WITH_GAPS",
  "sources": [
    {
      "id": "D04",
      "url": "https://dda.gov.ae/en/planning-development/master-planning/site-plan-issuance",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D04",
        "url": "https://dda.gov.ae/en/planning-development/master-planning/site-plan-issuance",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Requester / Required Documents"
      }
    },
    {
      "id": "D05",
      "url": "https://dda.gov.ae/en/planning-development/master-planning/copy-of-planning-data",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D05",
        "url": "https://dda.gov.ae/en/planning-development/master-planning/copy-of-planning-data",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Requester / Required Documents"
      }
    },
    {
      "id": "D08",
      "url": "https://dda.gov.ae/en/planning-development/design/final-design-approval",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D08",
        "url": "https://dda.gov.ae/en/planning-development/design/final-design-approval",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Required Documents / Notes"
      }
    },
    {
      "id": "D09",
      "url": "https://dda.gov.ae/en/planning-development/construction/permits-nocs/final-building-permit",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D09",
        "url": "https://dda.gov.ae/en/planning-development/construction/permits-nocs/final-building-permit",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Fees / Notes"
      }
    },
    {
      "id": "D10",
      "url": "https://pcfc.ae/en/Pages/serviceinfo.aspx?BU=trakhees&ref=Services&sid=453",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D10",
        "url": "https://pcfc.ae/en/Pages/serviceinfo.aspx?BU=trakhees&ref=Services&sid=453",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Procedure and Required Documents / Service Fee"
      }
    },
    {
      "id": "D11",
      "url": "https://pcfc.ae/en/Pages/serviceinfo.aspx?BU=trakhees&ref=Services&sid=330",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D11",
        "url": "https://pcfc.ae/en/Pages/serviceinfo.aspx?BU=trakhees&ref=Services&sid=330",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Procedure and Required Documents / Service Fee"
      }
    },
    {
      "id": "D13",
      "url": "https://dubailand.gov.ae/en/eservices/request-detailed-property-report/",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D13",
        "url": "https://dubailand.gov.ae/en/eservices/request-detailed-property-report/",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Required Documents / Service Channels / Service Fees"
      }
    },
    {
      "id": "D14",
      "url": "https://dubailand.gov.ae/en/eservices/property-map-request/",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D14",
        "url": "https://dubailand.gov.ae/en/eservices/property-map-request/",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Description / Documents / Fees / Terms"
      }
    },
    {
      "id": "D15",
      "url": "https://dubailand.gov.ae/en/open-data/real-estate-data/",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D15",
        "url": "https://dubailand.gov.ae/en/open-data/real-estate-data/",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Table headers, captcha and Download as CSV controls"
      }
    },
    {
      "id": "D16",
      "url": "https://dubailand.gov.ae/en/eservices/register-project/",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D16",
        "url": "https://dubailand.gov.ae/en/eservices/register-project/",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Documents / Service Terms / Procedures"
      }
    },
    {
      "id": "D17",
      "url": "https://dubailand.gov.ae/en/eservices/api-gateway/",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D17",
        "url": "https://dubailand.gov.ae/en/eservices/api-gateway/",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Oqood/TAS prerequisites and API descriptions"
      }
    },
    {
      "id": "D31",
      "url": "https://dubailand.gov.ae/en/eservices/api-gateway-registration?appId=3",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D31",
        "url": "https://dubailand.gov.ae/en/eservices/api-gateway-registration?appId=3",
        "source_type": "subscription_terms",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "License to Use / Restrictions on Use / Pricing"
      }
    },
    {
      "id": "E01",
      "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/Master-Planning/P-04-SITE-PLAN-ISSUANCE/ZA-MP-F-04-Site-Plan-Issuance-Request.pdf",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "ZA-MP-F-04 Issue 7",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E01",
        "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/Master-Planning/P-04-SITE-PLAN-ISSUANCE/ZA-MP-F-04-Site-Plan-Issuance-Request.pdf",
        "source_type": "official_form",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "ZA-MP-F-04 Issue 7",
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "page 1, delegation declaration and issue footer",
        "sha256": "7fcaf7d8178b3dceef95fbbe6185ae58b8b4efc0f4db1d40d14478d6dfdd2023",
        "byte_count": 253838
      }
    },
    {
      "id": "E02",
      "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/Master-Planning/P-09-COPY-OF-PLANNING-DATA/ZA-MP-F-08-Copy-of-Planning-Data-Request.pdf",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "ZA-MP-F-08 Issue 8; marked Internal",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E02",
        "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/Master-Planning/P-09-COPY-OF-PLANNING-DATA/ZA-MP-F-08-Copy-of-Planning-Data-Request.pdf",
        "source_type": "official_form",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "ZA-MP-F-08 Issue 8; marked Internal",
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "page 1, fields and Internal classification",
        "sha256": "ca433f825fe9e9c37758081af00ada75ee8ff399746a4cf15efa641a12e8b070",
        "byte_count": 253809
      }
    },
    {
      "id": "E03",
      "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/02-Design/B-09-FINAL-DESIGN-APPROVAL/ZA-DC-F-04-final-design-approval-request9.pdf",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "ZA-DC-F-04 Issue 15; body verified, PDF metadata title mismatched",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E03",
        "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/02-Design/B-09-FINAL-DESIGN-APPROVAL/ZA-DC-F-04-final-design-approval-request9.pdf",
        "source_type": "official_form",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "ZA-DC-F-04 Issue 15; body verified, PDF metadata title mismatched",
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "page 1, Issue 15 and required attachments",
        "sha256": "bfc06259daf5ea146e91c12659f562d35461f36cd6c0c2604a03c1913962c2da",
        "byte_count": 613248
      }
    },
    {
      "id": "E04",
      "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/03-Construction/Permits-and-NOCs/B-10-FINAL-BUILDING-PERMIT/ZA-DC-F-08-Building-Permit-Application.pdf",
      "verification": "FULL_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "ZA-DC-F-08 Issue 14",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E04",
        "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/03-Construction/Permits-and-NOCs/B-10-FINAL-BUILDING-PERMIT/ZA-DC-F-08-Building-Permit-Application.pdf",
        "source_type": "official_form",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "ZA-DC-F-08 Issue 14",
        "verification": "FULL_PUBLIC_TEXT_READ",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "pages 1-2, type-specific requirements",
        "sha256": "c060d3ccd7b624c92f043c9f3118accaa1aeb1c917a9898721d59e1637b14737",
        "byte_count": 285857
      }
    },
    {
      "id": "E05",
      "url": "https://www.pcfc.ae/en/Service%20Documents/PCFC-TRK-CED-PL-CP-02%2C%20Obtaining%20Site%20Plan%2C%20Lease%20drwg.pdf",
      "verification": "FETCH_BLOCKED_403",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "card lists Jan-2023",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E05",
        "url": "https://www.pcfc.ae/en/Service%20Documents/PCFC-TRK-CED-PL-CP-02%2C%20Obtaining%20Site%20Plan%2C%20Lease%20drwg.pdf",
        "source_type": "procedure_pdf",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "card lists Jan-2023",
        "verification": "FETCH_BLOCKED_403",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Linked on service card; PDF blocked403"
      }
    },
    {
      "id": "E06",
      "url": "https://www.pcfc.ae/en/Service%20Documents/PCFC-TRK-CED-PS-CP-11%2C%20Obtaining%20Concept%20Design.pdf",
      "verification": "FETCH_BLOCKED_403",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "card lists Nov-2022",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E06",
        "url": "https://www.pcfc.ae/en/Service%20Documents/PCFC-TRK-CED-PS-CP-11%2C%20Obtaining%20Concept%20Design.pdf",
        "source_type": "procedure_pdf",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "card lists Nov-2022",
        "verification": "FETCH_BLOCKED_403",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Linked on service card; PDF blocked403"
      }
    },
    {
      "id": "E07",
      "url": "https://www.pcfc.ae/en/Service%20Documents/TRK-CED-PS-CF11a%2C%20Application%20Form%20for%20Concept%20Design%20NOC.pdf",
      "verification": "FETCH_BLOCKED_403",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "card lists Nov-2022",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E07",
        "url": "https://www.pcfc.ae/en/Service%20Documents/TRK-CED-PS-CF11a%2C%20Application%20Form%20for%20Concept%20Design%20NOC.pdf",
        "source_type": "official_form",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "card lists Nov-2022",
        "verification": "FETCH_BLOCKED_403",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public accessibility only; no inferred data redistribution licence",
        "locator": "Linked on service card; PDF blocked403"
      }
    },
    {
      "id": "D01",
      "url": "https://dubailand.gov.ae/en/frequently-asked-questions/",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D01",
        "url": "https://dubailand.gov.ae/en/frequently-asked-questions/",
        "source_type": "official_faq",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "What are the planning authorities in Dubai; land separation/amalgamation; units",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D02",
      "url": "https://www.dm.gov.ae/municipality-business/building-permit-steps/",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D02",
        "url": "https://www.dm.gov.ae/municipality-business/building-permit-steps/",
        "source_type": "official_catalog",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Multi-storey buildings and public buildings",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D03",
      "url": "https://dmpmedia.dm.gov.ae/uploads/2020/06/Multi-Story_Building-Permits-Procedures.pdf",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "version 4, 10 May 2020",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D03",
        "url": "https://dmpmedia.dm.gov.ae/uploads/2020/06/Multi-Story_Building-Permits-Procedures.pdf",
        "source_type": "procedure_pdf",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "version 4, 10 May 2020",
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "page 1, all three stages",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D06",
      "url": "https://dda.gov.ae/en/planning-development/master-planning/master-plan-modification-temporary-use-of-plot",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D06",
        "url": "https://dda.gov.ae/en/planning-development/master-planning/master-plan-modification-temporary-use-of-plot",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Requester, required documents, notes",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D07",
      "url": "https://dda.gov.ae/en/planning-development/design/preliminary-design-approval",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D07",
        "url": "https://dda.gov.ae/en/planning-development/design/preliminary-design-approval",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Requester, required documents, notes",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D18",
      "url": "https://dewa.gov.ae/en/builder/master-plan-noc/infrastructure-noc-application",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D18",
        "url": "https://dewa.gov.ae/en/builder/master-plan-noc/infrastructure-noc-application",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Service limitations, journey map, mandatory documents",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D19",
      "url": "https://www.rta.ae/wps/portal/rta/ae/home/rta-services/service-details?serviceId=308",
      "verification": "FETCH_TIMEOUT",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D19",
        "url": "https://www.rta.ae/wps/portal/rta/ae/home/rta-services/service-details?serviceId=308",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FETCH_TIMEOUT",
        "locator": "Direct page fetch failed; DDA requirement remains separately documented",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D21",
      "url": "https://dlp.dubai.gov.ae/Legislation%20Reference/2026/Law%20No.%20(11)%20of%202026%20Concerning%20Antiquities%20and%20Archaeological%20Sites.html",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": "2026-05-24",
      "version": "Law 11/2026, issued 11 May 2026",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D21",
        "url": "https://dlp.dubai.gov.ae/Legislation%20Reference/2026/Law%20No.%20(11)%20of%202026%20Concerning%20Antiquities%20and%20Archaeological%20Sites.html",
        "source_type": "official_law_translation",
        "observed_date": "2026-10-22",
        "effective_date": "2026-05-24",
        "source_version": "Law 11/2026, issued 11 May 2026",
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Articles 3,7,8,9,12,13,19,27,28,30; Arabic text prevails",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D25",
      "url": "https://dubailand.gov.ae/en/eservices/title-deed-verification-overview/title-deed-verification/",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D25",
        "url": "https://dubailand.gov.ae/en/eservices/title-deed-verification-overview/title-deed-verification/",
        "source_type": "public_validation_form",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Property and owner/property modes, visible field labels; no query submitted",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D26a",
      "url": "https://dlp.dubai.gov.ae/Legislation%20Reference/2006/Law%20No.%20(7)%20of%202006.pdf",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "Original Law 7/2006; consolidated amendment audit not performed",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D26a",
        "url": "https://dlp.dubai.gov.ae/Legislation%20Reference/2006/Law%20No.%20(7)%20of%202006.pdf",
        "source_type": "official_law_translation",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "Original Law 7/2006; consolidated amendment audit not performed",
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "page 3, Articles 4-5",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D26b",
      "url": "https://dlp.dubai.gov.ae/Legislation%20Reference/2006/Regulation%20No.%20(3)%20of%202006.pdf",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "Original Regulation 3/2006; maps/amendments not verified",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D26b",
        "url": "https://dlp.dubai.gov.ae/Legislation%20Reference/2006/Regulation%20No.%20(3)%20of%202006.pdf",
        "source_type": "official_regulation_translation",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "Original Regulation 3/2006; maps/amendments not verified",
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "pages 1-3, Articles 3-4",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D27",
      "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/02-Design/B-23-SUBSTRUCTURE-DESIGN-APPROVAL/ZA-DC-F-04-Final-Design-Approval-Request.pdf",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "ZA-DC-F-04 Issue 13; historical alternative URL still accessible",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D27",
        "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/02-Design/B-23-SUBSTRUCTURE-DESIGN-APPROVAL/ZA-DC-F-04-Final-Design-Approval-Request.pdf",
        "source_type": "official_form",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "ZA-DC-F-04 Issue 13; historical alternative URL still accessible",
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "page 1; compare E03 Issue 15, especially soil report",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D29",
      "url": "https://www.dm.gov.ae/modern-heritage-sites-and-buildings/",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D29",
        "url": "https://www.dm.gov.ae/modern-heritage-sites-and-buildings/",
        "source_type": "official_heritage_catalog",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Public thematic listing; not complete parcel clearance",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D30",
      "url": "https://dewa.gov.ae/en/about-us/service-guide/builder-services/building-no-objection-certificate",
      "verification": "PAGE_SHELL_ONLY",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D30",
        "url": "https://dewa.gov.ae/en/about-us/service-guide/builder-services/building-no-objection-certificate",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "PAGE_SHELL_ONLY",
        "locator": "Old generic URL returned navigation without service substance",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "D32",
      "url": "https://partnersportal.digitaldubai.ae/Services/Details/c64fcb52-534f-4831-815f-ab5d4aed38b6",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "D32",
        "url": "https://partnersportal.digitaldubai.ae/Services/Details/c64fcb52-534f-4831-815f-ab5d4aed38b6",
        "source_type": "official_platform_description",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Service delivery steps; public vs shared access",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E08",
      "url": "https://dewa.gov.ae/en/about-us/service-guide/builder-services/building-no-objection-certificate-water",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E08",
        "url": "https://dewa.gov.ae/en/about-us/service-guide/builder-services/building-no-objection-certificate-water",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Requirements, limitations and journey map",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E09",
      "url": "https://dlp.dubai.gov.ae/Official%20Gazette/O%20G%20774.pdf",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": "2026-05-24",
      "version": "Gazette 774, 24 May 2026",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E09",
        "url": "https://dlp.dubai.gov.ae/Official%20Gazette/O%20G%20774.pdf",
        "source_type": "official_gazette",
        "observed_date": "2026-10-22",
        "effective_date": "2026-05-24",
        "source_version": "Gazette 774, 24 May 2026",
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "PDF page 1 cover visually checked; printed page 22 / PDF page 23 Articles 28-30",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant",
        "sha256": "aa19a5e85fe25adf0b0f2b822745614b7ca000305a4b85257c5173d882a663ea"
      }
    },
    {
      "id": "E10",
      "url": "https://www.dm.gov.ae/20-services-restructured-for-simpler-seamless-customer-experience/",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "Published 20 August 2026",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E10",
        "url": "https://www.dm.gov.ae/20-services-restructured-for-simpler-seamless-customer-experience/",
        "source_type": "official_announcement",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "Published 20 August 2026",
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Environmental service transfer; heritage maintenance integration; discontinued requests",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E11",
      "url": "https://www.dm.gov.ae/dubai-municipality-services/",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E11",
        "url": "https://www.dm.gov.ae/dubai-municipality-services/",
        "source_type": "official_catalog",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Permit for a New Building; Apply for a Planning Permit",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E12",
      "url": "https://hub.dm.gov.ae/link/servicedetails?ServiceCode=3398",
      "verification": "DETAIL_BLOCKED",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E12",
        "url": "https://hub.dm.gov.ae/link/servicedetails?ServiceCode=3398",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "DETAIL_BLOCKED",
        "locator": "Text tool redirects to shell; fresh browser timeout, see browser-receipts.json",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E13",
      "url": "https://hub.dm.gov.ae/link/servicedetails?ServiceCode=3583",
      "verification": "PAGE_SHELL_ONLY",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E13",
        "url": "https://hub.dm.gov.ae/link/servicedetails?ServiceCode=3583",
        "source_type": "official_service_card",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "PAGE_SHELL_ONLY",
        "locator": "Text tool redirects to index.html; no current form fields recovered",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E14",
      "url": "https://dubailand.gov.ae/en/terms-conditions/",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E14",
        "url": "https://dubailand.gov.ae/en/terms-conditions/",
        "source_type": "website_terms",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Use of this Web Site; Intellectual Property",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E15",
      "url": "https://dda.gov.ae/en/terms-and-conditions",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E15",
        "url": "https://dda.gov.ae/en/terms-and-conditions",
        "source_type": "website_terms",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Clauses 2.2, 3.10, 5.1-5.5",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E16",
      "url": "https://www.dubaipulse.gov.ae/docs/DDE%20_%20DRAFT_Open_Data%20Licence_LONG_Form_English%203.pdf",
      "verification": "INDEX_ONLY_FULL_FETCH_TIMEOUT",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "Filename contains DRAFT; applicability/version unverified",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E16",
        "url": "https://www.dubaipulse.gov.ae/docs/DDE%20_%20DRAFT_Open_Data%20Licence_LONG_Form_English%203.pdf",
        "source_type": "licence_document",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "Filename contains DRAFT; applicability/version unverified",
        "verification": "INDEX_ONLY_FULL_FETCH_TIMEOUT",
        "locator": "Indexed clauses 2.1-2.3 and 3.1-3.3 only; no dataset binding established",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E17",
      "url": "https://data.dubai/en/",
      "verification": "REQUEST_REJECTED",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E17",
        "url": "https://data.dubai/en/",
        "source_type": "public_platform",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "REQUEST_REJECTED",
        "locator": "Fresh browser HTTP200 title Request Rejected; not functional success",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E18",
      "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/02-Design/B-03-PRELIMINARY-DESIGN-APPROVAL/ZA-DC-F-03-preliminary-design-approval-request-v1.pdf",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "ZA-DC-F-03 Issue 14",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E18",
        "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/02-Design/B-03-PRELIMINARY-DESIGN-APPROVAL/ZA-DC-F-03-preliminary-design-approval-request-v1.pdf",
        "source_type": "official_form",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "ZA-DC-F-03 Issue 14",
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "page 1",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E19",
      "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/Master-Planning/P-08-MASTER-PLAN-MODIFICATION-and-TEMPORARY-USE-OF-PLOT/ZA-MP-F-09-Master-Plan-Modification-Request-Editable.pdf",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "ZA-MP-F-09 Issue 8",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E19",
        "url": "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/Master-Planning/P-08-MASTER-PLAN-MODIFICATION-and-TEMPORARY-USE-OF-PLOT/ZA-MP-F-09-Master-Plan-Modification-Request-Editable.pdf",
        "source_type": "official_form",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "ZA-MP-F-09 Issue 8",
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "page 1",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E20",
      "url": "https://dlp.dubai.gov.ae/Legislation%20Reference/2007/Law%20No.%20%288%29%20of%202007.html",
      "verification": "INDEX_ONLY_FULL_FETCH_TIMEOUT",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "Law 8/2007; consolidated applicability not verified",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E20",
        "url": "https://dlp.dubai.gov.ae/Legislation%20Reference/2007/Law%20No.%20%288%29%20of%202007.html",
        "source_type": "official_law_translation",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": "Law 8/2007; consolidated applicability not verified",
        "verification": "INDEX_ONLY_FULL_FETCH_TIMEOUT",
        "locator": "Indexed Articles 13-14; HTML and PDF both timed out",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E21",
      "url": "https://www.dubaipulse.gov.ae/organisation/dld",
      "verification": "FETCH_TIMEOUT",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E21",
        "url": "https://www.dubaipulse.gov.ae/organisation/dld",
        "source_type": "public_data_catalog",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "FETCH_TIMEOUT",
        "locator": "DLD Real Estate Data link text data.dubai targets this legacy URL",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    },
    {
      "id": "E22",
      "url": "https://dlp.dubai.gov.ae/en/Pages/LegislationSearch.aspx?trk=public_post_comment-text",
      "verification": "RELEVANT_PUBLIC_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": null,
      "original": {
        "source_id": "E22",
        "url": "https://dlp.dubai.gov.ae/en/Pages/LegislationSearch.aspx?trk=public_post_comment-text",
        "source_type": "official_legislation_index",
        "observed_date": "2026-10-22",
        "effective_date": null,
        "source_version": null,
        "verification": "RELEVANT_PUBLIC_TEXT_READ",
        "locator": "Law 11/2026 record: Gazette 774; issued 11 May; In Force",
        "service_execution": "NOT_TESTED",
        "rights_basis": "Public source read; see reuse-rights.json, no implied redistribution grant"
      }
    }
  ],
  "rules": [
    {
      "id": "AE-DU-DDA-SITE-PLAN",
      "jurisdiction": "AE-DU",
      "label": "Site plan issuance",
      "authority": "DDA",
      "applicability": "Confirmed plot-specific jurisdiction required",
      "sourceIds": [
        "D04",
        "E01"
      ],
      "sourceUrls": [
        "https://dda.gov.ae/en/planning-development/master-planning/site-plan-issuance",
        "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/Master-Planning/P-04-SITE-PLAN-ISSUANCE/ZA-MP-F-04-Site-Plan-Issuance-Request.pdf"
      ],
      "form": {
        "source_id": "E01",
        "code": "ZA-MP-F-04",
        "issue": "7",
        "fields": [
          "master project",
          "single or multiple request",
          "plot number",
          "owner category",
          "requester contact/signature"
        ],
        "file_hash": "7fcaf7d8178b3dceef95fbbe6185ae58b8b4efc0f4db1d40d14478d6dfdd2023",
        "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
        "fillable_pdf_tested": false
      },
      "applicants": [
        "Plot owner",
        "Master developer",
        "Owner representative"
      ],
      "requirements": [
        "Owner identity or company licence",
        "Title deed unless master developer owns plot",
        "Master-developer NOC for lease",
        "Representative delegation required by form"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": "7",
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
        "terms_source_ids": [
          "E15"
        ]
      },
      "access": {
        "published_channel": "zoning eServices; form for customer-service route",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "base": 1000,
        "additional": 20,
        "unit": "site plan",
        "service_time": "2 working days excluding submission day",
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Actual plot, mandate, issued document and operative conditions not provided",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and local professional confirm current requirements and submit via official channel"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DDA-SITE-PLAN",
        "name": "Site plan issuance",
        "jurisdiction": "AE-DU",
        "authority": "DDA",
        "applicability": "Confirmed plot-specific jurisdiction required",
        "registry_row_ids": [
          2,
          10,
          11
        ],
        "source_ids": [
          "D04",
          "E01"
        ],
        "source_urls": [
          "https://dda.gov.ae/en/planning-development/master-planning/site-plan-issuance",
          "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/Master-Planning/P-04-SITE-PLAN-ISSUANCE/ZA-MP-F-04-Site-Plan-Issuance-Request.pdf"
        ],
        "form": {
          "source_id": "E01",
          "code": "ZA-MP-F-04",
          "issue": "7",
          "fields": [
            "master project",
            "single or multiple request",
            "plot number",
            "owner category",
            "requester contact/signature"
          ],
          "file_hash": "7fcaf7d8178b3dceef95fbbe6185ae58b8b4efc0f4db1d40d14478d6dfdd2023",
          "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
          "fillable_pdf_tested": false
        },
        "applicant": [
          "Plot owner",
          "Master developer",
          "Owner representative"
        ],
        "access": {
          "published_channel": "zoning eServices; form for customer-service route",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
          "terms_source_ids": [
            "E15"
          ]
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Owner identity or company licence",
          "Title deed unless master developer owns plot",
          "Master-developer NOC for lease",
          "Representative delegation required by form"
        ],
        "published_fees": {
          "currency": "AED",
          "base": 1000,
          "additional": 20,
          "unit": "site plan",
          "service_time": "2 working days excluding submission day",
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Actual plot, mandate, issued document and operative conditions not provided"
        ],
        "automation_allowed_now": [
          "Prepare internal checklist",
          "Link official source",
          "Keep unverified fields null"
        ],
        "manual_step": "Authorised applicant and local professional confirm current requirements and submit via official channel",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DDA-PLANNING-DATA",
      "jurisdiction": "AE-DU",
      "label": "Copy of planning data",
      "authority": "DDA",
      "applicability": "Confirmed plot-specific jurisdiction required",
      "sourceIds": [
        "D05",
        "E02"
      ],
      "sourceUrls": [
        "https://dda.gov.ae/en/planning-development/master-planning/copy-of-planning-data",
        "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/Master-Planning/P-09-COPY-OF-PLANNING-DATA/ZA-MP-F-08-Copy-of-Planning-Data-Request.pdf"
      ],
      "form": {
        "source_id": "E02",
        "code": "ZA-MP-F-08",
        "issue": "8",
        "classification_on_form": "Internal",
        "fields": [
          "master project",
          "drawing description",
          "AutoCad/Microstation/PDF",
          "requester signature/stamp"
        ],
        "file_hash": "ca433f825fe9e9c37758081af00ada75ee8ff399746a4cf15efa641a12e8b070",
        "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
        "fillable_pdf_tested": false
      },
      "applicants": [
        "Plot owner",
        "Master developer",
        "Owner representative"
      ],
      "requirements": [
        "Master project and drawing description",
        "Requested file format"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": "8",
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
        "terms_source_ids": [
          "E15"
        ]
      },
      "access": {
        "published_channel": "Master Planning eServices or service centre",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "base": 500,
        "additional": 20,
        "service_time": "2 working days",
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Dataset licence and permission to reproduce Internal-marked form not established",
        "Project-specific planning parameters unknown",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and local professional confirm current requirements and submit via official channel"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DDA-PLANNING-DATA",
        "name": "Copy of planning data",
        "jurisdiction": "AE-DU",
        "authority": "DDA",
        "applicability": "Confirmed plot-specific jurisdiction required",
        "registry_row_ids": [
          12
        ],
        "source_ids": [
          "D05",
          "E02"
        ],
        "source_urls": [
          "https://dda.gov.ae/en/planning-development/master-planning/copy-of-planning-data",
          "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/Master-Planning/P-09-COPY-OF-PLANNING-DATA/ZA-MP-F-08-Copy-of-Planning-Data-Request.pdf"
        ],
        "form": {
          "source_id": "E02",
          "code": "ZA-MP-F-08",
          "issue": "8",
          "classification_on_form": "Internal",
          "fields": [
            "master project",
            "drawing description",
            "AutoCad/Microstation/PDF",
            "requester signature/stamp"
          ],
          "file_hash": "ca433f825fe9e9c37758081af00ada75ee8ff399746a4cf15efa641a12e8b070",
          "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
          "fillable_pdf_tested": false
        },
        "applicant": [
          "Plot owner",
          "Master developer",
          "Owner representative"
        ],
        "access": {
          "published_channel": "Master Planning eServices or service centre",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
          "terms_source_ids": [
            "E15"
          ]
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Master project and drawing description",
          "Requested file format"
        ],
        "published_fees": {
          "currency": "AED",
          "base": 500,
          "additional": 20,
          "service_time": "2 working days",
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Dataset licence and permission to reproduce Internal-marked form not established",
          "Project-specific planning parameters unknown"
        ],
        "automation_allowed_now": [
          "Prepare internal checklist",
          "Link official source",
          "Keep unverified fields null"
        ],
        "manual_step": "Authorised applicant and local professional confirm current requirements and submit via official channel",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DDA-FINAL-DESIGN",
      "jurisdiction": "AE-DU",
      "label": "Final design approval",
      "authority": "DDA",
      "applicability": "Confirmed plot-specific jurisdiction required",
      "sourceIds": [
        "D08",
        "E03"
      ],
      "sourceUrls": [
        "https://dda.gov.ae/en/planning-development/design/final-design-approval",
        "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/02-Design/B-09-FINAL-DESIGN-APPROVAL/ZA-DC-F-04-final-design-approval-request9.pdf"
      ],
      "form": {
        "source_id": "E03",
        "code": "ZA-DC-F-04",
        "issue": "15",
        "supersedes_in_supplied_corpus": "Issue 13 remains historical; current service-page link is Issue 15",
        "fields": [
          "plot",
          "consultant",
          "request number",
          "final/substructure",
          "new/renewal",
          "initial/resubmission",
          "signature/stamp"
        ],
        "file_hash": "bfc06259daf5ea146e91c12659f562d35461f36cd6c0c2604a03c1913962c2da",
        "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
        "fillable_pdf_tested": false
      },
      "applicants": [
        "Consultant"
      ],
      "requirements": [
        "Valid site plan",
        "Owner appointment",
        "Architectural/structural/mechanical drawings and soil report",
        "RTA access/TIS/gate level",
        "DEWA, Civil Defence, telecom, sewerage",
        "Conditional aviation/environment/cooling approvals",
        "Project details, universal design and green-building declarations/checklists (also present in Issue 13)"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": "15",
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
        "terms_source_ids": [
          "E15"
        ]
      },
      "access": {
        "published_channel": "zoning eServices or service centre",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "rate": 0.1,
        "area_unit": "ft2 BUA",
        "minimum": 200,
        "maximum": 50000,
        "additional": 20,
        "service_time": "5 working days",
        "design_validity": "1 year",
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Professional design/NOCs absent",
        "Effective issue date not printed/verified",
        "Fee deduction must be reconciled at permit stage",
        "Environmental authority routing conflict AE-DU-ENV-2026-08",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and local professional confirm current requirements and submit via official channel"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DDA-FINAL-DESIGN",
        "name": "Final design approval",
        "jurisdiction": "AE-DU",
        "authority": "DDA",
        "applicability": "Confirmed plot-specific jurisdiction required",
        "registry_row_ids": [
          18,
          20,
          21,
          22,
          23,
          28
        ],
        "source_ids": [
          "D08",
          "E03"
        ],
        "source_urls": [
          "https://dda.gov.ae/en/planning-development/design/final-design-approval",
          "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/02-Design/B-09-FINAL-DESIGN-APPROVAL/ZA-DC-F-04-final-design-approval-request9.pdf"
        ],
        "form": {
          "source_id": "E03",
          "code": "ZA-DC-F-04",
          "issue": "15",
          "supersedes_in_supplied_corpus": "Issue 13 remains historical; current service-page link is Issue 15",
          "fields": [
            "plot",
            "consultant",
            "request number",
            "final/substructure",
            "new/renewal",
            "initial/resubmission",
            "signature/stamp"
          ],
          "file_hash": "bfc06259daf5ea146e91c12659f562d35461f36cd6c0c2604a03c1913962c2da",
          "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
          "fillable_pdf_tested": false
        },
        "applicant": [
          "Consultant"
        ],
        "access": {
          "published_channel": "zoning eServices or service centre",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
          "terms_source_ids": [
            "E15"
          ]
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Valid site plan",
          "Owner appointment",
          "Architectural/structural/mechanical drawings and soil report",
          "RTA access/TIS/gate level",
          "DEWA, Civil Defence, telecom, sewerage",
          "Conditional aviation/environment/cooling approvals",
          "Project details, universal design and green-building declarations/checklists (also present in Issue 13)"
        ],
        "published_fees": {
          "currency": "AED",
          "rate": 0.1,
          "area_unit": "ft2 BUA",
          "minimum": 200,
          "maximum": 50000,
          "additional": 20,
          "service_time": "5 working days",
          "design_validity": "1 year",
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Professional design/NOCs absent",
          "Effective issue date not printed/verified",
          "Fee deduction must be reconciled at permit stage",
          "Environmental authority routing conflict AE-DU-ENV-2026-08"
        ],
        "automation_allowed_now": [
          "Prepare internal checklist",
          "Link official source",
          "Keep unverified fields null"
        ],
        "manual_step": "Authorised applicant and local professional confirm current requirements and submit via official channel",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DDA-FINAL-PERMIT",
      "jurisdiction": "AE-DU",
      "label": "Final building permit",
      "authority": "DDA",
      "applicability": "Confirmed plot-specific jurisdiction required",
      "sourceIds": [
        "D09",
        "E04"
      ],
      "sourceUrls": [
        "https://dda.gov.ae/en/planning-development/construction/permits-nocs/final-building-permit",
        "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/03-Construction/Permits-and-NOCs/B-10-FINAL-BUILDING-PERMIT/ZA-DC-F-08-Building-Permit-Application.pdf"
      ],
      "form": {
        "source_id": "E04",
        "code": "ZA-DC-F-08",
        "issue": "14",
        "fields": [
          "plot",
          "consultant",
          "contractor",
          "permit type",
          "requester signature/stamp"
        ],
        "file_hash": "c060d3ccd7b624c92f043c9f3118accaa1aeb1c917a9898721d59e1637b14737",
        "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
        "fillable_pdf_tested": false
      },
      "applicants": [
        "Contractor"
      ],
      "requirements": [
        "Owner/consultant/contractor appointment",
        "Applicable design approval",
        "Land demarcation before any site activity"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": "14",
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
        "terms_source_ids": [
          "E15"
        ]
      },
      "access": {
        "published_channel": "zoning eServices",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "rate": 1,
        "area_unit": "ft2 total BUA",
        "minimum": 200,
        "additional": 20,
        "industrial_cap": 250000,
        "deductions": "Earlier applicable permit fees except mobilisation/excavation; final-design card also describes credit",
        "service_time": "2 working days",
        "validity": "4 years",
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "No permit issued",
        "Separate excavation/piling/shoring conditions need professional review",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and local professional confirm current requirements and submit via official channel"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DDA-FINAL-PERMIT",
        "name": "Final building permit",
        "jurisdiction": "AE-DU",
        "authority": "DDA",
        "applicability": "Confirmed plot-specific jurisdiction required",
        "registry_row_ids": [
          15,
          16,
          29
        ],
        "source_ids": [
          "D09",
          "E04"
        ],
        "source_urls": [
          "https://dda.gov.ae/en/planning-development/construction/permits-nocs/final-building-permit",
          "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/03-Construction/Permits-and-NOCs/B-10-FINAL-BUILDING-PERMIT/ZA-DC-F-08-Building-Permit-Application.pdf"
        ],
        "form": {
          "source_id": "E04",
          "code": "ZA-DC-F-08",
          "issue": "14",
          "fields": [
            "plot",
            "consultant",
            "contractor",
            "permit type",
            "requester signature/stamp"
          ],
          "file_hash": "c060d3ccd7b624c92f043c9f3118accaa1aeb1c917a9898721d59e1637b14737",
          "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
          "fillable_pdf_tested": false
        },
        "applicant": [
          "Contractor"
        ],
        "access": {
          "published_channel": "zoning eServices",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
          "terms_source_ids": [
            "E15"
          ]
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Owner/consultant/contractor appointment",
          "Applicable design approval",
          "Land demarcation before any site activity"
        ],
        "published_fees": {
          "currency": "AED",
          "rate": 1,
          "area_unit": "ft2 total BUA",
          "minimum": 200,
          "additional": 20,
          "industrial_cap": 250000,
          "deductions": "Earlier applicable permit fees except mobilisation/excavation; final-design card also describes credit",
          "service_time": "2 working days",
          "validity": "4 years",
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "No permit issued",
          "Separate excavation/piling/shoring conditions need professional review"
        ],
        "automation_allowed_now": [
          "Prepare internal checklist",
          "Link official source",
          "Keep unverified fields null"
        ],
        "manual_step": "Authorised applicant and local professional confirm current requirements and submit via official channel",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-PCFC-SITE-PLAN",
      "jurisdiction": "AE-DU",
      "label": "Issue site plan",
      "authority": "PCFC Trakhees",
      "applicability": "Confirmed plot-specific jurisdiction required",
      "sourceIds": [
        "D10",
        "E05"
      ],
      "sourceUrls": [
        "https://pcfc.ae/en/Pages/serviceinfo.aspx?BU=trakhees&ref=Services&sid=453",
        "https://www.pcfc.ae/en/Service%20Documents/PCFC-TRK-CED-PL-CP-02%2C%20Obtaining%20Site%20Plan%2C%20Lease%20drwg.pdf"
      ],
      "form": null,
      "applicants": [
        "Customer; eligibility details not verified"
      ],
      "requirements": [
        "Procedure PCFC-TRK-CED-PL-CP-02 linked but returned 403"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence"
      },
      "access": {
        "published_channel": "Email",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "site_map": 250,
        "land_creation_or_modification": 320,
        "urgent_request": 100,
        "basis": "Published service-card wording; additive/tax scope unknown",
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Procedure body and applicant mandate unknown",
        "No verified official email address extracted",
        "No actual plot selected",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and local professional confirm current requirements and submit via official channel"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-PCFC-SITE-PLAN",
        "name": "Issue site plan",
        "jurisdiction": "AE-DU",
        "authority": "PCFC Trakhees",
        "applicability": "Confirmed plot-specific jurisdiction required",
        "registry_row_ids": [
          13
        ],
        "source_ids": [
          "D10",
          "E05"
        ],
        "source_urls": [
          "https://pcfc.ae/en/Pages/serviceinfo.aspx?BU=trakhees&ref=Services&sid=453",
          "https://www.pcfc.ae/en/Service%20Documents/PCFC-TRK-CED-PL-CP-02%2C%20Obtaining%20Site%20Plan%2C%20Lease%20drwg.pdf"
        ],
        "form": null,
        "applicant": [
          "Customer; eligibility details not verified"
        ],
        "access": {
          "published_channel": "Email",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence"
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Procedure PCFC-TRK-CED-PL-CP-02 linked but returned 403"
        ],
        "published_fees": {
          "currency": "AED",
          "site_map": 250,
          "land_creation_or_modification": 320,
          "urgent_request": 100,
          "basis": "Published service-card wording; additive/tax scope unknown",
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Procedure body and applicant mandate unknown",
          "No verified official email address extracted",
          "No actual plot selected"
        ],
        "automation_allowed_now": [
          "Prepare internal checklist",
          "Link official source",
          "Keep unverified fields null"
        ],
        "manual_step": "Authorised applicant and local professional confirm current requirements and submit via official channel",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-PCFC-CONCEPT",
      "jurisdiction": "AE-DU",
      "label": "New concept design NOC",
      "authority": "PCFC Trakhees",
      "applicability": "Confirmed plot-specific jurisdiction required",
      "sourceIds": [
        "D11",
        "E06",
        "E07"
      ],
      "sourceUrls": [
        "https://pcfc.ae/en/Pages/serviceinfo.aspx?BU=trakhees&ref=Services&sid=330",
        "https://www.pcfc.ae/en/Service%20Documents/PCFC-TRK-CED-PS-CP-11%2C%20Obtaining%20Concept%20Design.pdf",
        "https://www.pcfc.ae/en/Service%20Documents/TRK-CED-PS-CF11a%2C%20Application%20Form%20for%20Concept%20Design%20NOC.pdf"
      ],
      "form": {
        "source_id": "E07",
        "code": "TRK-CED-PS-CF11a",
        "issue": null,
        "fields": null,
        "file_hash": null,
        "verification": "INDEX_ONLY; fetch 403",
        "fields_kind": "NOT_VERIFIED; linked form body inaccessible",
        "fillable_pdf_tested": false
      },
      "applicants": [
        "Company; authorised professional/signatory not verified"
      ],
      "requirements": [
        "Procedure PCFC-TRK-CED-PS-CP-11",
        "Form TRK-CED-PS-CF11a",
        "Checklist TRK-CED-PS-CF01b listed on service card"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence"
      },
      "access": {
        "published_channel": "Website/mobile application",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "minimum": 250,
        "formula_text": "0.5 x Additional Built Up Area +20; 100 x Sheet +20",
        "computable": false,
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Area unit and relation between fee formula alternatives not confirmed",
        "Form fields, versions, signatory and attachment requirements unverified",
        "Portability is a routing/contract check, not completed permit route",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and local professional confirm current requirements and submit via official channel"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-PCFC-CONCEPT",
        "name": "New concept design NOC",
        "jurisdiction": "AE-DU",
        "authority": "PCFC Trakhees",
        "applicability": "Confirmed plot-specific jurisdiction required",
        "registry_row_ids": [
          28
        ],
        "source_ids": [
          "D11",
          "E06",
          "E07"
        ],
        "source_urls": [
          "https://pcfc.ae/en/Pages/serviceinfo.aspx?BU=trakhees&ref=Services&sid=330",
          "https://www.pcfc.ae/en/Service%20Documents/PCFC-TRK-CED-PS-CP-11%2C%20Obtaining%20Concept%20Design.pdf",
          "https://www.pcfc.ae/en/Service%20Documents/TRK-CED-PS-CF11a%2C%20Application%20Form%20for%20Concept%20Design%20NOC.pdf"
        ],
        "form": {
          "source_id": "E07",
          "code": "TRK-CED-PS-CF11a",
          "issue": null,
          "fields": null,
          "file_hash": null,
          "verification": "INDEX_ONLY; fetch 403",
          "fields_kind": "NOT_VERIFIED; linked form body inaccessible",
          "fillable_pdf_tested": false
        },
        "applicant": [
          "Company; authorised professional/signatory not verified"
        ],
        "access": {
          "published_channel": "Website/mobile application",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence"
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Procedure PCFC-TRK-CED-PS-CP-11",
          "Form TRK-CED-PS-CF11a",
          "Checklist TRK-CED-PS-CF01b listed on service card"
        ],
        "published_fees": {
          "currency": "AED",
          "minimum": 250,
          "formula_text": "0.5 x Additional Built Up Area +20; 100 x Sheet +20",
          "computable": false,
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Area unit and relation between fee formula alternatives not confirmed",
          "Form fields, versions, signatory and attachment requirements unverified",
          "Portability is a routing/contract check, not completed permit route"
        ],
        "automation_allowed_now": [
          "Prepare internal checklist",
          "Link official source",
          "Keep unverified fields null"
        ],
        "manual_step": "Authorised applicant and local professional confirm current requirements and submit via official channel",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DLD-PROPERTY-REPORT",
      "jurisdiction": "AE-DU",
      "label": "Detailed property report",
      "authority": "DLD",
      "applicability": "One registered property; applicant rights must be established",
      "sourceIds": [
        "D13"
      ],
      "sourceUrls": [
        "https://dubailand.gov.ae/en/eservices/request-detailed-property-report/"
      ],
      "form": null,
      "applicants": [
        "Individuals online/REST",
        "Individuals or companies via trustee"
      ],
      "requirements": [
        "Trustee: individual Emirates ID; company licence and official letter"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
        "terms_source_ids": [
          "E14"
        ]
      },
      "access": {
        "published_channel": "DLD account/REST; real-estate trustee",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "online_total": 70,
        "trustee_total_including_vat": 120,
        "service_time": "10 minutes",
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Public card does not establish access to an unrelated owner property",
        "Operational authentication and report issuance not tested",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and local professional confirm current requirements and submit via official channel"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DLD-PROPERTY-REPORT",
        "name": "Detailed property report",
        "jurisdiction": "AE-DU",
        "authority": "DLD",
        "applicability": "One registered property; applicant rights must be established",
        "registry_row_ids": [
          4
        ],
        "source_ids": [
          "D13"
        ],
        "source_urls": [
          "https://dubailand.gov.ae/en/eservices/request-detailed-property-report/"
        ],
        "form": null,
        "applicant": [
          "Individuals online/REST",
          "Individuals or companies via trustee"
        ],
        "access": {
          "published_channel": "DLD account/REST; real-estate trustee",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
          "terms_source_ids": [
            "E14"
          ]
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Trustee: individual Emirates ID; company licence and official letter"
        ],
        "published_fees": {
          "currency": "AED",
          "online_total": 70,
          "trustee_total_including_vat": 120,
          "service_time": "10 minutes",
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Public card does not establish access to an unrelated owner property",
          "Operational authentication and report issuance not tested"
        ],
        "automation_allowed_now": [
          "Prepare internal checklist",
          "Link official source",
          "Keep unverified fields null"
        ],
        "manual_step": "Authorised applicant and local professional confirm current requirements and submit via official channel",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DLD-PROPERTY-MAP",
      "jurisdiction": "AE-DU",
      "label": "Property map",
      "authority": "DLD",
      "applicability": "Registered property and owner mandate; e-map does not establish planning approval",
      "sourceIds": [
        "D14"
      ],
      "sourceUrls": [
        "https://dubailand.gov.ae/en/eservices/property-map-request/"
      ],
      "form": null,
      "applicants": [
        "Property owner",
        "Representative with owner/company letter"
      ],
      "requirements": [
        "Owner/company representation letter where applicable"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
        "terms_source_ids": [
          "E14"
        ]
      },
      "access": {
        "published_channel": "DLD/REST/Oqood or trustee",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "land_outside_dm": 100,
        "unified_dm_land": 225,
        "additional_per_drawing": 20,
        "service_time": "12 minutes; shared DM map subject to DM terms and within 24h",
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Map geometry, CRS, currency and original rights not verified",
        "DLD FAQ gives25-minute map time versus service-card12 minutes; use service-specific card as published estimate, obtain current quote",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and local professional confirm current requirements and submit via official channel"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DLD-PROPERTY-MAP",
        "name": "Property map",
        "jurisdiction": "AE-DU",
        "authority": "DLD",
        "applicability": "Registered property and owner mandate; e-map does not establish planning approval",
        "registry_row_ids": [
          2,
          5
        ],
        "source_ids": [
          "D14"
        ],
        "source_urls": [
          "https://dubailand.gov.ae/en/eservices/property-map-request/"
        ],
        "form": null,
        "applicant": [
          "Property owner",
          "Representative with owner/company letter"
        ],
        "access": {
          "published_channel": "DLD/REST/Oqood or trustee",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
          "terms_source_ids": [
            "E14"
          ]
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Owner/company representation letter where applicable"
        ],
        "published_fees": {
          "currency": "AED",
          "land_outside_dm": 100,
          "unified_dm_land": 225,
          "additional_per_drawing": 20,
          "service_time": "12 minutes; shared DM map subject to DM terms and within 24h",
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Map geometry, CRS, currency and original rights not verified",
          "DLD FAQ gives25-minute map time versus service-card12 minutes; use service-specific card as published estimate, obtain current quote"
        ],
        "automation_allowed_now": [
          "Prepare internal checklist",
          "Link official source",
          "Keep unverified fields null"
        ],
        "manual_step": "Authorised applicant and local professional confirm current requirements and submit via official channel",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DLD-OFFPLAN",
      "jurisdiction": "AE-DU",
      "label": "Register project and escrow",
      "authority": "DLD RERA",
      "applicability": "Only off-plan sales branch; not universal building stage",
      "sourceIds": [
        "D16"
      ],
      "sourceUrls": [
        "https://dubailand.gov.ae/en/eservices/register-project/"
      ],
      "form": null,
      "applicants": [
        "Real estate development company",
        "Account custodian for escrow opening"
      ],
      "requirements": [
        "Freehold or long-term lease land",
        "Title deed; preliminary sale certificate insufficient",
        "Developer registered in DLD Trakheesi",
        "Approved plans/units and final building permits",
        "Main-developer NOC for name, off-plan sale and marketing",
        "Development agreement if owner differs",
        "30% guarantee: construction completion OR bank guarantee OR cash deposit",
        "Consultant letter, cooling agreement, investor compensation mechanism"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
        "terms_source_ids": [
          "E14"
        ]
      },
      "access": {
        "published_channel": "Oqood / Trust Account System",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "registration_total": 150020,
        "development_agreement_when_applicable": "4% of land value; separate conditional item",
        "service_time": "25 minutes; not whole readiness lead time",
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Exact guarantee base, escrow agreement, drawdown conditions and project-specific exceptions require confirmation",
        "No registration, account or sales authorisation",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and local professional confirm current requirements and submit via official channel"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DLD-OFFPLAN",
        "name": "Register project and escrow",
        "jurisdiction": "AE-DU",
        "authority": "DLD RERA",
        "applicability": "Only off-plan sales branch; not universal building stage",
        "registry_row_ids": [
          30
        ],
        "source_ids": [
          "D16"
        ],
        "source_urls": [
          "https://dubailand.gov.ae/en/eservices/register-project/"
        ],
        "form": null,
        "applicant": [
          "Real estate development company",
          "Account custodian for escrow opening"
        ],
        "access": {
          "published_channel": "Oqood / Trust Account System",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate plus document/data-use terms; public card is not result-data licence",
          "terms_source_ids": [
            "E14"
          ]
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Freehold or long-term lease land",
          "Title deed; preliminary sale certificate insufficient",
          "Developer registered in DLD Trakheesi",
          "Approved plans/units and final building permits",
          "Main-developer NOC for name, off-plan sale and marketing",
          "Development agreement if owner differs",
          "30% guarantee: construction completion OR bank guarantee OR cash deposit",
          "Consultant letter, cooling agreement, investor compensation mechanism"
        ],
        "published_fees": {
          "currency": "AED",
          "registration_total": 150020,
          "development_agreement_when_applicable": "4% of land value; separate conditional item",
          "service_time": "25 minutes; not whole readiness lead time",
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Exact guarantee base, escrow agreement, drawdown conditions and project-specific exceptions require confirmation",
          "No registration, account or sales authorisation"
        ],
        "automation_allowed_now": [
          "Prepare internal checklist",
          "Link official source",
          "Keep unverified fields null"
        ],
        "manual_step": "Authorised applicant and local professional confirm current requirements and submit via official channel",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DLD-OPEN-DATA",
      "jurisdiction": "AE-DU",
      "label": "Public real estate datasets",
      "authority": "DLD",
      "applicability": "Market context only; not title, cadastral or planning evidence",
      "sourceIds": [
        "D15"
      ],
      "sourceUrls": [
        "https://dubailand.gov.ae/en/open-data/real-estate-data/"
      ],
      "form": null,
      "applicants": [
        "Public reader; extraction entitlement unresolved"
      ],
      "requirements": [
        "Confirm dataset licence, snapshot and field dictionary before ingestion"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PUBLIC_PAGE_DATASET_LICENCE_UNKNOWN",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "terms_source_ids": [
          "E14"
        ]
      },
      "access": {
        "published_channel": "Public table UI with captcha and CSV buttons",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "CSV bytes and API not tested",
        "Dataset-specific commercial redistribution/storage/AI rights unresolved",
        "No bypass of captcha performed",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and local professional confirm current requirements and submit via official channel"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DLD-OPEN-DATA",
        "name": "Public real estate datasets",
        "jurisdiction": "AE-DU",
        "authority": "DLD",
        "applicability": "Market context only; not title, cadastral or planning evidence",
        "registry_row_ids": [
          25,
          26
        ],
        "source_ids": [
          "D15"
        ],
        "source_urls": [
          "https://dubailand.gov.ae/en/open-data/real-estate-data/"
        ],
        "form": null,
        "applicant": [
          "Public reader; extraction entitlement unresolved"
        ],
        "access": {
          "published_channel": "Public table UI with captcha and CSV buttons",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PUBLIC_PAGE_DATASET_LICENCE_UNKNOWN",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "terms_source_ids": [
            "E14"
          ]
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Confirm dataset licence, snapshot and field dictionary before ingestion"
        ],
        "published_fees": null,
        "unknown": [
          "CSV bytes and API not tested",
          "Dataset-specific commercial redistribution/storage/AI rights unresolved",
          "No bypass of captcha performed"
        ],
        "automation_allowed_now": [
          "Prepare internal checklist",
          "Link official source",
          "Keep unverified fields null"
        ],
        "manual_step": "Authorised applicant and local professional confirm current requirements and submit via official channel",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DLD-TRAKHEESI-API",
      "jurisdiction": "AE-DU",
      "label": "Trakheesi listing validation and delisting API",
      "authority": "DLD ERES",
      "applicability": "DLD Trakheesi is distinct from PCFC Trakhees and is not a building-permit API",
      "sourceIds": [
        "D17",
        "D31"
      ],
      "sourceUrls": [
        "https://dubailand.gov.ae/en/eservices/api-gateway/",
        "https://dubailand.gov.ae/en/eservices/api-gateway-registration?appId=3"
      ],
      "form": null,
      "applicants": [
        "Subscriber meeting official business requirements"
      ],
      "requirements": [
        "Standard subscription is non-transferable and non-sublicensable",
        "Internal business use; third-party sale/rental of API access restricted"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "CONTRACT_RESTRICTED",
        "internal_business_use": "conditional_on_subscription",
        "sublicense": false,
        "resell_api_access": false,
        "saas_output_rights": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED"
      },
      "access": {
        "published_channel": "Paid subscription registration; public terms read only",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "annual_base": 30000,
        "vat_percent": 5,
        "annual_total": 31500,
        "purchased": false,
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Multi-tenant SaaS display, derivatives, caching, retention and onward delivery rights need express scope",
        "API schema, credentials and execution not tested",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and local professional confirm current requirements and submit via official channel"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DLD-TRAKHEESI-API",
        "name": "Trakheesi listing validation and delisting API",
        "jurisdiction": "AE-DU",
        "authority": "DLD ERES",
        "applicability": "DLD Trakheesi is distinct from PCFC Trakhees and is not a building-permit API",
        "registry_row_ids": [
          25,
          27
        ],
        "source_ids": [
          "D17",
          "D31"
        ],
        "source_urls": [
          "https://dubailand.gov.ae/en/eservices/api-gateway/",
          "https://dubailand.gov.ae/en/eservices/api-gateway-registration?appId=3"
        ],
        "form": null,
        "applicant": [
          "Subscriber meeting official business requirements"
        ],
        "access": {
          "published_channel": "Paid subscription registration; public terms read only",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "CONTRACT_RESTRICTED",
          "internal_business_use": "conditional_on_subscription",
          "sublicense": false,
          "resell_api_access": false,
          "saas_output_rights": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED"
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Standard subscription is non-transferable and non-sublicensable",
          "Internal business use; third-party sale/rental of API access restricted"
        ],
        "published_fees": {
          "currency": "AED",
          "annual_base": 30000,
          "vat_percent": 5,
          "annual_total": 31500,
          "purchased": false,
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Multi-tenant SaaS display, derivatives, caching, retention and onward delivery rights need express scope",
          "API schema, credentials and execution not tested"
        ],
        "automation_allowed_now": [
          "Prepare internal checklist",
          "Link official source",
          "Keep unverified fields null"
        ],
        "manual_step": "Authorised applicant and local professional confirm current requirements and submit via official channel",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DLD-TITLE-CHECK",
      "jurisdiction": "AE-DU",
      "label": "Title deed authenticity check",
      "authority": "DLD",
      "applicability": "Validate specified deed details; not a general owner search or complete title due diligence",
      "sourceIds": [
        "D25"
      ],
      "sourceUrls": [
        "https://dubailand.gov.ae/en/eservices/title-deed-verification-overview/title-deed-verification/"
      ],
      "form": {
        "source_id": "D25",
        "code": null,
        "issue": null,
        "fields": [
          "deed number",
          "deed year",
          "property type",
          "owner name if selected",
          "captcha"
        ],
        "file_hash": null,
        "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
        "fillable_pdf_tested": false
      },
      "applicants": [
        "Person holding legitimate deed details; no unrestricted lookup entitlement inferred"
      ],
      "requirements": [
        "Deed number/year, property type",
        "Owner name for owner-and-property mode"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate, applicable rights/licence and professional review",
        "terms_source_ids": [
          "E14"
        ]
      },
      "access": {
        "published_channel": "Public form with captcha",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "No real deed queried",
        "Empty page success/error messages are template text, not a validation result",
        "Fee and API entitlement unverified",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Applicable authority and authorised professional confirm and execute the request"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DLD-TITLE-CHECK",
        "name": "Title deed authenticity check",
        "jurisdiction": "AE-DU",
        "authority": "DLD",
        "applicability": "Validate specified deed details; not a general owner search or complete title due diligence",
        "registry_row_ids": [
          3
        ],
        "source_ids": [
          "D25"
        ],
        "source_urls": [
          "https://dubailand.gov.ae/en/eservices/title-deed-verification-overview/title-deed-verification/"
        ],
        "form": {
          "source_id": "D25",
          "code": null,
          "issue": null,
          "fields": [
            "deed number",
            "deed year",
            "property type",
            "owner name if selected",
            "captcha"
          ],
          "file_hash": null,
          "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
          "fillable_pdf_tested": false
        },
        "applicant": [
          "Person holding legitimate deed details; no unrestricted lookup entitlement inferred"
        ],
        "access": {
          "published_channel": "Public form with captcha",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate, applicable rights/licence and professional review",
          "terms_source_ids": [
            "E14"
          ]
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Deed number/year, property type",
          "Owner name for owner-and-property mode"
        ],
        "published_fees": null,
        "unknown": [
          "No real deed queried",
          "Empty page success/error messages are template text, not a validation result",
          "Fee and API entitlement unverified"
        ],
        "automation_allowed_now": [
          "Prepare own checklist",
          "Link authoritative source",
          "Keep missing fields explicit"
        ],
        "manual_step": "Applicable authority and authorised professional confirm and execute the request",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DDA-PRELIMINARY",
      "jurisdiction": "AE-DU",
      "label": "Preliminary design approval",
      "authority": "DDA",
      "applicability": "Plot-specific jurisdiction and applicability must be established",
      "sourceIds": [
        "D07",
        "E18"
      ],
      "sourceUrls": [
        "https://dda.gov.ae/en/planning-development/design/preliminary-design-approval",
        "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/02-Design/B-03-PRELIMINARY-DESIGN-APPROVAL/ZA-DC-F-03-preliminary-design-approval-request-v1.pdf"
      ],
      "form": {
        "source_id": "E18",
        "code": "ZA-DC-F-03",
        "issue": "14",
        "fields": [
          "plot",
          "consultant",
          "new/renewal",
          "initial/resubmission",
          "requester signature/stamp"
        ],
        "file_hash": null,
        "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
        "fillable_pdf_tested": false
      },
      "applicants": [
        "Consultant"
      ],
      "requirements": [
        "Valid site plan",
        "Owner appointment",
        "Preliminary architectural drawings per Circular400",
        "Accessibility compliance",
        "Gate level confirmation before site work"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": "14",
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate, applicable rights/licence and professional review",
        "terms_source_ids": [
          "E15"
        ]
      },
      "access": {
        "published_channel": "zoning eServices or service centre",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "rate": 0.02,
        "area_unit": "ft2 total BUA",
        "minimum": 200,
        "maximum": 10000,
        "additional": 20,
        "service_time": "5 working days",
        "validity": "1 year",
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Preliminary approval does not waive mechanical/structural reviews",
        "Actual design and NOCs absent",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Applicable authority and authorised professional confirm and execute the request"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DDA-PRELIMINARY",
        "name": "Preliminary design approval",
        "jurisdiction": "AE-DU",
        "authority": "DDA",
        "applicability": "Plot-specific jurisdiction and applicability must be established",
        "registry_row_ids": [
          28
        ],
        "source_ids": [
          "D07",
          "E18"
        ],
        "source_urls": [
          "https://dda.gov.ae/en/planning-development/design/preliminary-design-approval",
          "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/02-Design/B-03-PRELIMINARY-DESIGN-APPROVAL/ZA-DC-F-03-preliminary-design-approval-request-v1.pdf"
        ],
        "form": {
          "source_id": "E18",
          "code": "ZA-DC-F-03",
          "issue": "14",
          "fields": [
            "plot",
            "consultant",
            "new/renewal",
            "initial/resubmission",
            "requester signature/stamp"
          ],
          "file_hash": null,
          "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
          "fillable_pdf_tested": false
        },
        "applicant": [
          "Consultant"
        ],
        "access": {
          "published_channel": "zoning eServices or service centre",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate, applicable rights/licence and professional review",
          "terms_source_ids": [
            "E15"
          ]
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Valid site plan",
          "Owner appointment",
          "Preliminary architectural drawings per Circular400",
          "Accessibility compliance",
          "Gate level confirmation before site work"
        ],
        "published_fees": {
          "currency": "AED",
          "rate": 0.02,
          "area_unit": "ft2 total BUA",
          "minimum": 200,
          "maximum": 10000,
          "additional": 20,
          "service_time": "5 working days",
          "validity": "1 year",
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Preliminary approval does not waive mechanical/structural reviews",
          "Actual design and NOCs absent"
        ],
        "automation_allowed_now": [
          "Prepare own checklist",
          "Link authoritative source",
          "Keep missing fields explicit"
        ],
        "manual_step": "Applicable authority and authorised professional confirm and execute the request",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DDA-MASTER-MODIFICATION",
      "jurisdiction": "AE-DU",
      "label": "Master plan modification",
      "authority": "DDA",
      "applicability": "Plot-specific jurisdiction and applicability must be established",
      "sourceIds": [
        "D06",
        "E19"
      ],
      "sourceUrls": [
        "https://dda.gov.ae/en/planning-development/master-planning/master-plan-modification-temporary-use-of-plot",
        "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/Master-Planning/P-08-MASTER-PLAN-MODIFICATION-and-TEMPORARY-USE-OF-PLOT/ZA-MP-F-09-Master-Plan-Modification-Request-Editable.pdf"
      ],
      "form": {
        "source_id": "E19",
        "code": "ZA-MP-F-09",
        "issue": "8",
        "fields": [
          "master project",
          "change types",
          "affected plots",
          "requester signature/stamp"
        ],
        "file_hash": null,
        "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
        "fillable_pdf_tested": false
      },
      "applicants": [
        "Master developer",
        "Consultant appointed by master developer"
      ],
      "requirements": [
        "Before/after subdivision and land-use budget",
        "Master-developer/owner NOC as applicable",
        "Revised guidelines and checklist"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": "8",
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate, applicable rights/licence and professional review",
        "terms_source_ids": [
          "E15"
        ]
      },
      "access": {
        "published_channel": "Master Planning eServices or service centre",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "initial": 1000,
        "additional_per_transaction": 20,
        "final_fee": "Conditional minor/major tariff; calculate only after authority classifies application",
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Requested GFA/use/plot changes are not approved parameters",
        "Classification, final quote and decision unknown",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Applicable authority and authorised professional confirm and execute the request"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DDA-MASTER-MODIFICATION",
        "name": "Master plan modification",
        "jurisdiction": "AE-DU",
        "authority": "DDA",
        "applicability": "Plot-specific jurisdiction and applicability must be established",
        "registry_row_ids": [
          14
        ],
        "source_ids": [
          "D06",
          "E19"
        ],
        "source_urls": [
          "https://dda.gov.ae/en/planning-development/master-planning/master-plan-modification-temporary-use-of-plot",
          "https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/General/DDA_PDF/PD_PDF/Master-Planning/P-08-MASTER-PLAN-MODIFICATION-and-TEMPORARY-USE-OF-PLOT/ZA-MP-F-09-Master-Plan-Modification-Request-Editable.pdf"
        ],
        "form": {
          "source_id": "E19",
          "code": "ZA-MP-F-09",
          "issue": "8",
          "fields": [
            "master project",
            "change types",
            "affected plots",
            "requester signature/stamp"
          ],
          "file_hash": null,
          "fields_kind": "Semantic labels observed in public source; not PDF AcroForm field identifiers",
          "fillable_pdf_tested": false
        },
        "applicant": [
          "Master developer",
          "Consultant appointed by master developer"
        ],
        "access": {
          "published_channel": "Master Planning eServices or service centre",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate, applicable rights/licence and professional review",
          "terms_source_ids": [
            "E15"
          ]
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Before/after subdivision and land-use budget",
          "Master-developer/owner NOC as applicable",
          "Revised guidelines and checklist"
        ],
        "published_fees": {
          "currency": "AED",
          "initial": 1000,
          "additional_per_transaction": 20,
          "final_fee": "Conditional minor/major tariff; calculate only after authority classifies application",
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Requested GFA/use/plot changes are not approved parameters",
          "Classification, final quote and decision unknown"
        ],
        "automation_allowed_now": [
          "Prepare own checklist",
          "Link authoritative source",
          "Keep missing fields explicit"
        ],
        "manual_step": "Applicable authority and authorised professional confirm and execute the request",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DEWA-WATER-NOC",
      "jurisdiction": "AE-DU",
      "label": "Building NOC Water",
      "authority": "DEWA",
      "applicability": "Water building NOC; not a utility capacity or connection commitment",
      "sourceIds": [
        "E08"
      ],
      "sourceUrls": [
        "https://dewa.gov.ae/en/about-us/service-guide/builder-services/building-no-objection-certificate-water"
      ],
      "form": null,
      "applicants": [
        "Enrolled contractor",
        "Enrolled consultant"
      ],
      "requirements": [
        "Setting-out plan locating ground/underground water tank",
        "Link/register project owner"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate, applicable rights/licence and professional review"
      },
      "access": {
        "published_channel": "DM projects only via Dubai BPS; other authorities via DEWA",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "published_service_fee": 0,
        "service_time": "3 working days",
        "validity_months": 6,
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "No NOC issued",
        "Electricity scope separate",
        "Capacity, reinforcement, connection cost/date require separate evidence",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Applicable authority and authorised professional confirm and execute the request"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DEWA-WATER-NOC",
        "name": "Building NOC Water",
        "jurisdiction": "AE-DU",
        "authority": "DEWA",
        "applicability": "Water building NOC; not a utility capacity or connection commitment",
        "registry_row_ids": [
          20
        ],
        "source_ids": [
          "E08"
        ],
        "source_urls": [
          "https://dewa.gov.ae/en/about-us/service-guide/builder-services/building-no-objection-certificate-water"
        ],
        "form": null,
        "applicant": [
          "Enrolled contractor",
          "Enrolled consultant"
        ],
        "access": {
          "published_channel": "DM projects only via Dubai BPS; other authorities via DEWA",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate, applicable rights/licence and professional review"
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Setting-out plan locating ground/underground water tank",
          "Link/register project owner"
        ],
        "published_fees": {
          "currency": "AED",
          "published_service_fee": 0,
          "service_time": "3 working days",
          "validity_months": 6,
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "No NOC issued",
          "Electricity scope separate",
          "Capacity, reinforcement, connection cost/date require separate evidence"
        ],
        "automation_allowed_now": [
          "Prepare own checklist",
          "Link authoritative source",
          "Keep missing fields explicit"
        ],
        "manual_step": "Applicable authority and authorised professional confirm and execute the request",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DEWA-INFRA-NOC",
      "jurisdiction": "AE-DU",
      "label": "Infrastructure NOC",
      "authority": "DEWA / RTA / DM according to works scope",
      "applicability": "Infrastructure works in ROW or within/adjacent to DEWA reservations/premises",
      "sourceIds": [
        "D18"
      ],
      "sourceUrls": [
        "https://dewa.gov.ae/en/builder/master-plan-noc/infrastructure-noc-application"
      ],
      "form": null,
      "applicants": [
        "Registered consultant/contractor/developer/service authority"
      ],
      "requirements": [
        "Scope-specific technical/submission guidelines",
        "Project/type/NOC type and DLTM coordinates"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate, applicable rights/licence and professional review"
      },
      "access": {
        "published_channel": "ROW: RTA eNOC; design-and-build: DM DBPS; DEWA reservations/premises: DEWA",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "published_service_fee": 0,
        "service_time": "3-7 working days by type; special cases may take longer",
        "validity_months": 6,
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Project-specific attachments unresolved",
        "No NOC, capacity or connection tested",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Applicable authority and authorised professional confirm and execute the request"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DEWA-INFRA-NOC",
        "name": "Infrastructure NOC",
        "jurisdiction": "AE-DU",
        "authority": "DEWA / RTA / DM according to works scope",
        "applicability": "Infrastructure works in ROW or within/adjacent to DEWA reservations/premises",
        "registry_row_ids": [
          19
        ],
        "source_ids": [
          "D18"
        ],
        "source_urls": [
          "https://dewa.gov.ae/en/builder/master-plan-noc/infrastructure-noc-application"
        ],
        "form": null,
        "applicant": [
          "Registered consultant/contractor/developer/service authority"
        ],
        "access": {
          "published_channel": "ROW: RTA eNOC; design-and-build: DM DBPS; DEWA reservations/premises: DEWA",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate, applicable rights/licence and professional review"
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Scope-specific technical/submission guidelines",
          "Project/type/NOC type and DLTM coordinates"
        ],
        "published_fees": {
          "currency": "AED",
          "published_service_fee": 0,
          "service_time": "3-7 working days by type; special cases may take longer",
          "validity_months": 6,
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Project-specific attachments unresolved",
          "No NOC, capacity or connection tested"
        ],
        "automation_allowed_now": [
          "Prepare own checklist",
          "Link authoritative source",
          "Keep missing fields explicit"
        ],
        "manual_step": "Applicable authority and authorised professional confirm and execute the request",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-DM-NEW-BUILDING",
      "jurisdiction": "AE-DU",
      "label": "New building permit route",
      "authority": "Dubai Municipality",
      "applicability": "DM-confirmed multistorey/FAR/public-building route; no DDA form substitution",
      "sourceIds": [
        "D02",
        "D03",
        "E11",
        "E12"
      ],
      "sourceUrls": [
        "https://www.dm.gov.ae/municipality-business/building-permit-steps/",
        "https://dmpmedia.dm.gov.ae/uploads/2020/06/Multi-Story_Building-Permits-Procedures.pdf",
        "https://www.dm.gov.ae/dubai-municipality-services/",
        "https://hub.dm.gov.ae/link/servicedetails?ServiceCode=3398"
      ],
      "form": null,
      "applicants": [
        "Consultant for multistorey submission per2020 procedure",
        "Consultant/contractor for inspections/completion"
      ],
      "requirements": [
        "Applicable drawings, building card, authority NOCs",
        "Structural inspection",
        "Completion inspection and connections"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate, applicable rights/licence and professional review"
      },
      "access": {
        "published_channel": "Dubai BPS; current catalogue links DM Hub service3398",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": {
        "currency": "AED",
        "amount": null,
        "published_service_time": "Current catalogue says3 working days; not end-to-end development time",
        "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
      },
      "unknowns": [
        "Current detailed form and tariff inaccessible",
        "2020 procedure is historical version still linked today",
        "Current professional account flow not tested",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Applicable authority and authorised professional confirm and execute the request"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DM-NEW-BUILDING",
        "name": "New building permit route",
        "jurisdiction": "AE-DU",
        "authority": "Dubai Municipality",
        "applicability": "DM-confirmed multistorey/FAR/public-building route; no DDA form substitution",
        "registry_row_ids": [
          10,
          29,
          31
        ],
        "source_ids": [
          "D02",
          "D03",
          "E11",
          "E12"
        ],
        "source_urls": [
          "https://www.dm.gov.ae/municipality-business/building-permit-steps/",
          "https://dmpmedia.dm.gov.ae/uploads/2020/06/Multi-Story_Building-Permits-Procedures.pdf",
          "https://www.dm.gov.ae/dubai-municipality-services/",
          "https://hub.dm.gov.ae/link/servicedetails?ServiceCode=3398"
        ],
        "form": null,
        "applicant": [
          "Consultant for multistorey submission per2020 procedure",
          "Consultant/contractor for inspections/completion"
        ],
        "access": {
          "published_channel": "Dubai BPS; current catalogue links DM Hub service3398",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate, applicable rights/licence and professional review"
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Applicable drawings, building card, authority NOCs",
          "Structural inspection",
          "Completion inspection and connections"
        ],
        "published_fees": {
          "currency": "AED",
          "amount": null,
          "published_service_time": "Current catalogue says3 working days; not end-to-end development time",
          "status": "PUBLISHED_INFORMATION_NOT_PROJECT_QUOTE"
        },
        "unknown": [
          "Current detailed form and tariff inaccessible",
          "2020 procedure is historical version still linked today",
          "Current professional account flow not tested"
        ],
        "automation_allowed_now": [
          "Prepare own checklist",
          "Link authoritative source",
          "Keep missing fields explicit"
        ],
        "manual_step": "Applicable authority and authorised professional confirm and execute the request",
        "result_status": "route_documented_current_detail_gap"
      }
    },
    {
      "id": "AE-DU-DM-PLANNING",
      "jurisdiction": "AE-DU",
      "label": "Planning permit",
      "authority": "Dubai Municipality",
      "applicability": "Plot-specific jurisdiction and applicability must be established",
      "sourceIds": [
        "E11",
        "E13"
      ],
      "sourceUrls": [
        "https://www.dm.gov.ae/dubai-municipality-services/",
        "https://hub.dm.gov.ae/link/servicedetails?ServiceCode=3583"
      ],
      "form": null,
      "applicants": [
        "Unknown from detailed card"
      ],
      "requirements": [
        "Special planning criteria per catalogue; detailed requirements unresolved"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate, applicable rights/licence and professional review"
      },
      "access": {
        "published_channel": "DM Hub service3583",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "Applicant, fields, prerequisites, fee and current detailed procedure unverified",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Applicable authority and authorised professional confirm and execute the request"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-DM-PLANNING",
        "name": "Planning permit",
        "jurisdiction": "AE-DU",
        "authority": "Dubai Municipality",
        "applicability": "Plot-specific jurisdiction and applicability must be established",
        "registry_row_ids": [
          10,
          12
        ],
        "source_ids": [
          "E11",
          "E13"
        ],
        "source_urls": [
          "https://www.dm.gov.ae/dubai-municipality-services/",
          "https://hub.dm.gov.ae/link/servicedetails?ServiceCode=3583"
        ],
        "form": null,
        "applicant": [
          "Unknown from detailed card"
        ],
        "access": {
          "published_channel": "DM Hub service3583",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate, applicable rights/licence and professional review"
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Special planning criteria per catalogue; detailed requirements unresolved"
        ],
        "published_fees": null,
        "unknown": [
          "Applicant, fields, prerequisites, fee and current detailed procedure unverified"
        ],
        "automation_allowed_now": [
          "Prepare own checklist",
          "Link authoritative source",
          "Keep missing fields explicit"
        ],
        "manual_step": "Applicable authority and authorised professional confirm and execute the request",
        "result_status": "catalog_only"
      }
    },
    {
      "id": "AE-DU-HERITAGE",
      "jurisdiction": "AE-DU",
      "label": "Archaeology and heritage applicability review",
      "authority": "Dubai Culture and Arts Authority (heritage), with DM heritage separately",
      "applicability": "Plot-specific jurisdiction and applicability must be established",
      "sourceIds": [
        "D21",
        "E09",
        "E22",
        "D29"
      ],
      "sourceUrls": [
        "https://dlp.dubai.gov.ae/Legislation%20Reference/2026/Law%20No.%20(11)%20of%202026%20Concerning%20Antiquities%20and%20Archaeological%20Sites.html",
        "https://dlp.dubai.gov.ae/Official%20Gazette/O%20G%20774.pdf",
        "https://dlp.dubai.gov.ae/en/Pages/LegislationSearch.aspx?trk=public_post_comment-text",
        "https://www.dm.gov.ae/modern-heritage-sites-and-buildings/"
      ],
      "form": null,
      "applicants": [
        "Affected owner/person; authorised representative and specialists to be confirmed"
      ],
      "requirements": [
        "Official site and buffer determination",
        "Applicable permission/NOC before affected works",
        "Separate modern-heritage and archaeological review"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": "2026-05-24",
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate, applicable rights/licence and professional review"
      },
      "access": {
        "published_channel": "Current service channel/form not established",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "Implementing bylaw, service forms/fees, major-project classification and map access not established",
        "No site-specific heritage clearance",
        "One-year compliance provision must not be treated as permission to undertake otherwise restricted work",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Applicable authority and authorised professional confirm and execute the request"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-HERITAGE",
        "name": "Archaeology and heritage applicability review",
        "jurisdiction": "AE-DU",
        "authority": "Dubai Culture and Arts Authority (heritage), with DM heritage separately",
        "applicability": "Plot-specific jurisdiction and applicability must be established",
        "registry_row_ids": [
          24
        ],
        "source_ids": [
          "D21",
          "E09",
          "E22",
          "D29"
        ],
        "source_urls": [
          "https://dlp.dubai.gov.ae/Legislation%20Reference/2026/Law%20No.%20(11)%20of%202026%20Concerning%20Antiquities%20and%20Archaeological%20Sites.html",
          "https://dlp.dubai.gov.ae/Official%20Gazette/O%20G%20774.pdf",
          "https://dlp.dubai.gov.ae/en/Pages/LegislationSearch.aspx?trk=public_post_comment-text",
          "https://www.dm.gov.ae/modern-heritage-sites-and-buildings/"
        ],
        "form": null,
        "applicant": [
          "Affected owner/person; authorised representative and specialists to be confirmed"
        ],
        "access": {
          "published_channel": "Current service channel/form not established",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate, applicable rights/licence and professional review"
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": "2026-05-24",
          "issued_on": "2026-05-11",
          "gazette_publication": "2026-05-24",
          "commencement_basis": "Law Article30 plus Gazette774 cover"
        },
        "requirements": [
          "Official site and buffer determination",
          "Applicable permission/NOC before affected works",
          "Separate modern-heritage and archaeological review"
        ],
        "published_fees": null,
        "unknown": [
          "Implementing bylaw, service forms/fees, major-project classification and map access not established",
          "No site-specific heritage clearance",
          "One-year compliance provision must not be treated as permission to undertake otherwise restricted work"
        ],
        "automation_allowed_now": [
          "Prepare own checklist",
          "Link authoritative source",
          "Keep missing fields explicit"
        ],
        "manual_step": "Applicable authority and authorised professional confirm and execute the request",
        "result_status": "procedure_documented_not_executed"
      }
    },
    {
      "id": "AE-DU-FOREIGN-ELIGIBILITY",
      "jurisdiction": "AE-DU",
      "label": "Foreign buyer and land-right eligibility",
      "authority": "DLD / Dubai competent authority",
      "applicability": "No community-wide or all-Dubai ownership conclusion",
      "sourceIds": [
        "D26a",
        "D26b"
      ],
      "sourceUrls": [
        "https://dlp.dubai.gov.ae/Legislation%20Reference/2006/Law%20No.%20(7)%20of%202006.pdf",
        "https://dlp.dubai.gov.ae/Legislation%20Reference/2006/Regulation%20No.%20(3)%20of%202006.pdf"
      ],
      "form": null,
      "applicants": [
        "Buyer and legal representative"
      ],
      "requirements": [
        "Current designated-area/plot evidence",
        "Corporate eligibility and proposed right",
        "Current amendments and original Arabic text"
      ],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "classification": "PROJECT_RESTRICTED",
        "public_reuse": "NOT_ESTABLISHED",
        "commercial_redistribution": "NOT_ESTABLISHED",
        "ai_processing": "NOT_ESTABLISHED",
        "required_basis": "Owner mandate, applicable rights/licence and professional review"
      },
      "access": {
        "published_channel": "DLD/legal review of designated plot and buyer structure",
        "public_document_check": "See source_ids verification; document reading is separate from operation",
        "service_execution": "NOT_TESTED",
        "login_performed": false,
        "submission_performed": false,
        "api_tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "Original texts read; current consolidated amendments and designated maps not checked",
        "No buyer or plot confirmed",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Applicable authority and authorised professional confirm and execute the request"
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "procedure_id": "AE-DU-FOREIGN-ELIGIBILITY",
        "name": "Foreign buyer and land-right eligibility",
        "jurisdiction": "AE-DU",
        "authority": "DLD / Dubai competent authority",
        "applicability": "No community-wide or all-Dubai ownership conclusion",
        "registry_row_ids": [
          6
        ],
        "source_ids": [
          "D26a",
          "D26b"
        ],
        "source_urls": [
          "https://dlp.dubai.gov.ae/Legislation%20Reference/2006/Law%20No.%20(7)%20of%202006.pdf",
          "https://dlp.dubai.gov.ae/Legislation%20Reference/2006/Regulation%20No.%20(3)%20of%202006.pdf"
        ],
        "form": null,
        "applicant": [
          "Buyer and legal representative"
        ],
        "access": {
          "published_channel": "DLD/legal review of designated plot and buyer structure",
          "public_document_check": "See source_ids verification; document reading is separate from operation",
          "service_execution": "NOT_TESTED",
          "login_performed": false,
          "submission_performed": false,
          "api_tested": false
        },
        "rights": {
          "classification": "PROJECT_RESTRICTED",
          "public_reuse": "NOT_ESTABLISHED",
          "commercial_redistribution": "NOT_ESTABLISHED",
          "ai_processing": "NOT_ESTABLISHED",
          "required_basis": "Owner mandate, applicable rights/licence and professional review"
        },
        "date": {
          "checked_on": "2026-10-22",
          "effective_from": null
        },
        "requirements": [
          "Current designated-area/plot evidence",
          "Corporate eligibility and proposed right",
          "Current amendments and original Arabic text"
        ],
        "published_fees": null,
        "unknown": [
          "Original texts read; current consolidated amendments and designated maps not checked",
          "No buyer or plot confirmed"
        ],
        "automation_allowed_now": [
          "Prepare own checklist",
          "Link authoritative source",
          "Keep missing fields explicit"
        ],
        "manual_step": "Applicable authority and authorised professional confirm and execute the request",
        "result_status": "procedure_documented_not_executed"
      }
    }
  ],
  "sourcePackage": {
    "schema_version": "geoai.region-procedures/0.1",
    "package_version": "2026-10-22.bounded-1",
    "status": "BOUNDED_RESEARCH_COMPLETE_WITH_GAPS",
    "owner": "uae_1",
    "jurisdiction": "AE-DU",
    "created_at": "2026-10-22T14:33:29.695133+00:00",
    "checked_on": "2026-10-22",
    "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
    "scope": "Public primary-source procedure research; no real plot, account operation, API call, paid document, application or approval",
    "source_registry_preservation": {
      "file": "registry-32-preserved.json",
      "rows": 32,
      "unmodified": true
    },
    "authority_resolution": {
      "default": "UNKNOWN",
      "requires": [
        "plot identity from original documents",
        "jurisdiction evidence",
        "local consultant attestation",
        "master-developer identity separately"
      ],
      "never_infer_from": [
        "community name alone",
        "AOI geometry",
        "DLD Trakheesi account",
        "Dubai-wide location"
      ],
      "conflict_action": "HOLD dependent decision; retain source conflict",
      "other_authorities": [
        "Dubai Municipality",
        "Dubai South",
        "Dubai Silicon Oasis"
      ],
      "primary_route": "DDA only after plot-specific confirmation",
      "portability_route": "PCFC Trakhees; form-body gate remains blocked",
      "source_ids": [
        "D01",
        "D04",
        "D05",
        "D10",
        "E11"
      ],
      "authority_ids": {
        "DDA": "AE-DU-DDA",
        "Dubai Municipality": "AE-DU-DM",
        "PCFC Trakhees": "AE-DU-PCFC-TRAKHEES",
        "DLD RERA": "AE-DU-DLD-RERA",
        "Dubai Culture and Arts Authority": "AE-DU-CULTURE",
        "Dubai Civil Aviation Authority": "AE-DU-CIVIL-AVIATION"
      }
    },
    "consumer_rules": [
      "Do not map FULL_PUBLIC_TEXT_READ to service/API verified",
      "Unknown dates/rights/fields stay null or explicit unknown",
      "Authority stays unknown for real plots until documentary attestation",
      "Do not autofill signatures, seals or official approvals",
      "Draft/exported does not mean submitted/approved",
      "Fees are published estimates, not paid quotes",
      "Raw document distribution and AI processing require separate rights",
      "Preserve original 32-row registry and apply deltas separately",
      "Use full authority identity: Dubai Culture and Arts Authority (heritage) is distinct from Dubai Civil Aviation Authority",
      "Official PDF issue and actual service-page link take precedence over misleading PDF title metadata; preserve alternate versions",
      "Website last-modified date is not legislation commencement or form issue date"
    ],
    "next_research": [
      "Obtain one owner-authorised real plot dossier and professional authority attestation",
      "Obtain current PCFC procedure/forms through an authorised public/customer channel",
      "Resolve dataset licence binding and SaaS/AI/redistribution rights before ingest",
      "Confirm heritage implementing instruments/maps and environmental routing",
      "Confirm current DM form/service details through licensed applicant"
    ],
    "corrections": [
      {
        "date": "2026-10-22",
        "field": "DDA Issue 15 comparison",
        "prior_claim": "Accessibility and green-building checklists newly added",
        "corrected_claim": "Already present in Issue 13; Issue 15 explicitly lists soil report per Circular 645 and changes the earlier ZA-DC-F-07B approval note",
        "basis": "Both official PDFs read directly"
      }
    ],
    "updated_at": "2026-10-22T15:17:56.746925+00:00",
    "schema_compatibility": "Additive to early geoai.region-procedures/0.1; procedure/source IDs stable; no application contract mutation",
    "acceptance": {
      "research_record_validation": "PENDING",
      "real_plot_applicability": "NOT_VERIFIED_NO_PLOT_DOCUMENTS",
      "service_execution": "NOT_TESTED",
      "api_execution": "NOT_TESTED",
      "code_integration": "NOT_PERFORMED_BY_RESEARCHER",
      "professional_review": "NOT_PERFORMED",
      "release_or_pilot_acceptance": false
    },
    "conflicts": [
      {
        "conflict_id": "AE-DU-ENV-2026-08",
        "source_ids": [
          "D08",
          "E03",
          "E10"
        ],
        "fact": "DDA final-design sources still name DM environmental approval; DM20Aug2026 announces seven specialised services transferred to Dubai Environment and Climate Change Authority",
        "action": "Confirm current receiving authority for the exact environmental trigger; do not rewrite all DM NOCs to the new authority",
        "blocking_scope": "Only affected environmental submission, not entire draft project",
        "status": "UNRESOLVED_ROUTING_CONFLICT"
      },
      {
        "conflict_id": "DDA-ISSUE13-15",
        "source_ids": [
          "D27",
          "E03"
        ],
        "status": "CURRENT_SERVICE_LINK_SELECTED_OLD_PRESERVED",
        "action": "Use current final-design card link Issue15; older substructure URL Issue13 remains historical; no inferred date or global replacement authority"
      }
    ],
    "source_limits": {
      "raw_official_forms_bundled": false,
      "raw_datasets_bundled": false,
      "full_official_documents_saved": false,
      "public_factual_checklists": "Own research summaries with primary links; not an authority approval or a replica form",
      "client_document_processing": "Requires project-specific authority, custody and rights; not enabled by this research"
    },
    "compiledMetadataOnly": true,
    "compilationProvenance": {
      "owner": "uae_1",
      "market": "dubai",
      "inputSchema": "geoai.region-procedures/0.1",
      "packageVersion": "2026-10-22.bounded-1",
      "inputStatus": "BOUNDED_RESEARCH_COMPLETE_WITH_GAPS",
      "checkedOn": "2026-10-22",
      "sourceSha256": "d78723d9689d15ef2a42cab3eae8ecc4deb9af47f1b24c74d99a6cec88465837",
      "registrySha256": null,
      "rules": 20,
      "sources": 49,
      "sourceRecordDates": "Retained from researcher records; not independently fetched by evidence_1.",
      "readback": "REGIONAL_RESULT.md bounded research with explicit gaps"
    }
  },
  "sourceRegistry": null,
  "unknowns": [
    "Research is metadata, primary links and own checklists; no real plot/service/API/application acceptance.",
    "AOI/community name does not resolve competent authority.",
    "FetchedAt and document publication/effective dates are distinct; no inferred real-world observation date."
  ],
  "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
};

const MOSCOW: RegionalRulePack = {
  "version": "DEVKIT_REGIONAL_RULES_V1",
  "inputSchema": "geoai.region-procedures/1.0",
  "packageVersion": "1.0.0-research",
  "jurisdiction": "RU-MOW",
  "inputStatus": "READY_FOR_REVIEW_NOT_INTEGRATED",
  "sources": [
    {
      "id": "E1-MSK-S01",
      "url": "https://www.mos.ru/upload/documents/files/2575/182-PP%28red03102025%29.pdf",
      "verification": "FULL_DOCUMENT_RELEVANT_SECTIONS_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:30:32.357638+00:00",
      "publishedOn": "2012-04-25",
      "effectiveFrom": null,
      "version": "2025-10-03",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S01",
        "corpus_ids": [
          "H9"
        ],
        "url": "https://www.mos.ru/upload/documents/files/2575/182-PP%28red03102025%29.pdf",
        "title": "182-ПП: ГРНКН и ИКОП",
        "kind": "official_hosted_regulation",
        "edition": "2025-10-03",
        "document_date": "2012-04-25",
        "verification": "FULL_DOCUMENT_RELEVANT_SECTIONS_READ",
        "locator": "пп. 2.4, 2.5, 2.7, 2.12, 2.13; приложение, PDF с. 16",
        "latest_edition_verified": false,
        "retrieved_at": "2026-10-22T14:30:32.357638+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "2e08d11a2c62e657d4d6831fb7bda7a966e38e0de693b61fe565de7b1d585ff5",
        "bytes": 271818,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S02",
      "url": "https://www.mos.ru/upload/content/files/d3aa47cf6e0ab402056c13a63ae68caf/PPMot28062017396-PP.pdf",
      "verification": "FULL_DOCUMENT_RELEVANT_SECTIONS_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:32:54.881748+00:00",
      "publishedOn": "2017-06-28",
      "effectiveFrom": null,
      "version": "2025-08-12",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S02",
        "corpus_ids": [
          "M9"
        ],
        "url": "https://www.mos.ru/upload/content/files/d3aa47cf6e0ab402056c13a63ae68caf/PPMot28062017396-PP.pdf",
        "title": "396-ПП: ГПЗУ",
        "kind": "official_hosted_regulation",
        "edition": "2025-08-12",
        "document_date": "2017-06-28",
        "verification": "FULL_DOCUMENT_RELEVANT_SECTIONS_READ",
        "locator": "Приложение 1, пп. 2.4–2.5; приложение 2",
        "latest_edition_verified": false,
        "retrieved_at": "2026-10-22T14:32:54.881748+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "7a0fefb208d1f143c6a0a81c90865662a7ef4cdefaf45bb46dcb70b71d7b0607",
        "bytes": 346010,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S03",
      "url": "https://vestnikmoscow.mos.ru/wp-content/uploads/2025/03/zhurnal-vestnik-moskvy-%E2%84%96-14.pdf",
      "verification": "FULL_DOCUMENT_RELEVANT_SECTIONS_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:32:54.882256+00:00",
      "publishedOn": "2025-03-04",
      "effectiveFrom": "2025-08-05",
      "version": "2025-03-04",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S03",
        "corpus_ids": [
          "M12"
        ],
        "url": "https://vestnikmoscow.mos.ru/wp-content/uploads/2025/03/zhurnal-vestnik-moskvy-%E2%84%96-14.pdf",
        "title": "403-ПП: новая редакция регламента 177-ПП о техническом заключении Сводного плана",
        "kind": "official_gazette",
        "edition": "2025-03-04",
        "document_date": "2025-03-04",
        "verification": "FULL_DOCUMENT_RELEVANT_SECTIONS_READ",
        "locator": "Печатные с. 35–45 / PDF с. 36–46",
        "latest_edition_verified": false,
        "retrieved_at": "2026-10-22T14:32:54.882256+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "aa12c426b1cd9c4d9f43a0209502d01cfa9d36e25df8f9f8373b65b75b25b244",
        "bytes": 5404175,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": "2025-08-05",
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S04",
      "url": "https://vestnikmoscow.mos.ru/wp-content/uploads/2026/04/zhurnal-vestnik-moskvy-%E2%84%96-22.pdf",
      "verification": "FULL_AMENDING_ACT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:32:54.882347+00:00",
      "publishedOn": "2026-04-14",
      "effectiveFrom": null,
      "version": "2026-04-14",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S04",
        "corpus_ids": [
          "M8"
        ],
        "url": "https://vestnikmoscow.mos.ru/wp-content/uploads/2026/04/zhurnal-vestnik-moskvy-%E2%84%96-22.pdf",
        "title": "1039-ПП: изменение 331-ПП о КРТ",
        "kind": "official_gazette",
        "edition": "2026-04-14",
        "document_date": "2026-04-14",
        "verification": "FULL_AMENDING_ACT_READ",
        "locator": "Печатная с. 18 / PDF с. 19",
        "latest_edition_verified": false,
        "retrieved_at": "2026-10-22T14:32:54.882347+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "e089369c68420cc9d7d7e5a6b01239fafc87549768406b80ad2dd1f17b07ee16",
        "bytes": 3182653,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S05",
      "url": "https://xn--b1aesfkbbawel.xn--p1ai/services/tu/",
      "verification": "FULL_PAGE_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:45:44.345503+00:00",
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S05",
        "corpus_ids": [
          "M14"
        ],
        "url": "https://xn--b1aesfkbbawel.xn--p1ai/services/tu/",
        "title": "Мосводосток: доступная страница подключения, просмотр 22.10.2026",
        "kind": "operator_service_page",
        "edition": null,
        "document_date": null,
        "verification": "FULL_PAGE_READ",
        "locator": "Разделы предварительных и строительных ТУ; образцы документов",
        "latest_edition_verified": null,
        "retrieved_at": "2026-10-22T14:45:44.345503+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "d2c5535aa8f542252de21abb85ede0f63580fb6a05c8d1e09e602f4df4d2a832",
        "bytes": 313762,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S06",
      "url": "https://xn--b1aesfkbbawel.xn--p1ai/upload/docs/teh/tu/perechen-dokumentov-prilagaemykh-k-zayavleniyu-na-podgotovku-tekhnicheskikh-usloviy-na-podklyuchenie.pdf",
      "verification": "FULL_DOCUMENT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:32:54.882403+00:00",
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S06",
        "corpus_ids": [
          "M14"
        ],
        "url": "https://xn--b1aesfkbbawel.xn--p1ai/upload/docs/teh/tu/perechen-dokumentov-prilagaemykh-k-zayavleniyu-na-podgotovku-tekhnicheskikh-usloviy-na-podklyuchenie.pdf",
        "title": "Мосводосток: приложения к запросу ТУ",
        "kind": "operator_checklist",
        "edition": null,
        "document_date": null,
        "verification": "FULL_DOCUMENT_READ",
        "locator": "PDF с. 1",
        "latest_edition_verified": null,
        "retrieved_at": "2026-10-22T14:32:54.882403+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "6fd17efb71faa0fe8f305e43ea836566efd29fe70ada1da5fc551a09b51307d1",
        "bytes": 371213,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S07",
      "url": "https://xn--b1aesfkbbawel.xn--p1ai/upload/docs/teh/tu/3new.docx",
      "verification": "FULL_DOCX_TEXT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:30:32.358126+00:00",
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S07",
        "corpus_ids": [
          "M14"
        ],
        "url": "https://xn--b1aesfkbbawel.xn--p1ai/upload/docs/teh/tu/3new.docx",
        "title": "Мосводосток: опубликованный запрос ТУ",
        "kind": "operator_form",
        "edition": null,
        "document_date": null,
        "verification": "FULL_DOCX_TEXT_READ",
        "locator": "word/document.xml: вся форма, 11 пунктов; форматирование Word не проверено",
        "latest_edition_verified": null,
        "retrieved_at": "2026-10-22T14:30:32.358126+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "5f0418fc6be503a5e41a8be0d033f0609c2b2ac0b1d96478c3f382b25c671412",
        "bytes": 17191,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S08",
      "url": "https://www.mos.ru/upload/documents/docs/4959/2993-PP-km3s.pdf",
      "verification": "FULL_ACT_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:36:42.899016+00:00",
      "publishedOn": "2025-12-03",
      "effectiveFrom": null,
      "version": "2025-12-03",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S08",
        "title": "2993-ПП: присоединение Москомархитектуры к ДГП",
        "url": "https://www.mos.ru/upload/documents/docs/4959/2993-PP-km3s.pdf",
        "corpus_ids": [
          "M9",
          "M10"
        ],
        "kind": "official_hosted_act",
        "document_date": "2025-12-03",
        "edition": "2025-12-03",
        "locator": "пп. 1–2; PDF с. 1",
        "verification": "FULL_ACT_READ",
        "latest_edition_verified": false,
        "retrieved_at": "2026-10-22T14:36:42.899016+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "fd9606e9321d97f72a0ded2f23c80d30a4e50568a83d8a848d6616e3c4d60c12",
        "bytes": 380868,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S09",
      "url": "https://publication.pravo.gov.ru/document/0001202509190014",
      "verification": "ALL_16_SCANNED_PAGES_VISUALLY_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:36:42.899511+00:00",
      "publishedOn": "2025-09-19",
      "effectiveFrom": "2026-03-01",
      "version": "2025-08-13",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S09",
        "title": "Приказ Минкультуры № 1455: согласование документации сохранения",
        "url": "https://publication.pravo.gov.ru/document/0001202509190014",
        "corpus_ids": [
          "H2",
          "H3",
          "H18"
        ],
        "kind": "official_publication",
        "document_date": "2025-08-13",
        "edition": "2025-08-13",
        "locator": "Порядок пп. 2–13; приложение 1 PDF с. 11–14; приложение 2 с. 15–16",
        "verification": "ALL_16_SCANNED_PAGES_VISUALLY_READ",
        "latest_edition_verified": false,
        "retrieved_at": "2026-10-22T14:36:42.899511+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "7d9cb9fbff49303ffdd0d9d880a80ea0be83002b9583a46a14bd1797bec3409e",
        "bytes": 796584,
        "publication_date": "2025-09-19",
        "publication_date_basis": "official publication identifier/date; distinct from adoption date",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": true
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": "2026-03-01",
        "effective_to": "2032-03-01",
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S10",
      "url": "https://publication.pravo.gov.ru/document/0001202606100012",
      "verification": "FULL_57_PAGE_FILE_OBTAINED_SELECTED_PAGES_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:36:42.899605+00:00",
      "publishedOn": "2026-06-10",
      "effectiveFrom": null,
      "version": "2026-06-10",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S10",
        "title": "180-ФЗ: изменения законодательства о наследии и переходные положения",
        "url": "https://publication.pravo.gov.ru/document/0001202606100012",
        "corpus_ids": [
          "H4"
        ],
        "kind": "official_publication",
        "document_date": "2026-06-10",
        "edition": "2026-06-10",
        "locator": "ст. 3, PDF с. 54–57; визуально также с. 1 и 53",
        "verification": "FULL_57_PAGE_FILE_OBTAINED_SELECTED_PAGES_READ",
        "latest_edition_verified": false,
        "retrieved_at": "2026-10-22T14:36:42.899605+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "f010f9c35c9cc7407c1e0b43d035a54727f28a434f32b2e92e02808110ed63e7",
        "bytes": 3059730,
        "publication_date": "2026-06-10",
        "publication_date_basis": "official publication identifier/date; distinct from adoption date",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": true
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S11",
      "url": "https://xn--b1aesfkbbawel.xn--p1ai/upload/docs/teh/tu/%D0%92%D1%80%D0%B5%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B5%20%D0%A2%D0%A3%20%D0%BF%D0%B5%D1%80%D0%B5%D1%87%D0%B5%D0%BD%D1%8C%20%D0%B4%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D0%BE%D0%B2.pdf",
      "verification": "FULL_DOCUMENT_READ_VERSION_CONFLICT",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:36:42.899660+00:00",
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S11",
        "title": "Мосводосток: перечень приложений для временных ТУ",
        "url": "https://xn--b1aesfkbbawel.xn--p1ai/upload/docs/teh/tu/%D0%92%D1%80%D0%B5%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B5%20%D0%A2%D0%A3%20%D0%BF%D0%B5%D1%80%D0%B5%D1%87%D0%B5%D0%BD%D1%8C%20%D0%B4%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D0%BE%D0%B2.pdf",
        "corpus_ids": [
          "M14"
        ],
        "kind": "operator_checklist",
        "document_date": null,
        "edition": null,
        "locator": "PDF с. 1–2; дата утверждения отсутствует; footer 2017 не равен дате версии",
        "verification": "FULL_DOCUMENT_READ_VERSION_CONFLICT",
        "latest_edition_verified": false,
        "retrieved_at": "2026-10-22T14:36:42.899660+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "3b8fa97ea41bcf9e9ca87b258a308805c1fc6a565e396e728ba1b2e596aa5f78",
        "bytes": 118388,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S12",
      "url": "https://mggt.ru/news/ob-izmeneniyah-poryadka-predostavleniya-uslugi-predostavlenie-tehnicheskogo-zaklyucheniya-o-sootvetstvii-proektnoj-dokumentatsii-svodnomu-planu-podzemnyh-kommunikatsij-i-sooruzhenij-v-gorode-moskve/",
      "verification": "FULL_ARTICLE_READ",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:38:57.274445+00:00",
      "publishedOn": "2025-07-23",
      "effectiveFrom": "2025-08-05",
      "version": "2025-07-23",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S12",
        "title": "Мосгоргеотрест: изменение услуги с 5 августа 2025 года",
        "url": "https://mggt.ru/news/ob-izmeneniyah-poryadka-predostavleniya-uslugi-predostavlenie-tehnicheskogo-zaklyucheniya-o-sootvetstvii-proektnoj-dokumentatsii-svodnomu-planu-podzemnyh-kommunikatsij-i-sooruzhenij-v-gorode-moskve/",
        "corpus_ids": [
          "M12"
        ],
        "kind": "authority_service_explanation",
        "document_date": "2025-07-23",
        "edition": "2025-07-23",
        "locator": "Основной текст статьи от 23.07.2025",
        "verification": "FULL_ARTICLE_READ",
        "latest_edition_verified": false,
        "retrieved_at": "2026-10-22T14:38:57.274445+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "c1192c09d0448161c4f148e02196451a37a297bb4850c578da29f0aec175295b",
        "bytes": 81809,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": "2025-08-05",
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S13",
      "url": "https://vestnikmoscow.mos.ru/wp-content/uploads/2026/07/zhurnal-vestnik-moskvy-%E2%84%96-39.pdf",
      "verification": "FULL_AMENDING_ACT_READ_AND_VISUALLY_CHECKED",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:45:44.343575+00:00",
      "publishedOn": "2026-07-07",
      "effectiveFrom": null,
      "version": "2026-07-07",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S13",
        "title": "1830-ПП: июльское изменение сроков направления договора КРТ",
        "url": "https://vestnikmoscow.mos.ru/wp-content/uploads/2026/07/zhurnal-vestnik-moskvy-%E2%84%96-39.pdf",
        "corpus_ids": [
          "M8"
        ],
        "kind": "official_gazette",
        "document_date": "2026-07-07",
        "edition": "2026-07-07",
        "locator": "Печатная с. 29 / PDF с. 30, весь акт",
        "verification": "FULL_AMENDING_ACT_READ_AND_VISUALLY_CHECKED",
        "latest_edition_verified": false,
        "retrieved_at": "2026-10-22T14:45:44.343575+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "af576cd81dad695ddeb21e53932554aa244ecaae35ac30d34ff18f9a6490db10",
        "bytes": 3811491,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S14",
      "url": "http://pravo.gov.ru/proxy/ips/?docbody=&nd=120261687",
      "verification": "METADATA_WRAPPER_ONLY_NOT_CURRENT_TEXT",
      "checkedOn": "2026-10-22",
      "fetchedAt": "2026-10-22T14:40:34.745287+00:00",
      "publishedOn": null,
      "effectiveFrom": null,
      "version": "wrapper lists through 2022-08-09",
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S14",
        "title": "331-ПП: оболочка карточки с устаревшим списком редакций",
        "url": "http://pravo.gov.ru/proxy/ips/?docbody=&nd=120261687",
        "corpus_ids": [
          "M8"
        ],
        "kind": "official_document_wrapper",
        "document_date": null,
        "edition": "wrapper lists through 2022-08-09",
        "locator": "HTML содержит iframe документа; не содержит проверенного полного сводного текста",
        "verification": "METADATA_WRAPPER_ONLY_NOT_CURRENT_TEXT",
        "latest_edition_verified": false,
        "retrieved_at": "2026-10-22T14:40:34.745287+00:00",
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": "01aac1e9a1c89de29fa644facd7685217a60d9ba4fa1631b1743028aa8a53c6d",
        "bytes": 28740,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": true,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": true
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "public source retrieval",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S15",
      "url": "https://rosreestr.gov.ru/press/news/505407/",
      "verification": "ACCESS_FAILED_TLS_CERTIFICATE",
      "checkedOn": null,
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S15",
        "title": "Росреестр: ограничения раскрытия сведений",
        "url": "https://rosreestr.gov.ru/press/news/505407/",
        "corpus_ids": [
          "M2"
        ],
        "kind": "inherited_primary_link",
        "document_date": null,
        "edition": null,
        "locator": null,
        "verification": "ACCESS_FAILED_TLS_CERTIFICATE",
        "latest_edition_verified": false,
        "retrieved_at": null,
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": null,
        "bytes": null,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": false,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "link inherited from supplied corpus",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S16",
      "url": "https://www.gosuslugi.ru/online-egrn",
      "verification": "INHERITED_LINK_NOT_OPENED",
      "checkedOn": null,
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S16",
        "title": "Госуслуги: online-egrn",
        "url": "https://www.gosuslugi.ru/online-egrn",
        "corpus_ids": [
          "M2"
        ],
        "kind": "inherited_primary_link",
        "document_date": null,
        "edition": null,
        "locator": null,
        "verification": "INHERITED_LINK_NOT_OPENED",
        "latest_edition_verified": false,
        "retrieved_at": null,
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": null,
        "bytes": null,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": false,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "link inherited from supplied corpus",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S17",
      "url": "https://www.mos.ru/dgp/documents/pravila-zemlepolzovaniya-i-zastroiki-goroda-moskvy/",
      "verification": "INHERITED_INDEX_NOT_REVERIFIED",
      "checkedOn": null,
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S17",
        "title": "ДГП: ПЗЗ Москвы",
        "url": "https://www.mos.ru/dgp/documents/pravila-zemlepolzovaniya-i-zastroiki-goroda-moskvy/",
        "corpus_ids": [
          "M10"
        ],
        "kind": "inherited_primary_link",
        "document_date": null,
        "edition": null,
        "locator": null,
        "verification": "INHERITED_INDEX_NOT_REVERIFIED",
        "latest_edition_verified": false,
        "retrieved_at": null,
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": null,
        "bytes": null,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": false,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "link inherited from supplied corpus",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S18",
      "url": "https://www.mos.ru/pgu2/landing/target/7700000000165072138/",
      "verification": "INHERITED_INDEX_PORTAL_NOT_ENTERED",
      "checkedOn": null,
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S18",
        "title": "mos.ru: согласование документации сохранения",
        "url": "https://www.mos.ru/pgu2/landing/target/7700000000165072138/",
        "corpus_ids": [
          "H18"
        ],
        "kind": "inherited_primary_link",
        "document_date": null,
        "edition": null,
        "locator": null,
        "verification": "INHERITED_INDEX_PORTAL_NOT_ENTERED",
        "latest_edition_verified": false,
        "retrieved_at": null,
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": null,
        "bytes": null,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": false,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "link inherited from supplied corpus",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S19",
      "url": "https://culture.gov.ru/about/departments/departament_gosudarstvennoy_okhrany_kulturnogo_naslediya/activities/409784/",
      "verification": "INHERITED_INDEX_NOT_REVERIFIED",
      "checkedOn": null,
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S19",
        "title": "Минкультуры: открытые листы",
        "url": "https://culture.gov.ru/about/departments/departament_gosudarstvennoy_okhrany_kulturnogo_naslediya/activities/409784/",
        "corpus_ids": [
          "H11"
        ],
        "kind": "inherited_primary_link",
        "document_date": null,
        "edition": null,
        "locator": null,
        "verification": "INHERITED_INDEX_NOT_REVERIFIED",
        "latest_edition_verified": false,
        "retrieved_at": null,
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": null,
        "bytes": null,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": false,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "link inherited from supplied corpus",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    },
    {
      "id": "E1-MSK-S20",
      "url": "https://www.mos.ru/upload/documents/files/5119/metodicheskierekomendacii_razdel.pdf",
      "verification": "INHERITED_CORPUS_NOT_REVERIFIED",
      "checkedOn": null,
      "fetchedAt": null,
      "publishedOn": null,
      "effectiveFrom": null,
      "version": null,
      "observedAt": null,
      "serviceTested": false,
      "apiTested": false,
      "original": {
        "id": "E1-MSK-S20",
        "title": "ДКН: методические рекомендации по обеспечению сохранности",
        "url": "https://www.mos.ru/upload/documents/files/5119/metodicheskierekomendacii_razdel.pdf",
        "corpus_ids": [
          "H15"
        ],
        "kind": "inherited_primary_link",
        "document_date": null,
        "edition": null,
        "locator": null,
        "verification": "INHERITED_CORPUS_NOT_REVERIFIED",
        "latest_edition_verified": false,
        "retrieved_at": null,
        "service_tested": false,
        "authentication_used": false,
        "api_tested": false,
        "commercial_reuse_permission": null,
        "sha256": null,
        "bytes": null,
        "publication_date": null,
        "publication_date_basis": "not independently established",
        "checked_at": "2026-10-22T15:00:04.153125+00:00",
        "access": {
          "public_document": false,
          "login_used": false,
          "payment_used": false,
          "portal_transaction": "NOT_RUN",
          "http_transport": false
        },
        "integrity_note": "SHA-256 verifies saved-byte identity, not legal authenticity or digital signature validation.",
        "rights": {
          "access_basis": "link inherited from supplied corpus",
          "licence": null,
          "commercial_bulk_access": "unknown",
          "redistribution": "unknown",
          "publication_policy": "cite/link and review reuse rights before bundling in public product; no blanket permission inferred"
        },
        "effective_from": null,
        "effective_to": null,
        "coverage_limit": "See verification and locator. File access is not a tested government service, case result, API or current consolidated-law audit."
      }
    }
  ],
  "rules": [
    {
      "id": "MSK-EGRN",
      "jurisdiction": "RU-MOW",
      "label": "Идентификация объектов и права",
      "authority": "Росреестр / Роскадастр",
      "applicability": "unknown_without_object_documents",
      "sourceIds": [
        "E1-MSK-S15",
        "E1-MSK-S16"
      ],
      "sourceUrls": [
        "https://rosreestr.gov.ru/press/news/505407/",
        "https://www.gosuslugi.ru/online-egrn"
      ],
      "form": {
        "id": "egrn-official-service",
        "version": null,
        "status": "not_inspected"
      },
      "applicants": [
        "Зависит от вида сведений и законного доступа"
      ],
      "requirements": [],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "processing": "client_supplied_result_only_after_rights_review",
        "redistribution": null
      },
      "access": {
        "public_page": "unavailable_this_session",
        "login": "required_for_service",
        "tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "Кадастровые ID",
        "Подписанный результат",
        "Состав доступных третьему лицу сведений",
        "Текущая форма и тариф",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and qualified local reviewer confirm applicability, current form and source rights before official action."
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "id": "MSK-EGRN",
        "jurisdiction": "RU-MOW",
        "title_ru": "Идентификация объектов и права",
        "authority": "Росреестр / Роскадастр",
        "source": [
          "E1-MSK-S15",
          "E1-MSK-S16"
        ],
        "form": {
          "id": "egrn-official-service",
          "version": null,
          "status": "not_inspected"
        },
        "applicant": {
          "role": "Зависит от вида сведений и законного доступа",
          "verified_current": false
        },
        "access": {
          "public_page": "unavailable_this_session",
          "login": "required_for_service",
          "tested": false
        },
        "rights": {
          "processing": "client_supplied_result_only_after_rights_review",
          "redistribution": null
        },
        "date": {
          "as_of": "2026-10-22",
          "retrieved_at": null,
          "effective_from": null,
          "effective_to": null,
          "latest_consolidated_edition_verified": false,
          "checked_at": "2026-10-22T15:00:04.153125+00:00",
          "retrieval_note": "Per-source retrieval times are in source-verifications.json; not a uniform service verification time."
        },
        "unknown": [
          "Кадастровые ID",
          "Подписанный результат",
          "Состав доступных третьему лицу сведений",
          "Текущая форма и тариф"
        ],
        "corpus_registry_rows": [
          1,
          2,
          3,
          4
        ],
        "applied_decision": "AOI, участок и ОКС хранить раздельно; без документов право и статус объекта unknown.",
        "reviewer_required": true,
        "status": "documentary_research_only",
        "submission_status": "not_submitted",
        "site_applicability": "unknown_without_object_documents",
        "source_urls": [
          "https://rosreestr.gov.ru/press/news/505407/",
          "https://www.gosuslugi.ru/online-egrn"
        ],
        "implementation_status": "research_only",
        "review_status": "pending_control_and_domain_review",
        "integration_status": "not_integrated",
        "acceptance_status": "not_accepted",
        "filing_readiness": "blocked_until_applicant_object_documents_and_current_portal_checked",
        "manual_steps": [
          "Идентифицировать объект и полномочия заявителя",
          "Сверить актуальную редакцию и форму на дату обращения",
          "Проверить комплект и подписи профильным специалистом",
          "Подачу и получение результата выполняет уполномоченный заявитель; в этой работе не выполнялось"
        ],
        "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
        "documents": [],
        "timing": {
          "status": "not_verified"
        },
        "fee": {
          "kind": "unknown",
          "amount": null,
          "currency": "RUB"
        }
      }
    },
    {
      "id": "MSK-PLANNING",
      "jurisdiction": "RU-MOW",
      "label": "ПЗЗ и документация по планировке",
      "authority": "ДГП Москвы",
      "applicability": "unknown_without_object_documents",
      "sourceIds": [
        "E1-MSK-S17",
        "E1-MSK-S08"
      ],
      "sourceUrls": [
        "https://www.mos.ru/dgp/documents/pravila-zemlepolzovaniya-i-zastroiki-goroda-moskvy/",
        "https://www.mos.ru/upload/documents/docs/4959/2993-PP-km3s.pdf"
      ],
      "form": {
        "id": "planning-document-request",
        "version": null,
        "status": "not_inspected"
      },
      "applicants": [
        "Публичное ознакомление; запросы по применимому регламенту"
      ],
      "requirements": [],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "processing": "act_geometry_with_provenance",
        "bulk_api": null
      },
      "access": {
        "public_page": "inherited_index_only",
        "tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "Акт для конкретного участка",
        "Полная цепочка изменений",
        "CRS и границы",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and qualified local reviewer confirm applicability, current form and source rights before official action."
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "id": "MSK-PLANNING",
        "jurisdiction": "RU-MOW",
        "title_ru": "ПЗЗ и документация по планировке",
        "authority": "ДГП Москвы",
        "source": [
          "E1-MSK-S17",
          "E1-MSK-S08"
        ],
        "form": {
          "id": "planning-document-request",
          "version": null,
          "status": "not_inspected"
        },
        "applicant": {
          "role": "Публичное ознакомление; запросы по применимому регламенту",
          "verified_current": false
        },
        "access": {
          "public_page": "inherited_index_only",
          "tested": false
        },
        "rights": {
          "processing": "act_geometry_with_provenance",
          "bulk_api": null
        },
        "date": {
          "as_of": "2026-10-22",
          "retrieved_at": null,
          "effective_from": null,
          "effective_to": null,
          "latest_consolidated_edition_verified": false,
          "checked_at": "2026-10-22T15:00:04.153125+00:00",
          "retrieval_note": "Per-source retrieval times are in source-verifications.json; not a uniform service verification time."
        },
        "unknown": [
          "Акт для конкретного участка",
          "Полная цепочка изменений",
          "CRS и границы"
        ],
        "corpus_registry_rows": [
          8,
          9,
          10,
          12
        ],
        "applied_decision": "Принятый акт, проект изменения и пользовательский желаемый объём — разные статусы.",
        "reviewer_required": true,
        "status": "documentary_research_only",
        "submission_status": "not_submitted",
        "site_applicability": "unknown_without_object_documents",
        "source_urls": [
          "https://www.mos.ru/dgp/documents/pravila-zemlepolzovaniya-i-zastroiki-goroda-moskvy/",
          "https://www.mos.ru/upload/documents/docs/4959/2993-PP-km3s.pdf"
        ],
        "implementation_status": "research_only",
        "review_status": "pending_control_and_domain_review",
        "integration_status": "not_integrated",
        "acceptance_status": "not_accepted",
        "filing_readiness": "blocked_until_applicant_object_documents_and_current_portal_checked",
        "manual_steps": [
          "Идентифицировать объект и полномочия заявителя",
          "Сверить актуальную редакцию и форму на дату обращения",
          "Проверить комплект и подписи профильным специалистом",
          "Подачу и получение результата выполняет уполномоченный заявитель; в этой работе не выполнялось"
        ],
        "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
        "documents": [],
        "timing": {
          "status": "not_verified"
        },
        "fee": {
          "kind": "unknown",
          "amount": null,
          "currency": "RUB"
        }
      }
    },
    {
      "id": "MSK-GPZU",
      "jurisdiction": "RU-MOW",
      "label": "ГПЗУ по запросу правообладателя",
      "authority": "Департамент градостроительной политики Москвы: правопреемник Москомархитектуры по 2993-ПП; название в форме 396-ПП устаревшее",
      "applicability": "unknown_without_object_documents",
      "sourceIds": [
        "E1-MSK-S02",
        "E1-MSK-S08"
      ],
      "sourceUrls": [
        "https://www.mos.ru/upload/content/files/d3aa47cf6e0ab402056c13a63ae68caf/PPMot28062017396-PP.pdf",
        "https://www.mos.ru/upload/documents/docs/4959/2993-PP-km3s.pdf"
      ],
      "form": {
        "id": "MSK-F02",
        "version": "396-PP-edition-2025-08-12-with-agency-successor-note",
        "status": "regulation_fields_available_portal_not_tested"
      },
      "applicants": [
        "Обычный маршрут приложения 1: правообладатель поставленного на кадастровый учёт участка. Специальный маршрут приложения 2: установленные органы/оператор КРТ/лицо по договору и иные прямо указанные случаи. Инвестор без основания не приравнивается к правообладателю."
      ],
      "requirements": [],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": "396-PP-edition-2025-08-12-with-agency-successor-note",
      "rights": {
        "processing": "project_only_subject_to_document_rights",
        "redistribution": null
      },
      "access": {
        "channel": "mos.ru",
        "public_service_page": "403",
        "login": true,
        "tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "Документы и права по объекту",
        "Все изменения после редакции 12.08.2025, кроме отдельно проверенного правопреемства",
        "Текущий экран и обязательность полей портала",
        "Применимость специального или многоучасткового маршрута",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and qualified local reviewer confirm applicability, current form and source rights before official action."
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "id": "MSK-GPZU",
        "jurisdiction": "RU-MOW",
        "title_ru": "ГПЗУ по запросу правообладателя",
        "authority": "Департамент градостроительной политики Москвы: правопреемник Москомархитектуры по 2993-ПП; название в форме 396-ПП устаревшее",
        "source": [
          "E1-MSK-S02",
          "E1-MSK-S08"
        ],
        "form": {
          "id": "MSK-F02",
          "version": "396-PP-edition-2025-08-12-with-agency-successor-note",
          "status": "regulation_fields_available_portal_not_tested"
        },
        "applicant": {
          "role": "Обычный маршрут приложения 1: правообладатель поставленного на кадастровый учёт участка. Специальный маршрут приложения 2: установленные органы/оператор КРТ/лицо по договору и иные прямо указанные случаи. Инвестор без основания не приравнивается к правообладателю.",
          "representation": "Для физлица — уполномоченное лицо; для ИП/юрлица — уполномоченные ИП/юрлица по тексту проверенной редакции.",
          "verified_in_edition": "2025-08-12"
        },
        "access": {
          "channel": "mos.ru",
          "public_service_page": "403",
          "login": true,
          "tested": false
        },
        "rights": {
          "processing": "project_only_subject_to_document_rights",
          "redistribution": null
        },
        "date": {
          "as_of": "2026-10-22",
          "retrieved_at": null,
          "effective_from": null,
          "effective_to": null,
          "latest_consolidated_edition_verified": false,
          "checked_at": "2026-10-22T15:00:04.153125+00:00",
          "retrieval_note": "Per-source retrieval times are in source-verifications.json; not a uniform service verification time."
        },
        "unknown": [
          "Документы и права по объекту",
          "Все изменения после редакции 12.08.2025, кроме отдельно проверенного правопреемства",
          "Текущий экран и обязательность полей портала",
          "Применимость специального или многоучасткового маршрута"
        ],
        "corpus_registry_rows": [
          11
        ],
        "applied_decision": "Не разрешать произвольному инвестору запрос от имени правообладателя; несколько участков не сливать автоматически.",
        "reviewer_required": true,
        "status": "documentary_research_only",
        "submission_status": "not_submitted",
        "site_applicability": "unknown_without_object_documents",
        "source_urls": [
          "https://www.mos.ru/upload/content/files/d3aa47cf6e0ab402056c13a63ae68caf/PPMot28062017396-PP.pdf",
          "https://www.mos.ru/upload/documents/docs/4959/2993-PP-km3s.pdf"
        ],
        "implementation_status": "research_only",
        "review_status": "pending_control_and_domain_review",
        "integration_status": "not_integrated",
        "acceptance_status": "not_accepted",
        "filing_readiness": "blocked_until_applicant_object_documents_and_current_portal_checked",
        "manual_steps": [
          "Идентифицировать объект и полномочия заявителя",
          "Сверить актуальную редакцию и форму на дату обращения",
          "Проверить комплект и подписи профильным специалистом",
          "Подачу и получение результата выполняет уполномоченный заявитель; в этой работе не выполнялось"
        ],
        "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
        "documents": [
          "Электронный запрос; кадастровая идентификация участка/участков",
          "Документы полномочий при представительстве",
          "Правоустанавливающий документ, когда право не зарегистрировано/регистрация не требуется, с исключениями регламента; сведения ЕГРН запрашиваются межведомственно",
          "При нескольких смежных участках проверить условия 603-ПП; одно AOI не создаёт единый ГПЗУ"
        ],
        "timing": {
          "working_days": 14,
          "starts": "registration",
          "basis": "S02 п. 2.7.1; не полный срок девелоперского проекта"
        },
        "fee": {
          "kind": "free_in_verified_edition",
          "amount": 0,
          "currency": "RUB",
          "scope": "выдача ГПЗУ; не проектирование/изыскания"
        }
      }
    },
    {
      "id": "MSK-KRT",
      "jurisdiction": "RU-MOW",
      "label": "КРТ по инициативе правообладателей / городской маршрут",
      "authority": "Уполномоченные органы Москвы по 331-ПП",
      "applicability": "unknown_without_object_documents",
      "sourceIds": [
        "E1-MSK-S04",
        "E1-MSK-S13",
        "E1-MSK-S14"
      ],
      "sourceUrls": [
        "https://vestnikmoscow.mos.ru/wp-content/uploads/2026/04/zhurnal-vestnik-moskvy-%E2%84%96-22.pdf",
        "https://vestnikmoscow.mos.ru/wp-content/uploads/2026/07/zhurnal-vestnik-moskvy-%E2%84%96-39.pdf",
        "http://pravo.gov.ru/proxy/ips/?docbody=&nd=120261687"
      ],
      "form": {
        "id": "krt-application",
        "version": null,
        "status": "current_full_regulation_missing"
      },
      "applicants": [
        "Правообладатели и надлежащий представитель; городской маршрут отдельно"
      ],
      "requirements": [],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "processing": "public_acts_only",
        "automated_submission": false
      },
      "access": {
        "channel": "Официальный регламент / городские публикации",
        "tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "Полная актуальная редакция 331-ПП и изменения после 07.07.2026",
        "Земельные/имущественные права и утверждённые границы КРТ",
        "Ветка городской инициативы/правообладателей/торгов",
        "Текущие приложения, форма и полномочия",
        "Точная дата вступления 1830-ПП по правилам опубликования не установлена",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and qualified local reviewer confirm applicability, current form and source rights before official action."
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "id": "MSK-KRT",
        "jurisdiction": "RU-MOW",
        "title_ru": "КРТ по инициативе правообладателей / городской маршрут",
        "authority": "Уполномоченные органы Москвы по 331-ПП",
        "source": [
          "E1-MSK-S04",
          "E1-MSK-S13",
          "E1-MSK-S14"
        ],
        "form": {
          "id": "krt-application",
          "version": null,
          "status": "current_full_regulation_missing"
        },
        "applicant": {
          "role": "Правообладатели и надлежащий представитель; городской маршрут отдельно",
          "verified_current": false
        },
        "access": {
          "channel": "Официальный регламент / городские публикации",
          "tested": false
        },
        "rights": {
          "processing": "public_acts_only",
          "automated_submission": false
        },
        "date": {
          "as_of": "2026-10-22",
          "retrieved_at": null,
          "effective_from": null,
          "effective_to": null,
          "latest_consolidated_edition_verified": false,
          "checked_at": "2026-10-22T15:00:04.153125+00:00",
          "retrieval_note": "Per-source retrieval times are in source-verifications.json; not a uniform service verification time."
        },
        "unknown": [
          "Полная актуальная редакция 331-ПП и изменения после 07.07.2026",
          "Земельные/имущественные права и утверждённые границы КРТ",
          "Ветка городской инициативы/правообладателей/торгов",
          "Текущие приложения, форма и полномочия",
          "Точная дата вступления 1830-ПП по правилам опубликования не установлена"
        ],
        "corpus_registry_rows": [
          4,
          8,
          9,
          11
        ],
        "applied_decision": "Хранить 1039-ПП и 1830-ПП как проверенные изменения, не как полный свод 331-ПП. Сроки победителя торгов не переносить на инициативное обращение.",
        "reviewer_required": true,
        "status": "documentary_research_only",
        "submission_status": "not_submitted",
        "site_applicability": "unknown_without_object_documents",
        "source_urls": [
          "https://vestnikmoscow.mos.ru/wp-content/uploads/2026/04/zhurnal-vestnik-moskvy-%E2%84%96-22.pdf",
          "https://vestnikmoscow.mos.ru/wp-content/uploads/2026/07/zhurnal-vestnik-moskvy-%E2%84%96-39.pdf",
          "http://pravo.gov.ru/proxy/ips/?docbody=&nd=120261687"
        ],
        "implementation_status": "research_only",
        "review_status": "pending_control_and_domain_review",
        "integration_status": "not_integrated",
        "acceptance_status": "not_accepted",
        "filing_readiness": "blocked_until_applicant_object_documents_and_current_portal_checked",
        "manual_steps": [
          "Идентифицировать объект и полномочия заявителя",
          "Сверить актуальную редакцию и форму на дату обращения",
          "Проверить комплект и подписи профильным специалистом",
          "Подачу и получение результата выполняет уполномоченный заявитель; в этой работе не выполнялось"
        ],
        "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
        "timing": {
          "applicability": "только победитель соответствующих торгов",
          "maximum": {
            "value": 30,
            "unit": "working_days",
            "trigger": "оформление протокола результатов торгов"
          },
          "minimum": {
            "value": 10,
            "unit": "calendar_days",
            "trigger": "размещение протокола на официальном сайте торгов"
          },
          "action": "направить три подписанных экземпляра договора адресату соответствующей ветки",
          "basis": "S13 пп. 1.1–1.2; не срок рассмотрения заявки КРТ"
        },
        "documents": [],
        "fee": {
          "kind": "unknown",
          "amount": null,
          "currency": "RUB"
        }
      }
    },
    {
      "id": "MSK-HERITAGE-INFO",
      "jurisdiction": "RU-MOW",
      "label": "Выписка ГРНКН и фрагмент ИКОП",
      "authority": "Департамент культурного наследия Москвы",
      "applicability": "unknown_without_object_documents",
      "sourceIds": [
        "E1-MSK-S01"
      ],
      "sourceUrls": [
        "https://www.mos.ru/upload/documents/files/2575/182-PP%28red03102025%29.pdf"
      ],
      "form": {
        "id": "MSK-F01",
        "version": "182-PP-edition-2025-10-03",
        "status": "regulation_fields_verified"
      },
      "applicants": [
        "Физические лица, ИП, юридические лица"
      ],
      "requirements": [],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": "182-PP-edition-2025-10-03",
      "rights": {
        "processing": "result_for_project_after_access_review",
        "public_republication": null
      },
      "access": {
        "channel": "mos.ru target 7700000000205630685",
        "login": true,
        "tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "Адрес/состав объектов",
        "Свежесть редакции перед подачей",
        "Полученный подписанный результат",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and qualified local reviewer confirm applicability, current form and source rights before official action."
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "id": "MSK-HERITAGE-INFO",
        "jurisdiction": "RU-MOW",
        "title_ru": "Выписка ГРНКН и фрагмент ИКОП",
        "authority": "Департамент культурного наследия Москвы",
        "source": [
          "E1-MSK-S01"
        ],
        "form": {
          "id": "MSK-F01",
          "version": "182-PP-edition-2025-10-03",
          "status": "regulation_fields_verified"
        },
        "applicant": {
          "role": "Физические лица, ИП, юридические лица",
          "representation": "Уполномоченные ИП и юридические лица; не произвольный представитель-физлицо",
          "account": "Для физлица стандартная/полная учётная запись mos.ru; для ИП/юрлица соответствующая запись",
          "verified_in_edition": "2025-10-03"
        },
        "access": {
          "channel": "mos.ru target 7700000000205630685",
          "login": true,
          "tested": false
        },
        "rights": {
          "processing": "result_for_project_after_access_review",
          "public_republication": null
        },
        "date": {
          "as_of": "2026-10-22",
          "retrieved_at": null,
          "effective_from": null,
          "effective_to": null,
          "latest_consolidated_edition_verified": false,
          "checked_at": "2026-10-22T15:00:04.153125+00:00",
          "retrieval_note": "Per-source retrieval times are in source-verifications.json; not a uniform service verification time."
        },
        "unknown": [
          "Адрес/состав объектов",
          "Свежесть редакции перед подачей",
          "Полученный подписанный результат"
        ],
        "corpus_registry_rows": [
          21
        ],
        "applied_decision": "Первый практический документ исторического центра: есть информационный результат и для объекта вне реестра; отсутствие записи не равно отсутствию зон.",
        "reviewer_required": true,
        "status": "documentary_research_only",
        "submission_status": "not_submitted",
        "site_applicability": "unknown_without_object_documents",
        "source_urls": [
          "https://www.mos.ru/upload/documents/files/2575/182-PP%28red03102025%29.pdf"
        ],
        "implementation_status": "research_only",
        "review_status": "pending_control_and_domain_review",
        "integration_status": "not_integrated",
        "acceptance_status": "not_accepted",
        "filing_readiness": "blocked_until_applicant_object_documents_and_current_portal_checked",
        "manual_steps": [
          "Идентифицировать объект и полномочия заявителя",
          "Сверить актуальную редакцию и форму на дату обращения",
          "Проверить комплект и подписи профильным специалистом",
          "Подачу и получение результата выполняет уполномоченный заявитель; в этой работе не выполнялось"
        ],
        "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
        "documents": [
          "Интерактивный запрос",
          "При представительстве: документы полномочий в ZIP/PDF",
          "При подписании за организацию/представителя: документы подписанта ZIP/PDF/XML и требуемые регламентом подписи"
        ],
        "timing": {
          "working_days": 15,
          "starts": "next_working_day_after_registration",
          "basis": "S01 п. 2.7"
        },
        "fee": {
          "kind": "free_in_verified_edition",
          "amount": 0,
          "currency": "RUB",
          "scope": "предоставление информации ГРНКН/ИКОП"
        },
        "result": [
          "Подписанная электронная выписка ГРНКН",
          "Фрагмент ИКОП или оба результата",
          "Информационное письмо о территориях/зонах для объекта вне реестра, если применимо",
          "Мотивированный отказ при основаниях регламента"
        ]
      }
    },
    {
      "id": "MSK-HERITAGE-PRESERVATION",
      "jurisdiction": "RU-MOW",
      "label": "Согласование проекта сохранения",
      "authority": "Компетентный федеральный/региональный/муниципальный орган по категории объекта и исключениям п. 8 приказа 1455; московского адресата сверить по конкретному объекту",
      "applicability": "unknown_without_object_documents",
      "sourceIds": [
        "E1-MSK-S09",
        "E1-MSK-S10",
        "E1-MSK-S18"
      ],
      "sourceUrls": [
        "https://publication.pravo.gov.ru/document/0001202509190014",
        "https://publication.pravo.gov.ru/document/0001202606100012",
        "https://www.mos.ru/pgu2/landing/target/7700000000165072138/"
      ],
      "form": {
        "id": "MSK-F05",
        "version": "1455-2025-08-13-effective-2026-03-01",
        "status": "recommended_applicant_form_content_verified"
      },
      "applicants": [
        "Физлицо, ИП, юрлицо или уполномоченный представитель"
      ],
      "requirements": [],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": "2026-03-01",
      "effectiveTo": "2032-03-01",
      "version": "1455-2025-08-13-effective-2026-03-01",
      "rights": {
        "processing": "no_client_data_in_external_ai",
        "automated_submission": false
      },
      "access": {
        "channel": "Лично/почта на бумаге или ЕПГУ/региональный портал по компетенции",
        "tested": false,
        "portal_transaction": "NOT_RUN"
      },
      "publishedFees": null,
      "unknowns": [
        "Кадастровая идентификация и категория объекта",
        "Компетентный московский орган и текущая карточка услуги",
        "Задание, лицензия разработчика, предмет/территория охраны, GIKE",
        "Согласование изменений процедуры с переходом 180-ФЗ в 2027 году",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and qualified local reviewer confirm applicability, current form and source rights before official action."
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "id": "MSK-HERITAGE-PRESERVATION",
        "jurisdiction": "RU-MOW",
        "title_ru": "Согласование проекта сохранения",
        "authority": "Компетентный федеральный/региональный/муниципальный орган по категории объекта и исключениям п. 8 приказа 1455; московского адресата сверить по конкретному объекту",
        "source": [
          "E1-MSK-S09",
          "E1-MSK-S10",
          "E1-MSK-S18"
        ],
        "form": {
          "id": "MSK-F05",
          "version": "1455-2025-08-13-effective-2026-03-01",
          "status": "recommended_applicant_form_content_verified"
        },
        "applicant": {
          "role": "Физлицо, ИП, юрлицо или уполномоченный представитель",
          "project_author": "Лицензированное юрлицо/ИП; электронный проект подписывается УКЭП разработчика",
          "verified_in_edition": "1455 original effective 2026-03-01"
        },
        "access": {
          "channel": "Лично/почта на бумаге или ЕПГУ/региональный портал по компетенции",
          "tested": false,
          "portal_transaction": "NOT_RUN"
        },
        "rights": {
          "processing": "no_client_data_in_external_ai",
          "automated_submission": false
        },
        "date": {
          "as_of": "2026-10-22",
          "retrieved_at": null,
          "effective_from": "2026-03-01",
          "effective_to": "2032-03-01",
          "latest_consolidated_edition_verified": false,
          "checked_at": "2026-10-22T15:00:04.153125+00:00",
          "retrieval_note": "Per-source retrieval times are in source-verifications.json; not a uniform service verification time."
        },
        "unknown": [
          "Кадастровая идентификация и категория объекта",
          "Компетентный московский орган и текущая карточка услуги",
          "Задание, лицензия разработчика, предмет/территория охраны, GIKE",
          "Согласование изменений процедуры с переходом 180-ФЗ в 2027 году"
        ],
        "corpus_registry_rows": [
          21
        ],
        "applied_decision": "Порядок 2026 и будущие изменения 2027 хранить отдельно; не применять старый шаблон 1749 по умолчанию.",
        "reviewer_required": true,
        "status": "documentary_research_only",
        "submission_status": "not_submitted",
        "site_applicability": "unknown_without_object_documents",
        "source_urls": [
          "https://publication.pravo.gov.ru/document/0001202509190014",
          "https://publication.pravo.gov.ru/document/0001202606100012",
          "https://www.mos.ru/pgu2/landing/target/7700000000165072138/"
        ],
        "implementation_status": "research_only",
        "review_status": "pending_control_and_domain_review",
        "integration_status": "not_integrated",
        "acceptance_status": "not_accepted",
        "filing_readiness": "blocked_until_applicant_object_documents_and_current_portal_checked",
        "manual_steps": [
          "Идентифицировать объект и полномочия заявителя",
          "Сверить актуальную редакцию и форму на дату обращения",
          "Проверить комплект и подписи профильным специалистом",
          "Подачу и получение результата выполняет уполномоченный заявитель; в этой работе не выполнялось"
        ],
        "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
        "documents": [
          "Заявление по рекомендуемому приложению 1",
          "Проектная документация в требуемом составе",
          "Положительное заключение государственной историко-культурной экспертизы с требуемыми подписями",
          "Документ полномочий, когда обращается представитель; требования к электронным подписям по п. 10"
        ],
        "timing": {
          "working_days_max": 20,
          "starts": "receipt_of_application_and_documents",
          "extension_allowed": false,
          "basis": "S09 п. 12"
        },
        "fee": {
          "kind": "not_verified_in_this_source",
          "amount": null,
          "currency": "RUB",
          "scope": "Стоимость проекта и экспертизы отдельно; бесплатность согласования по индексу не перепроверена действующим московским регламентом"
        }
      }
    },
    {
      "id": "MSK-ARCHAEOLOGY",
      "jurisdiction": "RU-MOW",
      "label": "Археология и воздействие земляных работ",
      "authority": "ДКН / Минкультуры по компетенции",
      "applicability": "unknown_without_object_documents",
      "sourceIds": [
        "E1-MSK-S19"
      ],
      "sourceUrls": [
        "https://culture.gov.ru/about/departments/departament_gosudarstvennoy_okhrany_kulturnogo_naslediya/activities/409784/"
      ],
      "form": {
        "id": "archaeology-open-list",
        "version": null,
        "status": "not_inspected"
      },
      "applicants": [
        "Уполномоченный специалист и заказчик; квалификация обязательна для применимого маршрута"
      ],
      "requirements": [],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "processing": "scope_and_result_permissions_required",
        "public_republication": null
      },
      "access": {
        "public_page": "inherited_index_only",
        "tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "Объект и территория воздействия",
        "Применимость исследований",
        "Текущие условия разрешения",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and qualified local reviewer confirm applicability, current form and source rights before official action."
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "id": "MSK-ARCHAEOLOGY",
        "jurisdiction": "RU-MOW",
        "title_ru": "Археология и воздействие земляных работ",
        "authority": "ДКН / Минкультуры по компетенции",
        "source": [
          "E1-MSK-S19"
        ],
        "form": {
          "id": "archaeology-open-list",
          "version": null,
          "status": "not_inspected"
        },
        "applicant": {
          "role": "Уполномоченный специалист и заказчик; квалификация обязательна для применимого маршрута",
          "verified_current": false
        },
        "access": {
          "public_page": "inherited_index_only",
          "tested": false
        },
        "rights": {
          "processing": "scope_and_result_permissions_required",
          "public_republication": null
        },
        "date": {
          "as_of": "2026-10-22",
          "retrieved_at": null,
          "effective_from": null,
          "effective_to": null,
          "latest_consolidated_edition_verified": false,
          "checked_at": "2026-10-22T15:00:04.153125+00:00",
          "retrieval_note": "Per-source retrieval times are in source-verifications.json; not a uniform service verification time."
        },
        "unknown": [
          "Объект и территория воздействия",
          "Применимость исследований",
          "Текущие условия разрешения"
        ],
        "corpus_registry_rows": [
          14,
          21
        ],
        "applied_decision": "Котлован и сети имеют собственную территорию воздействия; отсутствие объекта на карте не закрывает археологический вопрос.",
        "reviewer_required": true,
        "status": "documentary_research_only",
        "submission_status": "not_submitted",
        "site_applicability": "unknown_without_object_documents",
        "source_urls": [
          "https://culture.gov.ru/about/departments/departament_gosudarstvennoy_okhrany_kulturnogo_naslediya/activities/409784/"
        ],
        "implementation_status": "research_only",
        "review_status": "pending_control_and_domain_review",
        "integration_status": "not_integrated",
        "acceptance_status": "not_accepted",
        "filing_readiness": "blocked_until_applicant_object_documents_and_current_portal_checked",
        "manual_steps": [
          "Идентифицировать объект и полномочия заявителя",
          "Сверить актуальную редакцию и форму на дату обращения",
          "Проверить комплект и подписи профильным специалистом",
          "Подачу и получение результата выполняет уполномоченный заявитель; в этой работе не выполнялось"
        ],
        "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
        "documents": [],
        "timing": {
          "status": "not_verified"
        },
        "fee": {
          "kind": "unknown",
          "amount": null,
          "currency": "RUB"
        }
      }
    },
    {
      "id": "MSK-UNDERGROUND-REVIEW",
      "jurisdiction": "RU-MOW",
      "label": "Соответствие проекта Сводному плану подземных коммуникаций",
      "authority": "ГБУ Мосгоргеотрест",
      "applicability": "unknown_without_object_documents",
      "sourceIds": [
        "E1-MSK-S03",
        "E1-MSK-S12"
      ],
      "sourceUrls": [
        "https://vestnikmoscow.mos.ru/wp-content/uploads/2025/03/zhurnal-vestnik-moskvy-%E2%84%96-14.pdf",
        "https://mggt.ru/news/ob-izmeneniyah-poryadka-predostavleniya-uslugi-predostavlenie-tehnicheskogo-zaklyucheniya-o-sootvetstvii-proektnoj-dokumentatsii-svodnomu-planu-podzemnyh-kommunikatsij-i-sooruzhenij-v-gorode-moskve/"
      ],
      "form": {
        "id": "MSK-F03",
        "version": "177-PP-amended-403-PP-effective-2025-08-05",
        "status": "regulation_fields_available"
      },
      "applicants": [
        "Физлицо, ИП, юрлицо; представитель — ИП/юрлицо"
      ],
      "requirements": [],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": "2025-08-05",
      "effectiveTo": null,
      "version": "177-PP-amended-403-PP-effective-2025-08-05",
      "rights": {
        "processing": "result_access_class_must_be_preserved",
        "public_republication": null
      },
      "access": {
        "channel": "mos.ru target 7700000000210549775",
        "login": true,
        "tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "Изменения после марта 2025",
        "Текущий комплект и режим материалов",
        "Реальная геология/трасса/глубина",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and qualified local reviewer confirm applicability, current form and source rights before official action."
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "id": "MSK-UNDERGROUND-REVIEW",
        "jurisdiction": "RU-MOW",
        "title_ru": "Соответствие проекта Сводному плану подземных коммуникаций",
        "authority": "ГБУ Мосгоргеотрест",
        "source": [
          "E1-MSK-S03",
          "E1-MSK-S12"
        ],
        "form": {
          "id": "MSK-F03",
          "version": "177-PP-amended-403-PP-effective-2025-08-05",
          "status": "regulation_fields_available"
        },
        "applicant": {
          "role": "Физлицо, ИП, юрлицо; представитель — ИП/юрлицо",
          "verified_in_edition": "2025-03-04"
        },
        "access": {
          "channel": "mos.ru target 7700000000210549775",
          "login": true,
          "tested": false
        },
        "rights": {
          "processing": "result_access_class_must_be_preserved",
          "public_republication": null
        },
        "date": {
          "as_of": "2026-10-22",
          "retrieved_at": null,
          "effective_from": "2025-08-05",
          "effective_to": null,
          "latest_consolidated_edition_verified": false,
          "checked_at": "2026-10-22T15:00:04.153125+00:00",
          "retrieval_note": "Per-source retrieval times are in source-verifications.json; not a uniform service verification time."
        },
        "unknown": [
          "Изменения после марта 2025",
          "Текущий комплект и режим материалов",
          "Реальная геология/трасса/глубина"
        ],
        "corpus_registry_rows": [
          13,
          14
        ],
        "applied_decision": "Техническое заключение по проекту и получение исходной схемы сетей — разные услуги; не считать заключение гарантией свободного котлована.",
        "reviewer_required": true,
        "status": "documentary_research_only",
        "submission_status": "not_submitted",
        "site_applicability": "unknown_without_object_documents",
        "source_urls": [
          "https://vestnikmoscow.mos.ru/wp-content/uploads/2025/03/zhurnal-vestnik-moskvy-%E2%84%96-14.pdf",
          "https://mggt.ru/news/ob-izmeneniyah-poryadka-predostavleniya-uslugi-predostavlenie-tehnicheskogo-zaklyucheniya-o-sootvetstvii-proektnoj-dokumentatsii-svodnomu-planu-podzemnyh-kommunikatsij-i-sooruzhenij-v-gorode-moskve/"
        ],
        "implementation_status": "research_only",
        "review_status": "pending_control_and_domain_review",
        "integration_status": "not_integrated",
        "acceptance_status": "not_accepted",
        "filing_readiness": "blocked_until_applicant_object_documents_and_current_portal_checked",
        "manual_steps": [
          "Идентифицировать объект и полномочия заявителя",
          "Сверить актуальную редакцию и форму на дату обращения",
          "Проверить комплект и подписи профильным специалистом",
          "Подачу и получение результата выполняет уполномоченный заявитель; в этой работе не выполнялось"
        ],
        "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
        "documents": [
          "Проект земляных работ с подземными сетями/сооружениями, временными ограждениями/объектами на инженерно-геодезической основе",
          "ZIP: вектор DWG либо DGN и PDF; BIM IFC/XML/GML — при наличии",
          "Московская местная система координат; DWG в метрах; исходные единицы и высоты сохранять",
          "Полномочия и иные документы по условной ветке заявителя"
        ],
        "timing": {
          "working_days_general": 10,
          "conditional_routes_working_days": [
            8,
            7
          ],
          "registration_working_days_max": 3,
          "suspensions_included": false,
          "basis": "S03 п. 2.7; специальные сроки только при условиях регламента"
        },
        "fee": {
          "kind": "paid",
          "amount": null,
          "currency": "RUB",
          "basis": "S03 п. 2.12; счёт-договор, МРР-9.11-18",
          "conditional_repeat": "Один повтор без платы в пределах 60 рабочих дней после отрицательного результата при неизменном плановом/высотном положении сетей, с соблюдением п. 2.12.2"
        }
      }
    },
    {
      "id": "MSK-STORMWATER",
      "jurisdiction": "RU-MOW",
      "label": "Предварительные ТУ поверхностного водоотведения",
      "authority": "ГУП Мосводосток",
      "applicability": "unknown_without_object_documents",
      "sourceIds": [
        "E1-MSK-S05",
        "E1-MSK-S06",
        "E1-MSK-S07",
        "E1-MSK-S11"
      ],
      "sourceUrls": [
        "https://xn--b1aesfkbbawel.xn--p1ai/services/tu/",
        "https://xn--b1aesfkbbawel.xn--p1ai/upload/docs/teh/tu/perechen-dokumentov-prilagaemykh-k-zayavleniyu-na-podgotovku-tekhnicheskikh-usloviy-na-podklyuchenie.pdf",
        "https://xn--b1aesfkbbawel.xn--p1ai/upload/docs/teh/tu/3new.docx",
        "https://xn--b1aesfkbbawel.xn--p1ai/upload/docs/teh/tu/%D0%92%D1%80%D0%B5%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B5%20%D0%A2%D0%A3%20%D0%BF%D0%B5%D1%80%D0%B5%D1%87%D0%B5%D0%BD%D1%8C%20%D0%B4%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D0%BE%D0%B2.pdf"
      ],
      "form": {
        "id": "MSK-F04",
        "version": "undated-docx-sha256-5f0418fc6be5",
        "status": "published_docx_content_verified_version_undated"
      },
      "applicants": [
        "Правообладатель / уполномоченный орган; специальные основания перечислены в приложениях"
      ],
      "requirements": [],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": "undated-docx-sha256-5f0418fc6be5",
      "rights": {
        "processing": "draft_form_preparation",
        "bulk_reuse": null
      },
      "access": {
        "channel": "Электронный комплект / запись / mos.ru по процедуре",
        "tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "Дата версии DOCX",
        "Право на землю",
        "Гидравлический расчёт",
        "Условия договора",
        "Согласование старого приложения S11 (бумага/CD) с текущими электронными каналами S05",
        "Условия объекта для временного водоотвода; факт наличия мощности не установлен",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and qualified local reviewer confirm applicability, current form and source rights before official action."
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "id": "MSK-STORMWATER",
        "jurisdiction": "RU-MOW",
        "title_ru": "Предварительные ТУ поверхностного водоотведения",
        "authority": "ГУП Мосводосток",
        "source": [
          "E1-MSK-S05",
          "E1-MSK-S06",
          "E1-MSK-S07",
          "E1-MSK-S11"
        ],
        "form": {
          "id": "MSK-F04",
          "version": "undated-docx-sha256-5f0418fc6be5",
          "status": "published_docx_content_verified_version_undated"
        },
        "applicant": {
          "role": "Правообладатель / уполномоченный орган; специальные основания перечислены в приложениях",
          "verified_in_edition": "page_observed_2026-10-22"
        },
        "access": {
          "channel": "Электронный комплект / запись / mos.ru по процедуре",
          "tested": false
        },
        "rights": {
          "processing": "draft_form_preparation",
          "bulk_reuse": null
        },
        "date": {
          "as_of": "2026-10-22",
          "retrieved_at": null,
          "effective_from": null,
          "effective_to": null,
          "latest_consolidated_edition_verified": false,
          "checked_at": "2026-10-22T15:00:04.153125+00:00",
          "retrieval_note": "Per-source retrieval times are in source-verifications.json; not a uniform service verification time."
        },
        "unknown": [
          "Дата версии DOCX",
          "Право на землю",
          "Гидравлический расчёт",
          "Условия договора",
          "Согласование старого приложения S11 (бумага/CD) с текущими электронными каналами S05",
          "Условия объекта для временного водоотвода; факт наличия мощности не установлен"
        ],
        "corpus_registry_rows": [
          16
        ],
        "applied_decision": "Разделить предварительные ТУ, строительный водоотвод, договор и фактическое подключение.",
        "reviewer_required": true,
        "status": "documentary_research_only",
        "submission_status": "not_submitted",
        "site_applicability": "unknown_without_object_documents",
        "source_urls": [
          "https://xn--b1aesfkbbawel.xn--p1ai/services/tu/",
          "https://xn--b1aesfkbbawel.xn--p1ai/upload/docs/teh/tu/perechen-dokumentov-prilagaemykh-k-zayavleniyu-na-podgotovku-tekhnicheskikh-usloviy-na-podklyuchenie.pdf",
          "https://xn--b1aesfkbbawel.xn--p1ai/upload/docs/teh/tu/3new.docx",
          "https://xn--b1aesfkbbawel.xn--p1ai/upload/docs/teh/tu/%D0%92%D1%80%D0%B5%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B5%20%D0%A2%D0%A3%20%D0%BF%D0%B5%D1%80%D0%B5%D1%87%D0%B5%D0%BD%D1%8C%20%D0%B4%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D0%BE%D0%B2.pdf"
        ],
        "implementation_status": "research_only",
        "review_status": "pending_control_and_domain_review",
        "integration_status": "not_integrated",
        "acceptance_status": "not_accepted",
        "filing_readiness": "blocked_until_applicant_object_documents_and_current_portal_checked",
        "manual_steps": [
          "Идентифицировать объект и полномочия заявителя",
          "Сверить актуальную редакцию и форму на дату обращения",
          "Проверить комплект и подписи профильным специалистом",
          "Подачу и получение результата выполняет уполномоченный заявитель; в этой работе не выполнялось"
        ],
        "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
        "documents": [
          "Подписанный запрос и сведения о заявителе/полномочиях",
          "Права на землю и существующий ОКС, либо соответствующее специальное основание из перечня",
          "Схема границ 1:500 при наличии или предусмотренная схема размещения; ГПЗУ при наличии",
          "Расчёт поверхностного/дренажного стока; нагрузка с единицами л/с, м³/ч, м³/сут",
          "Для представителя-проектировщика: договор с условием получения ТУ, когда применимо"
        ],
        "timing": {
          "preliminary_tu_working_days": 7,
          "construction_tu_working_days": 14,
          "starts": "application_submission",
          "basis": "S05 current observed operator page; not connection completion"
        },
        "fee": {
          "kind": "free_tu_issue_on_operator_page",
          "amount": 0,
          "currency": "RUB",
          "scope": "Выдача ТУ; договор, подключение и работы оцениваются отдельно"
        }
      }
    },
    {
      "id": "MSK-HERITAGE-ACCESS",
      "jurisdiction": "RU-MOW",
      "label": "Охранные обязательства и доступ",
      "authority": "ДКН / компетентный орган охраны",
      "applicability": "unknown_without_object_documents",
      "sourceIds": [
        "E1-MSK-S01",
        "E1-MSK-S10",
        "E1-MSK-S20"
      ],
      "sourceUrls": [
        "https://www.mos.ru/upload/documents/files/2575/182-PP%28red03102025%29.pdf",
        "https://publication.pravo.gov.ru/document/0001202606100012",
        "https://www.mos.ru/upload/documents/files/5119/metodicheskierekomendacii_razdel.pdf"
      ],
      "form": {
        "id": "heritage-access-dossier",
        "version": null,
        "status": "internal_draft_not_official_form"
      },
      "applicants": [
        "Владелец/законный пользователь с профильным специалистом"
      ],
      "requirements": [],
      "checkedOn": "2026-10-22",
      "fetchedAt": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "version": null,
      "rights": {
        "processing": "object_specific",
        "public_republication": null
      },
      "access": {
        "channel": "Акты по объекту и документы собственника",
        "tested": false
      },
      "publishedFees": null,
      "unknowns": [
        "Предмет охраны",
        "Территория и зоны",
        "Установленный режим посещения",
        "Сервитуты/пожарный доступ",
        "Применимость переходных правил 180-ФЗ к конкретным прежним обязательствам и новому заданию",
        "Effective date/applicability not independently established.",
        "API not tested; URL is a documentary reference.",
        "Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient."
      ],
      "manualSteps": [
        "Authorised applicant and qualified local reviewer confirm applicability, current form and source rights before official action."
      ],
      "serviceStatus": "documented_not_executed",
      "confirmation": "review_required",
      "original": {
        "id": "MSK-HERITAGE-ACCESS",
        "jurisdiction": "RU-MOW",
        "title_ru": "Охранные обязательства и доступ",
        "authority": "ДКН / компетентный орган охраны",
        "source": [
          "E1-MSK-S01",
          "E1-MSK-S10",
          "E1-MSK-S20"
        ],
        "form": {
          "id": "heritage-access-dossier",
          "version": null,
          "status": "internal_draft_not_official_form"
        },
        "applicant": {
          "role": "Владелец/законный пользователь с профильным специалистом",
          "verified_current": false
        },
        "access": {
          "channel": "Акты по объекту и документы собственника",
          "tested": false
        },
        "rights": {
          "processing": "object_specific",
          "public_republication": null
        },
        "date": {
          "as_of": "2026-10-22",
          "retrieved_at": null,
          "effective_from": null,
          "effective_to": null,
          "latest_consolidated_edition_verified": false,
          "checked_at": "2026-10-22T15:00:04.153125+00:00",
          "retrieval_note": "Per-source retrieval times are in source-verifications.json; not a uniform service verification time."
        },
        "unknown": [
          "Предмет охраны",
          "Территория и зоны",
          "Установленный режим посещения",
          "Сервитуты/пожарный доступ",
          "Применимость переходных правил 180-ФЗ к конкретным прежним обязательствам и новому заданию"
        ],
        "corpus_registry_rows": [
          20,
          21
        ],
        "applied_decision": "Не утверждать разрешённость ограждения, сноса или высоты для Прохорова; сравнение концепций остаётся условным.",
        "reviewer_required": true,
        "status": "documentary_research_only",
        "submission_status": "not_submitted",
        "site_applicability": "unknown_without_object_documents",
        "source_urls": [
          "https://www.mos.ru/upload/documents/files/2575/182-PP%28red03102025%29.pdf",
          "https://publication.pravo.gov.ru/document/0001202606100012",
          "https://www.mos.ru/upload/documents/files/5119/metodicheskierekomendacii_razdel.pdf"
        ],
        "implementation_status": "research_only",
        "review_status": "pending_control_and_domain_review",
        "integration_status": "not_integrated",
        "acceptance_status": "not_accepted",
        "filing_readiness": "blocked_until_applicant_object_documents_and_current_portal_checked",
        "manual_steps": [
          "Идентифицировать объект и полномочия заявителя",
          "Сверить актуальную редакцию и форму на дату обращения",
          "Проверить комплект и подписи профильным специалистом",
          "Подачу и получение результата выполняет уполномоченный заявитель; в этой работе не выполнялось"
        ],
        "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
        "documents": [],
        "timing": {
          "status": "not_verified"
        },
        "fee": {
          "kind": "unknown",
          "amount": null,
          "currency": "RUB"
        }
      }
    }
  ],
  "sourcePackage": {
    "schema_version": "geoai.region-procedures/1.0",
    "package_version": "1.0.0-research",
    "status": "READY_FOR_REVIEW_NOT_INTEGRATED",
    "jurisdiction": "RU-MOW",
    "as_of": "2026-10-22",
    "created_at": "2026-10-22T14:35:34.737257+00:00",
    "source_registry": "source-verifications.json",
    "original_registry": "registry-29-preserved.json",
    "scope": "research_only_no_legal_submission_no_runtime_integration",
    "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
    "prokhorov": {
      "cadastre_ids": null,
      "aoi": null,
      "legal_status": "unknown",
      "heritage_status": "unknown",
      "assessed_buildability": null,
      "case_kind": "identity_gap_case"
    },
    "updated_at": "2026-10-22T15:00:04.153125+00:00",
    "form_registry": "form-registry.json",
    "rule_versions": "rule-versions.json",
    "contract_mapping": "contract-v1-payload.json",
    "compiledMetadataOnly": true,
    "compilationProvenance": {
      "owner": "moscow_1",
      "market": "moscow",
      "inputSchema": "geoai.region-procedures/1.0",
      "packageVersion": "1.0.0-research",
      "inputStatus": "READY_FOR_REVIEW_NOT_INTEGRATED",
      "checkedOn": "2026-10-22",
      "sourceSha256": "b32fbce94ac1be0cdf0ebecb4fd241e155eac8c1327df95fe2dd89fbe3279b0d",
      "registrySha256": "a6dc68e89bd277ff214572f5e19908ab8756f76cc73392892b0cf890ae180df7",
      "rules": 10,
      "sources": 20,
      "sourceRecordDates": "Retained from researcher records; not independently fetched by evidence_1.",
      "readback": "verification-result.json PASS 28 checks; handoff-receipt.json READY"
    }
  },
  "sourceRegistry": null,
  "unknowns": [
    "Research is metadata, primary links and own checklists; no real plot/service/API/application acceptance.",
    "AOI/community name does not resolve competent authority.",
    "FetchedAt and document publication/effective dates are distinct; no inferred real-world observation date."
  ],
  "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
};

/** Explicit region selection only; an AOI never selects its own regulator. */
export function getDevkitRegionalPack(marketKey: string): RegionalRulePack | null {
  const pack = marketKey === "dubai" ? DUBAI : marketKey === "moscow" ? MOSCOW : null;
  return pack ? structuredClone(pack) : null;
}
