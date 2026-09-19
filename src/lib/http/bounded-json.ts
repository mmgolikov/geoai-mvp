export type BoundedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; message: string };

export async function readBoundedJson(request: Request, maxBytes: number, signal?: AbortSignal): Promise<BoundedJsonResult> {
  signal?.throwIfAborted();
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, status: 413, message: `Request body exceeds the ${maxBytes}-byte limit.` };
  }

  if (!request.body) {
    return { ok: false, status: 400, message: "Invalid JSON request body." };
  }

  const reader = request.body.getReader();
  const cancelOnAbort = () => { void reader.cancel(signal?.reason).catch(() => undefined); };
  signal?.addEventListener("abort", cancelOnAbort, { once: true });
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413, message: `Request body exceeds the ${maxBytes}-byte limit.` };
      }
      chunks.push(value);
    }
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? error;
    return { ok: false, status: 400, message: "Unable to read request body." };
  } finally {
    signal?.removeEventListener("abort", cancelOnAbort);
  }

  const bytes = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, status: 400, message: "Request body must be valid UTF-8 JSON." };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON request body." };
  }
}
