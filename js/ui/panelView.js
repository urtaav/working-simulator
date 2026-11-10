export const MAX_PANEL_LINES = 400;

// Pure part: keeps at most `max` lines so the page can run for hours.
export function createLineBuffer(max = MAX_PANEL_LINES) {
  const lines = [];
  return {
    push(line) {
      lines.push(line);
      return lines.length > max ? lines.splice(0, lines.length - max) : [];
    },
    lines: () => lines.slice(),
    clear() {
      lines.length = 0;
    },
  };
}

// Terminal-like panel. Lines are plain text; `kind` adds a color class (prompt, ok, warn, dim).
export function createPanelView(el) {
  const buffer = createLineBuffer();
  let current = null;

  function addLine(text, kind) {
    const div = document.createElement('div');
    div.className = 'term-line' + (kind ? ` term-${kind}` : '');
    div.textContent = text;
    el.appendChild(div);
    for (let i = buffer.push(text).length; i > 0; i--) el.firstChild?.remove();
    el.scrollTop = el.scrollHeight;
    return div;
  }

  return {
    prompt(text) {
      addLine(text, 'prompt');
    },
    beginPrompt(prefix) {
      current = addLine('', 'prompt');
      const p = document.createElement('span');
      p.className = 'term-ps';
      p.textContent = prefix;
      const cmd = document.createElement('span');
      cmd.className = 'term-cmd';
      const caret = document.createElement('span');
      caret.className = 'term-caret';
      current.append(p, cmd, caret);
    },
    typeChar(ch) {
      current?.querySelector('.term-cmd')?.append(ch);
    },
    backspace() {
      const cmd = current?.querySelector('.term-cmd');
      if (cmd) cmd.textContent = cmd.textContent.slice(0, -1);
    },
    endPrompt() {
      current?.querySelector('.term-caret')?.remove();
      current = null;
    },
    write(line, kind) {
      addLine(line, kind);
    },
    clear() {
      el.textContent = '';
      buffer.clear();
      current = null;
    },
  };
}
