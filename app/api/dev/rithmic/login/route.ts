import { NextResponse } from "next/server";

import {
  DEFAULT_APP_NAME,
  DEFAULT_APP_VERSION,
  DEFAULT_RITHMIC_SYSTEM,
  DEFAULT_RITHMIC_WSS,
  DEFAULT_TEMPLATE_VERSION,
  loginOrderPlant,
} from "@/lib/rithmic/protocol-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development." }, { status: 403 });
  }

  const user = process.env.RITHMIC_USER?.trim();
  const password = process.env.RITHMIC_PASSWORD?.trim();
  if (!user || !password) {
    return NextResponse.json(
      {
        error:
          "Set RITHMIC_USER and RITHMIC_PASSWORD in .env.local (server-side; never NEXT_PUBLIC_*) to test login.",
      },
      { status: 400 }
    );
  }

  const uri = process.env.RITHMIC_WSS_URL?.trim() || DEFAULT_RITHMIC_WSS;
  const systemName = process.env.RITHMIC_SYSTEM_NAME?.trim() || DEFAULT_RITHMIC_SYSTEM;
  const templateVersion = process.env.RITHMIC_TEMPLATE_VERSION?.trim() || DEFAULT_TEMPLATE_VERSION;
  const appName = process.env.RITHMIC_APP_NAME?.trim() || DEFAULT_APP_NAME;
  const appVersion = process.env.RITHMIC_APP_VERSION?.trim() || DEFAULT_APP_VERSION;

  const result = await loginOrderPlant({
    uri,
    user,
    password,
    systemName,
    templateVersion,
    appName,
    appVersion,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false as const,
        uri,
        appName,
        appVersion,
        systemName,
        error: result.error,
        rpCode: result.rpCode ?? [],
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true as const,
    uri,
    appName,
    appVersion,
    systemName,
    rpCode: result.rpCode,
    fcmId: result.fcmId,
    ibId: result.ibId,
    heartbeatInterval: result.heartbeatInterval,
    uniqueUserId: result.uniqueUserId,
  });
}
