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
          dark: '#070B14',
          panel: 'rgba(11, 18, 32, 0.85)',
          border: 'rgba(56, 189, 248, 0.2)',
          borderGlow: 'rgba(6, 182, 212, 0.5)',
          cyan: '#00F2FE',
          teal: '#06B6D4',
          amber: '#F59E0B',
          red: '#EF4444',
          rust: '#C1440E',
          dust: '#E07A5F'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'Courier New', 'monospace'],
        sans: ['Space Grotesk', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'cyan-glow': '0 0 20px -3px rgba(6, 182, 212, 0.35)',
        'amber-glow': '0 0 20px -3px rgba(245, 158, 11, 0.4)',
        'red-glow': '0 0 20px -3px rgba(239, 68, 68, 0.5)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' }
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      }
    },
  },
  plugins: [],
}
