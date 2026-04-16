export type CsvBrokerExportKind =
  | "generic"
  | "rithmic"
  | "ninjatrader"
  | "tradovate"
  | "topstepx";

/**
 * TopStepX : paires d’ExecutePrice (1ʳᵉ / 2ᵉ exécution), ou open/close sur une ligne, ou ExecutePrice + action.
 */
export type TopStepCsvLayout =
  | {
      mode: "openClose";
      contractIdx: number;
      sizeIdx: number;
      sideIdx: number | null;
      openPriceIdx: number;
      closePriceIdx: number;
    }
  | {
      mode: "executeFifo";
      contractIdx: number;
      sizeIdx: number;
      sideIdx: number | null;
      executePriceIdx: number;
      actionIdx: number;
    }
  | {
      mode: "executePair";
      contractIdx: number;
      sizeIdx: number;
      sideIdx: number | null;
      executePriceIdx: number;
    };

function normHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'");
}

function headerSet(headers: string[]): Set<string> {
  return new Set(headers.map((h) => normHeader(h)));
}

function has(h: Set<string>, re: RegExp): boolean {
  for (const x of h) {
    if (re.test(x)) return true;
  }
  return false;
}

function findColIndex(headers: string[], pred: (norm: string) => boolean): number {
  for (let i = 0; i < headers.length; i++) {
    if (pred(normHeader(headers[i]!))) return i;
  }
  return -1;
}

export function pickTopStepLayout(headers: string[]): TopStepCsvLayout | null {
  const sizeIdx = findColIndex(
    headers,
    (n) =>
      n === "size" ||
      n === "quantity" ||
      n === "qty" ||
      n === "filled" ||
      n === "contracts" ||
      n === "fill qty" ||
      n === "filled qty" ||
      n === "order qty"
  );
  const executePriceIdx = findColIndex(
    headers,
    (n) =>
      n === "executeprice" ||
      n === "execute price" ||
      n === "execution price" ||
      n === "avg execute price" ||
      n === "fill price" ||
      n === "avg fill price"
  );
  if (sizeIdx < 0 || executePriceIdx < 0) return null;

  const contractLooseIdx = findColIndex(
    headers,
    (n) =>
      n === "contractname" ||
      n === "contract name" ||
      /^contract$/i.test(n) ||
      n === "instrument" ||
      n === "symbol" ||
      n === "product"
  );
  if (contractLooseIdx < 0) return null;

  const sideIdx = findColIndex(
    headers,
    (n) =>
      n === "side" ||
      n === "b/s" ||
      n === "market side" ||
      n === "market pos." ||
      n === "market pos" ||
      /^buy\s*\/\s*sell$/i.test(n)
  );
  const sideOrNull = sideIdx >= 0 ? sideIdx : null;

  const openPriceIdx = findColIndex(headers, (n) => {
    if (n.includes("profit")) return false;
    return (
      n === "entry price" ||
      n === "avg entry" ||
      n === "opening price" ||
      n === "open price" ||
      n === "opening" ||
      (n.includes("open") && n.includes("price") && !n.includes("profit"))
    );
  });
  const closePriceIdx = findColIndex(headers, (n) => {
    if (n.includes("profit")) return false;
    return (
      n === "exit price" ||
      n === "avg exit" ||
      n === "closing price" ||
      n === "close price" ||
      (n === "closing" && !n.includes("time")) ||
      (n.includes("close") && n.includes("price") && !n.includes("time"))
    );
  });
  const hasOpenClose =
    openPriceIdx >= 0 && closePriceIdx >= 0 && openPriceIdx !== closePriceIdx;

  const actionIdx = findColIndex(
    headers,
    (n) =>
      n === "action" ||
      n === "open/close" ||
      n === "open close" ||
      n === "oc" ||
      n === "execution type" ||
      n === "fill type" ||
      (n.includes("open") && n.includes("close") && n !== "executeprice")
  );
  const hasExecuteAction = actionIdx >= 0 && actionIdx !== executePriceIdx;

  if (hasOpenClose) {
    return {
      mode: "openClose",
      contractIdx: contractLooseIdx,
      sizeIdx,
      sideIdx: sideOrNull,
      openPriceIdx,
      closePriceIdx,
    };
  }
  if (hasExecuteAction) {
    return {
      mode: "executeFifo",
      contractIdx: contractLooseIdx,
      sizeIdx,
      sideIdx: sideOrNull,
      executePriceIdx,
      actionIdx,
    };
  }

  return {
    mode: "executePair",
    contractIdx: contractLooseIdx,
    sizeIdx,
    sideIdx: sideOrNull,
    executePriceIdx,
  };
}

/** Headers that match `Templates csv export trades` reference exports (first row). */
export function detectCsvBrokerExportKind(headers: string[]): CsvBrokerExportKind {
  const h = headerSet(headers);

  if (h.has("_ticksize") || h.has("buyfillid") || h.has("sellfillid")) {
    return "tradovate";
  }
  if (has(h, /^connection name$/) && (has(h, /^net p\/l$/) || has(h, /^net p&l$/) || h.has("net p/l"))) {
    return "rithmic";
  }
  if (
    has(h, /^trade number$/) &&
    (h.has("instrument") || has(h, /^instrument$/)) &&
    has(h, /^profit(\s+currency)?$/) &&
    has(h, /^commission/)
  ) {
    return "ninjatrader";
  }

  if (pickTopStepLayout(headers)) return "topstepx";

  return "generic";
}

export function slashDateOrderForBroker(kind: CsvBrokerExportKind): "mdy" | "dmy" {
  if (kind === "tradovate" || kind === "topstepx") return "mdy";
  if (kind === "rithmic" || kind === "ninjatrader") return "dmy";
  return "mdy";
}
