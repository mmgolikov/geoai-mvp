import type {
  GeoAIOrganization,
  GeoAIProjectMembership,
  GeoAIProjectRole,
  GeoAIUser
} from "@/src/types/auth";

export const demoUser: GeoAIUser = {
  id: "demo-user-geoai",
  email: "demo@geoai.space",
  phone: null,
  name: "GeoAI Guided Access User",
  isDemoUser: true,
  profile: {
    fullName: "GeoAI Guided Access User",
    region: "Dubai / UAE",
    defaultAudience: "b2b",
    defaultRole: "developer",
    contactPhone: "",
    avatarUrl: null
  }
};

export const demoOrganization: GeoAIOrganization = {
  id: "demo-org-geoai",
  name: "GeoAI Guided Access Organization",
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
    caveat: "Browser-local guided access membership only; protected access requires Supabase Auth, RLS and deployment governance."
  };
}
