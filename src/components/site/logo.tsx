// The KitGap mark: a shipping tag with a punched hole. Kraft shows through
// the hole; the body is packing forest. Confirmed receipt fills that hole
// in progress meters — see RequestProgress.
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <path
        d="M4.2 7.2h15.2L28 16.2v9.6c0 1.1-.9 2-2 2H4.2c-1.1 0-2-.9-2-2V9.2c0-1.1.9-2 2-2z"
        fill="#234d3b"
      />
      <circle cx="10" cy="16.2" r="2.7" fill="#f1e6d6" />
      <path d="M15.2 13.4h9.2v5.6h-9.2z" fill="#fbf6ec" />
    </svg>
  );
}
