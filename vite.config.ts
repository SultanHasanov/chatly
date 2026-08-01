import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'notification-badge-96.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff,woff2}'],
        navigateFallback: '/index.html',
        importScripts: ['push-sw.js'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'chat-brat-images-v1',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        id: '/',
        name: 'Chat Brat',
        short_name: 'Chat Brat',
        description: 'Общайтесь без лишнего',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#128C7E',
        background_color: '#25D366',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: '/image1.png',
            sizes: '1080x2400',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Список чатов Chat Brat',
          },
          {
            src: '/image2.png',
            sizes: '1080x2400',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Групповой чат и голосовые сообщения',
          },
          {
            src: '/image3.png',
            sizes: '576x1280',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Информация и настройки группы',
          },
        ],
      },
    }),
  ],
})
