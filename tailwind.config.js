/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        deep: '#030508',
        dark: '#06080d',
        card: 'rgba(10, 14, 24, 0.75)',
        'card-hover': 'rgba(14, 20, 36, 0.9)',
        cyan: '#00f0ff',
        purple: '#a855f7',
        pink: '#ff006e',
        green: '#00ff88',
        orange: '#ff8a00',
        blue: '#3b82f6',
        text: '#e8eaf0',
        'text-dim': '#8a94b0',
        'text-muted': '#5a6480',
        border: 'rgba(0, 240, 255, 0.08)',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.3)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
        'glow-pink': '0 0 20px rgba(255, 0, 110, 0.3)',
      },
      animation: {
        'grad-shift': 'gradShift 5s ease infinite',
        'pulse-dot': 'pulse 2s infinite',
        'blink': 'blink 1s step-end infinite',
        'scroll-down': 'scrollDown 2s ease-in-out infinite',
        'border-rotate': 'borderRotate 4s linear infinite',
        'loader-spin': 'loaderSpin 2s linear infinite',
        'loader-dash': 'loaderDash 2s ease-in-out infinite',
      },
      keyframes: {
        gradShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.3 },
        },
        blink: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 },
        },
        scrollDown: {
          '0%': { top: '-40px' },
          '100%': { top: '40px' },
        },
        borderRotate: {
          to: { transform: 'rotate(360deg)' },
        },
        loaderSpin: {
          to: { transform: 'rotate(360deg)' },
        },
        loaderDash: {
          '0%': { strokeDashoffset: 280 },
          '50%': { strokeDashoffset: 80 },
          '100%': { strokeDashoffset: 280 },
        },
      },
    },
  },
  plugins: [],
};
