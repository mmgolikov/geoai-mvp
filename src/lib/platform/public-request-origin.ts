import {
  getSelfHostedPublicOrigin,
  type RuntimeEnvironmentSource
} from "@/src/lib/platform/runtime-environment";

export function getConfiguredPublicOrigin(
  environment: RuntimeEnvironmentSource = process.env
): string | null {
  return getSelfHostedPublicOrigin(environment);
}

export function getPublicRequestOrigin(
  requestUrl: string,
  environment: RuntimeEnvironmentSource = process.env
): string {
  const configured = getConfiguredPublicOrigin(environment);
  if (configured) return configured;
  return new URL(requestUrl).origin;
}
