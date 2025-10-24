import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#5CA8FF",
          primary: "#52A2ED",
          light: "#A3CEFF"
        },
        dark03: "#04070A",
        dark09: "#13171C",
        panel: "#0E1218"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(92,168,255,.25), 0 10px 40px rgba(92,168,255,.18), inset 0 1px 0 rgba(255,255,255,.04)",
        soft: "0 10px 30px rgba(0,0,0,.35)"
      },
      borderRadius: {
        'xl2': '1.25rem',
        'xl3': '1.75rem'
      },
      backgroundImage: {
        'radial-mask': 'radial-gradient(1200px 600px at 50% -10%, rgba(92,168,255,.18), rgba(0,0,0,0))',
        'brand-grad': 'linear-gradient(90deg, #5CA8FF 0%, #52A2ED 100%)'
      }
    }
  },
  plugins: []
} satisfies Config;
