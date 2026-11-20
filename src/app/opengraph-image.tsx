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
            "radial-gradient(ellipse at 20% 20%, #1a7a5c55, transparent 45%), radial-gradient(ellipse at 85% 10%, #2a9b7440, transparent 40%), linear-gradient(155deg, #071410 0%, #12352c 55%, #0a1f18 100%)",
          color: "#e8eef0",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          Consol
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              maxWidth: 900,
            }}
          >
            The product factory where every lifecycle shares one floor.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: "#9cb8ae",
              maxWidth: 780,
              lineHeight: 1.35,
            }}
          >
            Product, engineering, design, and data — with AI in the loop.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
