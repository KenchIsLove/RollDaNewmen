/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base:            '#1a1b23',
        card:            '#22232d',
        surface:         '#2d2e3a',
        line:            '#3d3e4a',
        accent:          '#f59e42',
        'text-primary':   '#f4f4f5',
        'text-secondary': '#b4b4be',
        'text-muted':     '#8b8b98',
        'text-dim':       '#6b7280',
      },
      keyframes: {
        pop: {
          '0%':   { opacity: '0', transform: 'scale(0.75)' },
          '60%':  { transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.04' },
          '50%':      { opacity: '0.20' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(1)',    opacity: '0.6' },
          '100%': { transform: 'scale(1.18)', opacity: '0' },
        },
      },
      animation: {
        pop:          'pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        slideUp:      'slideUp 0.3s ease-out',
        fadeIn:       'fadeIn 0.2s ease-out',
        shimmer:      'shimmer 1.6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
}
