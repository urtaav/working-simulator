import { generateQuery } from '../content/sqlGen.js';
import { typeInto, drift, pointAt } from './common.js';

// Database console: write a technical query, run it, read the grid.
export async function queryScene(ctx) {
  const { ide, rng, scheduler: s } = ctx;
  const dialect = rng.chance(0.65) ? 'postgres' : 'oracle';
  const name = ide.skin() === 'intellij' ? `console [${dialect === 'oracle' ? 'XEPDB1' : 'app_db'}]` : `scratch_${rng.int(1, 9)}.sql`;
  const header = dialect === 'oracle' ? '-- APP_USER@localhost:1521/XEPDB1' : '-- app_db@localhost:5432';

  ide.showPanel('database');
  ide.grid.clear();
  ide.setTabs([name], name);
  ide.setTree(['db/migration/V1__baseline.sql', 'db/migration/V2__audit_tables.sql', 'db/queries/' + name], 'db/queries/' + name);
  ide.setLang('sql');
  ctx.identity(name);
  ide.editor.open({ name, lang: 'sql', content: `${header}\n\n` });

  for (;;) {
    const q = generateQuery(rng, dialect);
    await s.sleep(rng.int(800, 2500));
    await pointAt(ctx, '.ide-editor .caret', 40, 12);
    await typeInto(ctx, ide.editor, q.sql, { wpm: 60 });
    await s.sleep(rng.int(400, 1400)); // Ctrl+Enter
    ide.grid.running(q.sql);
    await s.sleep(Math.min(3000, q.elapsedMs * 3 + rng.int(200, 600)));
    ide.grid.show(q);
    await pointAt(ctx, '.grid', rng.int(60, 300), rng.int(30, 120));
    await s.sleep(rng.int(4000, 15000));
    await drift(ctx, rng.int(0, 2));
    await typeInto(ctx, ide.editor, '\n\n');
  }
}
