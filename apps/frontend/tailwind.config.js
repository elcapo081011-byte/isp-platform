/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        base: '#0B1016',
        surface: '#12181F',
        'surface-raised': '#171F28',
        border: '#232B35',
        muted: '#7C8792',
        ink: '#E7ECF1',
        signal: {
          DEFAULT: 'var(--signal, #1FB6A6)',
          dim: 'var(--signal-dim, #164F49)',
        },
        warn: '#E8A23D',
        critical: '#E1554F',
        ok: '#39B76B',
      },
    },
  },
  plugins: [],
}
