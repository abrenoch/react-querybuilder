import AnalyzerPlugin from 'esbuild-analyzer';
import { mkdir } from 'node:fs/promises';
import type { Options } from 'tsup';
import { defineConfig } from 'tsup';
import { generateDTS } from '../../utils/generateDTS';

export default defineConfig(options => {
  const commonOptions: Options = {
    entry: {
      'react-querybuilder': 'src/index.ts',
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
      esbuildPlugins: [AnalyzerPlugin({ outfile: './build-analysis.html' })],
      onSuccess: () => generateDTS(import.meta.dir),
    },
    // ESM, Webpack 4 support. Target ES2017 syntax to compile away optional chaining and spreads
    {
      ...commonOptions,
      entry: {
        'react-querybuilder.legacy-esm': 'src/index.ts',
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
        'react-querybuilder.production': 'src/index.ts',
      },
      format: ['esm'],
      outExtension: () => ({ js: '.mjs' }),
      esbuildPlugins: [AnalyzerPlugin({ outfile: './build-analysis.production.html' })],
    },
    // CJS development
    {
      ...commonOptions,
      entry: {
        'react-querybuilder.cjs.development': 'src/index.ts',
      },
      format: 'cjs',
      outDir: './dist/cjs/',
    },
    // CJS production
    {
      ...commonOptions,
      ...productionOptions,
      entry: {
        'react-querybuilder.cjs.production': 'src/index.ts',
      },
      format: 'cjs',
      outDir: './dist/cjs/',
      onSuccess: async () => {
        // Write the CJS index file
        await Bun.write(
          'dist/cjs/index.js',
          `'use strict';
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./react-querybuilder.cjs.production.js');
} else {
  module.exports = require('./react-querybuilder.cjs.development.js');
}
`
        );
      },
    },
    // CJS modules without React dependency
    {
      ...commonOptions,
      entry: {
        formatQuery: 'src/utils/formatQuery/index.ts',
        parseCEL: 'src/utils/parseCEL/index.ts',
        parseJSONata: 'src/utils/parseJSONata/index.ts',
        parseJsonLogic: 'src/utils/parseJsonLogic/index.ts',
        parseMongoDB: 'src/utils/parseMongoDB/index.ts',
        parseSpEL: 'src/utils/parseSpEL/index.ts',
        parseSQL: 'src/utils/parseSQL/index.ts',
        transformQuery: 'src/utils/transformQuery.ts',
      },
      format: 'cjs',
      onSuccess: async () => {
        await Promise.all(
          [
            'formatQuery',
            'parseCEL',
            'parseJSONata',
            'parseJsonLogic',
            'parseMongoDB',
            'parseSpEL',
            'parseSQL',
            'transformQuery',
          ].map(async util => {
            await mkdir(util, { recursive: true });
            await Bun.write(
              `${util}/package.json`,
              JSON.stringify(
                {
                  main: `../dist/${util}.js`,
                  types: `../dist/types/utils/${util}${util === 'transformQuery' ? '' : '/index'}.d.ts`,
                },
                null,
                2
              )
            );
          })
        );
      },
    },
  ];

  return opts;
});
