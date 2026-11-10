import { createNoRepeat } from '../core/noRepeat.js';
import { ENTITIES, tableOf } from './vocab.js';

// Technical queries only: catalogs, plans, locks, sizes. Never business data.
const recent = createNoRepeat(4);

const pad2 = (n) => String(n).padStart(2, '0');
const ts = (rng) => `2026-11-${pad2(rng.int(1, 10))} ${pad2(rng.int(8, 18))}:${pad2(rng.int(0, 59))}:${pad2(rng.int(0, 59))}`;
const table = (rng) => tableOf(rng.pick(ENTITIES));
const rows = (rng, min, max, makeRow) => Array.from({ length: rng.int(min, max) }, (_, i) => makeRow(i));
const APPS = ['platform-api', 'app-core', 'psql', 'DBeaver 24.2', 'flyway', 'scheduler'];

const POSTGRES = [
  function activity(rng) {
    return {
      sql: `SELECT pid, usename, application_name, state, query_start\nFROM pg_stat_activity\nWHERE state <> 'idle'\n  AND datname = current_database();`,
      columns: ['pid', 'usename', 'application_name', 'state', 'query_start'],
      rows: rows(rng, 2, 9, () => [String(rng.int(1200, 98000)), rng.pick(['app', 'app_ro', 'postgres']), rng.pick(APPS), rng.pick(['active', 'idle in transaction', 'active']), ts(rng)]),
    };
  },
  function indexes(rng) {
    const t = table(rng);
    const cols = ['id', 'created_at', 'owner_id', 'status', 'expires_at', 'name'];
    return {
      sql: `SELECT indexname, indexdef\nFROM pg_indexes\nWHERE schemaname = 'public'\n  AND tablename = '${t}';`,
      columns: ['indexname', 'indexdef'],
      rows: rows(rng, 1, 5, (i) => {
        const c = i === 0 ? 'id' : rng.pick(cols);
        const name = i === 0 ? `${t}_pkey` : `idx_${t}_${c}`;
        return [name, `CREATE ${i === 0 ? 'UNIQUE ' : ''}INDEX ${name} ON public.${t} USING btree (${c})`];
      }),
    };
  },
  function tableStats(rng) {
    return {
      sql: `SELECT relname, seq_scan, idx_scan, n_live_tup, n_dead_tup, last_autovacuum\nFROM pg_stat_user_tables\nWHERE n_live_tup > 0\nORDER BY n_dead_tup DESC\nLIMIT 10;`,
      columns: ['relname', 'seq_scan', 'idx_scan', 'n_live_tup', 'n_dead_tup', 'last_autovacuum'],
      rows: rng.shuffle(ENTITIES).slice(0, rng.int(4, 10)).map((e) => [tableOf(e), String(rng.int(0, 900)), String(rng.int(100, 900000)), String(rng.int(50, 2000000)), String(rng.int(0, 40000)), rng.chance(0.2) ? '[NULL]' : ts(rng)]),
    };
  },
  function columns(rng) {
    const t = table(rng);
    const defs = [['id', 'bigint', 'NO', "nextval('" + t + "_id_seq'::regclass)"], ['name', 'character varying', 'NO', '[NULL]'], ['created_at', 'timestamp with time zone', 'NO', 'now()'], ['updated_at', 'timestamp with time zone', 'YES', '[NULL]'], ['enabled', 'boolean', 'NO', 'true'], ['version', 'integer', 'NO', '0'], ['owner_id', 'bigint', 'YES', '[NULL]']];
    return {
      sql: `SELECT column_name, data_type, is_nullable, column_default\nFROM information_schema.columns\nWHERE table_name = '${t}';`,
      columns: ['column_name', 'data_type', 'is_nullable', 'column_default'],
      rows: defs.slice(0, rng.int(4, defs.length)),
    };
  },
  function locks(rng) {
    return {
      sql: `SELECT l.locktype, l.relation::regclass AS relation, l.mode, l.granted, a.pid\nFROM pg_locks l\nJOIN pg_stat_activity a ON a.pid = l.pid\nWHERE l.relation IS NOT NULL;`,
      columns: ['locktype', 'relation', 'mode', 'granted', 'pid'],
      rows: rows(rng, 1, 6, () => ['relation', table(rng), rng.pick(['AccessShareLock', 'RowExclusiveLock', 'RowShareLock']), rng.pick(['true', 'true', 'false']), String(rng.int(1200, 98000))]),
    };
  },
  function explain(rng) {
    const t = table(rng);
    const col = rng.pick(['owner_id', 'status', 'created_at', 'expires_at']);
    const useIndex = rng.chance(0.6);
    const ms = (rng.next() * 40 + 0.05).toFixed(3);
    const plan = useIndex
      ? [`Index Scan using idx_${t}_${col} on ${t}  (cost=0.42..8.44 rows=1 width=${rng.int(40, 220)}) (actual time=0.021..0.024 rows=${rng.int(0, 3)} loops=1)`, `  Index Cond: (${col} = $1)`]
      : [`Seq Scan on ${t}  (cost=0.00..${rng.int(800, 9000)}.00 rows=${rng.int(10, 900)} width=${rng.int(40, 220)}) (actual time=0.012..${ms} rows=${rng.int(0, 400)} loops=1)`, `  Filter: (${col} = $1)`, `  Rows Removed by Filter: ${rng.int(1000, 90000)}`];
    return {
      sql: `EXPLAIN ANALYZE\nSELECT *\nFROM ${t}\nWHERE ${col} = $1;`,
      columns: ['QUERY PLAN'],
      rows: [...plan, `Planning Time: ${(rng.next() * 0.5 + 0.05).toFixed(3)} ms`, `Execution Time: ${ms} ms`].map((l) => [l]),
    };
  },
  function sizes(rng) {
    return {
      sql: `SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total_size\nFROM pg_catalog.pg_statio_user_tables\nORDER BY pg_total_relation_size(relid) DESC\nLIMIT 8;`,
      columns: ['relname', 'total_size'],
      rows: rng.shuffle(ENTITIES).slice(0, rng.int(4, 8)).map((e) => [tableOf(e), `${rng.int(8, 900)} ${rng.pick(['kB', 'MB', 'MB'])}`]),
    };
  },
  function dailyCounts(rng) {
    const t = table(rng);
    return {
      sql: `SELECT date_trunc('day', created_at) AS day, count(*)\nFROM ${t}\nWHERE created_at > now() - interval '7 days'\nGROUP BY 1\nORDER BY 1 DESC;`,
      columns: ['day', 'count'],
      rows: Array.from({ length: 7 }, (_, i) => [`2026-11-${pad2(10 - i)} 00:00:00-06`, String(rng.int(0, 4000))]),
    };
  },
  function createIndex(rng) {
    const t = table(rng);
    const col = rng.pick(['owner_id', 'expires_at', 'created_at', 'status']);
    return {
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${t}_${col}\n    ON ${t} (${col});`,
      columns: ['result'],
      rows: [[`CREATE INDEX (${(rng.next() * 3 + 0.2).toFixed(2)} s)`]],
    };
  },
];

const ORACLE = [
  function sessions(rng) {
    return {
      sql: `SELECT sid, serial#, username, status, program, machine\nFROM v$session\nWHERE type = 'USER'\n  AND username IS NOT NULL;`,
      columns: ['SID', 'SERIAL#', 'USERNAME', 'STATUS', 'PROGRAM', 'MACHINE'],
      rows: rows(rng, 2, 9, () => [String(rng.int(10, 900)), String(rng.int(1000, 65000)), rng.pick(['APP_USER', 'APP_RO', 'SYSTEM']), rng.pick(['ACTIVE', 'INACTIVE', 'INACTIVE']), rng.pick(['JDBC Thin Client', 'SQL Developer', 'sqlplus@build', 'DBeaver 24.2']), rng.pick(['app-01', 'app-02', 'dev-laptop', 'ci-runner'])]),
    };
  },
  function tables(rng) {
    return {
      sql: `SELECT owner, table_name, num_rows, last_analyzed\nFROM all_tables\nWHERE owner = 'APP_USER'\nFETCH FIRST 15 ROWS ONLY;`,
      columns: ['OWNER', 'TABLE_NAME', 'NUM_ROWS', 'LAST_ANALYZED'],
      rows: rng.shuffle(ENTITIES).slice(0, rng.int(4, 12)).map((e) => ['APP_USER', tableOf(e).toUpperCase(), String(rng.int(0, 3000000)), `${pad2(rng.int(1, 10))}/11/26`]),
    };
  },
  function userIndexes(rng) {
    const t = table(rng).toUpperCase();
    return {
      sql: `SELECT index_name, table_name, uniqueness, status\nFROM user_indexes\nWHERE table_name = '${t}';`,
      columns: ['INDEX_NAME', 'TABLE_NAME', 'UNIQUENESS', 'STATUS'],
      rows: rows(rng, 1, 4, (i) => [i === 0 ? `PK_${t}` : `IDX_${t}_${rng.pick(['OWNER', 'STATUS', 'CREATED', 'EXPIRES'])}`, t, i === 0 ? 'UNIQUE' : 'NONUNIQUE', 'VALID']),
    };
  },
  function tabColumns(rng) {
    const t = table(rng).toUpperCase();
    const defs = [['ID', 'NUMBER', 'N', '22'], ['NAME', 'VARCHAR2', 'N', '255'], ['CREATED_AT', 'TIMESTAMP(6)', 'N', '11'], ['UPDATED_AT', 'TIMESTAMP(6)', 'Y', '11'], ['ENABLED', 'NUMBER', 'N', '1'], ['VERSION', 'NUMBER', 'N', '22']];
    return {
      sql: `SELECT column_name, data_type, nullable, data_length\nFROM user_tab_columns\nWHERE table_name = '${t}';`,
      columns: ['COLUMN_NAME', 'DATA_TYPE', 'NULLABLE', 'DATA_LENGTH'],
      rows: defs.slice(0, rng.int(3, defs.length)),
    };
  },
  function xplan(rng) {
    const t = table(rng).toUpperCase();
    return {
      sql: `SELECT *\nFROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(NULL, NULL, 'BASIC'));`,
      columns: ['PLAN_TABLE_OUTPUT'],
      rows: [
        `SQL_ID  ${Math.floor(rng.next() * 1e12).toString(36)}, child number 0`,
        '-------------------------------------------',
        '| Id  | Operation                   | Name |',
        '-------------------------------------------',
        '|   0 | SELECT STATEMENT            |      |',
        `|   1 |  TABLE ACCESS BY INDEX ROWID| ${t} |`,
        `|   2 |   INDEX RANGE SCAN          | IDX_${t}_OWNER |`,
      ].map((l) => [l]),
    };
  },
  function segmentSize(rng) {
    return {
      sql: `SELECT segment_name, ROUND(bytes / 1024 / 1024, 1) AS size_mb\nFROM user_segments\nWHERE segment_type = 'TABLE'\nFETCH FIRST 10 ROWS ONLY;`,
      columns: ['SEGMENT_NAME', 'SIZE_MB'],
      rows: rng.shuffle(ENTITIES).slice(0, rng.int(3, 10)).map((e) => [tableOf(e).toUpperCase(), (rng.next() * 900).toFixed(1)]),
    };
  },
];

export function generateQuery(rng, dialect) {
  const pool = dialect === 'oracle' ? ORACLE : POSTGRES;
  const gen = recent.pickFresh(rng, pool, (g) => g.name);
  const q = gen(rng);
  return { ...q, elapsedMs: rng.int(3, 900) };
}
