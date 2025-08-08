/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'cream': {
          50: '#fefdf8',
          100: '#fdf9f0',
        },
        'amber': {
          25: '#fffef7',
        },
        'orange': {
          25: '#fffdf7',
        }
      }
    },
  },
  plugins: [],
};
