import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // TypeScript primero: si algún día vuelve a aparecer un .js compilado junto
  // a un .tsx, Vite seguirá usando el .tsx (por defecto prefería el .js, que
  // era lo que dejaba el menú lateral desactualizado).
  resolve: { extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'] },
  server: { port: 5173 },
});
