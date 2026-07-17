"use client";

import { readGeoAIUserProfile } from "@/src/lib/auth/profile-preferences";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import type { GeoAIUser } from "@/src/types/auth";

export async function enrichUserWithBrowserProfile(user: GeoAIUser) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return user;
  const { data, error } = await supabase.auth.getUser();
  const authUser = data.user;
  if (error || !authUser || authUser.id !== user.id || authUser.is_anonymous !== false) return user;
  const profile = readGeoAIUserProfile(authUser.user_metadata, {
    fullName: user.profile.fullName,
    phone: authUser.phone
  });
  return {
    ...user,
    email: authUser.email ?? user.email,
    phone: authUser.phone ?? null,
    name: profile.fullName,
    profile
  } satisfies GeoAIUser;
}
