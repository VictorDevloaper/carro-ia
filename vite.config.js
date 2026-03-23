import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        veiculos: resolve(__dirname, 'veiculos.html'),
        manutencoes: resolve(__dirname, 'manutencoes.html'),
      },
    },
  },
});
