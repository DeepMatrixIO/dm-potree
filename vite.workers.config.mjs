import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'example/workers',
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
    rollupOptions: {
      input: {
        'BinaryDecoderWorker': 'src/workers/BinaryDecoderWorker.js',
        '2.0/DecoderWorker': 'src/modules/loader/2.0/DecoderWorker.js',
        '2.0/DecoderWorker_brotli': 'src/modules/loader/2.0/DecoderWorker_brotli.js',
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
      },
    },
  },
});
