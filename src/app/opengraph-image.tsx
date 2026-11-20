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
            "radial-gradient(ellipse at 15% 0%, rgba(15,118,110,0.10), transparent 50%), linear-gradient(180deg, #fbfbfc 0%, #f6f7f8 60%, #eef1f3 100%)",
          color: "#111827",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 650,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          Consol
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              maxWidth: 820,
            }}
          >
            Every team&apos;s lifecycle on one floor — with AI in the loop.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#4b5563",
              maxWidth: 700,
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
