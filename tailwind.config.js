/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        obsidian: "#0A0A0C",
        gold: "#D4AF37",
        platinum: "#E4E4E5",
        ash: "#8E8E93",
        charcoal: "#2C2C2E",
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
