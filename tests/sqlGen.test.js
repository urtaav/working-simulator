import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';
import { generateQuery } from '../js/content/sqlGen.js';
import { forbiddenHits } from './helpers.js';

test('result shape is consistent', () => {
  for (let s = 1; s <= 100; s++) {
    for (const dialect of ['postgres', 'oracle']) {
      const q = generateQuery(createRng(s), dialect);
      assert.ok(q.columns.length >= 1);
      assert.ok(q.rows.length >= 1 && q.rows.length <= 30, `rows ${q.rows.length}`);
      assert.ok(q.rows.every((r) => r.length === q.columns.length));
      assert.ok(q.sql.trim().endsWith(';'));
      assert.ok(q.elapsedMs > 0);
    }
  }
});

test('first column values are unique within a result', () => {
  for (let s = 1; s <= 100; s++) {
    for (const d of ['postgres', 'oracle']) {
      const q = generateQuery(createRng(s), d);
      if (q.columns[0] === 'QUERY PLAN' || q.columns[0] === 'PLAN_TABLE_OUTPUT' || q.columns[0] === 'pid' || q.columns[0] === 'SID' || q.columns[0] === 'locktype' || q.columns[0] === 'OWNER') continue;
      const firsts = q.rows.map((r) => r[0]);
      assert.equal(new Set(firsts).size, firsts.length, q.sql);
    }
  }
});

test('queries vary', () => {
  const sqls = new Set();
  for (let s = 1; s <= 40; s++) sqls.add(generateQuery(createRng(s), 'postgres').sql);
  assert.ok(sqls.size >= 15);
});

test('dialect-specific catalogs', () => {
  let pg = '';
  let ora = '';
  for (let s = 1; s <= 60; s++) {
    pg += generateQuery(createRng(s), 'postgres').sql;
    ora += generateQuery(createRng(s), 'oracle').sql;
  }
  assert.match(pg, /pg_stat_activity|pg_indexes|pg_locks|information_schema/);
  assert.match(ora, /v\$session|all_tables|user_indexes/);
});

test('no business-domain words', () => {
  for (let s = 1; s <= 200; s++) {
    for (const d of ['postgres', 'oracle']) {
      const q = generateQuery(createRng(s), d);
      // ORDER BY is SQL syntax, not a business word
      const text = (q.sql + " " + q.columns.join(" ") + " " + q.rows.flat().join(" ")).replace(/order\s+by/gi, '');
      assert.deepEqual(forbiddenHits(text), [], q.sql);
    }
  }
});
