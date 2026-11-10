// SQL result grid. Each show() replaces the previous result, so nothing piles up.
export function createGridView(el) {
  function clear() {
    el.textContent = '';
  }

  function show({ columns, rows, elapsedMs }) {
    clear();
    const info = document.createElement('div');
    info.className = 'grid-info';
    info.textContent = `${rows.length} row${rows.length === 1 ? '' : 's'} retrieved starting from 1 in ${elapsedMs} ms (execution: ${Math.max(1, Math.round(elapsedMs * 0.8))} ms, fetching: ${Math.max(1, Math.round(elapsedMs * 0.2))} ms)`;

    const wrap = document.createElement('div');
    wrap.className = 'grid-wrap';
    const table = document.createElement('table');
    table.className = 'grid';
    const head = table.createTHead().insertRow();
    head.appendChild(Object.assign(document.createElement('th'), { className: 'grid-idx' }));
    for (const c of columns) head.appendChild(Object.assign(document.createElement('th'), { textContent: c }));
    const body = table.createTBody();
    rows.forEach((r, i) => {
      const tr = body.insertRow();
      tr.appendChild(Object.assign(document.createElement('td'), { className: 'grid-idx', textContent: String(i + 1) }));
      for (const v of r) {
        const td = document.createElement('td');
        td.textContent = v;
        if (v === '[NULL]') td.className = 'is-null';
        else if (/^-?\d+(\.\d+)?$/.test(v)) td.className = 'is-num';
        tr.appendChild(td);
      }
    });
    wrap.appendChild(table);
    el.append(info, wrap);
  }

  function running(sqlPreview) {
    clear();
    const info = document.createElement('div');
    info.className = 'grid-info is-running';
    info.textContent = `Executing: ${sqlPreview.split('\n')[0]} …`;
    el.appendChild(info);
  }

  return { show, clear, running };
}
