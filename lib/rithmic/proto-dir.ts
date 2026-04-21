import fs from "node:fs";
import path from "node:path";

/** SDK protos shipped under `0.89.0.0/samples/samples.js` (often gitignored locally). */
export function rithmicProtoSamplesDir(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "0.89.0.0", "samples", "samples.js");
}

export function rithmicProtosPresent(): boolean {
  return fs.existsSync(path.join(rithmicProtoSamplesDir(), "base.proto"));
}
