/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ambigo: {
          950: "#06050f",
          900: "#0d0b1e",
          800: "#17142e",
          700: "#231f42",
          600: "#312b58",
          500: "#4a3f7f",
          400: "#6b5ea8",
          300: "#9b8dd4",
          200: "#c8bfec",
          100: "#ede9f8",
        },
        alert: {
          red: "#ff4757",
          amber: "#ffa502",
          green: "#2ed573",
          blue: "#1e90ff",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "bounce-subtle": "bounceSubtle 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
