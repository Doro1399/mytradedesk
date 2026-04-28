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
    "request_login_info.proto",
    "response_login_info.proto",
    "request_account_list.proto",
    "response_account_list.proto",
    "request_logout.proto",
    "response_logout.proto",
  ];
  for (const f of files) {
    root.loadSync(path.join(dir, f));
  }
  return root;
}

/**
 * Multi-message reader for a single WebSocket: buffers incoming frames so callers can
 * `await queue.next(timeoutMs)` once per protobuf response, including streamed lists
 * (RequestAccountList returns one message per account + an end-of-list sentinel).
 */
function makeMessageQueue(ws: WebSocket) {
  const buffers: Buffer[] = [];
  const waiters: Array<{
    resolve: (b: Buffer) => void;
    reject: (e: Error) => void;
    timer: NodeJS.Timeout;
  }> = [];
  let detached = false;
  let lastError: Error | null = null;

  function rejectAll(err: Error) {
    while (waiters.length > 0) {
      const w = waiters.shift()!;
      clearTimeout(w.timer);
      w.reject(err);
    }
  }

  function onMessage(data: WebSocket.RawData) {
    if (detached) return;
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
    if (waiters.length > 0) {
      const w = waiters.shift()!;
      clearTimeout(w.timer);
      w.resolve(buf);
    } else {
      buffers.push(buf);
    }
  }
  function onError(err: Error) {
    if (detached) return;
    lastError = err;
    rejectAll(err);
  }
  function onClose() {
    if (detached) return;
    lastError = new Error("WebSocket closed unexpectedly");
    rejectAll(lastError);
  }

  ws.on("message", onMessage);
  ws.once("error", onError);
  ws.once("close", onClose);

  return {
    next(timeoutMs: number): Promise<Buffer> {
      if (lastError) return Promise.reject(lastError);
      if (buffers.length > 0) return Promise.resolve(buffers.shift()!);
      return new Promise<Buffer>((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = waiters.findIndex((w) => w.resolve === resolve);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error(`No message received within ${timeoutMs} ms`));
        }, timeoutMs);
        waiters.push({ resolve, reject, timer });
      });
    },
    detach() {
      if (detached) return;
      detached = true;
      ws.removeListener("message", onMessage);
      ws.removeListener("error", onError);
      ws.removeListener("close", onClose);
      rejectAll(new Error("Queue detached"));
      buffers.length = 0;
    },
  };
}

async function closeWsQuietly(ws: WebSocket, reason: string): Promise<void> {
  if (ws.readyState === WebSocket.CLOSED) return;
  await new Promise<void>((r) => {
    const done = () => r();
    ws.once("close", done);
    try {
      ws.close(1000, reason);
    } catch {
      ws.removeListener("close", done);
      r();
    }
  });
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

export type RithmicAccount = {
  accountId: string;
  accountName: string;
  accountCurrency?: string;
  fcmId?: string;
  ibId?: string;
  autoLiquidate?: string;
  autoLiqThreshold?: string;
};

export type LoginAndAccountsResult =
  | {
      ok: true;
      rpCode: string[];
      fcmId?: string;
      ibId?: string;
      heartbeatInterval?: number;
      uniqueUserId?: string;
      userType?: number;
      accounts: RithmicAccount[];
    }
  | { ok: false; error: string; rpCode?: string[]; stage?: "login" | "loginInfo" | "accountList" };

/**
 * Order Plant flow used by the dev sandbox: login + login info + account list on a single WS.
 * Balance / equity / live PnL are not part of this dev kit's protos (they live on the PnL Plant
 * with messages such as `instrument_pnl_position_update`, not shipped here).
 */
export async function loginAndListAccounts(p: LoginOrderPlantParams): Promise<LoginAndAccountsResult> {
  const uri = p.uri?.trim() || DEFAULT_RITHMIC_WSS;
  const systemName = p.systemName?.trim() || DEFAULT_RITHMIC_SYSTEM;
  const templateVersion = p.templateVersion?.trim() || DEFAULT_TEMPLATE_VERSION;
  const appName = p.appName?.trim() || DEFAULT_APP_NAME;
  const appVersion = p.appVersion?.trim() || DEFAULT_APP_VERSION;

  let ws: WebSocket | null = null;
  try {
    const root = loadProtoRoot();
    ws = await connectWss(uri);
    const queue = makeMessageQueue(ws);

    try {
      await ws.send(
        encodeMessage(root, "RequestLogin", {
          templateId: 10,
          templateVersion,
          userMsg: ["hello"],
          user: p.user,
          password: p.password,
          appName,
          appVersion,
          systemName,
          infraType: 2,
        })
      );
      const rawLogin = await queue.next(30_000);
      const ResponseLogin = root.lookupType("ResponseLogin");
      const loginMsg = ResponseLogin.decode(rawLogin) as {
        rpCode?: string[];
        fcmId?: string;
        ibId?: string;
        heartbeatInterval?: number;
        uniqueUserId?: string;
      };
      const rpCode = Array.isArray(loginMsg.rpCode) ? loginMsg.rpCode.map(String) : [];
      const loginOk = rpCode.length === 1 && rpCode[0] === "0";
      if (!loginOk) {
        return { ok: false, error: "Login rejected or incomplete response", rpCode, stage: "login" };
      }

      await ws.send(
        encodeMessage(root, "RequestLoginInfo", {
          templateId: 300,
          userMsg: ["hello"],
        })
      );
      const rawInfo = await queue.next(15_000);
      const ResponseLoginInfo = root.lookupType("ResponseLoginInfo");
      const infoMsg = ResponseLoginInfo.decode(rawInfo) as {
        rpCode?: string[];
        fcmId?: string;
        ibId?: string;
        userType?: number;
      };
      const infoRp = Array.isArray(infoMsg.rpCode) ? infoMsg.rpCode.map(String) : [];
      const infoOk = infoRp.length === 1 && infoRp[0] === "0";
      const fcmId = infoMsg.fcmId ?? loginMsg.fcmId ?? undefined;
      const ibId = infoMsg.ibId ?? loginMsg.ibId ?? undefined;
      const userType = typeof infoMsg.userType === "number" ? infoMsg.userType : 3;
      if (!infoOk) {
        return { ok: false, error: "RequestLoginInfo failed", rpCode: infoRp, stage: "loginInfo" };
      }

      await ws.send(
        encodeMessage(root, "RequestAccountList", {
          templateId: 302,
          userMsg: ["hello"],
          fcmId,
          ibId,
          userType,
        })
      );
      const ResponseAccountList = root.lookupType("ResponseAccountList");
      const accounts: RithmicAccount[] = [];
      for (let i = 0; i < 64; i++) {
        const raw = await queue.next(15_000);
        const m = ResponseAccountList.decode(raw) as {
          rpCode?: string[];
          rqHandlerRpCode?: string[];
          fcmId?: string;
          ibId?: string;
          accountId?: string;
          accountName?: string;
          accountCurrency?: string;
          accountAutoLiquidate?: string;
          autoLiqThresholdCurrentValue?: string;
        };
        const mRp = Array.isArray(m.rpCode) ? m.rpCode.map(String) : [];
        if (mRp.length === 1 && mRp[0] === "0") break;
        const handlerRp = Array.isArray(m.rqHandlerRpCode) ? m.rqHandlerRpCode.map(String) : [];
        const handlerOk = handlerRp.length > 0 && handlerRp[0] === "0";
        if (!handlerOk) continue;
        if (!m.accountId || !m.accountName) continue;
        accounts.push({
          accountId: String(m.accountId),
          accountName: String(m.accountName),
          accountCurrency: m.accountCurrency != null ? String(m.accountCurrency) : undefined,
          fcmId: m.fcmId != null ? String(m.fcmId) : undefined,
          ibId: m.ibId != null ? String(m.ibId) : undefined,
          autoLiquidate: m.accountAutoLiquidate != null ? String(m.accountAutoLiquidate) : undefined,
          autoLiqThreshold:
            m.autoLiqThresholdCurrentValue != null
              ? String(m.autoLiqThresholdCurrentValue)
              : undefined,
        });
      }

      try {
        await ws.send(encodeMessage(root, "RequestLogout", { templateId: 12, userMsg: ["bye"] }));
      } catch {
        // best-effort; we close the socket regardless
      }

      return {
        ok: true,
        rpCode,
        fcmId,
        ibId,
        heartbeatInterval:
          typeof loginMsg.heartbeatInterval === "number" ? loginMsg.heartbeatInterval : undefined,
        uniqueUserId: loginMsg.uniqueUserId != null ? String(loginMsg.uniqueUserId) : undefined,
        userType,
        accounts,
      };
    } finally {
      queue.detach();
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  } finally {
    if (ws) {
      try {
        await closeWsQuietly(ws, "after accounts");
      } catch {
        // ignore
      }
    }
  }
}
