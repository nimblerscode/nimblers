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
            50: { value: "#eef7ff" },
            100: { value: "#cfe7ff" },
            200: { value: "#a0d0ff" },
            300: { value: "#70b8ff" },
            400: { value: "#3d9eff" },
            500: { value: "#0077ff" },
            600: { value: "#0069e0" },
            700: { value: "#005ac0" },
            800: { value: "#00419a" },
            900: { value: "#002a66" },
          },

          /* Alias single‑value tokens so they can be scaled later if needed */
          success: { value: "#059669" },
          warning: { value: "#d97706" },
          danger: { value: "#dc2626" },
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
            background: { value: "{colors.gray.100}" },
            foreground: { value: "{colors.gray.800}" },
          },

          /* ---------- Content ----------------------------------------------*/
          content: {
            primary: { value: "{colors.gray.800}" },
            secondary: { value: "{colors.gray.600}" },
            subtle: { value: "{colors.gray.500}" },
            inverse: { value: "{colors.white}" },
          },

          /* ---------- Brand -------------------------------------------------*/
          brand: {
            solid: { value: "{colors.brand.600}" },
            solidHover: { value: "{colors.brand.700}" },
            onSolid: { value: "{colors.white}" },
            foreground: { value: "{colors.white}" },
            background: { value: "{colors.brand.50}" },
          },

          /* ---------- Borders ----------------------------------------------*/
          border: {
            subtle: { value: "{colors.gray.100}" },
            default: { value: "{colors.gray.200}" },
            strong: { value: "{colors.gray.400}" },
            focus: { value: "{colors.brand.600}" },
          },

          /* ---------- Focus -------------------------------------------------*/
          focusRing: {
            default: { value: "{colors.brand.600}" },
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
              subtleBg: { value: "{colors.green.50}" },
              border: { value: "{colors.green.200}" },
              icon: { value: "{colors.green.600}" },
              text: { value: "{colors.green.700}" },
            },
            warning: {
              solid: { value: "{colors.warning}" },
              solidHover: { value: "{colors.yellow.700}" },
              onSolid: { value: "{colors.black}" },
              subtleBg: { value: "{colors.yellow.50}" },
              border: { value: "{colors.yellow.200}" },
              icon: { value: "{colors.yellow.600}" },
              text: { value: "{colors.yellow.800}" },
            },
            danger: {
              solid: { value: "{colors.danger}" },
              solidHover: { value: "{colors.red.700}" },
              onSolid: { value: "{colors.white}" },
              subtleBg: { value: "{colors.red.50}" },
              border: { value: "{colors.red.200}" },
              icon: { value: "{colors.red.600}" },
              text: { value: "{colors.red.700}" },
            },
            info: {
              solid: { value: "{colors.blue.600}" },
              solidHover: { value: "{colors.blue.700}" },
              onSolid: { value: "{colors.white}" },
              subtleBg: { value: "{colors.blue.50}" },
              border: { value: "{colors.blue.200}" },
            },
          },

          /* ---------- Links -------------------------------------------------*/
          link: {
            default: { value: "{colors.brand.600}" },
            hover: { value: "{colors.brand.700}" },
            visited: { value: "{colors.brand.800}" },
          },
        },
      },
    },
  },

  /* --------------------------------------------------------------------------
   * 3. THEME VARIANTS  – override only what changes
   * ------------------------------------------------------------------------*/
  themes: {
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
              subtleBg: { value: "#fef2f2" },
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
    themes: ["artisanEarth"],
  },

  outdir: "styled-system",
  jsxFramework: "react",
});
