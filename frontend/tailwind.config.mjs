/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'soladia-primary': '#E60012',
        'soladia-secondary': '#0066CC',
        'soladia-accent': '#FFD700',
        'soladia-success': '#00A650',
        'soladia-warning': '#FF8C00',
        'soladia-dark': '#1A1A1A',
        'soladia-light': '#F8F9FA',
        'soladia-border': '#E1E5E9',
        'soladia-dark-bg': '#0F0F0F',
        'soladia-dark-surface': '#1A1A1A',
        'soladia-dark-text': '#FFFFFF',
        'soladia-dark-border': '#333333',
        'soladia-dark-muted': '#666666',
      },
      fontFamily: {
        'soladia-primary': ['Inter', 'system-ui', 'sans-serif'],
        'soladia-display': ['Poppins', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'soladia-xs': '0.25rem',
        'soladia-sm': '0.5rem',
        'soladia-md': '1rem',
        'soladia-lg': '1.5rem',
        'soladia-xl': '2rem',
        'soladia-2xl': '3rem',
      },
      borderRadius: {
        'soladia-sm': '4px',
        'soladia-md': '8px',
        'soladia-lg': '12px',
        'soladia-xl': '16px',
      },
      boxShadow: {
        'soladia': '0 4px 20px rgba(230, 0, 18, 0.15)',
        'soladia-lg': '0 8px 40px rgba(230, 0, 18, 0.25)',
        'soladia-card': '0 2px 12px rgba(0, 0, 0, 0.08)',
      },
      backgroundImage: {
        'soladia-gradient': 'linear-gradient(135deg, #E60012 0%, #0066CC 100%)',
        'soladia-gradient-gold': 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        'soladia-gradient-dark': 'linear-gradient(135deg, #1A1A1A 0%, #333333 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // Add custom utilities
    function({ addUtilities }) {
      const newUtilities = {
        '.text-gradient': {
          background: 'linear-gradient(135deg, #E60012 0%, #0066CC 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.bg-glass': {
          background: 'rgba(255, 255, 255, 0.95)',
          'backdrop-filter': 'blur(20px)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.bg-glass-dark': {
          background: 'rgba(26, 26, 26, 0.95)',
          'backdrop-filter': 'blur(20px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.btn-soladia': {
          background: 'linear-gradient(135deg, #E60012 0%, #0066CC 100%)',
          color: 'white',
          padding: '0.75rem 1.5rem',
          'border-radius': '12px',
          'font-weight': '700',
          'transition': 'all 0.2s ease',
          'text-decoration': 'none',
          'display': 'inline-block',
          'text-align': 'center',
          'border': 'none',
          'cursor': 'pointer',
        },
        '.btn-soladia:hover': {
          transform: 'translateY(-2px)',
          'box-shadow': '0 8px 40px rgba(230, 0, 18, 0.25)',
        },
        '.card-soladia': {
          background: 'white',
          'border-radius': '16px',
          'box-shadow': '0 2px 12px rgba(0, 0, 0, 0.08)',
          'transition': 'all 0.3s ease',
          'overflow': 'hidden',
        },
        '.card-soladia:hover': {
          transform: 'translateY(-4px)',
          'box-shadow': '0 8px 40px rgba(230, 0, 18, 0.25)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
  darkMode: 'class',
  future: {
    hoverOnlyWhenSupported: true,
  },
}