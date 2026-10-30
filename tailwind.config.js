/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // 所有颜色都指向主题令牌（RGB 三值 + alpha），换主题即换整站配色。
      // 令牌定义见 src/index.css 的 [data-theme='xx'] 块。
      colors: {
        paper: 'rgb(var(--c-bg) / <alpha-value>)',
        cream: 'rgb(var(--c-surface) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)',
        mute: 'rgb(var(--c-ink-mute) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        lime: 'rgb(var(--c-lime) / <alpha-value>)',
        coral: 'rgb(var(--c-coral) / <alpha-value>)',
        blue: 'rgb(var(--c-blue) / <alpha-value>)',
        grape: 'rgb(var(--c-grape) / <alpha-value>)',
        sky: 'rgb(var(--c-sky) / <alpha-value>)',
        sand: 'rgb(var(--c-surface-2) / <alpha-value>)',
        rose: 'rgb(var(--c-rose) / <alpha-value>)',
        // admin console palette — 与前台共用同一套令牌
        admin: {
          bg: 'rgb(var(--c-bg) / <alpha-value>)',
          panel: 'rgb(var(--c-surface) / <alpha-value>)',
          soft: 'rgb(var(--c-surface-2) / <alpha-value>)',
          line: 'rgb(var(--c-line) / <alpha-value>)',
          ink: 'rgb(var(--c-ink) / <alpha-value>)',
          muted: 'rgb(var(--c-ink-mute) / <alpha-value>)',
          red: 'rgb(var(--c-coral) / <alpha-value>)',
          teal: 'rgb(var(--c-teal) / <alpha-value>)',
          amber: 'rgb(var(--c-amber) / <alpha-value>)',
          plum: 'rgb(var(--c-plum) / <alpha-value>)',
          moss: 'rgb(var(--c-moss) / <alpha-value>)',
          blue: 'rgb(var(--c-blue) / <alpha-value>)',
          lime: 'rgb(var(--c-lime) / <alpha-value>)',
          rose: 'rgb(var(--c-rose) / <alpha-value>)',
          danger: 'rgb(var(--c-danger) / <alpha-value>)',
          info: 'rgb(var(--c-info) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: 'var(--ff-display)',
        sans: 'var(--ff-body)',
        hand: ['Caveat', '"Noto Sans SC"', 'cursive'],
        mono: 'var(--ff-mono)',
      },
      boxShadow: {
        'hard-xs': 'var(--sh-hard-sm)',
        hard: 'var(--sh-hard)',
        'hard-sm': 'var(--sh-hard-sm)',
        'hard-lg': 'var(--sh-hard-lg)',
        soft: 'var(--sh-soft)',
        lift: 'var(--sh-lift)',
      },
      borderWidth: {
        1.5: 'var(--bw)',
        3: 'var(--bw-strong)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        DEFAULT: 'var(--r-md)',
        md: 'var(--r-sm)',
        lg: 'var(--r-md)',
        xl: 'var(--r-md)',
        '2xl': 'var(--r-lg)',
        '3xl': 'var(--r-xl)',
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
