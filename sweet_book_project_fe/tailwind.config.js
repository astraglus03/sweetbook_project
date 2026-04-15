/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#D4916E',
          light: '#D4916E15',
          hover: '#C07E5C',
        },
        warm: {
          bg: '#F8F5F0',
          cream: '#F3EBE2',
          card: '#FFFFFF',
          border: '#E5E0D8',
          tag: '#C5BEB6',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          dim: '#3D3D3D',
          sub: '#6B6B6B',
          muted: '#9B9B9B',
        },
      },
      fontFamily: {
        display: ['"Pretendard Variable"', 'Pretendard', 'system-ui', 'sans-serif'],
        sans: ['"Pretendard Variable"', 'Pretendard', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
