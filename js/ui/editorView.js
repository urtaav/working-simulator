import { tokenizeLine } from '../core/highlight.js';

export const MAX_EDITOR_LINES = 220;

// Line-numbered, highlighted editor. Typing happens at the cursor, so scenes can
// "write" a method in the middle of an existing file instead of only appending.
export function createEditorView(el, { onCursor, onDirty } = {}) {
  let lang = 'plain';
  let lines = [''];
  let states = [];
  let rows = [];
  let cur = { line: 0, col: 0 };
  const caret = document.createElement('span');
  caret.className = 'caret';

  function makeRow() {
    const row = document.createElement('div');
    row.className = 'ed-row';
    const num = document.createElement('span');
    num.className = 'ed-num';
    const code = document.createElement('span');
    code.className = 'ed-code';
    row.append(num, code);
    return row;
  }

  function renderLine(i) {
    const prev = i > 0 ? states[i - 1] : undefined;
    const { tokens, state } = tokenizeLine(lines[i], lang, prev);
    const changed = !states[i] || states[i].inBlockComment !== state.inBlockComment;
    states[i] = state;
    const code = rows[i].lastChild;
    code.textContent = '';
    for (const t of tokens) {
      const span = document.createElement('span');
      span.className = `tk-${t.kind}`;
      span.textContent = t.text;
      code.appendChild(span);
    }
    if (!tokens.length) code.append('​');
    return changed;
  }

  // a change in block-comment state ripples down until it settles
  function renderFrom(i) {
    for (let j = i; j < lines.length; j++) {
      if (!renderLine(j) && j > i) break;
    }
  }

  function renumber(from = 0) {
    for (let i = from; i < rows.length; i++) rows[i].firstChild.textContent = String(i + 1);
  }

  function placeCaret() {
    rows.forEach((r) => r.classList.remove('is-current'));
    const row = rows[cur.line];
    row.classList.add('is-current');
    // caret goes after the character at `col`; walk text nodes to find the spot
    const code = row.lastChild;
    let remaining = cur.col;
    let placed = false;
    for (const span of code.childNodes) {
      const len = span.textContent.replace('​', '').length;
      if (remaining <= len && span.firstChild?.nodeType === 3) {
        const text = span.firstChild;
        if (remaining < len) text.splitText(remaining);
        span.insertBefore(caret, text.nextSibling);
        placed = true;
        break;
      }
      remaining -= len;
    }
    if (!placed) code.appendChild(caret);
    keepInView(row);
    onCursor?.(cur.line + 1, cur.col + 1);
  }

  function keepInView(row) {
    const top = row.offsetTop;
    const h = el.clientHeight;
    if (top < el.scrollTop + 40 || top > el.scrollTop + h - 80) {
      el.scrollTop = Math.max(0, top - h * 0.55);
    }
  }

  function trimTop() {
    while (lines.length > MAX_EDITOR_LINES && cur.line > 20) {
      lines.shift();
      states.shift();
      rows.shift().remove();
      cur.line--;
    }
    renumber();
  }

  return {
    open(file) {
      lang = file.lang;
      lines = (file.content ?? '').split('\n');
      if (lines.length > 1 && lines.at(-1) === '') lines.pop();
      states = [];
      el.textContent = '';
      rows = lines.map(() => makeRow());
      el.append(...rows);
      renumber();
      for (let i = 0; i < lines.length; i++) renderLine(i);
      cur = file.cursor ?? { line: lines.length - 1, col: lines.at(-1).length };
      el.scrollTop = 0;
      placeCaret();
      onDirty?.(false);
    },
    typeChar(ch) {
      const line = lines[cur.line];
      if (ch === '\n') {
        lines.splice(cur.line + 1, 0, line.slice(cur.col));
        lines[cur.line] = line.slice(0, cur.col);
        const row = makeRow();
        rows[cur.line].after(row);
        rows.splice(cur.line + 1, 0, row);
        states.splice(cur.line + 1, 0, undefined);
        renderLine(cur.line);
        cur = { line: cur.line + 1, col: 0 };
        renumber(cur.line - 1);
        renderFrom(cur.line);
        trimTop();
      } else {
        lines[cur.line] = line.slice(0, cur.col) + ch + line.slice(cur.col);
        cur.col++;
        renderFrom(cur.line);
      }
      placeCaret();
      onDirty?.(true);
    },
    backspace() {
      if (cur.col > 0) {
        const line = lines[cur.line];
        lines[cur.line] = line.slice(0, cur.col - 1) + line.slice(cur.col);
        cur.col--;
        renderFrom(cur.line);
      } else if (cur.line > 0) {
        const prevLen = lines[cur.line - 1].length;
        lines[cur.line - 1] += lines[cur.line];
        lines.splice(cur.line, 1);
        states.splice(cur.line, 1);
        rows.splice(cur.line, 1)[0].remove();
        cur = { line: cur.line - 1, col: prevLen };
        renumber(cur.line);
        renderFrom(cur.line);
      }
      placeCaret();
      onDirty?.(true);
    },
    setTyping(on) {
      caret.classList.toggle('is-typing', on);
    },
    setDirty(d) {
      onDirty?.(d);
    },
    lineCount: () => lines.length,
    cursor: () => ({ ...cur }),
  };
}
