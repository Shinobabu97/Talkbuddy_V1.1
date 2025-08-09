/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'slate': {
          25: '#fafafa',
          50: '#f8fafc',
          75: '#f1f5f9',
          850: '#1e293b',
          925: '#0f172a',
        },
        'blue': {
          25: '#f0f9ff',
          75: '#e0f2fe',
          850: '#1e3a8a',
          925: '#1e40af',
        },
        'indigo': {
          25: '#f0f4ff',
          75: '#e0e7ff',
          850: '#3730a3',
          925: '#312e81',
        },
        'purple': {
          25: '#faf5ff',
          75: '#f3e8ff',
          850: '#6b21a8',
          925: '#581c87',
        },
        'cyan': {
          25: '#ecfeff',
          75: '#cffafe',
          850: '#155e75',
          925: '#164e63',
        }
      },
      backgroundImage: {
        'gradient-professional': 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #667eea 50%, #764ba2 75%, #667eea 100%)',
        'gradient-cool': 'linear-gradient(135deg, #74b9ff 0%, #0984e3 25%, #6c5ce7 50%, #a29bfe 75%, #74b9ff 100%)',
        'gradient-warm-hero': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 25%, #fecfef 50%, #ff9a9e 75%, #fecfef 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
        'gradient-header': 'linear-gradient(135deg, rgba(116,185,255,0.95) 0%, rgba(105,92,231,0.95) 100%)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-lg': '0 25px 50px -12px rgba(31, 38, 135, 0.25)',
        'professional': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glossy': '0 4px 15px 0 rgba(31, 38, 135, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      }
    },
  },
  plugins: [],
};