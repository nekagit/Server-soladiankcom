/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    screens: {
      'xs': '320px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
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
        'touch': '44px', // Minimum touch target size
        'mobile': '1rem',
        'tablet': '1.5rem',
        'desktop': '2rem',
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
        'mobile': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'mobile-lg': '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      backgroundImage: {
        'soladia-gradient': 'linear-gradient(135deg, #E60012 0%, #0066CC 100%)',
        'soladia-gradient-gold': 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
      },
      fontSize: {
        'mobile-xs': ['0.75rem', '1rem'],
        'mobile-sm': ['0.875rem', '1.25rem'],
        'mobile-base': ['1rem', '1.5rem'],
        'mobile-lg': ['1.125rem', '1.75rem'],
        'mobile-xl': ['1.25rem', '1.75rem'],
        'mobile-2xl': ['1.5rem', '2rem'],
        'mobile-3xl': ['1.875rem', '2.25rem'],
        'mobile-4xl': ['2.25rem', '2.5rem'],
        'mobile-5xl': ['3rem', '1'],
        'mobile-6xl': ['3.75rem', '1'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'mobile-bounce': 'mobileBounce 0.6s ease-in-out',
        'mobile-pulse': 'mobilePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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
        mobileBounce: {
          '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
          '40%, 43%': { transform: 'translate3d(0, -8px, 0)' },
          '70%': { transform: 'translate3d(0, -4px, 0)' },
          '90%': { transform: 'translate3d(0, -2px, 0)' },
        },
        mobilePulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      minHeight: {
        'touch': '44px',
        'mobile': '48px',
        'tablet': '52px',
        'desktop': '56px',
      },
      minWidth: {
        'touch': '44px',
        'mobile': '48px',
        'tablet': '52px',
        'desktop': '56px',
      },
      maxWidth: {
        'mobile': '320px',
        'tablet': '768px',
        'desktop': '1024px',
        'wide': '1280px',
      },
      zIndex: {
        'mobile-menu': '9999',
        'mobile-modal': '10000',
        'mobile-overlay': '9998',
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
  future: {
    hoverOnlyWhenSupported: true,
  },
}