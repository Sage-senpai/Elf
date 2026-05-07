import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // Theme switch is driven by a `class="dark"` on <html>, set by ThemeScript
  // before hydration to avoid a flash. See src/components/theme/*.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // All elf colors flip in dark mode via the CSS variables defined
        // in globals.css. Brand greens (forest/deep/mid/mint) get lighter,
        // neutrals (warm-white/ink/muted/border) invert. The `on-brand`
        // token is special — it stays cream in BOTH modes, used as text
        // on green/dark colored buttons that don't change with the theme.
        elf: {
          forest: "var(--elf-forest)",
          deep: "var(--elf-deep)",
          mid: "var(--elf-mid)",
          mint: "var(--elf-mint)",
          "warm-white": "var(--elf-warm-white)",
          ink: "var(--elf-ink)",
          muted: "var(--elf-muted)",
          border: "var(--elf-border)",
          "border-mid": "var(--elf-border-mid)",
          "on-brand": "var(--elf-on-brand)"
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
