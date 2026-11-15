/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mars: {
          dark: '#080608',
          surface: '#181114',
          rust: '#bf360c',
          glow: '#ff5722',
          sand: '#d77a4a',
          cyan: '#00e5ff',
          hazard: '#ff1744'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
