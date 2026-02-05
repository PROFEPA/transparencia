/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Colores institucionales PROFEPA / Gobierno de México
        'gob-green': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#235B4E',  // Verde principal gobierno
          600: '#1a4a3f',
          700: '#13392f',
          800: '#0d2720',
          900: '#061410',
        },
        'gob-red': {
          500: '#691C32',  // Guinda gobierno
          600: '#5a1829',
          700: '#4b1422',
        },
        'gob-gold': {
          500: '#BC955C',  // Dorado gobierno
          600: '#a6834f',
          700: '#8f7144',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
