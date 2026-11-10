import { createEditorView } from './editorView.js';
import { createPanelView } from './panelView.js';
import { createGridView } from './gridView.js';

const LANG_LABEL = { java: 'Java', ts: 'TypeScript', tsx: 'TypeScript JSX', python: 'Python', html: 'HTML', sql: 'SQL', yaml: 'YAML', shell: 'Shell Script' };

const SKINS = {
  vscode: {
    sidebarTitle: 'EXPLORER',
    panelTabs: {
      terminal: [['PROBLEMS'], ['OUTPUT'], ['DEBUG CONSOLE'], ['TERMINAL', true], ['PORTS']],
      run: [['PROBLEMS'], ['OUTPUT'], ['DEBUG CONSOLE', true], ['TERMINAL'], ['PORTS']],
      database: [['PROBLEMS'], ['OUTPUT'], ['QUERY RESULTS', true], ['TERMINAL']],
      services: [['PROBLEMS'], ['OUTPUT'], ['DEBUG CONSOLE'], ['TERMINAL', true], ['PORTS']],
    },
    activity: ['files', 'search', 'git', 'run', 'ext', 'db'],
  },
  intellij: {
    sidebarTitle: 'Project',
    panelTabs: {
      terminal: [['Terminal', true], ['Local'], ['+']],
      run: [['Run', true], ['Application']],
      database: [['Services', true], ['Output'], ['app_db']],
      services: [['Services', true], ['Docker']],
    },
    activity: ['files', 'git', 'structure', 'db', 'run', 'terminal'],
  },
};

const ICON = {
  files: '<path d="M6 3h7l5 5v13H6z M13 3v5h5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
  git: '<circle cx="7" cy="6" r="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="9" r="2"/><path d="M7 8v8M17 11c0 4-10 2-10 5"/>',
  run: '<path d="M8 5v14l11-7z"/>',
  ext: '<path d="M4 4h7v7H4zM13 13h7v7h-7zM4 13h7v7H4zM15 3l5 5-5 5-5-5z"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  structure: '<path d="M5 5h14M8 10h11M8 15h11M5 20h14"/>',
  terminal: '<path d="M4 5h16v14H4z M7 10l3 2-3 2M12 15h5"/>',
};

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

export function createIde(root, opts) {
  let editor = opts.editor;
  let project = opts.project;
  let branch = 'main';
  let panelKind = 'terminal';
  let tabs = [];
  let activeTab = '';
  let dirty = false;

  root.textContent = '';
  const ide = el('div', 'ide');
  const titlebar = el('header', 'ide-titlebar');
  const body = el('div', 'ide-body');
  const activity = el('nav', 'ide-activity');
  const sidebar = el('aside', 'ide-sidebar');
  const sideTitle = el('div', 'side-title');
  const tree = el('div', 'tree');
  sidebar.append(sideTitle, tree);
  const main = el('main', 'ide-main');
  const tabBar = el('div', 'ide-tabs');
  const crumbs = el('div', 'ide-crumbs');
  const editorEl = el('div', 'ide-editor');
  const panel = el('section', 'ide-panel');
  const panelTabs = el('div', 'panel-tabs');
  const termEl = el('div', 'panel-body term');
  const gridEl = el('div', 'panel-body grid-host');
  panel.append(panelTabs, termEl, gridEl);
  main.append(tabBar, crumbs, editorEl, panel);
  body.append(activity, sidebar, main);
  const status = el('footer', 'ide-status');
  ide.append(titlebar, body, status);
  root.appendChild(ide);

  let statusState = { branch, lang: 'Java', line: 1, col: 1 };

  const editorView = createEditorView(editorEl, {
    onCursor: (line, col) => setStatus({ line, col }),
    onDirty: (d) => {
      dirty = d;
      renderTabs();
    },
  });
  const panelView = createPanelView(termEl);
  const gridView = createGridView(gridEl);

  function renderTitlebar() {
    titlebar.textContent = '';
    if (editor === 'vscode') {
      const menus = el('div', 'tb-menus');
      for (const m of ['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help']) menus.appendChild(el('span', 'tb-menu', m));
      const center = el('div', 'tb-center');
      center.appendChild(el('div', 'tb-search', project));
      titlebar.append(el('span', 'tb-logo'), menus, center, windowControls());
    } else {
      const left = el('div', 'tb-left');
      left.append(el('span', 'tb-burger', '≡'), el('span', 'tb-widget tb-project', `${initials(project)}  ${project}  ⌄`), el('span', 'tb-widget', `⑂ ${branch}  ⌄`));
      const right = el('div', 'tb-right');
      right.append(el('span', 'tb-widget', 'Application  ⌄'), el('span', 'tb-icon tb-run', '▶'), el('span', 'tb-icon tb-debug', '✱'), el('span', 'tb-icon', '⋮'));
      titlebar.append(left, el('div', 'tb-spacer'), right, windowControls());
    }
  }

  function windowControls() {
    const w = el('div', 'tb-window');
    w.append(el('span', null, '—'), el('span', null, '▢'), el('span', null, '✕'));
    return w;
  }

  function renderActivity() {
    activity.textContent = '';
    SKINS[editor].activity.forEach((name, i) => {
      const b = el('span', 'act-item' + (i === 0 ? ' is-active' : ''));
      b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;
      activity.appendChild(b);
    });
  }

  function renderTabs() {
    tabBar.textContent = '';
    for (const name of tabs) {
      const t = el('div', 'tab' + (name === activeTab ? ' is-active' : ''));
      t.append(el('span', 'tab-icon tab-icon--' + extOf(name)), el('span', 'tab-name', name));
      t.appendChild(el('span', 'tab-close', name === activeTab && dirty ? '●' : '×'));
      tabBar.appendChild(t);
    }
  }

  function renderPanelTabs() {
    panelTabs.textContent = '';
    for (const [label, active] of SKINS[editor].panelTabs[panelKind]) panelTabs.appendChild(el('span', 'ptab' + (active ? ' is-active' : ''), label));
    termEl.hidden = panelKind === 'database';
    gridEl.hidden = panelKind !== 'database';
  }

  function setTree(paths, active) {
    tree.textContent = '';
    const row = (depth, label, kind, isActive) => {
      const r = el('div', `tree-row tree-${kind}` + (isActive ? ' is-active' : ''));
      r.style.paddingLeft = `${8 + depth * 14}px`;
      r.append(el('span', 'tree-arrow', kind === 'dir' ? '⌄' : kind === 'dir-closed' ? '›' : ''), el('span', 'tab-icon tab-icon--' + (kind.startsWith('dir') ? 'dir' : extOf(label))), el('span', null, label));
      tree.appendChild(r);
    };
    row(0, project, 'dir');
    const parts = active.split('/');
    const file = parts.pop();
    const shown = new Set();
    parts.forEach((p, i) => row(i + 1, p, 'dir'));
    const siblings = paths.filter((p) => p.startsWith(parts.join('/') + '/')).map((p) => p.slice(parts.join('/').length + 1)).filter((p) => !p.includes('/'));
    for (const f of [...new Set([...siblings, file])].sort()) {
      if (shown.has(f)) continue;
      shown.add(f);
      row(parts.length + 1, f, 'file', f === file);
    }
    const roots = editor === 'intellij' ? ['.idea', 'docker', 'target'] : ['.vscode', 'docker', 'node_modules'];
    roots.forEach((r) => row(1, r, 'dir-closed'));
    ['docker-compose.yml', '.gitignore', 'README.md', rngFile(active)].forEach((f) => row(1, f, 'file'));
    crumbs.textContent = [project, ...parts, file].join(editor === 'intellij' ? ' › ' : ' > ');
  }

  function setStatus(patch) {
    statusState = { ...statusState, ...patch };
    const s = statusState;
    status.textContent = '';
    const left = el('div', 'st-left');
    const right = el('div', 'st-right');
    if (editor === 'vscode') {
      left.append(el('span', 'st-remote', '><'), el('span', null, `⑂ ${s.branch}`), el('span', null, '⟳'), el('span', null, '⊗ 0  ⚠ 0'));
      right.append(el('span', null, `Ln ${s.line}, Col ${s.col}`), el('span', null, 'Spaces: 4'), el('span', null, 'UTF-8'), el('span', null, 'CRLF'), el('span', null, s.lang), el('span', null, '🔔'));
    } else {
      left.append(el('span', null, crumbs.textContent));
      right.append(el('span', null, `${s.line}:${s.col}`), el('span', null, 'CRLF'), el('span', null, 'UTF-8'), el('span', null, '4 spaces'), el('span', null, `⑂ ${s.branch}`));
    }
    status.append(left, right);
  }

  function setSkin(next) {
    editor = next;
    ide.className = `ide ide--${editor}`;
    sideTitle.textContent = SKINS[editor].sidebarTitle;
    renderTitlebar();
    renderActivity();
    renderTabs();
    renderPanelTabs();
    setStatus({});
  }

  setSkin(editor);

  return {
    editor: editorView,
    panel: panelView,
    grid: gridView,
    setSkin,
    skin: () => editor,
    project: () => project,
    setBranch(b) {
      branch = b;
      renderTitlebar();
      setStatus({ branch: b });
    },
    setLang(lang) {
      setStatus({ lang: LANG_LABEL[lang] ?? lang });
    },
    showPanel(kind) {
      panelKind = kind;
      renderPanelTabs();
    },
    setTree,
    setTabs(names, active) {
      tabs = names;
      activeTab = active;
      renderTabs();
    },
    setStatus,
    bounds: () => ide.getBoundingClientRect(),
  };
}

function extOf(name) {
  const m = name.match(/\.([a-z]+)$/i);
  return m ? m[1].toLowerCase() : 'txt';
}

function initials(project) {
  return project.split('-').map((p) => p[0].toUpperCase()).join('').slice(0, 2);
}

function rngFile(active) {
  if (active.endsWith('.java')) return 'pom.xml';
  if (active.endsWith('.py')) return 'pyproject.toml';
  return 'package.json';
}
