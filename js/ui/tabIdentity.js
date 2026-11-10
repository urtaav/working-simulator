// Browser tab looks like the editor's own window title; never mentions what this page really is.
const ICONS = {
  vscode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0078d4"/><path d="M9 11l7 5-7 5M17 21h7" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  intellij: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fe2857"/><stop offset="1" stop-color="#7b51f7"/></linearGradient></defs><rect width="32" height="32" rx="6" fill="url(#g)"/><rect x="7" y="7" width="18" height="18" fill="#000"/><rect x="10" y="20" width="8" height="2" fill="#fff"/></svg>',
};

export function titleFor(editor, fileName, project) {
  return editor === 'intellij' ? `${project} – ${fileName}` : `${fileName} - ${project} - Visual Studio Code`;
}

export function setTabIdentity(editor, fileName, project) {
  document.title = titleFor(editor, fileName, project);
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = 'data:image/svg+xml,' + encodeURIComponent(ICONS[editor] ?? ICONS.vscode);
}
