// Usage: npx tsx scripts/make-icons.tsx
// Draws the KitGap mark into the PNG app icons in public/icons, used by the
// web app manifest (installable app) and the native shells.
import { writeFileSync } from "node:fs";
import { ImageResponse } from "next/og";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path d="M9.6 15.6C7 12.6 5.4 8 7.4 4.6c1.2-2 3.6-1.8 4.1.4" fill="none" stroke="#a64b2a" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M4.2 9.2h15.2L28 17.6v8.2c0 1.1-.9 2-2 2H4.2c-1.1 0-2-.9-2-2V11.2c0-1.1.9-2 2-2z" fill="#234d3b"/>
  <circle cx="9.6" cy="17.8" r="3.3" fill="#e0a43a"/>
  <circle cx="9.6" cy="17.8" r="1.9" fill="#f1e6d6"/>
  <rect x="14.6" y="14.4" width="10.2" height="8.6" rx="1" fill="#fbf6ec"/>
  <rect x="16.2" y="16.4" width="6.8" height="1.5" rx=".75" fill="#a64b2a"/>
  <rect x="16.2" y="19.5" width="4.6" height="1.5" rx=".75" fill="#7fa58f"/>
</svg>`;
const src = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

// "any" icons fill most of the tile; "maskable" ones keep the mark inside the
// central 60% so Android's circle or squircle crop never cuts it.
async function draw(size: number, scale: number, rounded: boolean, file: string) {
  const mark = Math.round(size * scale);
  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f1e6d6",
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og into a PNG, not a page */}
        <img src={src} width={mark} height={mark} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
  writeFileSync(file, Buffer.from(await image.arrayBuffer()));
  console.log("wrote", file);
}

async function main() {
  await draw(192, 0.82, false, "public/icons/icon-192.png");
  await draw(512, 0.82, false, "public/icons/icon-512.png");
  await draw(512, 0.6, false, "public/icons/icon-maskable-512.png");
  await draw(1024, 0.6, false, "public/icons/icon-1024.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
