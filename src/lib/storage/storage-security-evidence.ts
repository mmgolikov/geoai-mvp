export const storageSecurityEvidenceStatus = {
  implemented: false,
  userContextUploadDownloadDeleteVerified: false,
  wrongTenantDenied: false,
  privateBucketPolicyVerified: false,
  reason: "Private Storage verification is not implemented in request user context. Bucket reachability or an operator marker is not security evidence."
} as const;
