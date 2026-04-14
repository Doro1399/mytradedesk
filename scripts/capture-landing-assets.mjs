/**
 * Captures real MyTradeDesk UI into `public/landing/*.png`.
 *
 * Install browser once: `npx playwright install chromium`
 *
 * Recommended (fresh bundle + stable DOM hooks):
 *   npx next build && npx next start -p 3001
 *   set BASE_URL=http://127.0.0.1:3001&& npm run capture:landing
 *
 * `dev` on :3000 can lag behind disk edits; if selectors time out, use the flow above.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "landing");
const seedPath = path.join(__dirname, "landing-capture-seed.json");

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const JOURNAL_KEY = "prop-control-center:v1";

async function main() {
  const { chromium } = await import("playwright");
  if (!fs.existsSync(seedPath)) {
    console.error("Missing", seedPath);
    process.exit(1);
  }
  const seedJson = fs.readFileSync(seedPath, "utf8");
  JSON.parse(seedJson);

  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const shot = async (page, name, locatorSel, opts = {}) => {
    const filePath = path.join(outDir, `${name}.png`);
    const el = page.locator(locatorSel).first();
    await el.waitFor({ state: "attached", timeout: 45_000 });
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await el.screenshot({
      path: filePath,
      animations: "disabled",
      ...opts,
    });
    console.log("Wrote", path.relative(root, filePath));
  };

  try {
    const ctxCompare = await browser.newContext({
      viewport: { width: 1480, height: 960 },
      deviceScaleFactor: 1,
      colorScheme: "dark",
    });
    const pCompare = await ctxCompare.newPage();
    await pCompare.goto(`${BASE_URL}/compare`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await pCompare.waitForSelector("#compare-table", { timeout: 60_000 });
    await shot(pCompare, "compare-table", "#compare-table");
    await ctxCompare.close();

    const context = await browser.newContext({
      viewport: { width: 1480, height: 960 },
      deviceScaleFactor: 2,
      colorScheme: "dark",
    });
    const page = await context.newPage();
    page.on("pageerror", (err) => {
      console.error("pageerror:", err?.message ?? err);
    });

    await page.goto(`${BASE_URL}/journal`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.evaluate(
      ([key, value]) => {
        localStorage.setItem(key, value);
      },
      [JOURNAL_KEY, seedJson]
    );
    await page.reload({ waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector("#landing-capture-payout-ledger", {
      state: "attached",
      timeout: 60_000,
    });
    await shot(page, "payout-ledger", "#landing-capture-payout-ledger");
    await shot(page, "capital-snapshot", "#landing-capture-capital-snapshot");
    await shot(page, "firm-by-table", "#landing-capture-firm-table");

    await page.evaluate(
      ([key, value]) => {
        localStorage.setItem(key, value);
      },
      [JOURNAL_KEY, seedJson]
    );
    await page.goto(`${BASE_URL}/journal/progress`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForSelector("#landing-capture-progress", {
      state: "attached",
      timeout: 60_000,
    });
    await shot(page, "progress-mission-control", "#landing-capture-progress");
    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
