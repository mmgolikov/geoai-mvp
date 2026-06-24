export const evidenceFileCaveat =
  "Uploaded evidence requires review; it is not a legal, cadastral, zoning, planning, ownership or valuation conclusion.";

export type StorageProvider = "supabase_storage" | "local_metadata_only" | "disabled";

export type StorageObjectStatus =
  | "pending"
  | "uploaded"
  | "available"
  | "unavailable"
  | "deleted"
  | "failed"
  | "metadata_only";

export type EvidenceFileValidationStatus =
  | "uploaded_unreviewed"
  | "in_review"
  | "client_validated"
  | "official_validated"
  | "rejected"
  | "expired";

export type EvidenceFileAsset = {
  id: string;
  organizationId?: string | null;
  projectId?: string | null;
  projectKey: string;
  linkedValidationEvidenceIds?: string[];
  linkedDataRoomAssetIds?: string[];
  linkedAoiIds?: string[];
  linkedReportIds?: string[];
  fileName: string;
  safeFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  extension: string;
  storageProvider: StorageProvider;
  bucketName?: string | null;
  storagePath?: string | null;
  objectStatus: StorageObjectStatus;
  checksum?: string | null;
  uploadedBy?: string | null;
  uploadedAt?: string | null;
  signedUrlExpiresAt?: string | null;
  notes?: string | null;
  validationStatus: EvidenceFileValidationStatus;
  caveat: string;
  createdAt: string;
  updatedAt: string;
};
