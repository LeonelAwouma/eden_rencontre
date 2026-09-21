import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'Manrope', 'sans-serif'],
        headline: ['Cormorant Garamond', 'Libre Baskerville', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        // Couleurs d'état : les variables CSS existaient déjà mais n'étaient
        // exposées à aucune classe, d'où les statuts écrits en hexadécimal.
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Botanical color palette
        sage: 'hsl(var(--sage))',
        forest: 'hsl(var(--forest))',
        olive: 'hsl(var(--olive))',
        'deep-eden': 'hsl(var(--deep-eden))',
        'leaf-highlight': 'hsl(var(--leaf-highlight))',
        pomegranate: 'hsl(var(--pomegranate))',
        'warm-ivory': 'hsl(var(--warm-ivory))',
        'botanical-beige': 'hsl(var(--botanical-beige))',
        'linen-white': 'hsl(var(--linen-white))',
        'muted-terracotta': 'hsl(var(--muted-terracotta))',
        'moss-light': 'hsl(var(--moss-light))',
        'natural-sage': 'hsl(var(--natural-sage))',
        // Legacy
        'rose-pale': 'hsl(var(--rose-pale))',
        lavender: 'hsl(var(--lavender))',
        beige: 'hsl(var(--beige))',
        'sage-accent': 'hsl(var(--sage-accent))',
        moss: 'hsl(var(--moss))',
        ivoire: 'hsl(var(--ivoire))',
        champagne: 'hsl(var(--champagne))',
        creme: 'hsl(var(--creme))',
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'gentle-sway': {
          '0%, 100%': { transform: 'rotate(-2deg) translateY(0)' },
          '50%': { transform: 'rotate(2deg) translateY(-4px)' },
        },
        'wind-drift': {
          '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
          '33%': { transform: 'translateX(4px) rotate(1.5deg)' },
          '66%': { transform: 'translateX(-3px) rotate(-1deg)' },
        },
        'float-up': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'sway-slow': {
          '0%, 100%': { transform: 'rotate(-1deg) translateY(0)' },
          '50%': { transform: 'rotate(1deg) translateY(-2px)' },
        },
        'leaf-drift': {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(-60px) rotate(25deg)', opacity: '0' },
        },
        'pollen-float': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)', opacity: '0.3' },
          '25%': { transform: 'translateY(-15px) translateX(5px)', opacity: '0.7' },
          '50%': { transform: 'translateY(-25px) translateX(-3px)', opacity: '0.5' },
          '75%': { transform: 'translateY(-35px) translateX(4px)', opacity: '0.3' },
        },
        'sunrise-glow': {
          '0%, 100%': { opacity: '0.15', transform: 'scale(1)' },
          '50%': { opacity: '0.25', transform: 'scale(1.05)' },
        },
        'bloom': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'undergrow': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        'dove-flight': {
          '0%':   { transform: 'translate(-10vw, 8vh) scale(0.9)', opacity: '0' },
          '8%':   { opacity: '0.16' },
          '45%':  { transform: 'translate(45vw, -3vh) scale(1)', opacity: '0.16' },
          '55%':  { transform: 'translate(56vw, -6vh) scale(1)', opacity: '0.14' },
          '92%':  { opacity: '0.08' },
          '100%': { transform: 'translate(115vw, -16vh) scale(0.85)', opacity: '0' },
        },
        // ── Faune du jardin ──
        'swallow-flight': {
          '0%':   { transform: 'translate(112vw, -2vh) scaleX(-1) scale(0.75)', opacity: '0' },
          '10%':  { opacity: '0.13' },
          '50%':  { transform: 'translate(48vw, 7vh) scaleX(-1) scale(1)', opacity: '0.13' },
          '88%':  { opacity: '0.06' },
          '100%': { transform: 'translate(-16vw, 1vh) scaleX(-1) scale(0.7)', opacity: '0' },
        },
        'wing-beat': {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%':      { transform: 'scaleY(0.74)' },
        },
        'wing-beat-quick': {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%':      { transform: 'scaleY(0.6)' },
        },
        'flock-drift': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%':      { transform: 'translate(-14px, -7px)' },
        },
        'perch-sway': {
          '0%, 100%': { transform: 'rotate(-1.2deg)' },
          '50%':      { transform: 'rotate(1.2deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'gentle-sway': 'gentle-sway 6s ease-in-out infinite',
        'wind-drift': 'wind-drift 8s ease-in-out infinite',
        'float-up': 'float-up 5s ease-in-out infinite',
        'fade-up': 'fade-up 0.8s ease-out forwards',
        'breathe': 'breathe 8s ease-in-out infinite',
        'sway-slow': 'sway-slow 12s ease-in-out infinite',
        'leaf-drift': 'leaf-drift 6s ease-in-out infinite',
        'pollen-float': 'pollen-float 8s ease-in-out infinite',
        'sunrise-glow': 'sunrise-glow 6s ease-in-out infinite',
        'bloom': 'bloom 0.6s ease-out forwards',
        'undergrow': 'undergrow 0.4s ease-out forwards',
        'dove-flight': 'dove-flight 38s ease-in-out infinite',
        'swallow-flight': 'swallow-flight 34s ease-in-out infinite',
        'wing-beat': 'wing-beat 2.6s ease-in-out infinite',
        'wing-beat-quick': 'wing-beat-quick 1.1s ease-in-out infinite',
        'flock-drift': 'flock-drift 18s ease-in-out infinite',
        'perch-sway': 'perch-sway 7s ease-in-out infinite',
      },
      boxShadow: {
        'botanical': '0 2px 20px -4px hsl(152 22% 42% / 0.08)',
        'botanical-lg': '0 8px 40px -8px hsl(152 22% 42% / 0.12)',
        'sage-glow': '0 4px 24px -4px hsl(145 22% 62% / 0.15)',
        'soft': '0 1px 8px -1px hsl(0 0% 0% / 0.04), 0 4px 24px -4px hsl(0 0% 0% / 0.06)',
        'elevated': '0 2px 12px -2px hsl(0 0% 0% / 0.06), 0 8px 32px -8px hsl(0 0% 0% / 0.08)',
      },
      backgroundImage: {
        'botanical-noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
        'linen-texture': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;