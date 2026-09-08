import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import compression from 'vite-plugin-compression';
import path from 'path';
import { configDefaults } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // Carrega todas as variáveis do .env.local
  const env = loadEnv(mode, process.cwd(), '');

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'StudySystem ADS',
          short_name: 'StudySystem',
          description: 'Sistema de Estudos Avançado para ADS',
          theme_color: '#4f46e5', // Indigo-600
          background_color: '#050810',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          lang: 'pt-BR',
          categories: ['education', 'productivity'],
          icons: [
            {
              src: 'pwa-icon.svg',
              sizes: '64x64 192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ],
          shortcuts: [
            {
              name: 'Dashboard',
              short_name: 'Dashboard',
              description: 'Ir para o Dashboard',
              url: '/dashboard',
              icons: [{ src: 'pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml' }]
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // FontAwesome (cdnjs.cloudflare.com) must NOT be cached by SW.
              // CacheFirst with opaque responses causes icons to vanish on reload.
              // NetworkOnly forces SW to always pass through to CDN directly.
              urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/]
        },
        devOptions: {
          enabled: false // Enable for testing in dev
        }
      }),
      compression()
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./")
      }
    },
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'window.env': {
        SUPABASE_URL: supabaseUrl,
        SUPABASE_ANON_KEY: supabaseAnonKey
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['framer-motion', 'sonner'],
            'charts-vendor': ['recharts'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
            'utils-vendor': ['localforage', 'match-sorter', 'sort-by', 'zustand'],
            'content-vendor': ['marked', 'react-highlight-words'],
            'mammoth-vendor': ['mammoth'],
            'dropbox-vendor': ['dropbox', 'react-dropbox-chooser']
          }
        }
      }
    },
    server: {
      port: 3000,
      open: true
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: './vitest.setup.ts',
      exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    }
  };
});
