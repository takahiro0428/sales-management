import type { Config } from 'tailwindcss'

export default {
  content: [],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans JP"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#FFF0F7',
          100: '#FFE0EF',
          200: '#FFC2DF',
          300: '#F9B2D7',
          400: '#F08BBF',
          500: '#E866A8',
          600: '#D94D93',
          700: '#BF3578',
          800: '#9C2760',
          900: '#7A1D4C',
        },
        sub1: {
          50: '#F0FAFB',
          100: '#CFECF3',
          200: '#A8DCE8',
          300: '#7AC8DA',
          400: '#52B2CA',
          500: '#3A97B0',
        },
        sub2: {
          50: '#F0FDF2',
          100: '#DAF9DE',
          200: '#B5F0BD',
          300: '#82E390',
          400: '#52D066',
          500: '#32B64A',
        },
        sub3: {
          50: '#FDFFF0',
          100: '#F6FFDC',
          200: '#ECFBB8',
          300: '#DDF48E',
          400: '#CCE86A',
          500: '#B2D44E',
        },
      },
    },
  },
} satisfies Config
