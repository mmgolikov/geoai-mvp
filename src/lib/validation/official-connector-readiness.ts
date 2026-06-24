import { validationRequiredCaveat, type OfficialConnectorReadiness } from "@/src/types/validation";

const forbiddenOfficialClaims = [
  "live ownership verification",
  "official parcel boundary",
  "zoning approval",
  "certified valuation",
  "cadastral validation",
  "legal conclusion",
  "approved site",
  "guaranteed best use"
];

export const officialConnectorReadiness: OfficialConnectorReadiness[] = [
  {
    id: "dld-public-real-estate-data",
    name: "DLD Public Real Estate Data",
    provider: "Dubai Land Department / public exports",
    sourceCategory: "dld_public_snapshot",
    accessMode: "manual_import",
    currentStatus: "manual_snapshot_ready",
    credentialRequired: false,
    agreementRequired: false,
    currentImplementation: "Manual/sample snapshot ingestion with source/date/category validation.",
    whatItCanSupport: ["Transaction/rent/project/valuation category snapshot context if manually downloaded/imported."],
    whatItCannotSupport: ["Live ownership verification", "Official parcel boundary", "Zoning approval", "Certified valuation"],
    allowedClaims: ["DLD public snapshot context indicates...", "Manual snapshot evidence requires source/date review."],
    forbiddenClaims: forbiddenOfficialClaims,
    nextStep: "Manually import CSV snapshots and validate source/date/category.",
    caveat: validationRequiredCaveat
  },
  {
    id: "dld-api-gateway",
    name: "DLD API Gateway",
    provider: "Dubai Land Department API Gateway",
    sourceCategory: "dld_api_gateway",
    accessMode: "permission_required",
    currentStatus: "permission_required",
    credentialRequired: true,
    agreementRequired: true,
    currentImplementation: "Readiness metadata only; no live calls are made.",
    whatItCanSupport: ["Rental Index", "Dubai Brokers", "Ejari", "Trakheesi", "Mollak, subject to permission."],
    whatItCannotSupport: ["Any live official claim without credentials and contractual authorization."],
    allowedClaims: ["Permission required for live DLD API validation."],
    forbiddenClaims: forbiddenOfficialClaims,
    nextStep: "Obtain business account, subscription and API permission before any live connector.",
    caveat: validationRequiredCaveat
  },
  {
    id: "dubai-pulse-data-dubai",
    name: "Dubai Pulse / Data Dubai",
    provider: "Dubai Pulse / Data Dubai",
    sourceCategory: "dubai_pulse_snapshot",
    accessMode: "manual_import",
    currentStatus: "manual_snapshot_ready",
    credentialRequired: false,
    agreementRequired: false,
    currentImplementation: "Manual public export path when available; planned validation otherwise.",
    whatItCanSupport: ["Public export context and metadata if source/date/category are reviewed."],
    whatItCannotSupport: ["Official ownership, zoning, cadastral or valuation validation."],
    allowedClaims: ["Dubai Pulse snapshot context indicates...", "Public export review remains required."],
    forbiddenClaims: forbiddenOfficialClaims,
    nextStep: "Confirm public export availability and import reviewed snapshots.",
    caveat: validationRequiredCaveat
  },
  {
    id: "geodubai-municipality",
    name: "GeoDubai / Dubai Municipality",
    provider: "GeoDubai / Dubai Municipality",
    sourceCategory: "geodubai_municipality",
    accessMode: "permission_required",
    currentStatus: "planned_validation",
    credentialRequired: true,
    agreementRequired: true,
    currentImplementation: "Planned validation connector only; no live GIS/planning claim.",
    whatItCanSupport: ["Future official GIS/planning evidence if authorized."],
    whatItCannotSupport: ["Current parcel, zoning, cadastral, planning or entitlement validation."],
    allowedClaims: ["GeoDubai / Municipality validation is planned or permission-required."],
    forbiddenClaims: forbiddenOfficialClaims,
    nextStep: "Obtain GeoDubai / Municipality access or client-provided official validation evidence.",
    caveat: validationRequiredCaveat
  },
  {
    id: "client-uploaded-official-document",
    name: "Client Uploaded Official Document",
    provider: "Client / advisor / authority-provided file",
    sourceCategory: "client_uploaded_document",
    accessMode: "client_provided",
    currentStatus: "client_document_required",
    credentialRequired: false,
    agreementRequired: true,
    currentImplementation: "Metadata-only evidence tracking; secure file storage is not active.",
    whatItCanSupport: ["Client-provided evidence after upload/review.", "Linked validation note for AOIs/reports/analyses."],
    whatItCannotSupport: ["GeoAI certification of ownership, zoning, cadastral status, planning approval or valuation."],
    allowedClaims: ["Client-provided evidence indicates...", "Subject to official validation..."],
    forbiddenClaims: forbiddenOfficialClaims,
    nextStep: "Register document metadata, review it and set evidence status conservatively.",
    caveat: validationRequiredCaveat
  },
  {
    id: "licensed-valuation-market-provider",
    name: "Licensed Valuation / Market Provider",
    provider: "Licensed third-party valuation or market data provider",
    sourceCategory: "licensed_valuation",
    accessMode: "licensed",
    currentStatus: "permission_required",
    credentialRequired: true,
    agreementRequired: true,
    currentImplementation: "Readiness metadata only; no licensed connector is active.",
    whatItCanSupport: ["Licensed market/valuation evidence subject to contract and review."],
    whatItCannotSupport: ["Certified GeoAI valuation or legal conclusion."],
    allowedClaims: ["Licensed provider evidence indicates...", "Subject to provider license and validation scope."],
    forbiddenClaims: forbiddenOfficialClaims,
    nextStep: "Select provider, confirm license scope and add reviewed evidence metadata.",
    caveat: validationRequiredCaveat
  }
];

export function getConnectorReadinessSummary() {
  return {
    total: officialConnectorReadiness.length,
    permissionRequired: officialConnectorReadiness.filter((item) => item.currentStatus === "permission_required").length,
    manualSnapshotReady: officialConnectorReadiness.filter((item) => item.currentStatus === "manual_snapshot_ready").length,
    plannedValidation: officialConnectorReadiness.filter((item) => item.currentStatus === "planned_validation").length,
    clientDocumentRequired: officialConnectorReadiness.filter((item) => item.currentStatus === "client_document_required").length
  };
}
