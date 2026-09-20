/** Same UTF-8 JSON SHA-256 input used by the authoritative Create route. */
export async function pointObjectCreateAoiHash(coordinates: [number, number][][]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(coordinates));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
