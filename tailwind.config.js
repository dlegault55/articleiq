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
        },
      },
      fontFamily: {
        sans:    ['"Inter"', 'sans-serif'],
        display: ['"Inter"', 'sans-serif'],
        mono:    ['"Fira Code"', 'monospace'],
        body:    ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 8px rgba(16,124,16,0.25)',
        'glow':    '0 0 20px rgba(16,124,16,0.3)',
        'glow-lg': '0 0 40px rgba(16,124,16,0.35)',
        'card':    '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
        'card-dark': '0 1px 0 rgba(16,124,16,0.1), 0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in':  'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-in':  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-glow': { '0%,100%': { boxShadow: '0 0 8px rgba(16,124,16,0.25)' }, '50%': { boxShadow: '0 0 24px rgba(16,124,16,0.5)' } },
      },
    },
  },
  plugins: [],
}
