import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        elf: {
          forest: "#0F3D2B",
          deep: "#0F6E56",
          mid: "#1D9E75",
          mint: "#9FE1CB",
          "warm-white": "#F1EFE8",
          ink: "#2C2C2A",
          muted: "#5F5E5A",
          border: "#D3D1C7",
          "border-mid": "#B4B2A9"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      },
      borderRadius: {
        card: "12px",
        input: "8px",
        button: "8px",
        badge: "20px"
      },
      borderWidth: {
        hair: "0.5px"
      },
      spacing: {
        // 4px base grid is already Tailwind default; expose semantic tokens
        gutter: "24px"
      },
      maxWidth: {
        prose: "68ch",
        shell: "1280px"
      }
    }
  },
  plugins: []
};

export default config;
