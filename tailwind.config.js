/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          purple: '#8A2BE2',
          pink: '#FF00FF',
          light: '#BF40BF',
          accent: '#EE82EE',
        },
        dark: {
          primary: '#0F0F1A',
          secondary: '#1A1A2E',
        }
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'rajdhani': ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'gradient': 'gradient-shift 3s ease infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
};