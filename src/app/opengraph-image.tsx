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
            "radial-gradient(ellipse at 12% 0%, rgba(15,118,110,0.14), transparent 50%), linear-gradient(180deg, #fafbfb 0%, #f4f6f5 55%, #eef2f0 100%)",
          color: "#14241c",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 650,
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
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              maxWidth: 880,
            }}
          >
            Run product, eng, design, and data on one floor — with AI that helps
            you decide and ship.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                background: "#0f766e",
                color: "white",
                fontSize: 20,
                fontWeight: 600,
                padding: "12px 22px",
                borderRadius: 8,
              }}
            >
              Get started
            </div>
            <div style={{ display: "flex", fontSize: 18, color: "#4d5c55" }}>
              Free to try · Open in under a minute
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
