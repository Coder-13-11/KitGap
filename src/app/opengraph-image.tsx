import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/components/site/og-art";

export const alt = "KitGap: turn a community need into a drive";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame footer="Organizations post exact needs. Groups collect them. Only confirmed deliveries count.">
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 980 }}>
          Turn a community need into a drive.
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
          {["1 backpack", "2 notebooks", "1 pencil pack"].map((item) => (
            <div
              key={item}
              style={{ display: "flex", fontSize: 30, padding: "12px 24px", borderRadius: 999, border: "2px solid #234d3b", color: "#234d3b" }}
            >
              {item}
            </div>
          ))}
          <div style={{ display: "flex", fontSize: 30, padding: "12px 0", color: "#5b625e" }}>= one kit</div>
        </div>
      </OgFrame>
    ),
    size,
  );
}
