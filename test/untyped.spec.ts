import { process_commands } from '../src/untyped';
import { parse } from '../src/grammar/untyped-pegjs';
import { readData } from './utils';

test('untyped', () => {
  const data = readData('untyped.txt');

  const commands = parse(data).ast?.commands.map(x => x.term);
  expect(commands?.length).toBeTruthy();

  expect(process_commands(commands!)).toMatchSnapshot();
});
