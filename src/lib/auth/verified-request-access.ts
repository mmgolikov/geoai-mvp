import { requestAuthKernelStatus } from "@/src/lib/auth/request-auth-kernel";
import type { ProjectAccessResult } from "@/src/lib/auth/project-access";

export function hasVerifiedRequestIdentity(access: ProjectAccessResult) {
  return requestAuthKernelStatus.implemented &&
    requestAuthKernelStatus.requestUserVerified &&
    requestAuthKernelStatus.projectMembershipVerified &&
    access.allowed && access.mode === "hard" &&
    access.authMode === "supabase_auth" &&
    access.decisionStatus === "allowed_project_member" &&
    access.user?.isDemoUser === false &&
    access.membership?.source !== "demo_seed";
}
