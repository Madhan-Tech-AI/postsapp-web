/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design tokens for PostsApp
        primary: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#0f172a',
        },
        muted: '#64748b',
      },
      fontFamily: {
        sans: ['var(--font-noto-sans)', 'var(--font-noto-sans-tamil)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-noto-serif)', 'var(--font-noto-serif-tamil)', 'Georgia', 'serif'],
        tamil: ['var(--font-noto-sans-tamil)', 'var(--font-noto-serif-tamil)', 'sans-serif'],
      },
      lineHeight: {
        // Tamil script needs more line height
        'tamil': '2',
        'tamil-tight': '1.75',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      }),
    },
  },
  plugins: [],
}
