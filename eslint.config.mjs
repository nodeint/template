import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import onlyWarn from 'eslint-plugin-only-warn';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';

/** Boolean names as is/has/can/should (locals + args; not function names). */
const BOOLEAN_NAME_OPTIONS = {
  checkFunctions: 'never',
  prefixes: {
    is: true,
    has: true,
    can: true,
    should: true,
    are: false,
    have: false,
    was: false,
    were: false,
    did: false,
    will: false,
    requires: false,
  },
  ignore: ['^value$', '^v$', '^next$', '^flag$'],
};

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/dist-test/**',
  '**/.vscode-test/**',
  '**/.git/**',
  '**/.tmp/**',
  '**/fixtures/**',
  '**/*.generated.ts',
];

const TEST_FILE_GLOBS = ['**/*.test.{ts,tsx}', '**/*.integration.test.{ts,tsx}', '**/*.specs.ts'];

const SIZE_SKIP = { skipBlankLines: true, skipComments: true };

// Base: non-type-aware (naming, logic, functions, formatting, imports).
const baseConfig = {
  files: ['**/*.{ts,tsx}'],
  extends: [eslint.configs.recommended, tseslint.configs.recommended],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    globals: globals.node,
  },
  plugins: {
    'only-warn': onlyWarn,
    'simple-import-sort': simpleImportSort,
    sonarjs,
    unicorn,
  },
  rules: {
    // Imports
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',

    // Naming
    '@typescript-eslint/naming-convention': [
      'warn',
      { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
      { selector: 'function', format: ['camelCase', 'PascalCase'] },
      { selector: 'typeLike', format: ['PascalCase'] },
      {
        selector: 'variable',
        modifiers: ['const', 'global'],
        format: ['UPPER_CASE', 'camelCase', 'PascalCase'],
      },
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: { regex: '^I[A-Z]', match: false },
      },
      { selector: 'enumMember', format: ['PascalCase', 'UPPER_CASE'] },
    ],

    // Types
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-inferrable-types': 'warn',
    '@typescript-eslint/consistent-type-assertions': [
      'warn',
      { assertionStyle: 'as', objectLiteralTypeAssertions: 'allow-as-parameter' },
    ],
    '@typescript-eslint/prefer-as-const': 'warn',

    // Logic
    'eqeqeq': ['warn', 'always'],
    'no-nested-ternary': 'warn',
    'no-extra-boolean-cast': 'warn',
    'no-magic-numbers': [
      'warn',
      {
        ignore: [0, 1, -1],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        enforceConst: true,
      },
    ],
    'max-depth': ['warn', { max: 3 }],
    'max-nested-callbacks': ['warn', { max: 1 }],
    'complexity': ['warn', { max: 15 }],
    'max-statements': ['warn', { max: 20 }],
    'sonarjs/cognitive-complexity': ['warn', 15],
    'unicorn/consistent-function-scoping': ['warn', { checkArrowFunctions: false }],
    'no-lonely-if': 'warn',
    'operator-assignment': 'warn',
    'unicorn/explicit-length-check': ['warn', { 'non-zero': 'greater-than' }],
    'brace-style': ['warn', '1tbs', { allowSingleLine: true }],

    // Functions
    'max-params': ['warn', { max: 3 }],
    'prefer-rest-params': 'warn',
    'prefer-arrow-callback': 'warn',
    'no-param-reassign': [
      'warn',
      {
        props: true,
        ignorePropertyModificationsFor: [
          'acc', 'accumulator', 'draft', 'state',
          'req', 'request', 'res', 'response', 'ctx', 'context',
        ],
      },
    ],
    '@typescript-eslint/default-param-last': 'warn',
    'unicorn/prefer-default-parameters': 'warn',
    '@typescript-eslint/explicit-member-accessibility': [
      'warn',
      {
        accessibility: 'explicit',
        overrides: { constructors: 'no-public' },
      },
    ],
    '@typescript-eslint/no-useless-constructor': 'warn',

    // Arrays & objects
    '@typescript-eslint/array-type': ['warn', { default: 'array' }],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'prefer-destructuring': [
      'warn',
      {
        VariableDeclarator: { array: true, object: true },
        AssignmentExpression: { array: false, object: false },
      },
      { enforceForRenamedProperties: false },
    ],
    'prefer-spread': 'warn',

    // Formatting
    'max-len': [
      'warn',
      { code: 120, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true },
    ],
    'no-tabs': 'warn',
    'semi': ['warn', 'always'],
    'quotes': ['warn', 'single', { avoidEscape: true }],

    // Hygiene
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
    'no-empty': ['warn', { allowEmptyCatch: false }],
  },
};

// Type-aware: one project service for every package.
const typeAwareConfig = {
  files: ['**/src/**/*.{ts,tsx}'],
  extends: [tseslint.configs.recommendedTypeChecked],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/no-misused-promises': 'warn',
    '@typescript-eslint/await-thenable': 'warn',
    '@typescript-eslint/only-throw-error': 'warn',
    '@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': [
      'warn',
      {
        ignoreConditionalTests: true,
        ignoreMixedLogicalExpressions: true,
        ignorePrimitives: { boolean: true },
      },
    ],
    '@typescript-eslint/switch-exhaustiveness-check': [
      'warn',
      { considerDefaultExhaustiveForUnions: true },
    ],
    '@typescript-eslint/no-confusing-void-expression': [
      'warn',
      { ignoreArrowShorthand: true },
    ],
    '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'warn',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
    '@typescript-eslint/no-unsafe-type-assertion': 'warn',
    '@typescript-eslint/prefer-readonly': 'warn',
    'unicorn/prefer-await': 'warn',
    'unicorn/consistent-boolean-name': ['warn', BOOLEAN_NAME_OPTIONS],
  },
};

const sizeConfig = {
  files: ['**/*.{ts,tsx}'],
  rules: {
    'max-lines': ['warn', { max: 512, ...SIZE_SKIP }],
    'max-lines-per-function': ['warn', { max: 80, ...SIZE_SKIP }],
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
  },
};

// Tests follow the production rules except these, which do not fit how tests are written.
const testFilesConfig = {
  files: TEST_FILE_GLOBS,
  rules: {
    // Suites and table-driven tests are longer and nest callbacks, but stay bounded for readers and agents.
    'max-lines': ['warn', { max: 1024, ...SIZE_SKIP }],
    'max-lines-per-function': ['warn', { max: 160, ...SIZE_SKIP }],
    'max-nested-callbacks': ['warn', { max: 3 }],
    'max-statements': ['warn', { max: 40 }],
    // Expected values are written inline.
    'no-magic-numbers': 'off',
    // Table-driven callbacks take one argument per column.
    'max-params': 'off',
    // Narrowing after an assertion and partial fakes.
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unsafe-type-assertion': 'off',
    // Mocks, parsed JSON, and asymmetric matchers are loosely typed.
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
  },
};

export default defineConfig(
  { ignores: IGNORE_PATTERNS },
  baseConfig,
  typeAwareConfig,
  sizeConfig,
  testFilesConfig
);
