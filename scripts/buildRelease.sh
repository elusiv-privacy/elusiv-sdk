#!/bin/bash

# This script is used to build the project into an importable package.

#  Build the dirs we'll use
mkdir temp
mkdir temp/elusiv-sdk
mkdir build/release

# Copy the files into the repo
cp build/elusiv-sdk.cjs.js temp/elusiv-sdk/index.cjs.js
# TODO: Don't duplicate the esm file while we're still copying the keys 
# cp dist/elusiv-sdk.esm.js temp/elusiv-sdk/index.esm.js
cp dist/elusiv-sdk.d.ts temp/elusiv-sdk/index.d.ts
cp metadata/buildFiles/package.build.json temp/elusiv-sdk/package.json

# Pack it into a tarball
npm pack temp/elusiv-sdk/

# Remove temp dir and artifacts
rm -rf temp
rm -rf build/elusiv-sdk.cjs.js
rm -rf build/dist

# Move the tarball to the build dir
mv elusiv-sdk-*.tgz build/release
