import Image from "next/image";

/**
 * Commercial attribution when the app uses R | Protocol (Rithmic sandbox / connected flows).
 * R | API+ line omitted — we do not use RAPI+.
 */
export function RithmicAttributionBlock() {
  return (
    <aside className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-5 text-[11px] leading-relaxed text-white/65 sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400/90">
        Rithmic / OMNE attribution
      </p>
      <p>
        The R | Protocol API™ software is Copyright © 2026 by Rithmic, LLC. All rights reserved.
      </p>
      <p>Trading Platform by Rithmic™ is a trademark of Rithmic, LLC. All rights reserved.</p>
      <p>
        The OMNE™ software is Copyright © 2026 by Omnesys, LLC and Omnesys Technologies, Inc. All
        rights reserved.
      </p>
      <div className="flex flex-wrap items-center gap-6 pt-1">
        <Image
          src="/rithmic-attribution/trading-platform-by-rithmic.png"
          alt="Trading Platform by Rithmic"
          width={220}
          height={48}
          className="h-10 w-auto max-w-[min(100%,220px)] object-contain opacity-95"
        />
        <Image
          src="/rithmic-attribution/powered-by-omne.png"
          alt="Powered by OMNE"
          width={160}
          height={48}
          className="h-10 w-auto max-w-[min(100%,160px)] object-contain opacity-95"
        />
      </div>
      <p className="text-white/50">
        Powered by OMNE™ is a trademark of Omnesys, LLC and Omnesys Technologies, Inc. All rights
        reserved.
      </p>
    </aside>
  );
}
