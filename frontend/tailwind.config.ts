import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        /* YKS/KPSS temaları CSS değişkenleriyle; varsayılan YKS (teal+turuncu) */
        wingo: {
          50: 'var(--wingo-50)',
          100: 'var(--wingo-100)',
          200: 'var(--wingo-200)',
          300: 'var(--wingo-300)',
          400: 'var(--wingo-400)',
          500: 'var(--wingo-500)',
          600: 'var(--wingo-600)',
          700: 'var(--wingo-700)',
          800: 'var(--wingo-800)',
          900: 'var(--wingo-900)',
        },
        brand: {
          primary: 'var(--wingo-600)',
          secondary: 'var(--wingo-700)',
          accent: 'var(--edu-cta)',
          success: '#059669',
          warning: '#D97706',
          danger: '#DC2626',
        },
        surface: {
          darkest: 'var(--surface-darkest)',
          dark: 'var(--surface-dark)',
          mid: 'var(--wingo-900)',
          card: '#FFFFFF',
          border: 'var(--surface-border)',
        },
        edu: {
          bg: 'var(--edu-bg)',
          ink: 'var(--edu-ink)',
          muted: 'var(--edu-muted)',
          line: 'var(--edu-line)',
          mint: 'var(--edu-mint)',
          cta: 'var(--edu-cta)',
          'cta-hover': 'var(--edu-cta-hover)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Outfit', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'DM Sans', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'DM Sans', 'system-ui', 'sans-serif'],
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
        'gradient-x': 'gradientX 3s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
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
