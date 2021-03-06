#!/usr/bin/env node

// @ts-check

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

const dir = 'src/grammar';

const pegFileExt = '.pegjs';
fs.readdirSync(dir)
  .filter(x => x.endsWith(pegFileExt))
  .forEach(fileName => {
    const targetFileName =
      fileName.substr(0, fileName.length - pegFileExt.length) + '-pegjs.ts';

    execFileSync('node_modules/.bin/tspeg', [
      path.join(dir, fileName),
      path.join(dir, targetFileName),
    ]);
  });
