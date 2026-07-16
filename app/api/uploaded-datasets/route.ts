import { NextResponse } from "next/server";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";

export const runtime = "nodejs";

export async function GET() {
  return privateNoStoreJson({
    ok: true,
    ...repositoryModeFields("browser_local"),
    count: 0,
    items: [],
    dataHonesty: "Public-demo uploads are browser-local only and are never listed from server storage."
  });
}

export async function POST() {
  return NextResponse.json({
    ok: false,
    persisted: false,
    ...repositoryModeFields("browser_local"),
    message: "Public-demo uploads must remain browser-local; server persistence requires verified Auth, membership, RLS and Storage."
  }, { status: 403 });
}

export async function DELETE() {
  return NextResponse.json({
    ok: false,
    ...repositoryModeFields("browser_local"),
    deleted: false,
    message: "Public-demo uploads are browser-local and have no server record to delete."
  }, { status: 403 });
}
