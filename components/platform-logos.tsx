import Image from "next/image";
import type { PlatformId } from "@/lib/platforms";
import { platformLabels, platformLogoSrc } from "@/lib/platforms";

type Props = {
  platforms: PlatformId[];
  size?: number;
  /** Tableau dense : logos plus petits. */
  compact?: boolean;
};

export function PlatformLogos({ platforms, size, compact }: Props) {
  const px = size ?? (compact ? 22 : 32);
  const box = compact ? "h-6 w-6" : "h-8 w-8";
  const imgClass = compact ? "h-[18px] w-[18px]" : "h-7 w-7";

  return (
    <div className={`flex flex-wrap items-center ${compact ? "gap-1" : "gap-1.5"}`}>
      {platforms.map((id) => {
        const src = platformLogoSrc[id];
        const label = platformLabels[id];
        return (
          <span
            key={id}
            title={label}
            className={`inline-flex ${box} shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/40 p-px`}
          >
            {src ? (
              <Image
                src={src}
                alt={label}
                width={px}
                height={px}
                className={`${imgClass} object-contain`}
              />
            ) : (
              <span className="px-0.5 text-center text-[7px] font-bold uppercase leading-tight tracking-tight text-white/65">
                {label.slice(0, 3)}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
