import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendors base
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-ui';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('pdfjs-dist')) {
              return 'vendor-pdf';
            }
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            if (id.includes('@dnd-kit')) {
              return 'vendor-dnd';
            }
            return 'vendor-other';
          }
          
          // 🚀 OTIMIZAÇÃO: Chunks por área do app
          if (id.includes('src/pages/loja/') || id.includes('src/components/loja/') || id.includes('src/hooks/useLoja')) {
            return 'app-loja';
          }
          if (id.includes('src/pages/Administracao') || id.includes('src/pages/Gerenciar')) {
            return 'app-admin';
          }
          if (id.includes('src/pages/Clientes') || id.includes('src/pages/Pedidos') || id.includes('src/pages/Prospects')) {
            return 'app-crm';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // 🚀 Minificação agressiva para produção
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
}));
