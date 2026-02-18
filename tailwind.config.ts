import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        // Admin-specific colors (theme-aware)
        admin: {
          "bg-primary": "var(--admin-bg-primary)",
          "bg-secondary": "var(--admin-bg-secondary)",
          "bg-tertiary": "var(--admin-bg-tertiary)",
          "border-primary": "var(--admin-border-primary)",
          "border-secondary": "var(--admin-border-secondary)",
          "text-primary": "var(--admin-text-primary)",
          "text-secondary": "var(--admin-text-secondary)",
          "text-tertiary": "var(--admin-text-tertiary)",
          "text-on-dark": "var(--admin-text-on-dark)",
          "accent-primary": "var(--admin-accent-primary)",
          "accent-secondary": "var(--admin-accent-secondary)",
          "accent-tertiary": "var(--admin-accent-tertiary)",
          success: "var(--admin-success)",
          warning: "var(--admin-warning)",
          error: "var(--admin-error)",
          info: "var(--admin-info)",
        },
        // Premium Background Colors
        "bg-light": "var(--color-bg-light)",
        "bg-lighter": "var(--color-bg-lighter)",
        "bg-cream": "var(--color-bg-cream)",
        // Premium Text Colors
        "text-primary": "var(--color-text-primary)",
        "text-inverse": "var(--color-text-inverse)",

        // Dynamic Line Theme Colors (use CSS variables)
        line: {
          primary: "var(--line-primary)",
          secondary: "var(--line-secondary)",
          accent: "var(--line-accent)",
          light: "var(--line-light)",
          lightest: "var(--line-lightest)",
        },

        // Product Line Colors - Alma Terra
        alma: {
          primary: "var(--alma-primary)",
          secondary: "var(--alma-secondary)",
          accent: "var(--alma-accent)",
          light: "var(--alma-light)",
          lightest: "var(--alma-lightest)",
        },
        // Product Line Colors - Ecos
        ecos: {
          primary: "var(--ecos-primary)",
          secondary: "var(--ecos-secondary)",
          accent: "var(--ecos-accent)",
          light: "var(--ecos-light)",
          lightest: "var(--ecos-lightest)",
        },
        // Product Line Colors - Jade Ritual
        jade: {
          primary: "var(--jade-primary)",
          secondary: "var(--jade-secondary)",
          accent: "var(--jade-accent)",
          light: "var(--jade-light)",
          lightest: "var(--jade-lightest)",
        },
        // Product Line Colors - Umbral
        umbral: {
          primary: "var(--umbral-primary)",
          secondary: "var(--umbral-secondary)",
          accent: "var(--umbral-accent)",
          light: "var(--umbral-light)",
          lightest: "var(--umbral-lightest)",
        },
        // Product Line Colors - Utópica
        utopica: {
          primary: "var(--utopica-primary)",
          secondary: "var(--utopica-secondary)",
          accent: "var(--utopica-accent)",
          light: "var(--utopica-light)",
          lightest: "var(--utopica-lightest)",
        },
        // Epoch Design System
        epoch: {
          primary: "#2C3E33",
          accent: "#C4B28C",
          background: "#EAE8DD",
          surface: "#1A1A1A",
          "surface-light": "#F5F4EF",
          "surface-dark": "#262626",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        arch: "100px 100px 0 0",
        oval: "50%",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Premium Custom Animations
        "premium-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "premium-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "premium-shimmer": {
          "0%": { backgroundPosition: "-200px 0" },
          "100%": { backgroundPosition: "200px 0" },
        },
        // Enhanced React Bits Compatible Animations
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(-50px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.8)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(50px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": {
            transform: "translateX(100%)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Premium Animations
        "premium-float": "premium-float 3s ease-in-out infinite",
        "premium-pulse": "premium-pulse 2s ease-in-out infinite",
        "premium-shimmer": "premium-shimmer 2s infinite",
        // Enhanced React Bits Animations
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "slide-in-right": "slide-in-right 0.6s ease-out",
        "scale-in": "scale-in 0.6s ease-out",
        "slide-in-left": "slide-in-left 0.6s ease-out",
        "fade-in-down": "fade-in-down 0.6s ease-out",
      },
      fontFamily: {
        // Epoch Fonts
        display: ["var(--font-cinzel)", "serif"],
        serif: ["var(--font-playfair)", "serif"],
        body: ["var(--font-lato)", "sans-serif"],

        // Opttius Font Hierarchy
        title: ["var(--font-title)", "VELISTA", "serif"],
        subtitle: ["var(--font-subtitle)", "Inter", "sans-serif"],
        text: ["var(--font-text)", "Inter", "sans-serif"],
        caption: ["var(--font-caption)", "Inter", "sans-serif"],

        // LEGACY SUPPORT (existing)
        heading: ["var(--font-heading)", "Inter", "sans-serif"],
        sans: ["var(--font-body)", "Inter", "sans-serif"],
        // Cormorant Garamond: reemplazo de Malisha, elegante y sobrio para títulos alternativos
        cormorant: ["var(--font-cormorant)", "Cormorant Garamond", "serif"],
        velista: ["var(--font-velista)", "VELISTA", "serif"],
      },
      fontSize: {
        // Enhanced Typography Scale using CSS variables
        xs: "var(--text-xs)" /* 12px */,
        sm: "var(--text-sm)" /* 14px */,
        base: "var(--text-base)" /* 16px */,
        lg: "var(--text-lg)" /* 18px */,
        xl: "var(--text-xl)" /* 20px */,
        "2xl": "var(--text-2xl)" /* 24px */,
        "3xl": "var(--text-3xl)" /* 30px */,
        "4xl": "var(--text-4xl)" /* 36px */,
        "5xl": "var(--text-5xl)" /* 48px */,
        "6xl": "3.75rem" /* 60px */,
        "7xl": "4.5rem" /* 72px */,
        "8xl": "6rem" /* 96px */,
        "9xl": "8rem" /* 128px */,
      },
      spacing: {
        // Enhanced Spacing System using CSS variables
        "1": "var(--space-1)" /* 4px */,
        "2": "var(--space-2)" /* 8px */,
        "3": "var(--space-3)" /* 12px */,
        "4": "var(--space-4)" /* 16px */,
        "6": "var(--space-6)" /* 24px */,
        "8": "var(--space-8)" /* 32px */,
        "12": "var(--space-12)" /* 48px */,
        "16": "var(--space-16)" /* 64px */,
        "24": "var(--space-24)" /* 96px */,
        // Additional spacing utilities
        "18": "4.5rem" /* 72px */,
        "20": "5rem" /* 80px */,
        "32": "8rem" /* 128px */,
        "40": "10rem" /* 160px */,
        "48": "12rem" /* 192px */,
        "56": "14rem" /* 224px */,
        "64": "16rem" /* 256px */,
        "72": "18rem" /* 288px */,
        "80": "20rem" /* 320px */,
        "88": "22rem" /* 352px */,
        "96": "24rem" /* 384px */,
        "128": "32rem" /* 512px */,
      },
      backgroundImage: {
        // Premium Gradient System
        "premium-gradient":
          "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
        "line-gradient":
          "linear-gradient(135deg, var(--line-primary) 0%, var(--line-secondary) 100%)",

        // Product Line Gradients
        "alma-gradient":
          "linear-gradient(135deg, var(--alma-primary) 0%, var(--alma-accent) 100%)",
        "ecos-gradient":
          "linear-gradient(135deg, var(--ecos-primary) 0%, var(--ecos-accent) 100%)",
        "jade-gradient":
          "linear-gradient(135deg, var(--jade-primary) 0%, var(--jade-accent) 100%)",
        "umbral-gradient":
          "linear-gradient(135deg, var(--umbral-primary) 0%, var(--umbral-accent) 100%)",
        "utopica-gradient":
          "linear-gradient(135deg, var(--utopica-primary) 0%, var(--utopica-accent) 100%)",

        // Enhanced Background Patterns
        "hero-pattern":
          "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
        "card-pattern":
          "linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.05) 75%)",
      },
      boxShadow: {
        // Premium Shadow System
        premium: "0 8px 25px rgba(174, 0, 0, 0.15)",
        "premium-lg": "0 20px 40px rgba(174, 0, 0, 0.2)",
        "premium-xl": "0 25px 50px rgba(174, 0, 0, 0.25)",

        // Dynamic Line Shadows
        line: "0 8px 25px var(--line-primary)",
        "line-lg": "0 20px 40px var(--line-primary)",

        // Product Line Shadows
        alma: "0 8px 25px rgba(155, 32, 26, 0.15)",
        ecos: "0 8px 25px rgba(18, 64, 111, 0.15)",
        jade: "0 8px 25px rgba(4, 65, 45, 0.15)",
        umbral: "0 8px 25px rgba(234, 79, 18, 0.15)",
        utopica: "0 8px 25px rgba(57, 46, 19, 0.15)",

        // Enhanced Generic Shadows
        soft: "0 2px 10px rgba(0, 0, 0, 0.08)",
        medium: "0 4px 20px rgba(0, 0, 0, 0.12)",
        strong: "0 8px 30px rgba(0, 0, 0, 0.16)",
        "inner-soft": "inset 0 2px 4px rgba(0, 0, 0, 0.06)",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        "3xl": "40px",
      },
      transitionTimingFunction: {
        "in-expo": "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
        "in-out-expo": "cubic-bezier(0.87, 0, 0.13, 1)",
        premium: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
        "400": "400ms",
        "450": "450ms",
        "600": "600ms",
        "800": "800ms",
        "900": "900ms",
        "1200": "1200ms",
      },
      lineHeight: {
        relaxed: "1.6",
        loose: "1.8",
        "extra-loose": "2.0",
      },
      letterSpacing: {
        tighter: "-0.02em",
        tight: "-0.01em",
        normal: "0",
        wide: "0.01em",
        wider: "0.02em",
        widest: "0.04em",
      },
      zIndex: {
        dropdown: "1000",
        sticky: "1020",
        fixed: "1030",
        "modal-backdrop": "1040",
        modal: "1050",
        popover: "1060",
        tooltip: "1070",
        toast: "1080",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Custom DA LUZ Plugin for enhanced utilities
    function ({ addUtilities, theme }: any) {
      const lineColors = theme("colors.line");
      const newUtilities = {
        // Line Theme Utilities
        ".bg-line-primary": {
          backgroundColor: "var(--line-primary)",
        },
        ".bg-line-secondary": {
          backgroundColor: "var(--line-secondary)",
        },
        ".bg-line-accent": {
          backgroundColor: "var(--line-accent)",
        },
        ".bg-line-light": {
          backgroundColor: "var(--line-light)",
        },
        ".bg-line-lightest": {
          backgroundColor: "var(--line-lightest)",
        },
        ".text-line-primary": {
          color: "var(--line-primary)",
        },
        ".text-line-secondary": {
          color: "var(--line-secondary)",
        },
        ".text-line-accent": {
          color: "var(--line-accent)",
        },
        ".border-line-primary": {
          borderColor: "var(--line-primary)",
        },
        ".border-line-secondary": {
          borderColor: "var(--line-secondary)",
        },
        ".border-line-accent": {
          borderColor: "var(--line-accent)",
        },
        // Enhanced Typography Utilities
        ".text-heading": {
          fontFamily: "var(--font-heading)",
        },
        ".text-body": {
          fontFamily: "var(--font-body)",
        },
        // Premium Animation Utilities
        ".animate-premium-float": {
          animation: "premium-float 3s ease-in-out infinite",
        },
        ".animate-premium-pulse": {
          animation: "premium-pulse 2s ease-in-out infinite",
        },
        ".animate-premium-shimmer": {
          animation: "premium-shimmer 2s infinite",
        },
        // Premium Spacing Utilities
        ".space-premium > * + *": {
          marginTop: "var(--space-4)",
        },
        ".space-premium-lg > * + *": {
          marginTop: "var(--space-8)",
        },
        ".space-premium-xl > * + *": {
          marginTop: "var(--space-12)",
        },
      };

      addUtilities(newUtilities, ["responsive", "hover"]);
    },
  ],
} satisfies Config;

export default config;
