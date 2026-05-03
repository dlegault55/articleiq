/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        xbox: {
          DEFAULT: '#107C10',
          light: '#15A015',
          dark: '#0A5A0A',
          glow: '#107C1060',
        },
        surface: {
          0: '#080A08',
          1: '#0D110D',
          2: '#121812',
          3: '#181F18',
          4: '#1E271E',
        },
        border: {
          DEFAULT: '#1E2B1E',
          bright: '#2A3D2A',
        },
      },
      fontFamily: {
        display: ['"Rajdhani"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 8px #107C1040',
        'glow': '0 0 20px #107C1050',
        'glow-lg': '0 0 40px #107C1060',
        'glow-xl': '0 0 60px #107C1070',
        'card': '0 1px 0 rgba(16,124,16,0.15), 0 4px 24px rgba(0,0,0,0.5)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px #107C1040' },
          '50%': { boxShadow: '0 0 24px #107C1070' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
