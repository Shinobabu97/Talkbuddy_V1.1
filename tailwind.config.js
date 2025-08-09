/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Custom palette from the image
        'rose-dust': {
          50: '#faf7f6',
          100: '#f5efed',
          200: '#ebd9d4',
          300: '#e0c3bb',
          400: '#d6a99d', // Main rose dust color
          500: '#c8958a',
          600: '#b8827a',
          700: '#a06b63',
          800: '#85574f',
          900: '#6d4741',
        },
        'cream-light': {
          50: '#fefefe',
          100: '#fdfcfa',
          200: '#fbf3d5', // Main cream light color
          300: '#f8ead0',
          400: '#f5e1cb',
          500: '#f2d8c6',
          600: '#efcfc1',
          700: '#ecc6bc',
          800: '#e9bdb7',
          900: '#e6b4b2',
        },
        'sage-light': {
          50: '#f8f9f8',
          100: '#f1f3f1',
          200: '#e4e7e4',
          300: '#d6dac8', // Main sage light color
          400: '#c8cdb6',
          500: '#bac0a4',
          600: '#acb392',
          700: '#9ea680',
          800: '#90996e',
          900: '#828c5c',
        },
        'sage-dark': {
          50: '#f6f7f6',
          100: '#edeeed',
          200: '#dbdddb',
          300: '#c9ccc9',
          400: '#b7bbb7',
          500: '#a5aaa5',
          600: '#9cafaa', // Main sage dark color
          700: '#8a9e95',
          800: '#788d80',
          900: '#667c6b',
        }
      }
    },
  },
  plugins: [],
};