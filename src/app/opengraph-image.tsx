import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#fafafa",
          background:
            "radial-gradient(ellipse at 80% 0%, rgba(99,102,241,0.45), transparent 55%), radial-gradient(ellipse at 10% 100%, rgba(139,92,246,0.25), transparent 50%), #09090b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 5,
              background: "linear-gradient(135deg, #818cf8, #7c3aed)",
            }}
          />
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>{site.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.02,
              letterSpacing: -3,
              fontWeight: 600,
              maxWidth: 980,
            }}
          >
            The AI product factory for cross-functional teams
          </div>
          <div style={{ fontSize: 30, color: "#a1a1aa", maxWidth: 900 }}>
            Product, engineering, design, and data — one workspace, with AI
            teammates in the loop.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
