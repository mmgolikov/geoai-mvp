export const auditEvidenceKernelStatus = {
  implemented: false,
  requestActorVerified: false,
  durableWriteReadVerified: false,
  exactDeploymentEvidenceVerified: false,
  reason: "Audit durability and actor attribution are not certified against an exact deployment in request user context."
} as const;
