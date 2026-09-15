import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Exercise the actual shared TypeScript module, without a second test bundler.
const source = await readFile(new URL('../lib/domain.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { findMatches } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const report = (extra = {}) => ({
  id: 'lost', owner: 'aarav', type: 'lost', title: 'Water bottle',
  description: 'Insulated drinking container', category: 'Bottles',
  location: 'Central Library', color: 'Black', status: 'open',
  date: '2026-09-15', image: '', createdAt: 1, ...extra,
});

test('finds an opposite-type item and explains shared attributes', () => {
  const matches = findMatches(report(), [report({ id: 'found', type: 'found' })]);
  assert.equal(matches.length, 1);
  assert.ok(matches[0].reasons.includes('Same location'));
  assert.ok(matches[0].reasons.includes('Same category'));
});
test('excludes own report, same type, hidden, returned and unrelated categories', () => {
  const variants = [
    report(), report({ id: 'same-type' }),
    report({ id: 'hidden', type: 'found', status: 'hidden' }),
    report({ id: 'returned', type: 'found', status: 'returned' }),
    report({ id: 'wrong-category', type: 'found', category: 'Electronics' }),
  ];
  assert.deepEqual(findMatches(report(), variants), []);
});
test('category alone does not count as a meaningful match', () => {
  const unrelated = report({ id: 'other', type: 'found', title: 'Unrelated', description: 'Nothing shared', location: 'Main Gate', color: 'Red' });
  assert.deepEqual(findMatches(report(), [unrelated]), []);
});
test('returns at most four suggestions, strongest first', () => {
  const candidates = Array.from({ length: 8 }, (_, i) => report({ id: 'item-' + i, type: 'found', color: i === 7 ? 'Black' : 'Red' }));
  const matches = findMatches(report(), candidates);
  assert.equal(matches.length, 4);
  assert.equal(matches[0].report.id, 'item-7');
});
