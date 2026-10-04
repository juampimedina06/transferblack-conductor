/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        obsidian: "#0A0A0C",
        "obsidian-card": "#12131A",
        "obsidian-glass": "rgba(15, 16, 22, 0.88)",
        gold: "#D4AF37",
        "gold-light": "#F3E5AB",
        "gold-muted": "rgba(212, 175, 55, 0.15)",
        platinum: "#E4E4E5",
        ash: "#A1A1AA",
        "ash-muted": "#71717A",
        charcoal: "#27272A",
        "glass-border": "rgba(255, 255, 255, 0.12)",
        "glass-specular": "rgba(255, 255, 255, 0.28)",
      },
      fontFamily: {
        sans: ["Montserrat_400Regular"],
        montserrat: ["Montserrat_400Regular"],
        "montserrat-medium": ["Montserrat_500Medium"],
        "montserrat-semibold": ["Montserrat_600SemiBold"],
        "montserrat-bold": ["Montserrat_700Bold"],
      },
    },
  },
  plugins: [],
}
