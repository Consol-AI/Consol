import { ImageResponse } from "next/og";

export const alt = "Consol — Product factory for cross-functional teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "radial-gradient(ellipse at 12% 0%, rgba(15,118,110,0.10), transparent 50%), linear-gradient(180deg, #f7f8fa 0%, #f4f5f7 55%, #eef1f4 100%)",
          color: "#111827",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: "-0.045em",
            lineHeight: 1,
          }}
        >
          Consol
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: 38,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              maxWidth: 860,
            }}
          >
            Every team&apos;s lifecycle on one floor — with AI in the loop.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#6b7280",
              maxWidth: 720,
              lineHeight: 1.35,
            }}
          >
            Product, engineering, design, and data — sharing one board.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
