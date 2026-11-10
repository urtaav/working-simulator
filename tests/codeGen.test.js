import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';
import { generateFile, pickLang } from '../js/content/codeGen.js';
import { tokenizeLine } from '../js/core/highlight.js';
import { forbiddenHits } from './helpers.js';

const LANGS = ['java', 'ts', 'tsx', 'python', 'html'];

test('varied output across seeds', () => {
  for (const lang of LANGS) {
    const files = [];
    for (let s = 1; s <= 30; s++) files.push(generateFile(createRng(s), lang));
    assert.ok(new Set(files.map((f) => f.content)).size >= 25, `${lang} contents`);
    assert.ok(new Set(files.map((f) => f.name)).size >= 10, `${lang} names`);
  }
});

test('valid-looking per language', () => {
  for (let s = 1; s <= 40; s++) {
    const java = generateFile(createRng(s), 'java').content;
    assert.ok(java.startsWith('package '));
    assert.equal((java.match(/{/g) || []).length, (java.match(/}/g) || []).length);
    assert.ok(generateFile(createRng(s), 'python').content.includes('def '));
    assert.ok(generateFile(createRng(s), 'html').content.trimStart().startsWith('<'));
    assert.ok(generateFile(createRng(s), 'tsx').content.includes('export'));
    assert.ok(generateFile(createRng(s), 'ts').content.includes('export'));
  }
});

test('file metadata matches language', () => {
  const ext = { java: '.java', ts: '.ts', tsx: '.tsx', python: '.py', html: '.html' };
  for (const lang of LANGS) {
    const f = generateFile(createRng(3), lang);
    assert.equal(f.lang, lang);
    assert.ok(f.name.endsWith(ext[lang]), f.name);
    assert.ok(f.path.endsWith(f.name), f.path);
  }
});

test('no business-domain words', () => {
  for (let s = 1; s <= 200; s++) {
    const f = generateFile(createRng(s), pickLang(createRng(s * 7)));
    assert.deepEqual(forbiddenHits(f.path + '\n' + f.content), [], f.path);
  }
});

test('size bounds fit the editor', () => {
  for (let s = 1; s <= 100; s++) {
    for (const lang of LANGS) {
      const lines = generateFile(createRng(s), lang).content.split('\n').length;
      assert.ok(lines >= 15 && lines <= 180, `${lang} seed ${s}: ${lines} lines`);
    }
  }
});

test('pickLang weights favour java', () => {
  const rng = createRng(1);
  const counts = {};
  for (let i = 0; i < 2000; i++) {
    const l = pickLang(rng);
    counts[l] = (counts[l] || 0) + 1;
  }
  assert.deepEqual(Object.keys(counts).sort(), [...LANGS].sort());
  assert.ok(counts.java > counts.ts && counts.java > counts.html);
});

test('generated code tokenizes without leaving an open block comment', () => {
  for (let s = 1; s <= 30; s++) {
    for (const lang of LANGS) {
      let state;
      for (const line of generateFile(createRng(s), lang).content.split('\n')) state = tokenizeLine(line, lang, state).state;
      assert.equal(state.inBlockComment, false, `${lang} seed ${s}`);
    }
  }
});
