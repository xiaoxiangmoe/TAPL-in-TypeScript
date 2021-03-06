import { process_commands } from '../src/simplebool';
import { parse } from '../src/grammar/simplebool-pegjs';
import { readData } from './utils';

describe('simplebool', () => {
  it('ok', () => {
    const data = readData('simplebool.ok.txt');
    const commands = parse(data).ast?.commands.map(x => x.term);
    expect(commands?.length).toBeTruthy();
    expect(process_commands(commands ?? [])).toMatchSnapshot();
  });
  it('has type error', () => {
    const data = readData('simplebool.error.txt');
    const commands = parse(data).ast?.commands.map(x => x.term);
    expect(commands?.length).toBeTruthy();
    expect(() => process_commands(commands!)).toThrowErrorMatchingSnapshot();
  });
});
