import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  optimizeDeps: {
    entries: ['index.html', 'feature_test.html', 'example/index.js', 'example/feature_test.js'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: path.resolve(__dirname, 'src/potree_module.js'),
      formats: ['es'],
      fileName: () => 'potree_module.js',
    },
    rollupOptions: {
      external: ['three', '@tweenjs/tween.js', 'proj4', 'i18next'],
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'src/viewer/potree.css', dest: 'potree' },
        { src: 'src/viewer/*.html', dest: 'potree' },
        { src: 'src/lines/**/*', dest: 'lines' },
        { src: 'example/workers/**/*', dest: 'workers' },
        { src: 'resources/**/*', dest: 'resources' },
        { src: 'resources/**/*', dest: 'potree/resources' },
        { src: 'examples/resources/**/*', dest: 'resources' },
        { src: 'examples/resources/**/*', dest: 'potree/resources' },
      ],
    }),
  ],
});
