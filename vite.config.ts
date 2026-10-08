import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    host: true,
    port: 5174,
  },
  build: {
    rollupOptions: {
      output: {
        // Recharts pulls in all of d3, which alone is ~200kB. Routes are
        // lazy, so d3 is split from the rest of the chart code and only
        // fetched by the admin screens that actually draw charts.
        manualChunks(id) {
          if (id.includes('node_modules/d3-') || id.includes('node_modules/internmap')) {
            return 'd3';
          }
          if (id.includes('node_modules/recharts')) {
            return 'charts';
          }
          return undefined;
        },
      },
    },
  },
});
