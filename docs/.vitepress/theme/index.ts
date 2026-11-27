import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import '@fontsource-variable/schibsted-grotesk'
import '@fontsource-variable/spline-sans-mono'
import './custom.css'
import Landing from './Landing.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Landing', Landing)
  },
} satisfies Theme
