import * as path from 'path';
import * as fs from 'fs';

export const readData = (filename: string) =>
  fs.readFileSync(path.join('./test/data', filename), { encoding: 'utf-8' });
