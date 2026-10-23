// The KitGap mark: an open kit box with one gap in its row of items.
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <rect x="3" y="11" width="26" height="17" rx="2.5" fill="#234d3b" />
      <path d="M3 13.5 7 6h18l4 7.5" fill="none" stroke="#234d3b" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="7.5" y="15" width="4" height="9" rx="1" fill="#f8f7f3" />
      <rect x="14" y="15" width="4" height="9" rx="1" fill="none" stroke="#f8f7f3" strokeWidth="1.4" strokeDasharray="2 1.6" />
      <rect x="20.5" y="15" width="4" height="9" rx="1" fill="#f8f7f3" />
    </svg>
  );
}
