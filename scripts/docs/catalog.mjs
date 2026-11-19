/**
 * Generate `docs/README.md` from the front matter of every document under `docs/`.
 *
 * Each document needs a `# Title` heading and front matter with `description` and `read_when`.
 * Documents live in one of the directories listed in `SECTIONS`.
 * The layout of the generated file comes from `scripts/docs/catalog.template.md`.
 *
 * Usage:
 *   node scripts/docs/catalog.mjs           write docs/README.md
 *   node scripts/docs/catalog.mjs --check   fail when docs/README.md or a document is out of date
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from '../lib/repo.mjs';

/** Document directories in display order, each with the kind of document it holds. */
const SECTIONS = [
  { dir: 'architecture', title: 'Architecture', holds: 'How the repository is structured and why.' },
  { dir: 'guides', title: 'Guides', holds: 'Steps to complete one task.' },
  { dir: 'reference', title: 'Reference', holds: 'Facts to look up.' },
];

const DOCS_DIR = join(REPO_ROOT, 'docs');
const INDEX_PATH = join(DOCS_DIR, 'README.md');
const TEMPLATE_PATH = join(import.meta.dirname, 'catalog.template.md');
const FRONT_MATTER_KEYS = ['description', 'read_when'];

/**
 * @param {string} text
 * @returns {{ data: Record<string, string>, body: string }}
 */
function parseFrontMatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return { data: {}, body: text };
  /** @type {Record<string, string>} */
  const data = {};
  for (const line of match[1].split('\n')) {
    const pair = /^([a-z_]+):\s*(.+)$/.exec(line);
    if (!pair) throw new Error(`unsupported front matter line: ${line}`);
    data[pair[1]] = pair[2].trim();
  }
  return { data, body: text.slice(match[0].length) };
}

/**
 * @param {string} cell
 * @returns {string}
 */
function escapeCell(cell) {
  return cell.replaceAll('|', String.raw`\|`);
}

/**
 * @returns {{ section: (typeof SECTIONS)[number], file: string, title: string, data: Record<string, string> }[]}
 */
function readDocuments() {
  const known = new Set(SECTIONS.map((section) => section.dir));
  const entries = readdirSync(DOCS_DIR, { withFileTypes: true });
  const stray = entries.filter((e) => (e.isDirectory() ? !known.has(e.name) : e.name !== 'README.md'));
  if (stray.length > 0) {
    const names = stray.map((e) => e.name).join(', ');
    throw new Error(`docs/ may only hold README.md and ${[...known].join(', ')}; found: ${names}`);
  }

  return SECTIONS.flatMap((section) =>
    readdirSync(join(DOCS_DIR, section.dir))
      .filter((name) => name.endsWith('.md'))
      .sort()
      .map((name) => {
        const file = `${section.dir}/${name}`;
        const { data, body } = parseFrontMatter(readFileSync(join(DOCS_DIR, file), 'utf8'));
        const title = /^# (.+)$/m.exec(body)?.[1];
        if (!title) throw new Error(`docs/${file}: missing "# Title" heading`);
        for (const key of FRONT_MATTER_KEYS) {
          if (!data[key]) throw new Error(`docs/${file}: missing front matter "${key}"`);
        }
        return { section, file, title, data };
      }),
  );
}

/** @returns {string} */
function renderIndex() {
  const documents = readDocuments();
  const catalog = SECTIONS.map((section) => {
    const rows = documents
      .filter((doc) => doc.section === section)
      .map((doc) => `| [${doc.title}](${doc.file}) | ${escapeCell(doc.data.description)} | ${escapeCell(doc.data.read_when)} |`);
    if (rows.length === 0) return '';
    return [
      `### ${section.title}`,
      '',
      section.holds,
      '',
      '| Document | Owns | Read when |',
      '| --- | --- | --- |',
      ...rows,
    ].join('\n');
  })
    .filter(Boolean)
    .join('\n\n');
  return readFileSync(TEMPLATE_PATH, 'utf8').replace('{{catalog}}', catalog);
}

const check = process.argv.includes('--check');
let expected;
try {
  expected = renderIndex();
} catch (error) {
  console.error(`docs catalog: ${error.message}`);
  process.exit(1);
}

if (check) {
  if (readFileSync(INDEX_PATH, 'utf8') !== expected) {
    console.error('docs/README.md is out of date; run `pnpm docs:generate`');
    process.exit(1);
  }
  console.log('docs catalog: docs/README.md matches document front matter');
} else {
  writeFileSync(INDEX_PATH, expected);
  console.log('docs catalog: wrote docs/README.md');
}
