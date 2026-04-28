"use client";

import Image from "next/image";
import Link from "next/link";
import { LANDING_SECTION_BLEED } from "./landing-layout";
import { LANDING_MICRO } from "./tokens";

/** Premium low-emphasis nav — discrete default, clean hover (no underline noise). */
const footerNavLink = `${LANDING_MICRO} text-[13px] text-white/28 transition-colors duration-200 ease-out hover:text-white/65`;

/**
 * Compact Rithmic / OMNE attribution for the desk footer (development only).
 *
 * Production builds omit this block; attributions stay on dev/sandbox surfaces
 * where R | Protocol is exercised until broker integrations ship to prod.
 */
function RithmicFooterAttribution({ workspace }: { workspace: boolean }) {
  return (
    <div
      className={`${LANDING_SECTION_BLEED} border-t border-white/[0.05] ${
        workspace ? "py-3" : "py-5"
      }`}
      aria-label="Rithmic / OMNE attribution"
    >
      <div className={`flex flex-col items-center ${workspace ? "gap-2" : "gap-3"}`}>
        <div className={`flex flex-wrap items-center justify-center ${workspace ? "gap-4" : "gap-6"} opacity-90`}>
          <Image
            src="/rithmic-attribution/trading-platform-by-rithmic.png"
            alt="Trading Platform by Rithmic"
            width={220}
            height={48}
            className={
              workspace
                ? "h-7 w-auto max-w-[280px] object-contain"
                : "h-[2.8rem] w-auto max-w-[308px] object-contain sm:h-[3.15rem]"
            }
          />
          <Image
            src="/rithmic-attribution/powered-by-omne.png"
            alt="Powered by OMNE"
            width={160}
            height={48}
            className={
              workspace
                ? "h-5 w-auto max-w-[120px] object-contain"
                : "h-7 w-auto max-w-[160px] object-contain sm:h-8"
            }
          />
        </div>
        <div
          className={`space-y-1 text-center ${
            workspace ? "text-[10px] leading-snug text-white/30" : "text-[11px] leading-relaxed text-white/45"
          }`}
        >
          <p>
            The R | Protocol API™ software is Copyright © 2026 by Rithmic, LLC. All rights reserved.
          </p>
          <p>Trading Platform by Rithmic™ is a trademark of Rithmic, LLC. All rights reserved.</p>
          <p>
            The OMNE™ software is Copyright © 2026 by Omnesys, LLC and Omnesys Technologies, Inc. All rights reserved.
          </p>
          <p>
            Powered by OMNE™ is a trademark of Omnesys, LLC and Omnesys Technologies, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export function LandingFooter({ variant = "default" }: { variant?: "default" | "workspace" }) {
  const workspace = variant === "workspace";
  const showDeskRithmicAttribution = workspace && process.env.NODE_ENV !== "production";
  return (
    <footer className="relative w-full shrink-0 border-t border-white/[0.06] bg-[#05060a]">
      <div
        className={
          workspace
            ? `flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between ${LANDING_SECTION_BLEED}`
            : `flex flex-col gap-5 py-8 sm:flex-row sm:items-start sm:justify-between ${LANDING_SECTION_BLEED}`
        }
      >
        <div>
          <p className="text-base font-semibold tracking-tight text-white">MyTradeDesk</p>
          <p
            className={
              workspace
                ? "mt-0.5 max-w-sm text-xs leading-snug text-slate-400/80"
                : "mt-2 max-w-sm text-sm leading-relaxed text-slate-400/80"
            }
          >
            Know your numbers. Run your desk.
          </p>
        </div>
        <nav
          className="flex flex-wrap items-center gap-x-6 gap-y-1.5 sm:justify-end"
          aria-label="Footer"
        >
          <Link href="/compare" className={footerNavLink}>
            Compare
          </Link>
          <Link href="/terms" className={footerNavLink}>
            Terms
          </Link>
          <Link href="/privacy" className={footerNavLink}>
            Privacy
          </Link>
        </nav>
      </div>

      {showDeskRithmicAttribution ? <RithmicFooterAttribution workspace /> : null}

      <div
        className={
          workspace
            ? "border-t border-white/[0.05] px-4 py-3 text-center text-[11px] text-white/22"
            : "border-t border-white/[0.05] px-4 py-4 text-center text-xs text-white/22"
        }
      >
        <p>© {new Date().getFullYear()} MyTradeDesk</p>
        {workspace ? (
          <p className="mx-auto mt-2 max-w-xl text-[10px] leading-snug text-white/28">
            MyTradeDesk is an independent third-party application and is not affiliated with,
            endorsed by, or sponsored by Rithmic, LLC.
          </p>
        ) : null}
      </div>
    </footer>
  );
}
