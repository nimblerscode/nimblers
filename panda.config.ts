import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  /* --------------------------------------------------------------------------
   * BUILD SETUP
   * ------------------------------------------------------------------------*/
  preflight: true,
  include: [
    "./src/app/design-system/**/*.{ts,tsx,js,jsx}",
    "./src/app/components/**/*.{ts,tsx,js,jsx}",
    "./src/app/pages/**/*.{ts,tsx,js,jsx}",
    "./src/app/Document.tsx",
  ],
  exclude: [],

  /* --------------------------------------------------------------------------
   * 1. DESIGN‑TOKENS  – raw values only
   * ------------------------------------------------------------------------*/
  theme: {
    extend: {
      tokens: {
        colors: {
          brand: {
            50: { value: "#f8fafc" },
            100: { value: "#f1f5f9" },
            200: { value: "#e2e8f0" },
            300: { value: "#cbd5e1" },
            400: { value: "#94a3b8" },
            500: { value: "#64748b" },
            600: { value: "#475569" },
            700: { value: "#334155" },
            800: { value: "#1e293b" },
            900: { value: "#0f172a" },
          },

          /* Alias single‑value tokens so they can be scaled later if needed */
          success: { value: "#059669" },
          warning: { value: "#d97706" },
          danger: { value: "#dc2626" },
          accent: {
            50: { value: "#f0f4ff" },
            100: { value: "#e0e7ff" },
            200: { value: "#c7d2fe" },
            300: { value: "#a5b4fc" },
            400: { value: "#818cf8" },
            500: { value: "#6366f1" },
            600: { value: "#4f46e5" },
            700: { value: "#4338ca" },
            800: { value: "#3730a3" },
            900: { value: "#312e81" },
          },
        },

        fonts: {
          sans: { value: "Inter, system-ui, sans-serif" },
          heading: { value: "{fonts.sans}" },
        },
      },

      /* --------------------------------------------------------------------
       * 2. SEMANTIC‑TOKENS  – role‑based aliases
       *    Components should reference ONLY these names.
       * ------------------------------------------------------------------*/
      semanticTokens: {
        colors: {
          /* ---------- Layout ------------------------------------------------*/
          page: {
            background: { value: "{colors.gray.50}" },
            foreground: { value: "{colors.gray.900}" },
          },

          /* ---------- Surface -----------------------------------------------*/
          surface: {
            base: { value: "{colors.white}" },
            raised: { value: "{colors.white}" },
            overlay: { value: "{colors.white}" },
          },

          /* ---------- Content ----------------------------------------------*/
          content: {
            primary: { value: "{colors.gray.900}" },
            secondary: { value: "{colors.gray.600}" },
            subtle: { value: "{colors.gray.500}" },
            inverse: { value: "{colors.white}" },
          },

          /* ---------- Brand -------------------------------------------------*/
          brand: {
            solid: { value: "{colors.accent.600}" },
            solidHover: { value: "{colors.accent.700}" },
            onSolid: { value: "{colors.white}" },
            foreground: { value: "{colors.brand.600}" },
            background: { value: "{colors.brand.50}" },
            subtle: { value: "{colors.brand.100}" },
            border: { value: "{colors.brand.200}" },
          },

          /* ---------- Borders ----------------------------------------------*/
          border: {
            subtle: { value: "{colors.gray.100}" },
            default: { value: "{colors.gray.200}" },
            strong: { value: "{colors.gray.300}" },
            focus: { value: "{colors.accent.600}" },
          },

          /* ---------- Focus -------------------------------------------------*/
          focusRing: {
            default: { value: "{colors.accent.600}" },
            offset: { value: "{colors.accent.100}" },
          },

          /* ---------- Disabled ----------------------------------------------*/
          disabled: {
            foreground: { value: "{colors.gray.400}" },
            background: { value: "{colors.gray.100}" },
            border: { value: "{colors.gray.200}" },
          },

          /* ---------- Status / Intent --------------------------------------*/
          status: {
            success: {
              solid: { value: "{colors.success}" },
              solidHover: { value: "{colors.green.700}" },
              onSolid: { value: "{colors.white}" },
              background: { value: "{colors.green.50}" },
              border: { value: "{colors.green.200}" },
              icon: { value: "{colors.green.600}" },
              text: { value: "{colors.green.700}" },
            },
            warning: {
              solid: { value: "{colors.warning}" },
              solidHover: { value: "{colors.yellow.700}" },
              onSolid: { value: "{colors.black}" },
              background: { value: "{colors.yellow.50}" },
              border: { value: "{colors.yellow.200}" },
              icon: { value: "{colors.yellow.600}" },
              text: { value: "{colors.yellow.800}" },
            },
            danger: {
              solid: { value: "{colors.danger}" },
              solidHover: { value: "{colors.red.700}" },
              onSolid: { value: "{colors.white}" },
              background: { value: "{colors.red.50}" },
              border: { value: "{colors.red.200}" },
              icon: { value: "{colors.red.600}" },
              text: { value: "{colors.red.700}" },
            },
            info: {
              solid: { value: "{colors.accent.600}" },
              solidHover: { value: "{colors.accent.700}" },
              onSolid: { value: "{colors.white}" },
              background: { value: "{colors.accent.50}" },
              border: { value: "{colors.accent.200}" },
              icon: { value: "{colors.accent.600}" },
              text: { value: "{colors.accent.700}" },
            },
          },

          /* ---------- Links -------------------------------------------------*/
          link: {
            default: { value: "{colors.accent.600}" },
            hover: { value: "{colors.accent.700}" },
            visited: { value: "{colors.accent.800}" },
            subtle: { value: "{colors.accent.500}" },
          },
        },
      },
    },
  },

  /* --------------------------------------------------------------------------
   * 3. THEME VARIANTS  – override only what changes
   * ------------------------------------------------------------------------*/
  themes: {
    dark: {
      semanticTokens: {
        colors: {
          /* ---------- Layout ------------------------------------------------*/
          page: {
            background: { value: "{colors.gray.900}" },
            foreground: { value: "{colors.gray.100}" },
          },

          /* ---------- Surface -----------------------------------------------*/
          surface: {
            base: { value: "{colors.gray.800}" },
            raised: { value: "{colors.gray.800}" },
            overlay: { value: "{colors.gray.700}" },
          },

          /* ---------- Content ----------------------------------------------*/
          content: {
            primary: { value: "{colors.gray.100}" },
            secondary: { value: "{colors.gray.300}" },
            subtle: { value: "{colors.gray.400}" },
            inverse: { value: "{colors.gray.900}" },
          },

          /* ---------- Brand -------------------------------------------------*/
          brand: {
            solid: { value: "{colors.accent.500}" }, // Slightly lighter accent for dark mode
            solidHover: { value: "{colors.accent.600}" },
            onSolid: { value: "{colors.white}" },
            foreground: { value: "{colors.brand.300}" }, // Lighter brand text
            background: { value: "{colors.brand.900}" }, // Dark brand background
            subtle: { value: "{colors.brand.800}" },
            border: { value: "{colors.brand.700}" },
          },

          /* ---------- Borders ----------------------------------------------*/
          border: {
            subtle: { value: "{colors.gray.800}" },
            default: { value: "{colors.gray.700}" },
            strong: { value: "{colors.gray.600}" },
            focus: { value: "{colors.accent.500}" },
          },

          /* ---------- Focus -------------------------------------------------*/
          focusRing: {
            default: { value: "{colors.accent.500}" },
            offset: { value: "{colors.accent.900}" },
          },

          /* ---------- Disabled ----------------------------------------------*/
          disabled: {
            foreground: { value: "{colors.gray.500}" },
            background: { value: "{colors.gray.800}" },
            border: { value: "{colors.gray.700}" },
          },

          /* ---------- Status / Intent --------------------------------------*/
          status: {
            success: {
              solid: { value: "{colors.green.500}" },
              solidHover: { value: "{colors.green.600}" },
              onSolid: { value: "{colors.white}" },
              background: { value: "{colors.green.900}" },
              border: { value: "{colors.green.700}" },
              icon: { value: "{colors.green.400}" },
              text: { value: "{colors.green.300}" },
            },
            warning: {
              solid: { value: "{colors.yellow.500}" },
              solidHover: { value: "{colors.yellow.600}" },
              onSolid: { value: "{colors.black}" },
              background: { value: "{colors.yellow.900}" },
              border: { value: "{colors.yellow.700}" },
              icon: { value: "{colors.yellow.400}" },
              text: { value: "{colors.yellow.300}" },
            },
            danger: {
              solid: { value: "{colors.red.500}" },
              solidHover: { value: "{colors.red.600}" },
              onSolid: { value: "{colors.white}" },
              background: { value: "{colors.red.900}" },
              border: { value: "{colors.red.700}" },
              icon: { value: "{colors.red.400}" },
              text: { value: "{colors.red.300}" },
            },
            info: {
              solid: { value: "{colors.accent.500}" },
              solidHover: { value: "{colors.accent.600}" },
              onSolid: { value: "{colors.white}" },
              background: { value: "{colors.accent.900}" },
              border: { value: "{colors.accent.700}" },
              icon: { value: "{colors.accent.400}" },
              text: { value: "{colors.accent.300}" },
            },
          },

          /* ---------- Links -------------------------------------------------*/
          link: {
            default: { value: "{colors.accent.400}" },
            hover: { value: "{colors.accent.300}" },
            visited: { value: "{colors.accent.500}" },
            subtle: { value: "{colors.accent.500}" },
          },
        },
      },
    },

    artisanEarth: {
      tokens: {
        colors: {
          brand: {
            50: { value: "#f4efe9" },
            100: { value: "#e7d8c9" },
            200: { value: "#d9bea7" },
            300: { value: "#cba485" },
            400: { value: "#bd8a63" },
            500: { value: "#a2704a" },
            600: { value: "#8a5c39" },
            700: { value: "#724728" },
            800: { value: "#5a3418" },
            900: { value: "#41220b" },
          },
          gray: {
            50: { value: "#faf7f4" },
            100: { value: "#efe9e2" },
            900: { value: "#2b1d12" },
          },
        },
      },

      semanticTokens: {
        colors: {
          page: {
            background: { value: "{colors.gray.50}" },
            foreground: { value: "{colors.gray.900}" },
          },
          brand: {
            solid: { value: "{colors.brand.600}" },
            solidHover: { value: "{colors.brand.700}" },
            onSolid: { value: "{colors.white}" },
          },
          /* Artisan‑specific status overrides (optional) */
          status: {
            danger: {
              solid: { value: "#b91c1c" },
              solidHover: { value: "#991b1b" },
              background: { value: "#fef2f2" },
              border: { value: "#fecaca" },
              icon: { value: "#b91c1c" },
              text: { value: "#7f1d1d" },
            },
          },
          link: {
            default: { value: "{colors.brand.600}" },
            hover: { value: "{colors.brand.700}" },
          },
        },
      },
    },
  },

  /* --------------------------------------------------------------------------
   * 4. BUILD OUTPUT
   * ------------------------------------------------------------------------*/
  staticCss: {
    themes: ["dark", "artisanEarth"],
  },

  outdir: "styled-system",
  jsxFramework: "react",
});
