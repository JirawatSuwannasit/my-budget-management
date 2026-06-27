import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17201c",
        muted: "#60716a",
        canvas: "#f6f8f7",
        surface: "#ffffff",
        primary: "#087f8c",
        success: "#12805c",
        warning: "#b7791f",
        danger: "#b84a62",
        cardpay: "#ad6a00"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 32, 28, 0.08)",
        card: "0 8px 26px rgba(23, 32, 28, 0.045)"
      },
      borderRadius: {
        panel: "18px"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Arial", "Noto Sans Thai", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
