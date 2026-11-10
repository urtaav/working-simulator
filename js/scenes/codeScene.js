import { generateFile, pickLang } from '../content/codeGen.js';
import { typeInto, drift, pointAt, runCommand, writeLines } from './common.js';
import { consoleSession } from '../content/shellGen.js';

// Opens a generic file, writes a chunk of it in the middle, saves, moves on.
export async function codeScene(ctx) {
  const { ide, rng, scheduler: s } = ctx;
  ide.showPanel('terminal');
  const tabs = [];
  const paths = [];

  for (;;) {
    const file = generateFile(rng, pickLang(rng), ctx.project);
    const lines = file.content.replace(/\n$/, '').split('\n');
    const from = Math.max(2, Math.floor(lines.length * (0.3 + rng.next() * 0.25)));
    const to = Math.min(lines.length - 1, from + rng.int(8, 26));
    const typed = lines.slice(from, to).join('\n');

    tabs.push(file.name);
    if (tabs.length > 5) tabs.shift();
    paths.push(file.path);
    if (paths.length > 12) paths.shift();
    ide.setTabs([...new Set(tabs)], file.name);
    ide.setTree(paths, file.path);
    ide.setLang(file.lang);
    ctx.identity(file.name);
    ide.editor.open({ name: file.name, lang: file.lang, content: [...lines.slice(0, from), '', ...lines.slice(to)].join('\n'), cursor: { line: from, col: 0 } });

    await s.sleep(rng.int(1200, 3000));
    await pointAt(ctx, '.ide-editor .caret', 40, 12);

    // Ctrl+S every so often, like a person would
    let sinceSave = 0;
    let saveEvery = rng.int(6, 20);
    ctx.onNewline = () => {
      if (++sinceSave >= saveEvery) {
        sinceSave = 0;
        saveEvery = rng.int(6, 20);
        s.after(rng.int(300, 900), () => ide.editor.setDirty(false));
      }
    };
    await typeInto(ctx, ide.editor, typed);
    ctx.onNewline = null;
    await s.sleep(rng.int(400, 1500));
    ide.editor.setDirty(false);

    // sometimes check something in the terminal after writing
    if (rng.chance(0.35)) {
      const step = consoleSession(rng)[1];
      await pointAt(ctx, '.term', 200, 20);
      await runCommand(ctx, step.cmd);
      await writeLines(ctx, step.output);
    }
    await drift(ctx, rng.int(1, 3));
    await s.sleep(rng.int(2000, 7000));
  }
}
