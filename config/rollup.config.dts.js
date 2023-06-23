/* eslint-disable import/no-extraneous-dependencies */
import resolve from '@rollup/plugin-node-resolve';
import dts from 'rollup-plugin-dts';

const config = [{
    input: './dist/index.d.ts',
    output: [{ file: 'build/elusiv-sdk.d.ts', format: 'es' }],
    plugins: [
        resolve(),
        dts(),
    ],
}];
export default config;
