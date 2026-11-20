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
            "radial-gradient(ellipse at 0% 0%, rgba(214,255,58,0.4), transparent 50%), linear-gradient(160deg, #f4f7f2 0%, #e8eee9 50%, #dfe8e3 100%)",
          color: "#0b1220",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 700,
              letterSpacing: "-0.05em",
              lineHeight: 1,
            }}
          >
            Consol
          </div>
          <div
            style={{
              display: "flex",
              width: 128,
              height: 10,
              background: "#d6ff3a",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: 36,
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
              color: "#3f4f4a",
              maxWidth: 720,
              lineHeight: 1.35,
            }}
          >
            Product · Build · Design · Data — sharing one board.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
