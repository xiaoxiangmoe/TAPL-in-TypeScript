// @ts-check

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import sh from 'shelljs';

const dir = 'src/grammar';

const pegFileExt = '.pegjs';

readdirSync(dir)
  .filter(x => x.endsWith(pegFileExt))
  .forEach(fileName => {
    const targetFileName =
      fileName.substr(0, fileName.length - pegFileExt.length) + '-pegjs.ts';

    sh.exec(`tspeg ${join(dir, fileName)} ${join(dir, targetFileName)}`);
  });
