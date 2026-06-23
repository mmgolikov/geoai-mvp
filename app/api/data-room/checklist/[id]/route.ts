import { NextResponse } from "next/server";
import { updateDataRoomChecklistItem } from "@/src/lib/repositories/data-room-repository";
import type { ValidationChecklistItem } from "@/src/types/data-room";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mode: "local_fallback", message: "Invalid JSON body." }, { status: 400 });
  }

  const { id } = await context.params;
  const patch = typeof body === "object" && body !== null && !Array.isArray(body)
    ? body as Partial<ValidationChecklistItem>
    : {};
  const result = await updateDataRoomChecklistItem(id, patch);

  return NextResponse.json({
    ok: result.ok,
    mode: "local_fallback",
    item: result.data,
    error: result.error,
    dataHonesty: "Checklist status is not an official validation claim."
  });
}
