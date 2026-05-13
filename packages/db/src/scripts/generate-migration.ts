#!/usr/bin/env node
/**
 * Migration generator wrapper.
 *
 * Drizzle-kit `generate` ESM `.js` import extension'larından kaynaklanan
 * sorunlardan ötürü `from './users'` syntax'i ister (without `.js`).
 * Bizim runtime (ESM Node) `.js` ister.
 *
 * Bu script:
 *   1. `.js` extension'larını strip eder (drizzle-kit'in beğeneceği şekilde)
 *   2. `drizzle-kit generate` çağırır
 *   3. `.js` extension'larını geri restore eder
 *
 * Kullanım: pnpm -F @yorecebimde/db generate
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = join(__dirname, '../schema');

const STRIP_PATTERN = /from '\.\/(\w[\w-]*)\.js'/g;
const STRIP_UTILS = /from '\.\.\/utils\/columns\.js'/g;
const RESTORE_PATTERN = /from '\.\/(\w[\w-]*)'/g;
const RESTORE_UTILS = /from '\.\.\/utils\/columns'/g;

function processFiles(transform: (content: string) => string) {
  const files = readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.ts'));
  for (const file of files) {
    const path = join(SCHEMA_DIR, file);
    const content = readFileSync(path, 'utf-8');
    const transformed = transform(content);
    if (transformed !== content) {
      writeFileSync(path, transformed, 'utf-8');
    }
  }
}

function strip() {
  processFiles((c) =>
    c.replace(STRIP_PATTERN, "from './$1'").replace(STRIP_UTILS, "from '../utils/columns'"),
  );
}

function restore() {
  processFiles((c) =>
    c.replace(RESTORE_PATTERN, "from './$1.js'").replace(RESTORE_UTILS, "from '../utils/columns.js'"),
  );
}

async function main() {
  console.log('→ Stripping .js extensions for drizzle-kit...');
  strip();

  let exitCode = 0;
  try {
    console.log('→ Running drizzle-kit generate...');
    execSync('drizzle-kit generate', {
      stdio: 'inherit',
      cwd: join(__dirname, '../..'),
    });
  } catch (err) {
    console.error('drizzle-kit failed:', err);
    exitCode = 1;
  }

  console.log('→ Restoring .js extensions...');
  restore();

  process.exit(exitCode);
}

main();
