"use client";

import { useCallback, useState } from "react";

type ListJson =
  | { ok: true; uri: string; rpCode: string[]; systems: string[] }
  | { ok: false; uri?: string; error: string };

type LoginJson =
  | {
      ok: true;
      uri: string;
      appName: string;
      appVersion: string;
      systemName: string;
      rpCode: string[];
      fcmId?: string;
      ibId?: string;
      heartbeatInterval?: number;
      uniqueUserId?: string;
    }
  | { ok: false; uri?: string; appName?: string; error: string; rpCode?: string[] };

export function RithmicSandboxPanel() {
  const [busy, setBusy] = useState<"list" | "login" | null>(null);
  const [listResult, setListResult] = useState<ListJson | null>(null);
  const [loginResult, setLoginResult] = useState<LoginJson | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);

  const runList = useCallback(async () => {
    setBusy("list");
    setRawError(null);
    setListResult(null);
    try {
      const res = await fetch("/api/dev/rithmic/list-systems", { method: "GET" });
      const data = (await res.json()) as ListJson & { error?: string };
      if (!res.ok) {
        setListResult({ ok: false, error: data.error ?? res.statusText });
        return;
      }
      setListResult(data as ListJson);
    } catch (e) {
      setRawError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, []);

  const runLogin = useCallback(async () => {
    setBusy("login");
    setRawError(null);
    setLoginResult(null);
    try {
      const res = await fetch("/api/dev/rithmic/login", { method: "POST" });
      const data = (await res.json()) as LoginJson & { error?: string };
      if (!res.ok) {
        setLoginResult({
          ok: false,
          error: data.error ?? res.statusText,
          rpCode: data.rpCode,
          appName: data.appName,
          uri: data.uri,
        });
        return;
      }
      setLoginResult(data as LoginJson);
    } catch (e) {
      setRawError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <div className="space-y-6 text-sm text-white/70">
      <p className="text-white/55">
        Calls run on the <strong className="text-white/80">Next.js dev server</strong> (Node) using
        the same protobuf flow as <code className="text-amber-200/90">npm run rithmic:smoke</code>.
        Credentials for login stay in <code className="text-amber-200/90">.env.local</code>{" "}
        (server-side keys only).
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runList()}
          className="rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-100 ring-1 ring-amber-400/35 hover:bg-amber-500/30 disabled:opacity-40"
        >
          {busy === "list" ? "Listing…" : "List Rithmic systems"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runLogin()}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/90 ring-1 ring-white/15 hover:bg-white/[0.14] disabled:opacity-40"
        >
          {busy === "login" ? "Logging in…" : "Test Order Plant login"}
        </button>
      </div>

      {rawError ? (
        <pre className="overflow-x-auto rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-100/90">
          {rawError}
        </pre>
      ) : null}

      {listResult ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            RequestRithmicSystemInfo
          </p>
          {listResult.ok ? (
            <>
              <p className="mb-1 text-xs text-white/45">URI: {listResult.uri}</p>
              <p className="mb-1 text-xs text-white/45">rpCode: {listResult.rpCode.join(" | ") || "—"}</p>
              <ul className="list-inside list-disc text-white/80">
                {listResult.systems.length ? (
                  listResult.systems.map((s) => <li key={s}>{s}</li>)
                ) : (
                  <li className="text-white/45">(no system names)</li>
                )}
              </ul>
            </>
          ) : (
            <p className="text-red-200/90">{listResult.error}</p>
          )}
        </div>
      ) : null}

      {loginResult ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            RequestLogin (Order Plant)
          </p>
          {loginResult.ok ? (
            <>
              <p className="text-xs text-white/45">URI: {loginResult.uri}</p>
              <p className="text-xs text-white/45">
                app: {loginResult.appName} v{loginResult.appVersion} · system: {loginResult.systemName}
              </p>
              <p className="text-xs text-white/45">rpCode: {loginResult.rpCode.join(" | ")}</p>
              <p className="mt-2 text-emerald-200/90">Login OK</p>
              <ul className="mt-1 space-y-0.5 text-xs text-white/60">
                <li>fcmId: {loginResult.fcmId ?? "—"}</li>
                <li>ibId: {loginResult.ibId ?? "—"}</li>
                <li>heartbeatInterval: {loginResult.heartbeatInterval ?? "—"}</li>
                <li>uniqueUserId: {loginResult.uniqueUserId ?? "—"}</li>
              </ul>
            </>
          ) : (
            <>
              <p className="text-red-200/90">{loginResult.error}</p>
              {loginResult.rpCode?.length ? (
                <p className="mt-1 text-xs text-white/50">rpCode: {loginResult.rpCode.join(" | ")}</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
