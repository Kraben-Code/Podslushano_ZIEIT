import Link from "next/link";
import { AudioLines } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="Подслушано ЗІЕІТ — на головну" className="brand" href="/">
      <span className="brand-mark">
        <AudioLines aria-hidden="true" size={20} strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>подслушано</strong>
          <span>ЗІЕІТ · спільнота</span>
        </span>
      )}
    </Link>
  );
}
