/**
 * Smoke test R | Protocol API (Rithmic Test) — no Next.js, no secrets in repo.
 *
 * Prérequis : dossier SDK `0.89.0.0/samples/samples.js` (protos) présent à la racine du projet.
 *
 * Usage :
 *   1) Lister les systèmes (sans identifiants) :
 *        npm run rithmic:smoke
 *   2) Lister + login Order Plant — identifiants Rithmic :
 *        Fichier à la racine du repo : `.env.local` (déjà ignoré par git) avec par ex. :
 *          RITHMIC_USER=...
 *          RITHMIC_PASSWORD=...
 *        Le script charge automatiquement les lignes `RITHMIC_*` depuis `.env.local`.
 *        Ou en PowerShell (session courante) :
 *          $env:RITHMIC_USER="..."; $env:RITHMIC_PASSWORD="..."; npm run rithmic:smoke
 *        Optionnel : RITHMIC_WSS_URL, RITHMIC_SYSTEM_NAME, RITHMIC_TEMPLATE_VERSION,
 *          RITHMIC_APP_NAME (RequestLogin.app_name — aligné conformité ; pour isoler un refus login,
 *          tester avec les mêmes valeurs que les samples officiels : app_name SampleMD.js, app_version 0.3.0.0),
 *          RITHMIC_APP_VERSION
 *
 * Rithmic indique : 1er socket → RequestRithmicSystemInfo (16), puis fermer ;
 * 2e socket → RequestLogin (10) avec infra_type = ORDER_PLANT (2).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

import WebSocket from "ws";
import protobuf from "protobufjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const PROTO_DIR = path.join(repoRoot, "0.89.0.0", "samples", "samples.js");

const DEFAULT_WSS = "wss://rituz00100.rithmic.com:443";
const DEFAULT_SYSTEM = "Rithmic Test";
const DEFAULT_TEMPLATE_VERSION = "3.9";

/** Charge `.env.local` pour les clés `RITHMIC_*` uniquement (sans écraser l’environnement déjà défini). */
function rithmicEnvAlreadySet(key) {
  const v = process.env[key];
  return v !== undefined && String(v).trim() !== "";
}

function loadRithmicEnvFromLocalEnvFile() {
  const envPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;
  let text = fs.readFileSync(envPath, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key.startsWith("RITHMIC_")) continue;
    // Laisser le fichier remplacer une variable vide (souvent héritée du shell sous Windows).
    if (rithmicEnvAlreadySet(key)) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function loadProtoEngine() {
  if (!fs.existsSync(path.join(PROTO_DIR, "base.proto"))) {
    die(
      `Protos introuvables dans :\n  ${PROTO_DIR}\n` +
        `Place le SDK Rithmic (dossier 0.89.0.0) à la racine du repo, ou ajuste PROTO_DIR dans ce script.`
    );
  }

  const root = new protobuf.Root();
  const files = [
    "base.proto",
    "request_rithmic_system_info.proto",
    "response_rithmic_system_info.proto",
    "request_login.proto",
    "response_login.proto",
  ];
  for (const f of files) {
    root.loadSync(path.join(PROTO_DIR, f));
  }
  return root;
}

function encodeMessage(root, typeName, payload) {
  const T = root.lookupType(typeName);
  const err = T.verify(payload);
  if (err) die(`Protobuf verify (${typeName}): ${err}`);
  const msg = T.create(payload);
  return Buffer.from(T.encode(msg).finish());
}

function onceMessage(ws, timeoutMs = 20_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeListener("message", onMessage);
      reject(new Error(`Aucun message reçu en ${timeoutMs} ms`));
    }, timeoutMs);
    function onMessage(data) {
      clearTimeout(timer);
      ws.removeListener("message", onMessage);
      resolve(data);
    }
    ws.on("message", onMessage);
  });
}

function connectWss(uri) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(uri, { rejectUnauthorized: false });
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

async function stepListSystems(root, uri) {
  console.log("\n--- Étape 1 : RequestRithmicSystemInfo (template 16) ---\n");
  const ws = await connectWss(uri);
  const buf = encodeMessage(root, "RequestRithmicSystemInfo", {
    templateId: 16,
    userMsg: ["hello"],
  });
  await ws.send(buf);
  const raw = await onceMessage(ws);
  const Res = root.lookupType("ResponseRithmicSystemInfo");
  const msg = Res.decode(raw);
  console.log("templateId:", msg.templateId);
  console.log("rpCode:", msg.rpCode?.join?.(" | ") ?? msg.rpCode);
  const names = msg.systemName;
  if (Array.isArray(names) && names.length) {
    console.log("system_name disponibles :");
    for (const n of names) console.log("  -", n);
  } else {
    console.log("system_name : (vide ou champ inattendu)", names);
  }
  await new Promise((r) => {
    ws.once("close", r);
    ws.close(1000, "after system info");
  });
  console.log("\nSocket 1 fermée (recommandé par Rithmic avant login).\n");
}

async function stepLoginOrderPlant(
  root,
  uri,
  { user, password, systemName, templateVersion, appName, appVersion }
) {
  console.log("--- Étape 2 : RequestLogin Order Plant (template 10) ---\n");
  const ws = await connectWss(uri);
  const RequestLogin = root.lookupType("RequestLogin");
  const ORDER_PLANT = RequestLogin.SysInfraType?.ORDER_PLANT ?? 2;

  const buf = encodeMessage(root, "RequestLogin", {
    templateId: 10,
    templateVersion,
    userMsg: ["hello"],
    user,
    password,
    appName,
    appVersion,
    systemName,
    infraType: ORDER_PLANT,
  });
  await ws.send(buf);
  const raw = await onceMessage(ws, 30_000);
  const Res = root.lookupType("ResponseLogin");
  const msg = Res.decode(raw);
  console.log("templateId:", msg.templateId);
  console.log("templateVersion:", msg.templateVersion ?? "(n/a)");
  console.log("userMsg:", msg.userMsg?.length ? msg.userMsg.join(" | ") : "(n/a)");
  console.log("rpCode:", msg.rpCode?.join?.(" | ") ?? msg.rpCode);
  if (msg.rpCode?.length === 1 && String(msg.rpCode[0]) === "0") {
    console.log("Login : OK");
    console.log("fcmId:", msg.fcmId ?? "(n/a)");
    console.log("ibId:", msg.ibId ?? "(n/a)");
    console.log("heartbeatInterval:", msg.heartbeatInterval ?? "(n/a)");
    console.log("uniqueUserId:", msg.uniqueUserId ?? "(n/a)");
  } else {
    console.log("Login : échec — vérifier identifiants, agreements R|Trader, system_name, template_version.");
  }
  await new Promise((r) => {
    ws.once("close", r);
    ws.close(1000, "after login");
  });
}

async function main() {
  loadRithmicEnvFromLocalEnvFile();

  const uri = process.env.RITHMIC_WSS_URL?.trim() || DEFAULT_WSS;
  const user = process.env.RITHMIC_USER?.trim();
  const password = process.env.RITHMIC_PASSWORD?.trim();
  const systemName = process.env.RITHMIC_SYSTEM_NAME?.trim() || DEFAULT_SYSTEM;
  const templateVersion = process.env.RITHMIC_TEMPLATE_VERSION?.trim() || DEFAULT_TEMPLATE_VERSION;
  const appName = process.env.RITHMIC_APP_NAME?.trim() || "MyTradeDesk";
  const appVersion = process.env.RITHMIC_APP_VERSION?.trim() || "0.1.0";

  console.log("Rithmic smoke —", uri);
  console.log("RequestLogin.app_name →", appName, "| app_version →", appVersion);
  const root = loadProtoEngine();

  await stepListSystems(root, uri);

  if (user && password) {
    await stepLoginOrderPlant(root, uri, {
      user,
      password,
      systemName,
      templateVersion,
      appName,
      appVersion,
    });
  } else {
    console.log(
      "Pas de RITHMIC_USER / RITHMIC_PASSWORD : arrêt après liste des systèmes.\n" +
        "Pour tester le login, exporte les deux variables puis relance npm run rithmic:smoke.\n"
    );
  }

  console.log("Terminé.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
