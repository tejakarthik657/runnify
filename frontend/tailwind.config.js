/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#e60012',      // Nintendo Red
        secondary: '#f68d1f',    // Signal Orange
        signal: '#f68d1f',       // Signal Orange
        amber: '#ecab37',        // Amber Gold
        navGold: '#e48600',      // Nav Gold
        canvas: '#7a8aba',       // Periwinkle Metallic
        canvasSoft: '#9fbee7',   // Pale Sky
        sky: '#9fbee7',
        lavender: '#acace7',     // Pale Lavender
        ice: '#c0d5e6',          // Pale Ice
        periwinkle: '#8ba1d4',   // Light Periwinkle
        chromeIndigo: '#3d4f97', // Chrome Indigo
        mutedIndigo: '#60619c',  // Muted Indigo
        platinum: '#dedede',     // Platinum Gray
        carbon: '#21242e',       // Carbon Navy
        hairline: '#5a5f8c',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
