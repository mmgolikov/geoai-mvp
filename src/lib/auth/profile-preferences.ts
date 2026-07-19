import {
  getDefaultRoleForAudience,
  isExploreRoleForAudience
} from "@/src/lib/explore/scenarios";
import type { ExploreAudience, ExploreRole } from "@/src/lib/explore/types";
import type { GeoAIUserProfile } from "@/src/types/auth";

export const defaultProfileRegion = "Dubai / UAE";
export const maxProfileFullNameLength = 160;
export const maxProfileRegionLength = 120;

type ProfileFallback = {
  fullName?: string | null;
  phone?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function boundedText(value: unknown, maxLength: number, fallback = "") {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return normalized.slice(0, maxLength) || fallback;
}

export function normalizeProfilePhone(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/[\s()-]/g, "").trim();
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : "";
}

export function normalizeProfileAudience(value: unknown): ExploreAudience {
  return value === "b2c" ? "b2c" : "b2b";
}

export function normalizeProfileRole(audience: ExploreAudience, value: unknown): ExploreRole {
  return isExploreRoleForAudience(audience, value)
    ? value
    : getDefaultRoleForAudience(audience);
}

export function normalizeAvatarUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function readGeoAIUserProfile(
  userMetadata: unknown,
  fallback: ProfileFallback = {}
): GeoAIUserProfile {
  const metadata = asRecord(userMetadata);
  const geoaiProfile = asRecord(metadata.geoai_profile);
  const defaultAudience = normalizeProfileAudience(geoaiProfile.default_audience);
  const metadataFullName = metadata.full_name ?? metadata.name;

  return {
    fullName: boundedText(
      metadataFullName,
      maxProfileFullNameLength,
      boundedText(fallback.fullName, maxProfileFullNameLength, "GeoAI user")
    ),
    region: boundedText(geoaiProfile.region, maxProfileRegionLength, defaultProfileRegion),
    defaultAudience,
    defaultRole: normalizeProfileRole(defaultAudience, geoaiProfile.default_role),
    contactPhone: normalizeProfilePhone(geoaiProfile.contact_phone ?? fallback.phone),
    avatarUrl: normalizeAvatarUrl(metadata.avatar_url ?? metadata.picture)
  };
}

export function normalizeProfileUpdate(input: {
  fullName: unknown;
  region: unknown;
  defaultAudience: unknown;
  defaultRole: unknown;
  contactPhone: unknown;
}) {
  const defaultAudience = normalizeProfileAudience(input.defaultAudience);
  return {
    fullName: boundedText(input.fullName, maxProfileFullNameLength),
    region: boundedText(input.region, maxProfileRegionLength, defaultProfileRegion),
    defaultAudience,
    defaultRole: normalizeProfileRole(defaultAudience, input.defaultRole),
    contactPhone: normalizeProfilePhone(input.contactPhone)
  } satisfies Omit<GeoAIUserProfile, "avatarUrl">;
}

export function createGeoAIUserMetadata(profile: Omit<GeoAIUserProfile, "avatarUrl">) {
  return {
    full_name: profile.fullName,
    geoai_profile: {
      region: profile.region,
      default_audience: profile.defaultAudience,
      default_role: profile.defaultRole,
      contact_phone: profile.contactPhone
    }
  };
}
