// Bundles the webview UIs (Empire Dashboard + OpenDesign canvas) with esbuild.
// Output lands in out/webview/*.js and is loaded by the extension's webviews.
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('out/webview', { recursive: true });

const shared = {
  bundle: true,
  format: 'iife',
  minify: true,
  sourcemap: false,
  target: ['chrome100', 'node18'],
  logLevel: 'info'
};

await Promise.all([
  build({
    ...shared,
    entryPoints: ['src/ui/webviews/dashboard/webview.ts'],
    outfile: 'out/webview/dashboard.js'
  }),
  build({
    ...shared,
    entryPoints: ['src/ui/webviews/opendesign/webview.tsx'],
    outfile: 'out/webview/opendesign.js',
    define: { 'process.env.NODE_ENV': '"production"' }
  })
]);

console.log('webviews bundled');
