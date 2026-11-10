import { consoleSession } from '../content/shellGen.js';
import { generateFile, pickLang } from '../content/codeGen.js';
import { runCommand, writeLines, drift, pointAt } from './common.js';

// Terminal work: git, builds, tests. The editor keeps showing the last file touched.
export async function consoleScene(ctx) {
  const { ide, rng, scheduler: s } = ctx;
  const file = generateFile(rng, pickLang(rng), ctx.project);
  ide.showPanel('terminal');
  ide.setTabs([file.name], file.name);
  ide.setTree([file.path], file.path);
  ide.setLang(file.lang);
  ctx.identity(file.name);
  ide.editor.open({ name: file.name, lang: file.lang, content: file.content, cursor: { line: rng.int(3, 15), col: 0 } });

  for (;;) {
    for (const step of consoleSession(rng)) {
      await pointAt(ctx, '.term', rng.int(150, 400), 20);
      await runCommand(ctx, step.cmd);
      // builds print slowly, git prints at once
      const slow = /mvnw|npm|pytest/.test(step.cmd);
      if (slow) await s.sleep(rng.int(1500, 5000));
      await writeLines(ctx, step.output, slow ? 60 : 5, slow ? 400 : 30);
      await s.sleep(rng.int(3000, 15000));
      if (rng.chance(0.4)) await drift(ctx, 1);
    }
  }
}
