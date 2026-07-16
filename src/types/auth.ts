export type GeoAIAuthMode = "demo_public" | "supabase_auth" | "disabled";

export type GeoAIProjectRole = "owner" | "admin" | "analyst" | "viewer" | "client_viewer";

export type GeoAIProjectMembershipStatus = "active" | "invited" | "disabled";

export type GeoAIUser = {
  id: string;
  email: string;
  name: string;
  isDemoUser: boolean;
};

export type GeoAIOrganization = {
  id: string;
  name: string;
  mode: "demo" | "customer";
};

export type GeoAIProjectMembership = {
  id: string;
  userId: string;
  organizationId: string;
  projectKey: string;
  role: GeoAIProjectRole;
  status: GeoAIProjectMembershipStatus;
  source: "demo_seed" | "supabase_verified";
  caveat: string;
};

export type GeoAIAuthSession = {
  user: GeoAIUser | null;
  organization: GeoAIOrganization | null;
  projectRole: GeoAIProjectRole | null;
  membership: GeoAIProjectMembership | null;
  isAuthenticated: boolean;
  isDemo: boolean;
};
