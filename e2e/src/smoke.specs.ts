import '@nodeint/example';

import { execFileSync } from 'node:child_process';

import { expect, test } from 'vitest';

test('the built package can be imported by a Node.js ESM consumer', () => {
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', "import '@nodeint/example';"], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });

  expect(output).toBe('');
});
