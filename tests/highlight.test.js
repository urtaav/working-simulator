import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeLine } from '../js/core/highlight.js';

const kindOf = (tokens, text) => tokens.find((t) => t.text === text)?.kind;
const joined = (tokens) => tokens.map((t) => t.text).join('');

test('java keywords, annotation and type', () => {
  const line = '@Service public class Foo {';
  const { tokens } = tokenizeLine(line, 'java');
  assert.equal(kindOf(tokens, '@Service'), 'ann');
  assert.equal(kindOf(tokens, 'public'), 'kw');
  assert.equal(kindOf(tokens, 'class'), 'kw');
  assert.equal(kindOf(tokens, 'Foo'), 'type');
  assert.equal(joined(tokens), line);
});

test('java string and line comment', () => {
  const line = 'String s = "a"; // note';
  const { tokens } = tokenizeLine(line, 'java');
  assert.equal(kindOf(tokens, '"a"'), 'str');
  assert.equal(kindOf(tokens, '// note'), 'com');
  assert.equal(joined(tokens), line);
});

test('block comment spans lines', () => {
  const first = tokenizeLine('/** doc', 'java');
  assert.equal(first.state.inBlockComment, true);
  const second = tokenizeLine(' */ int x;', 'java', first.state);
  assert.equal(second.tokens[0].kind, 'com');
  assert.equal(kindOf(second.tokens, 'int'), 'kw');
  assert.equal(second.state.inBlockComment, false);
  assert.equal(joined(second.tokens), ' */ int x;');
});

test('python decorator, def and function name', () => {
  assert.equal(kindOf(tokenizeLine('@lru_cache', 'python').tokens, '@lru_cache'), 'ann');
  const line = 'def slugify(value: str) -> str:';
  const { tokens } = tokenizeLine(line, 'python');
  assert.equal(kindOf(tokens, 'def'), 'kw');
  assert.equal(kindOf(tokens, 'slugify'), 'fn');
  assert.equal(joined(tokens), line);
});

test('python hash comment', () => {
  assert.equal(kindOf(tokenizeLine('x = 1  # why', 'python').tokens, '# why'), 'com');
});

test('html tag, attribute and value', () => {
  const line = '<div class="flex gap-2">';
  const { tokens } = tokenizeLine(line, 'html');
  assert.equal(kindOf(tokens, 'div'), 'tag');
  assert.equal(kindOf(tokens, 'class'), 'attr');
  assert.equal(kindOf(tokens, '"flex gap-2"'), 'str');
  assert.equal(joined(tokens), line);
});

test('sql keywords are case-insensitive', () => {
  const line = 'select relname from pg_stat_user_tables';
  const { tokens } = tokenizeLine(line, 'sql');
  assert.equal(kindOf(tokens, 'select'), 'kw');
  assert.equal(kindOf(tokens, 'from'), 'kw');
  assert.equal(joined(tokens), line);
});

test('ts and tsx keywords and numbers', () => {
  const line = 'export const MAX = 42;';
  const { tokens } = tokenizeLine(line, 'ts');
  assert.equal(kindOf(tokens, 'export'), 'kw');
  assert.equal(kindOf(tokens, '42'), 'num');
  assert.equal(joined(tokens), line);
  const jsx = '  return <div className="p-4">{label}</div>;';
  assert.equal(joined(tokenizeLine(jsx, 'tsx').tokens), jsx);
});

test('every language round-trips arbitrary text', () => {
  const samples = ['', '   ', 'a+b*(c-1)', '"unterminated', 'key: value # c', '$ docker ps -a', '<!-- x -->'];
  for (const lang of ['java', 'ts', 'tsx', 'python', 'html', 'sql', 'yaml', 'shell']) {
    for (const s of samples) assert.equal(joined(tokenizeLine(s, lang).tokens), s, `${lang}: ${s}`);
  }
});
