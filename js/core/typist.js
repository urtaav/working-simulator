// Plans keystrokes with human rhythm: irregular speed, pauses at line ends, small typos fixed right away.
const NEIGHBORS = {
  a: 'sqz', b: 'vn', c: 'xv', d: 'sf', e: 'wr', f: 'dg', g: 'fh', h: 'gj', i: 'uo', j: 'hk', k: 'jl', l: 'k',
  m: 'n', n: 'bm', o: 'ip', p: 'o', q: 'w', r: 'et', s: 'ad', t: 'ry', u: 'yi', v: 'cb', w: 'qe', x: 'zc',
  y: 'tu', z: 'x',
};

export function planTyping(text, rng, opts = {}) {
  const wpm = opts.wpm ?? 55;
  const typoRate = opts.typoRate ?? 0.025;
  const base = 60000 / (wpm * 5);
  const actions = [];
  const charDelay = () => Math.round(base * (0.5 + rng.next() * 1.2));
  let atLineStart = true;

  for (const ch of text) {
    if (atLineStart && ch === ' ') {
      // the IDE auto-indents, so leading spaces appear almost at once
      actions.push({ kind: 'char', ch, delay: rng.int(8, 35) });
      continue;
    }
    if (rng.chance(0.03)) actions.push({ kind: 'pause', delay: rng.int(600, 2500) });

    const lower = ch.toLowerCase();
    if (NEIGHBORS[lower] && rng.chance(typoRate)) {
      const wrong = rng.pick(NEIGHBORS[lower].split(''));
      actions.push({ kind: 'char', ch: ch === lower ? wrong : wrong.toUpperCase(), delay: charDelay() });
      actions.push({ kind: 'backspace', delay: rng.int(80, 250) });
    }

    actions.push({ kind: 'char', ch, delay: charDelay() });
    atLineStart = ch === '\n';
    if (ch === '\n' || ch === '{') actions.push({ kind: 'pause', delay: rng.int(500, 1800) });
  }
  return actions;
}
