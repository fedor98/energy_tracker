import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    // Proxy API requests to the backend during development
    // This avoids CORS issues and allows using relative URLs like '/api/config'
    proxy: {
      '/api': {
        target: 'http://backend-dev:8000',
        changeOrigin: true,
        // No pathRewrite needed - backend expects paths like /api/config
      }
    },
    // Expose server to all network interfaces for Docker container access
    host: '0.0.0.0',
    // Default Vite dev server port
    port: 5173,
  }
});
