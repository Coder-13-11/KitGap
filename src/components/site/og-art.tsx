// Shared pieces for the social share images (rendered by next/og, which
// supports a subset of CSS: flexbox only, inline styles).

import type { ReactNode } from "react";

export const OG_SIZE = { width: 1200, height: 630 };

const FOREST = "#234d3b";
const KRAFT = "#f1e6d6";
const MANILA = "#fbf6ec";
const INK = "#1c2921";

export function OgMark({ size = 56 }: { size?: number }) {
  // Same drawing as LogoMark, on a kraft tile.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill={KRAFT} />
      <path d="M9.6 15.6C7 12.6 5.4 8 7.4 4.6c1.2-2 3.6-1.8 4.1.4" fill="none" stroke="#a64b2a" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4.2 9.2h15.2L28 17.6v8.2c0 1.1-.9 2-2 2H4.2c-1.1 0-2-.9-2-2V11.2c0-1.1.9-2 2-2z" fill={FOREST} />
      <circle cx="9.6" cy="17.8" r="3.3" fill="#e0a43a" />
      <circle cx="9.6" cy="17.8" r="1.9" fill={KRAFT} />
      <rect x="14.6" y="14.4" width="10.2" height="8.6" rx="1" fill={MANILA} />
      <rect x="16.2" y="16.4" width="6.8" height="1.5" rx="0.75" fill="#a64b2a" />
      <rect x="16.2" y="19.5" width="4.6" height="1.5" rx="0.75" fill="#7fa58f" />
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

// A square post for Instagram, Facebook or a group chat: who needs what, how
// far along it is, and a QR code to the page. Plain words, big type, so it
// reads at phone size.
export function PostCard({
  orgName,
  title,
  headline,
  detail,
  confirmed,
  promised,
  target,
  qr,
}: {
  orgName: string;
  title: string;
  headline: string;
  detail: string;
  confirmed: number;
  promised: number;
  target: number;
  qr: string;
}) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: KRAFT, padding: 72, color: INK }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <OgMark size={64} />
        <div style={{ fontSize: 40, fontWeight: 700, color: FOREST }}>KitGap</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <div style={{ display: "flex", fontSize: 34, color: "#4a534e" }}>{orgName} needs</div>
        <div style={{ display: "flex", fontSize: headline.length > 28 ? 76 : 92, fontWeight: 700, lineHeight: 1.05, marginTop: 8 }}>
          {headline}
        </div>
        <div style={{ display: "flex", fontSize: 34, marginTop: 16, color: INK }}>{title}</div>
        <div style={{ display: "flex", marginTop: 40 }}>
          <OgBar confirmed={confirmed} promised={promised} max={target} />
        </div>
        <div style={{ display: "flex", fontSize: 30, marginTop: 14, color: "#4a534e" }}>{detail}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 32, maxWidth: 640 }}>
          <div style={{ display: "flex", fontWeight: 700, color: FOREST }}>Scan to help</div>
          <div style={{ display: "flex", color: "#4a534e" }}>Bring only what&apos;s on the list.</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered into a PNG by next/og */}
        <img src={qr} width={220} height={220} alt="" style={{ borderRadius: 12, background: MANILA, padding: 10 }} />
      </div>
    </div>
  );
}
