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
        'orange': {
          25: '#fffbf5',
          75: '#fed7aa',
          850: '#c2410c',
          925: '#9a3412',
        },
        'amber': {
          25: '#fffbeb',
          75: '#fde68a',
          850: '#d97706',
          925: '#b45309',
        },
        'rose': {
          25: '#fff1f2',
          75: '#fecaca',
          850: '#e11d48',
          925: '#be123c',
        },
        'pink': {
          25: '#fdf2f8',
          75: '#f9a8d4',
          850: '#db2777',
          925: '#be185d',
        },
        'yellow': {
          25: '#fefce8',
          75: '#fef08a',
          850: '#ca8a04',
          925: '#a16207',
        }
      },
      backgroundImage: {
        'gradient-professional': 'linear-gradient(135deg, #f97316 0%, #ea580c 25%, #dc2626 50%, #be123c 75%, #a21caf 100%)',
        'gradient-warm': 'linear-gradient(135deg, #fb923c 0%, #f97316 25%, #ea580c 50%, #dc2626 75%, #be123c 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 25%, #f97316 50%, #ea580c 75%, #dc2626 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
        'gradient-header': 'linear-gradient(135deg, rgba(251,146,60,0.95) 0%, rgba(220,38,38,0.95) 100%)',
        'gradient-button': 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(249, 115, 22, 0.2)',
        'glass-lg': '0 25px 50px -12px rgba(249, 115, 22, 0.25)',
        'professional': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glossy': '0 4px 15px 0 rgba(249, 115, 22, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        'warm-glow': '0 0 40px rgba(249, 115, 22, 0.3)',
      }
    },
  },
  plugins: [],
};