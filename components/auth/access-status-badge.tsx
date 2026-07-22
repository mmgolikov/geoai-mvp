"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { AccessStatusBadgeVisual } from "@/components/auth/access-status-badge-visual";

export { AccessStatusBadgeVisual } from "@/components/auth/access-status-badge-visual";

export function AccessStatusBadge() {
  const { isAuthenticated, isDemo, user } = useAuth();
  const avatar = user?.profile.avatarUrl;
  const label = isAuthenticated
    ? isDemo
      ? "Open demo profile"
      : "Open your profile"
    : "Sign in to GeoAI";

  return <AccessStatusBadgeVisual
    avatar={avatar ?? undefined}
    fullName={user?.profile.fullName}
    href={isAuthenticated ? "/profile" : "/login"}
    isAuthenticated={isAuthenticated}
    label={label}
  />;
}
