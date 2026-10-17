/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep Himalayan Navy (Logo Theme)
        primary: {
          DEFAULT: '#0F2547',
          50: '#F0F5FA',
          100: '#E0EBF5',
          200: '#C2D7EC',
          300: '#8EB5DB',
          400: '#528EC4',
          500: '#2E6BA8',
          600: '#0F2547',
          700: '#0B192C',
          800: '#081321',
          900: '#050D17',
        },
        navy: {
          DEFAULT: '#0F2547',
          50: '#F0F5FA',
          100: '#E0EBF5',
          800: '#0F2B4D',
          900: '#0F2547',
          950: '#0B192C',
        },
        // Golden Sun Amber (Logo Theme)
        amber: {
          DEFAULT: '#F5A623',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F5A623',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        accent: {
          DEFAULT: '#F5A623',
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F5A623',
          600: '#D97706',
        },
        dark: {
          DEFAULT: '#0B192C',
          card: '#0F2547',
          border: '#1E3E62',
        }
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        '2xs': '0 1px 1px 0 rgba(0, 0, 0, 0.03)',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
