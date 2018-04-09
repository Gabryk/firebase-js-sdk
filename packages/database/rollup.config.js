import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';

const plugins = [
  typescript({
    typescript: require('typescript')
  }),
  resolve(),
  commonjs(),
];

const external = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

export default [
  /**
   * Browser Builds
   */
  {
    input: 'index.ts',
    output: [
      { file: pkg.browser, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    plugins,
    external,
  },
  /**
   * Node.js Build
   */
  {
    input: 'index.node.ts',
    output: [
      { file: pkg.main, format: 'cjs' }
    ],
    plugins,
    external,
  }
];