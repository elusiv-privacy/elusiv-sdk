/* eslint-disable import/no-extraneous-dependencies */
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import virtual from '@rollup/plugin-virtual';
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-polyfill-node';

const empty = 'export default {}';

const EXTERNALS = [
    '@dao-xyz/borsh',
    '@noble/hashes',
    '@noble/hashes/sha256',
    '@noble/hashes/hkdf',
    '@noble/hashes/utils',
    '@pythnetwork/client',
    '@solana/spl-token',
    '@solana/web3.js',
    'aes-js',
    'bs58',
    'circomlibjs',
    'node-fetch',
    'ffjavascript',
    '@elusiv/ffjavascript',
    '@elusiv/serialization',
    '@elusiv/cryptojs',
];

const config = [{
    input: 'src/index.ts',
    output: {
        file: 'build/elusiv-sdk.cjs.js',
        format: 'cjs',
        sourcemap: false,
        globals: {
            os: 'null',
        },
        name: 'elusivSDK',
    },
    external: EXTERNALS,
    plugins: [
        typescript(),
        virtual({
            fs: empty,
            os: empty,
            crypto: empty,
            readline: empty,
            ejs: empty,
        }),
        json(),
        resolve({
            dedupe: ['bn.js'],
            browser: true,
            preferBuiltins: false,
            exportConditions: ['browser', 'default', 'module', 'require'],
        }),
        commonjs(),
        replace({
            preventAssignment: false,
            'process.browser': true,
        }),
        nodePolyfills({ include: null }),
        terser(),
    ],
}];
export default config;
