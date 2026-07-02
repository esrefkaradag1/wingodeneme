import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        wingo: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        brand: {
          primary: '#4F46E5',
          secondary: '#7C3AED',
          accent: '#06B6D4',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
        surface: {
          darkest: '#070C1C',
          dark: '#0A1024',
          mid: '#0F2137',
          card: '#0f1734',
          border: 'rgba(255,255,255,0.08)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'gradient-flow': 'gradientFlow 8s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'spin-slow': 'spin 8s linear infinite',
        'drift': 'drift 20s ease-in-out infinite',
        'drift-reverse': 'driftReverse 25s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(42, 187, 167, 0.15)' },
          '100%': { boxShadow: '0 0 40px rgba(42, 187, 167, 0.35)' },
        },
        gradientFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0px, 0px) rotate(0deg)' },
          '33%': { transform: 'translate(30px, -30px) rotate(1deg)' },
          '66%': { transform: 'translate(-20px, 20px) rotate(-1deg)' },
        },
        driftReverse: {
          '0%, 100%': { transform: 'translate(0px, 0px) rotate(0deg)' },
          '33%': { transform: 'translate(-30px, 20px) rotate(-1deg)' },
          '66%': { transform: 'translate(20px, -30px) rotate(1deg)' },
        },
      },
      backgroundImage: {
        'mesh-gradient': 'radial-gradient(circle at 20% 50%, rgba(42, 187, 167, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(124, 107, 255, 0.08) 0%, transparent 50%)',
        'hero-glow': 'radial-gradient(ellipse at 50% 0%, rgba(42, 187, 167, 0.12) 0%, transparent 50%)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.03) 100%)',
      },
      boxShadow: {
        'glow-teal': '0 0 30px rgba(42, 187, 167, 0.15)',
        'glow-indigo': '0 0 30px rgba(124, 107, 255, 0.15)',
        'glow-yellow': '0 0 30px rgba(247, 201, 72, 0.12)',
        'card': '0 2px 16px rgba(0,0,0,0.06)',
        'card-hover': '0 12px 36px rgba(0,0,0,0.12)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
