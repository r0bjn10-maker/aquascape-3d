import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({ registerType: 'prompt', includeAssets: ['icon.svg'], manifest: {
    name: 'Aquascape 3D — My Living Aquarium', short_name: 'Aquascape', lang: 'vi',
    theme_color: '#101e20', background_color: '#101e20', display: 'standalone', start_url: './',
    icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }, workbox: { maximumFileSizeToCacheInBytes: 4000000, globPatterns: ['**/*.{js,css,html,svg,png,webp,json,woff2,glb,gltf,bin}'] } })],
  build: { chunkSizeWarningLimit: 1600 },
});
