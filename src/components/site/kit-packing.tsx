import { LOGO_COLORS } from "./logo";

// A kit being packed, drawn from the logo: a backpack, a notebook and a
// pencil drop into a cardboard box, the flaps fold shut, the KitGap tag
// swings on by its twine and its hole fills forest. Shown while a new screen
// loads. Decorative: the label beside it is what screen readers hear, and
// with reduced motion it shows the packed box without moving.

const BOX = "#c99c62";
const BOX_DARK = "#a97e47";
const BOX_INSIDE = "#6f5333";
const NOTEBOOK = "#2f6f9f";

export function KitPacking({ label = "Packing your page", className = "" }: { label?: string; className?: string }) {
  const c = LOGO_COLORS;
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <svg viewBox="0 0 200 170" className="kit-packing w-56 sm:w-64" aria-hidden focusable="false">
        <ellipse cx="100" cy="156" rx="70" ry="7" fill="#1c2921" opacity="0.1" />

        {/* Opening of the box. */}
        <rect x="42" y="74" width="116" height="10" rx="2" fill={BOX_INSIDE} />

        {/* Flaps: open, then up, then folded down onto the top. */}
        <rect className="kp-flap kp-flap-l" x="42" y="50" width="57" height="32" rx="2" fill={BOX_DARK} />
        <rect className="kp-flap kp-flap-r" x="101" y="50" width="57" height="32" rx="2" fill={BOX_DARK} />

        {/* The items, in front of the flaps and behind the front, so they fall into the box. */}
        <g className="kp-drop kp-d1">
          <path d="M60 46c0-9 6-15 14-15s14 6 14 15v36H60z" fill={c.rust} />
          <path d="M66 46c0-6 3.5-9 8-9s8 3 8 9" fill="none" stroke="#7d3519" strokeWidth="3" />
          <rect x="64" y="58" width="20" height="12" rx="2.5" fill="#c2643f" />
        </g>
        <g className="kp-drop kp-d2">
          <rect x="94" y="34" width="26" height="48" rx="2.5" fill={NOTEBOOK} />
          <rect x="99" y="40" width="16" height="7" rx="1" fill={c.manila} />
          {[42, 52, 62, 72].map((y) => (
            <circle key={y} cx="94" cy={y} r="2" fill={c.manila} />
          ))}
        </g>
        <g className="kp-drop kp-d3">
          <rect x="128" y="26" width="9" height="50" rx="1.5" fill={c.marigold} />
          <path d="M128 76h9l-4.5 9z" fill="#f3d2a6" />
          <rect x="128" y="22" width="9" height="6" rx="1.5" fill="#e98d8d" />
        </g>

        {/* Front of the box. */}
        <rect x="38" y="80" width="124" height="72" rx="4" fill={BOX} />
        <rect x="38" y="80" width="124" height="8" rx="3" fill={BOX_DARK} />
        <rect className="kp-tape" x="88" y="80" width="24" height="9" fill="#e9d3ae" />
        <path d="M54 110h44M54 120h30" stroke={BOX_DARK} strokeWidth="4" strokeLinecap="round" />

        {/* The tag, hung from the box by its twine. */}
        <g className="kp-tag">
          <path d="M150 86C161 96 158 119 149 129" fill="none" stroke={c.rust} strokeWidth="2.4" strokeLinecap="round" />
          <g transform="translate(132 98) scale(1.75)">
            <path d="M4.2 9.2h15.2L28 17.6v8.2c0 1.1-.9 2-2 2H4.2c-1.1 0-2-.9-2-2V11.2c0-1.1.9-2 2-2z" fill={c.forest} />
            <circle cx="9.6" cy="17.8" r="3.3" fill={c.marigold} />
            <circle cx="9.6" cy="17.8" r="1.9" fill={c.kraft} />
            <circle className="kp-hole" cx="9.6" cy="17.8" r="1.9" fill={c.forest} />
            <rect x="14.6" y="14.4" width="10.2" height="8.6" rx="1" fill={c.manila} />
            <rect x="16.2" y="16.4" width="6.8" height="1.5" rx=".75" fill={c.rust} />
            <rect x="16.2" y="19.5" width="4.6" height="1.5" rx=".75" fill={c.sage} />
          </g>
        </g>
      </svg>
      <p className="text-sm font-semibold text-muted" role="status">
        {label}
        <span aria-hidden className="kp-dots" />
      </p>
    </div>
  );
}
