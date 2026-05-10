import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  splitting: false,
  clean: true,
  sourcemap: false,
  minify: false,
  noExternal: [/^@doit\//],
  outExtension: () => ({ js: '.js' }),
})
