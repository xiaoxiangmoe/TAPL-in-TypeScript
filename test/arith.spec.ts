import { process_commands } from '../src/arith';
import { parse } from '../src/grammar/arith-pegjs';
import { readData } from './utils';

test('arith', () => {
  const data = readData('arith.txt');
  // console.log(exampleData);
  const commands = parse(data).ast?.commands.map(x => x.term);
  expect(commands?.length).toBeTruthy();
  expect(process_commands(commands!)).toMatchSnapshot();
});
