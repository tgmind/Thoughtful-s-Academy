import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function youtubePlaylistDevPlugin() {
  return {
    name: 'youtube-playlist-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/youtube-playlist', async (req, res) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
          let listId = url.searchParams.get('listId')
          const videoId = url.searchParams.get('videoId')

          if (!listId && videoId) {
            try {
              const watchRes = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`)
              if (watchRes.ok) {
                const html = await watchRes.text()
                const m = html.match(/"playlistId":"(PL[a-zA-Z0-9_-]+)"/)
                if (m) listId = m[1]
              }
            } catch { /* proceed */ }
          }

          if (!listId) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing listId or discoverable videoId parameter' }))
            return
          }
          const ytRes = await fetch(
            `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(listId)}`
          )
          if (!ytRes.ok) {
            res.statusCode = ytRes.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `YouTube responded with ${ytRes.status}` }))
            return
          }
          const xml = await ytRes.text()
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/xml; charset=utf-8')
          res.setHeader('Cache-Control', 'public, max-age=900')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Expose-Headers', 'X-Discovered-Playlist-Id')
          res.setHeader('X-Discovered-Playlist-Id', listId)
          res.end(xml)
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message || 'Internal proxy error' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    youtubePlaylistDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,   // using our own public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Layer our Web Push handler on top of the generated Workbox SW so
        // push/notificationclick work without touching the caching strategy.
        importScripts: ['/push-sw.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/img\.youtube\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'youtube-thumbs',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,   // expose on all network interfaces (LAN access from tablet/phone)
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'vendor-ui'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts'
            }
          }
        },
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
  },
})
