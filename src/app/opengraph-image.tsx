import { ImageResponse } from "next/og";

export const alt = "elf — leave it to elf.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#F1EFE8",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: 96,
          paddingRight: 96,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              background: "#0F6E56",
              borderRadius: 22,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              paddingLeft: 20,
              gap: 8,
            }}
          >
            <div style={{ width: 56, height: 9, background: "#9FE1CB", borderRadius: 2 }} />
            <div style={{ width: 40, height: 9, background: "#9FE1CB", borderRadius: 2 }} />
            <div style={{ width: 56, height: 9, background: "#9FE1CB", borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 84, color: "#0F3D2B", fontWeight: 500, letterSpacing: -2 }}>
            elf
          </div>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 64,
            color: "#0F3D2B",
            fontWeight: 500,
            letterSpacing: -1.5,
            lineHeight: 1.05,
            maxWidth: 900,
          }}
        >
          Leave it to elf.
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 28,
            color: "#5F5E5A",
            lineHeight: 1.35,
            maxWidth: 880,
          }}
        >
          The cross-functional builder workspace where humans and AI agents ship together.
        </div>
      </div>
    ),
    { ...size }
  );
}
