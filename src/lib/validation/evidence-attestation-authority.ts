export const evidenceAttestationAuthorityStatus: {
  implemented: boolean;
  reason: string;
} = {
  implemented: false,
  reason: "Client and official evidence attestations require a server-verified subject, project membership and explicit attestation capability; that authority is not implemented yet."
};

export function hasEvidenceAttestationAuthority() {
  return evidenceAttestationAuthorityStatus.implemented;
}
