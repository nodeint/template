import { expect, test } from 'vitest';

import { buildVitestArgs } from './build-vitest-args.mjs';

const base = ['run', '--project', 'integration'];

test('runs the whole project without selection', () => {
  expect(buildVitestArgs('integration', [])).toEqual(base);
});

test('uses the given project name', () => {
  expect(buildVitestArgs('unit', ['--file', 'a'])).toEqual(['run', '--project', 'unit', 'a']);
});

test.each([[undefined], ['--file']])('rejects project %j', (project) => {
  expect(() => buildVitestArgs(project, [])).toThrow('a project name is required');
});

test('maps repeated --file to positional filters', () => {
  expect(buildVitestArgs('integration', ['--file', 'cancel', '--file=session-delete'])).toEqual([
    ...base, 'cancel', 'session-delete',
  ]);
});

test('maps --case to -t after the file filters', () => {
  expect(buildVitestArgs('integration', ['--file', 'cancel', '--case', 'stops the run'])).toEqual([
    ...base, 'cancel', '-t', 'stops the run',
  ]);
});

test('drops the -- separator and passes other arguments through', () => {
  expect(buildVitestArgs('integration', ['--', '--file', 'cancel', '--reporter=verbose'])).toEqual([
    ...base, 'cancel', '--reporter=verbose',
  ]);
});

test.each([
  [['--file'], '--file requires a value'],
  [['--file', '--case', 'x'], '--file requires a value'],
  [['--case='], '--case requires a value'],
  [['--case', 'x'], '--case requires --file'],
  [['--file', 'a', '--case', 'x', '--case', 'y'], '--case may be given only once'],
])('rejects %j', (argv, message) => {
  expect(() => buildVitestArgs('integration', argv)).toThrow(message);
});
