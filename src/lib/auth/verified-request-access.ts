import type { ProjectAccessResult } from "@/src/lib/auth/project-access";

export function hasRequestIdentityKernelEvidence() {
  // A deployment/global capability flag is not a request principal. Keep every
  // dynamic repository path closed until AUTH-01 supplies caller-bound proof.
  return false;
}

export function hasVerifiedRequestIdentity(_access: ProjectAccessResult) {
  return false;
}
