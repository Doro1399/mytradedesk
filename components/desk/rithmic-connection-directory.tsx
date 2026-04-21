/**
 * Per Rithmic commercial conformance (Kashyap): show Rithmic Test + gateways now;
 * placeholders for other deployments until the final list is sent after attribution.
 */
export function RithmicConnectionDirectory() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 text-sm text-white/70">
      <h2 className="text-base font-semibold text-white/90">Rithmic connections (listing)</h2>
      <p className="mt-3 max-w-3xl text-xs leading-relaxed text-white/50">
        For connection purposes, Rithmic indicated that the definitive choices will be sent once
        attribution is complete. Until then, the app should show{" "}
        <strong className="text-white/70">Rithmic Test and its gateways</strong>, with placeholders
        for additional deployments and their worldwide gateways.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-amber-200/90">Rithmic Test</h3>
          <p className="mt-1 text-xs text-white/45">System name for Protocol login: Rithmic Test</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs text-white/60">
            <li>
              <span className="text-white/55">Gateway (SDK / dev default):</span>{" "}
              <code className="text-amber-200/85">wss://rituz00100.rithmic.com:443</code>
            </li>
            <li>
              <span className="text-white/55">Additional worldwide gateways:</span> placeholder — to
              be filled from Rithmic after attribution.
            </li>
          </ul>
        </div>

        <PlaceholderBlock title='Rithmic 01' />
        <PlaceholderBlock title="Rithmic 04 Colo" />
        <PlaceholderBlock title="Rithmic Paper Trading" />
      </div>

      <p className="mt-6 text-[11px] leading-relaxed text-white/40">
        Quantower or other platforms may show paper servers (e.g. regional names) that are not the
        same URI as the Protocol sample gateway above. When Rithmic sends the official Paper /
        Protocol mapping, wire it here and in env config.
      </p>
    </section>
  );
}

function PlaceholderBlock({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-3">
      <h3 className="text-sm font-medium text-white/55">{title}</h3>
      <p className="mt-1 text-xs text-white/40">
        Worldwide gateway URI(s): <em className="text-white/45">TBD</em> — placeholder until
        Rithmic provides the list post-attribution.
      </p>
    </div>
  );
}
