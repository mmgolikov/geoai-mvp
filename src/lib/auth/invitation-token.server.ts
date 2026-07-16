import { createHash, randomBytes } from "node:crypto";

const invitationTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function isInvitationToken(value: string) {
  return invitationTokenPattern.test(value);
}

export function hashInvitationToken(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
