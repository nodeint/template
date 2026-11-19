/** Translates test runner arguments into vitest arguments. */

/**
 * Read the value of a flag given as `--name value` or `--name=value`.
 *
 * @param {string[]} argv
 * @param {number} index
 * @param {string} name
 * @returns {{ value: string, next: number } | null} `null` when `argv[index]` is not this flag.
 */
function readFlagValue(argv, index, name) {
  const arg = argv[index];
  if (arg.startsWith(`${name}=`)) {
    const value = arg.slice(name.length + 1);
    if (value === '') throw new Error(`${name} requires a value`);
    return { value, next: index };
  }
  if (arg !== name) return null;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('-')) throw new Error(`${name} requires a value`);
  return { value, next: index + 1 };
}

/**
 * Translate wrapper arguments into vitest arguments.
 *
 * @param {string | undefined} project Vitest project name.
 * @param {string[]} argv
 * @returns {string[]}
 */
export function buildVitestArgs(project, argv) {
  if (project === undefined || project.startsWith('-')) throw new Error('a project name is required');
  /** @type {string[]} */
  const files = [];
  /** @type {string | undefined} */
  let testCase;
  /** @type {string[]} */
  const passthrough = [];
  for (let index = 0; index < argv.length; index += 1) {
    const file = readFlagValue(argv, index, '--file');
    if (file) {
      files.push(file.value);
      index = file.next;
      continue;
    }
    const selected = readFlagValue(argv, index, '--case');
    if (selected) {
      if (testCase !== undefined) throw new Error('--case may be given only once');
      testCase = selected.value;
      index = selected.next;
      continue;
    }
    if (argv[index] !== '--') passthrough.push(argv[index]);
  }
  if (testCase !== undefined && files.length === 0) {
    throw new Error('--case requires --file so the case is looked up in a known suite');
  }
  return [
    'run',
    '--project',
    project,
    ...files,
    ...(testCase === undefined ? [] : ['-t', testCase]),
    ...passthrough,
  ];
}
