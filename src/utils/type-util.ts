import * as util from 'util';

export function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled value: ${util.inspect(value)}`);
}
