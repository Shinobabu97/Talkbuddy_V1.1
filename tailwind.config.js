/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Elingo Design System Colors
        elingo: {
          purple: '#6949ff', // Primary purple
          dark: '#181a20', // Dark background
          gray: '#bdbdbd', // Gray text
          lightGray: '#f5f5f5', // Light background
          yellow: '#ffc107', // Yellow accent
        },
        background: {
          DEFAULT: '#f5f5f5', // Elingo light background
          light: '#FFFFFF', // White cards
          muted: '#f5f5f5',
          dark: '#181a20', // Dark theme
        },
        text: {
          DEFAULT: '#000000', // Black text
          muted: '#bdbdbd', // Gray text
          light: '#FFFFFF',
          dark: '#181a20',
        },
        primary: {
          DEFAULT: '#6949ff', // Elingo purple primary
          50: '#f3f0ff',
          100: '#e8e0ff',
          200: '#d1c2ff',
          300: '#baa3ff',
          400: '#a385ff',
          500: '#6949ff',
          600: '#5a3de6',
          700: '#4b31cc',
          800: '#3c25b3',
          900: '#2d1999',
        },
        accent: {
          DEFAULT: '#ffc107', // Yellow accent
          50: '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#ffc107',
          600: '#ffb300',
          700: '#ffa000',
          800: '#ff8f00',
          900: '#ff6f00',
        },
        success: {
          DEFAULT: '#10b981',
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        warning: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        gray: {
          50: '#f9f9f9',
          100: '#f1f1f1',
          200: '#e5e5e5',
          300: '#C4C4C4', // Figma gray
          400: '#9e9e9e',
          500: '#757575',
          600: '#616161',
          700: '#424242',
          800: '#212121',
          900: '#000000',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        display: ['Nunito', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },
      borderRadius: {
        'elingo-button': '100px', // Fully rounded buttons (Elingo style)
        'elingo-card': '32px', // Card border radius
        'figma': '14px',
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'figma-card': '0px 0px 1px rgba(0, 0, 0, 0.04), 0px 2px 6px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.06)',
        'figma-hero': '0px 26.4px 54.7px rgba(0, 0, 0, 0.23), 0px 234px 437px rgba(0, 0, 0, 0.115)',
        'figma-outline': '0px 0px 1px rgba(0, 0, 0, 0.04)',
        'figma-close': '0px 2px 6px rgba(0, 0, 0, 0.04)',
        'figma-deep': '0px 16px 24px rgba(0, 0, 0, 0.06)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'ease-in-out': 'ease-in-out',
      },
    },
  },
  plugins: [],
};
