/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F0E6',
        cream: '#FBF8F1',
        ink: '#14140F',
        'ink-soft': '#4A4A40',
        lime: '#C9F158',
        coral: '#FF5A2B',
        blue: '#3C5BFF',
        grape: '#7C5CFF',
        sky: '#BFD8FF',
        sand: '#E6DDC9',
        rose: '#FFB3C7',
        // admin console palette — aligned with the site's paper/brutal language
        admin: {
          bg: '#F4F0E6', // paper
          panel: '#FBF8F1', // cream
          soft: '#EFE7D7',
          line: '#D9CFB8',
          ink: '#14140F',
          muted: '#6B6255',
          red: '#FF5A2B', // coral
          teal: '#2E6B3F', // success
          amber: '#7A4B08', // warning text
          plum: '#5E45C9', // grape
          moss: '#4F6222',
          blue: '#3C5BFF',
          lime: '#C9F158',
          rose: '#E8859F',
          danger: '#9C3110',
          info: '#2C46D6',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        hand: ['Caveat', '"Noto Sans SC"', 'cursive'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'hard-xs': '1.5px 1.5px 0 0 #14140F',
        hard: '4px 4px 0 0 #14140F',
        'hard-sm': '2px 2px 0 0 #14140F',
        'hard-lg': '8px 8px 0 0 #14140F',
        soft: '0 18px 40px -24px rgba(20,20,15,0.45)',
        lift: '0 30px 60px -30px rgba(20,20,15,0.5)',
      },
      borderWidth: {
        1.5: '1.5px',
        3: '3px',
      },
      opacity: {
        8: '0.08',
        12: '0.12',
        15: '0.15',
        18: '0.18',
        35: '0.35',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        85: '0.85',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0) rotate(var(--tw-rotate,0deg))' },
          '50%': { transform: 'translateY(-8px) rotate(var(--tw-rotate,0deg))' },
        },
        bob: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        blink: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.15' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
      },
      animation: {
        marquee: 'marquee 26s linear infinite',
        float: 'float 6s ease-in-out infinite',
        bob: 'bob 2.4s ease-in-out infinite',
        'spin-slow': 'spinSlow 18s linear infinite',
        blink: 'blink 1.6s ease-in-out infinite',
        shimmer: 'shimmer 4s linear infinite',
        wiggle: 'wiggle 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
