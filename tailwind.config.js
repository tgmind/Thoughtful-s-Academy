/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Institute brand — deep navy + saffron accent
        brand: {
          50:  "#fffbeb",
          100: "#fef3c7",
          400: "#f59e0b",   // saffron accent
          600: "#d97706",
          900: "#78350f",
        },
        navy: {
          50:  "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d7ff",
          300: "#a5bbff",
          600: "#3b4cca",
          700: "#2d3a9e",
          800: "#1e2771",
          900: "#111755",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "sans-serif"],
      },
      animation: {
        "slide-in-right": "slideInRight 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        slideInRight: {
          from: { transform: "translateX(100%)", opacity: 0 },
          to:   { transform: "translateX(0)",    opacity: 1 },
        },
        fadeIn: {
          from: { opacity: 0, transform: "translateY(4px)" },
          to:   { opacity: 1, transform: "translateY(0)"   },
        },
        pulseSoft: {
          "0%, 100%": { opacity: 1   },
          "50%":      { opacity: 0.6 },
        },
      },
    },
  },
  plugins: [],
}
