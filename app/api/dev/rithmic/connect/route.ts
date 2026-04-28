import { NextResponse } from "next/server";

import {
  DEFAULT_APP_NAME,
  DEFAULT_APP_VERSION,
  DEFAULT_RITHMIC_SYSTEM,
  DEFAULT_RITHMIC_WSS,
  DEFAULT_TEMPLATE_VERSION,
  loginAndListAccounts,
} from "@/lib/rithmic/protocol-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dev-only: Order Plant login from credentials supplied by the sandbox UI.
 * Mirrors `/api/dev/rithmic/login` but reads `{ user, password, systemName }` from the request body
 * instead of process env, so each row in `Settings → Integrations` can use its own credentials.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development." }, { status: 403 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const user = typeof b.user === "string" ? b.user.trim() : "";
  const password = typeof b.password === "string" ? b.password.trim() : "";
  const systemName =
    typeof b.systemName === "string" && b.systemName.trim() !== ""
      ? b.systemName.trim()
      : DEFAULT_RITHMIC_SYSTEM;

  if (!user || !password) {
    return NextResponse.json(
      { ok: false as const, error: "Missing user or password." },
      { status: 400 }
    );
  }

  const uri = process.env.RITHMIC_WSS_URL?.trim() || DEFAULT_RITHMIC_WSS;
  const templateVersion = process.env.RITHMIC_TEMPLATE_VERSION?.trim() || DEFAULT_TEMPLATE_VERSION;
  const appName = process.env.RITHMIC_APP_NAME?.trim() || DEFAULT_APP_NAME;
  const appVersion = process.env.RITHMIC_APP_VERSION?.trim() || DEFAULT_APP_VERSION;

  const result = await loginAndListAccounts({
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
        stage: result.stage,
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
    userType: result.userType,
    accounts: result.accounts,
  });
}
