import type {
  GeoAIOrganization,
  GeoAIProjectMembership,
  GeoAIProjectRole,
  GeoAIUser
} from "@/src/types/auth";

export const demoUser: GeoAIUser = {
  id: "demo-user-geoai",
  email: "demo@geoai.space",
  name: "GeoAI Demo User",
  isDemoUser: true
};

export const demoOrganization: GeoAIOrganization = {
  id: "demo-org-geoai",
  name: "GeoAI Demo Organization",
  mode: "demo"
};

export const demoProjectRole: GeoAIProjectRole = "owner";

export function createDemoProjectMembership(projectKey = "all-demo-projects"): GeoAIProjectMembership {
  return {
    id: `demo-membership-${projectKey}`,
    userId: demoUser.id,
    organizationId: demoOrganization.id,
    projectKey,
    role: demoProjectRole,
    status: "active",
    source: "demo_seed",
    caveat: "Demo sample membership only; production access control requires Supabase Auth, RLS and deployment governance."
  };
}
