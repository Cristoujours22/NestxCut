/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NESTXCUT Design System
        surface: {
          DEFAULT: '#131313',
          dim: '#131313',
          bright: '#393939',
          'container-lowest': '#0e0e0e',
          'container-low': '#1c1b1b',
          'container': '#201f1f',
          'container-high': '#2a2a2a',
          'container-highest': '#353534',
        },
        primary: {
          DEFAULT: '#a5e7ff',
          container: '#00d2ff',
          fixed: '#b6ebff',
          fixedDim: '#47d6ff',
        },
        secondary: {
          DEFAULT: '#c8c6c5',
          container: '#474746',
          fixed: '#e5e2e1',
          fixedDim: '#c8c6c5',
        },
        on: {
          surface: '#e5e2e1',
          'surface-variant': '#bbc9cf',
          primary: '#003543',
          'primary-container': '#00566a',
          secondary: '#303030',
          'secondary-container': '#b7b5b4',
        },
        outline: {
          DEFAULT: '#859399',
          variant: '#3c494e',
        },
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
      }
    },
  },
  plugins: [],
}