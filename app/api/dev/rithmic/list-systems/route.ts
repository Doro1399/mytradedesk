import { NextResponse } from "next/server";

import { DEFAULT_RITHMIC_WSS, listRithmicSystems } from "@/lib/rithmic/protocol-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development." }, { status: 403 });
  }

  const uri = process.env.RITHMIC_WSS_URL?.trim() || DEFAULT_RITHMIC_WSS;
  const result = await listRithmicSystems(uri);

  if (!result.ok) {
    return NextResponse.json({ ok: false as const, uri, error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true as const,
    uri,
    rpCode: result.rpCode,
    systems: result.systems,
  });
}
