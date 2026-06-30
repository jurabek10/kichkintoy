/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Concrete values (NativeWind reads these directly — no CSS variables on
      // native). Names mirror the web app so screens read the same.
      colors: {
        background: '#F2F3F5',
        card: '#FFFFFF',
        border: '#EFEFF1',
        foreground: '#2B2D31',
        muted: '#8A8F99',
        'muted-soft': '#AEB4BE',
        primary: '#3B8FF3',
        'header-blue': '#54A7F7',
        daycare: '#5B6BD6',
        'new-badge': '#FF5A4D',
        pill: '#F1F2F4',
        segment: '#E7E9ED',
        // Candy accents (match web token names): DEFAULT = soft bg, ink = icon.
        coral: { DEFAULT: '#FFE8E2', ink: '#E8674E' },
        sky: { DEFAULT: '#E1F0FF', ink: '#3E8FE0' },
        grape: { DEFAULT: '#EEE6FF', ink: '#7C5CD8' },
        mint: { DEFAULT: '#DDF3E4', ink: '#46B06A' },
        sunshine: { DEFAULT: '#FFF1CF', ink: '#F4A621' },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
    },
  },
  plugins: [],
};
