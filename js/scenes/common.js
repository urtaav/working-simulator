import { planTyping } from '../core/typist.js';

// Shared helpers for scenes. Every wait goes through the scene's scheduler, so when the
// director cancels it the scene simply stops at its next await.

export async function typeInto(ctx, sink, text, opts) {
  const { scheduler: s, rng } = ctx;
  sink.setTyping?.(true);
  for (const a of planTyping(text, rng, opts)) {
    if (a.kind === 'pause') {
      sink.setTyping?.(false);
      await s.sleep(a.delay);
      sink.setTyping?.(true);
      continue;
    }
    await s.sleep(a.delay);
    if (a.kind === 'char') sink.typeChar(a.ch);
    else sink.backspace();
    if (a.kind === 'char' && a.ch === '\n') ctx.onNewline?.();
  }
  sink.setTyping?.(false);
}

export async function runCommand(ctx, cmd) {
  const { ide, scheduler: s, rng } = ctx;
  ide.panel.beginPrompt(ctx.prompt());
  await s.sleep(rng.int(300, 1200));
  await typeInto(ctx, ide.panel, cmd, { wpm: 70, typoRate: 0.02 });
  await s.sleep(rng.int(150, 500));
  ide.panel.endPrompt();
}

export function kindOf(line) {
  if (/BUILD SUCCESS|passed in|complete\.|\(healthy\)|Already up to date|Successfully/.test(line)) return 'ok';
  if (/\bWARN\b|warning/i.test(line)) return 'warn';
  return undefined;
}

export async function writeLines(ctx, lines, minMs = 20, maxMs = 120) {
  for (const line of lines) {
    await ctx.scheduler.sleep(ctx.rng.int(minMs, maxMs));
    ctx.ide.panel.write(line, kindOf(line));
  }
}

// Mouse moves now and then while the person "thinks"; scheduler-gated so it stops with the scene.
export async function drift(ctx, times = 1) {
  for (let i = 0; i < times; i++) {
    const r = ctx.ide.bounds();
    await ctx.cursor.idleDrift(ctx.rng, { w: r.width, h: r.height });
    await ctx.scheduler.sleep(ctx.rng.int(400, 2500));
  }
}

export async function pointAt(ctx, selector, dx = 30, dy = 8) {
  const target = document.querySelector(selector);
  if (!target) return;
  const r = target.getBoundingClientRect();
  await ctx.cursor.moveTo({ x: r.left + dx, y: r.top + dy }, ctx.rng);
  await ctx.scheduler.sleep(ctx.rng.int(200, 700));
}
