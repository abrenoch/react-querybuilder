import { writeFile } from 'node:fs/promises';
import type { Options } from 'tsup';
import { defineConfig } from 'tsup';
import { generateDTS } from '../../utils/generateDTS';

export default defineConfig(options => {
  const commonOptions: Options = {
    entry: {
      'react-querybuilder_chakra': 'src/index.tsx',
    },
    sourcemap: true,
    ...options,
  };

  const productionOptions: Options = {
    minify: true,
    replaceNodeEnv: true,
  };

  const opts: Options[] = [
    // ESM, standard bundler dev, embedded `process` references
    {
      ...commonOptions,
      format: ['esm'],
      clean: true,
      onSuccess: () => generateDTS(import.meta.dir),
    },
    // ESM, Webpack 4 support. Target ES2017 syntax to compile away optional chaining and spreads
    {
      ...commonOptions,
      entry: {
        'react-querybuilder_chakra.legacy-esm': 'src/index.tsx',
      },
      // ESBuild outputs `'.mjs'` by default for the 'esm' format. Force '.js'
      outExtension: () => ({ js: '.js' }),
      target: 'es2017',
      format: ['esm'],
    },
    // ESM for use in browsers. Minified, with `process` compiled away
    {
      ...commonOptions,
      ...productionOptions,
      entry: {
        'react-querybuilder_chakra.production': 'src/index.tsx',
      },
      format: ['esm'],
      outExtension: () => ({ js: '.mjs' }),
    },
    // CJS development
    {
      ...commonOptions,
      entry: {
        'react-querybuilder_chakra.cjs.development': 'src/index.tsx',
      },
      format: 'cjs',
      outDir: './dist/cjs/',
    },
    // CJS production
    {
      ...commonOptions,
      ...productionOptions,
      entry: {
        'react-querybuilder_chakra.cjs.production': 'src/index.tsx',
      },
      format: 'cjs',
      outDir: './dist/cjs/',
      onSuccess: async () => {
        // Write the CJS index file
        await writeFile(
          'dist/cjs/index.js',
          `'use strict';
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./react-querybuilder_chakra.cjs.production.js');
} else {
  module.exports = require('./react-querybuilder_chakra.cjs.development.js');
}
`
        );
      },
    },
  ];

  return opts;
});
