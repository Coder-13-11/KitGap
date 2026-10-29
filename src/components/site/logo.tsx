// The KitGap logo: a shipping tag with a label and a loop of string.

export const LOGO_COLORS = {
  forest: "#234d3b",
  manila: "#fbf6ec",
  kraft: "#f1e6d6",
  rust: "#a64b2a",
  marigold: "#e0a43a",
  sage: "#7fa58f",
};

export function LogoMark({ className = "size-7" }: { className?: string }) {
  const c = LOGO_COLORS;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      {/* Twine looping out of the hole. */}
      <path d="M9.6 15.6C7 12.6 5.4 8 7.4 4.6c1.2-2 3.6-1.8 4.1.4" fill="none" stroke={c.rust} strokeWidth="1.7" strokeLinecap="round" />
      {/* Tag body. */}
      <path d="M4.2 9.2h15.2L28 17.6v8.2c0 1.1-.9 2-2 2H4.2c-1.1 0-2-.9-2-2V11.2c0-1.1.9-2 2-2z" fill={c.forest} />
      {/* Eyelet and hole. */}
      <circle cx="9.6" cy="17.8" r="3.3" fill={c.marigold} />
      <circle cx="9.6" cy="17.8" r="1.9" fill={c.kraft} />
      {/* Label with two item lines. */}
      <rect x="14.6" y="14.4" width="10.2" height="8.6" rx="1" fill={c.manila} />
      <rect x="16.2" y="16.4" width="6.8" height="1.5" rx=".75" fill={c.rust} />
      <rect x="16.2" y="19.5" width="4.6" height="1.5" rx=".75" fill={c.sage} />
    </svg>
  );
}
