import { createRng } from './core/rng.js';
import { createIde } from './ui/ide.js';
import { setTabIdentity } from './ui/tabIdentity.js';
import { generateFile } from './content/codeGen.js';
import { generateQuery } from './content/sqlGen.js';
import { dockerPs } from './content/shellGen.js';

// Temporary chrome preview (?demo=chrome&editor=vscode|intellij&panel=terminal|database)
const params = new URLSearchParams(location.search);
const editor = params.get('editor') === 'intellij' ? 'intellij' : 'vscode';
const rng = createRng(Number(params.get('seed') ?? 7));
const ide = createIde(document.getElementById('app'), { editor, project: 'app-core' });
const file = generateFile(rng, 'java');
ide.setBranch('feature/date-helpers');
ide.setTabs(['UserDto.java', file.name, 'application.yml'], file.name);
ide.setTree([file.path, file.path.replace(file.name, 'DateUtils.java')], file.path);
ide.setLang(file.lang);
ide.editor.open({ ...file, cursor: { line: 12, col: 4 } });
setTabIdentity(editor, file.name, 'app-core');
if (params.get('panel') === 'database') {
  ide.showPanel('database');
  ide.grid.show(generateQuery(rng, 'postgres'));
} else {
  ide.panel.prompt('~/projects/app-core (feature/date-helpers) $ docker ps');
  dockerPs(rng).forEach((l) => ide.panel.write(l));
  ide.panel.beginPrompt('~/projects/app-core (feature/date-helpers) $ ');
}
