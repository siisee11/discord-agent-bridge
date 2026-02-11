#!/usr/bin/env node

import { chmodSync, copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const root = resolve(new URL('..', import.meta.url).pathname);
const releaseRoot = join(root, 'dist', 'release');
const npmDir = join(releaseRoot, 'npm');
const metaDir = join(npmDir, 'discode');

const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const manifest = JSON.parse(readFileSync(join(releaseRoot, 'manifest.json'), 'utf-8'));
const optionalDependencies = manifest.binaries || {};

rmSync(metaDir, { recursive: true, force: true });
mkdirSync(join(metaDir, 'bin'), { recursive: true });

copyFileSync(join(root, 'bin', 'discode'), join(metaDir, 'bin', 'discode'));
copyFileSync(join(root, 'scripts', 'postinstall.mjs'), join(metaDir, 'postinstall.mjs'));
copyFileSync(join(root, 'LICENSE'), join(metaDir, 'LICENSE'));
copyFileSync(join(root, 'README.md'), join(metaDir, 'README.md'));
chmodSync(join(metaDir, 'bin', 'discode'), 0o755);

const publishPkg = {
  name: rootPkg.name,
  version: rootPkg.version,
  description: rootPkg.description,
  license: rootPkg.license,
  bin: {
    discode: './bin/discode',
  },
  scripts: {
    postinstall: 'node ./postinstall.mjs',
  },
  optionalDependencies,
};

writeFileSync(join(metaDir, 'package.json'), `${JSON.stringify(publishPkg, null, 2)}\n`, 'utf-8');
console.log(`Prepared npm package at ${metaDir}`);
