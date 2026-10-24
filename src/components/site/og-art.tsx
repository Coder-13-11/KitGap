// Shared pieces for the social share images (rendered by next/og, which
// supports a subset of CSS: flexbox only, inline styles).

import type { ReactNode } from "react";

export const OG_SIZE = { width: 1200, height: 630 };

const FOREST = "#234d3b";
const KRAFT = "#f1e6d6";
const MANILA = "#fbf6ec";
const INK = "#1c2921";

export function OgMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="6" fill={FOREST} />
      <path d="M6.2 8.4h13.4L26.2 15.4v8.4c0 .9-.7 1.6-1.6 1.6H6.2c-.9 0-1.6-.7-1.6-1.6V10c0-.9.7-1.6 1.6-1.6z" fill={MANILA} />
      <circle cx="11.2" cy="16.2" r="2.3" fill={FOREST} />
    </svg>
  );
}

export function OgFrame({ children, footer }: { children: ReactNode; footer: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: KRAFT, padding: 64, color: INK }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <OgMark />
        <div style={{ fontSize: 40, fontWeight: 700, color: FOREST }}>KitGap</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>{children}</div>
      <div style={{ display: "flex", fontSize: 26, color: "#4a534e" }}>{footer}</div>
    </div>
  );
}

// Confirmed in solid forest, promised-but-not-confirmed in promised green.
export function OgBar({ confirmed, promised, max }: { confirmed: number; promised: number; max: number }) {
  const pct = (n: number) => `${max > 0 ? Math.round(Math.max(0, Math.min(1, n / max)) * 100) : 0}%`;
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: 32,
        borderRadius: "3px 10px 10px 3px",
        background: "#e6d7c2",
        overflow: "hidden",
        border: "1px solid #6f6556",
      }}
    >
      <div style={{ display: "flex", width: pct(confirmed), height: "100%", background: FOREST }} />
      <div style={{ display: "flex", width: pct(Math.max(0, promised - confirmed)), height: "100%", background: "#45705c" }} />
    </div>
  );
}
