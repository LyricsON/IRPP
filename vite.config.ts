import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [vue(), VitePWA({ registerType: 'prompt', manifest: { name: 'IRPP Tunisie 2026', short_name: 'IRPP 2026', theme_color: '#0f4c5c', background_color: '#f7faf8', display: 'standalone', icons: [] }, workbox: { globPatterns: ['**/*.{js,css,html,svg,png,xlsx}'], runtimeCaching: [] } })]
})
