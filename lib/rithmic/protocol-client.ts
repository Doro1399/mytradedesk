import fs from "node:fs";
import path from "node:path";
import type { Root } from "protobufjs";
import protobuf from "protobufjs";
import WebSocket from "ws";

import { rithmicProtoSamplesDir, rithmicProtosPresent } from "@/lib/rithmic/proto-dir";

export const DEFAULT_RITHMIC_WSS = "wss://rituz00100.rithmic.com:443";
export const DEFAULT_RITHMIC_SYSTEM = "Rithmic Test";
export const DEFAULT_TEMPLATE_VERSION = "3.9";
export const DEFAULT_APP_NAME = "MyTradeDesk";
export const DEFAULT_APP_VERSION = "0.1.0";

export function assertProtosOrThrow(): void {
  if (!rithmicProtosPresent()) {
    throw new Error(
      `Rithmic protos not found under ${rithmicProtoSamplesDir()}. ` +
        "Add the vendor SDK folder 0.89.0.0 at the repo root (see scripts/rithmic-smoke.mjs)."
    );
  }
}

export function loadProtoRoot(): Root {
  assertProtosOrThrow();
  const dir = rithmicProtoSamplesDir();
  const root = new protobuf.Root();
  const files = [
    "base.proto",
    "request_rithmic_system_info.proto",
    "response_rithmic_system_info.proto",
    "request_login.proto",
    "response_login.proto",
  ];
  for (const f of files) {
    root.loadSync(path.join(dir, f));
  }
  return root;
}

function encodeMessage(root: Root, typeName: string, payload: Record<string, unknown>): Buffer {
  const T = root.lookupType(typeName);
  const err = T.verify(payload);
  if (err) throw new Error(`Protobuf verify (${typeName}): ${err}`);
  const msg = T.create(payload);
  return Buffer.from(T.encode(msg).finish());
}

function onceMessage(ws: WebSocket, timeoutMs: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeListener("message", onMessage);
      reject(new Error(`No message received within ${timeoutMs} ms`));
    }, timeoutMs);
    function onMessage(data: WebSocket.RawData) {
      clearTimeout(timer);
      ws.removeListener("message", onMessage);
      resolve(Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer));
    }
    ws.on("message", onMessage);
  });
}

function connectWss(uri: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(uri, { rejectUnauthorized: false });
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

export type ListSystemsResult =
  | { ok: true; rpCode: string[]; systems: string[] }
  | { ok: false; error: string };

export async function listRithmicSystems(uri = DEFAULT_RITHMIC_WSS): Promise<ListSystemsResult> {
  try {
    const root = loadProtoRoot();
    const ws = await connectWss(uri);
    const buf = encodeMessage(root, "RequestRithmicSystemInfo", {
      templateId: 16,
      userMsg: ["hello"],
    });
    await ws.send(buf);
    const raw = await onceMessage(ws, 20_000);
    const Res = root.lookupType("ResponseRithmicSystemInfo");
    const msg = Res.decode(raw) as {
      rpCode?: string[];
      systemName?: string[];
    };
    await new Promise<void>((r) => {
      ws.once("close", () => r());
      ws.close(1000, "after system info");
    });
    const rpCode = Array.isArray(msg.rpCode) ? msg.rpCode.map(String) : [];
    const systems = Array.isArray(msg.systemName) ? msg.systemName.map(String) : [];
    return { ok: true, rpCode, systems };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export type LoginOrderPlantParams = {
  uri?: string;
  user: string;
  password: string;
  systemName?: string;
  templateVersion?: string;
  appName?: string;
  appVersion?: string;
};

export type LoginOrderPlantResult =
  | {
      ok: true;
      rpCode: string[];
      fcmId?: string;
      ibId?: string;
      heartbeatInterval?: number;
      uniqueUserId?: string;
    }
  | { ok: false; error: string; rpCode?: string[] };

export async function loginOrderPlant(p: LoginOrderPlantParams): Promise<LoginOrderPlantResult> {
  const uri = p.uri?.trim() || DEFAULT_RITHMIC_WSS;
  const systemName = p.systemName?.trim() || DEFAULT_RITHMIC_SYSTEM;
  const templateVersion = p.templateVersion?.trim() || DEFAULT_TEMPLATE_VERSION;
  const appName = p.appName?.trim() || DEFAULT_APP_NAME;
  const appVersion = p.appVersion?.trim() || DEFAULT_APP_VERSION;

  try {
    const root = loadProtoRoot();
    const ws = await connectWss(uri);
    const buf = encodeMessage(root, "RequestLogin", {
      templateId: 10,
      templateVersion,
      userMsg: ["hello"],
      user: p.user,
      password: p.password,
      appName,
      appVersion,
      systemName,
      infraType: 2,
    });
    await ws.send(buf);
    const raw = await onceMessage(ws, 30_000);
    const Res = root.lookupType("ResponseLogin");
    const msg = Res.decode(raw) as {
      rpCode?: string[];
      fcmId?: string;
      ibId?: string;
      heartbeatInterval?: number;
      uniqueUserId?: string;
    };
    await new Promise<void>((r) => {
      ws.once("close", () => r());
      ws.close(1000, "after login");
    });

    const rpCode = Array.isArray(msg.rpCode) ? msg.rpCode.map(String) : [];
    const success = rpCode.length === 1 && rpCode[0] === "0";
    if (success) {
      return {
        ok: true,
        rpCode,
        fcmId: msg.fcmId != null ? String(msg.fcmId) : undefined,
        ibId: msg.ibId != null ? String(msg.ibId) : undefined,
        heartbeatInterval:
          typeof msg.heartbeatInterval === "number" ? msg.heartbeatInterval : undefined,
        uniqueUserId: msg.uniqueUserId != null ? String(msg.uniqueUserId) : undefined,
      };
    }
    return { ok: false, error: "Login rejected or incomplete response", rpCode };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
