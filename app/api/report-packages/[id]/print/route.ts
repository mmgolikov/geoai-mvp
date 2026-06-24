import { NextResponse } from "next/server";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  return NextResponse.redirect(new URL(`/report-packages/${encodeURIComponent(decodeURIComponent(id))}/print`, url.origin));
}
