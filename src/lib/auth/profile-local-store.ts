"use client";

import {
  normalizeProfileAudience,
  normalizeProfilePhone,
  normalizeProfileRole
} from "@/src/lib/auth/profile-preferences";
import type { GeoAIUser, GeoAIUserProfileUpdate } from "@/src/types/auth";

const profileStorageNamespace = "geoai-user-profile-v1";
const avatarDataUrlPattern = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i;
export const maxProfileAvatarBytes = 1_000_000;

type LocalProfileRecord = GeoAIUserProfileUpdate & {
  version: 1;
  userId: string;
  updatedAt: string;
};

function storageKey(userId: string) {
  return `${profileStorageNamespace}:${encodeURIComponent(userId)}`;
}

export function isSafeAvatarDataUrl(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= Math.ceil(maxProfileAvatarBytes * 4 / 3) + 128 &&
    avatarDataUrlPattern.test(value);
}

export function readLocalUserProfile(userId: string): LocalProfileRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey(userId)) ?? "null") as Partial<LocalProfileRecord> | null;
    if (!value || value.version !== 1 || value.userId !== userId) return null;
    const defaultAudience = normalizeProfileAudience(value.defaultAudience);
    return {
      version: 1,
      userId,
      fullName: typeof value.fullName === "string" ? value.fullName.slice(0, 160) : "",
      region: typeof value.region === "string" ? value.region.slice(0, 120) : "Dubai / UAE",
      defaultAudience,
      defaultRole: normalizeProfileRole(defaultAudience, value.defaultRole),
      contactPhone: normalizeProfilePhone(value.contactPhone),
      avatarDataUrl: isSafeAvatarDataUrl(value.avatarDataUrl) ? value.avatarDataUrl : null,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString()
    };
  } catch {
    return null;
  }
}

export function writeLocalUserProfile(userId: string, profile: GeoAIUserProfileUpdate, includePersonalFields: boolean) {
  if (typeof window === "undefined") return false;
  const value: LocalProfileRecord = {
    version: 1,
    userId,
    fullName: includePersonalFields ? profile.fullName : "",
    region: includePersonalFields ? profile.region : "",
    defaultAudience: profile.defaultAudience,
    defaultRole: profile.defaultRole,
    contactPhone: includePersonalFields ? profile.contactPhone : "",
    avatarDataUrl: isSafeAvatarDataUrl(profile.avatarDataUrl) ? profile.avatarDataUrl : null,
    updatedAt: new Date().toISOString()
  };

  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function mergeLocalProfileIntoUser(user: GeoAIUser): GeoAIUser {
  const localProfile = readLocalUserProfile(user.id);
  if (!localProfile) return user;
  const useLocalPersonalFields = user.isDemoUser;
  const fullName = useLocalPersonalFields && localProfile.fullName
    ? localProfile.fullName
    : user.profile.fullName;

  return {
    ...user,
    name: fullName,
    profile: {
      ...user.profile,
      fullName,
      region: useLocalPersonalFields && localProfile.region ? localProfile.region : user.profile.region,
      defaultAudience: localProfile.defaultAudience,
      defaultRole: localProfile.defaultRole,
      contactPhone: useLocalPersonalFields ? localProfile.contactPhone : user.profile.contactPhone,
      avatarUrl: localProfile.avatarDataUrl ?? user.profile.avatarUrl
    }
  };
}
