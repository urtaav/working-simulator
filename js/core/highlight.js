// Minimal line tokenizer: good enough to color code like an IDE from a distance, not a parser.
const words = (s) => new Set(s.split(/\s+/));

const KEYWORDS = {
  java: words(`abstract boolean break byte case catch char class const continue default do double else enum extends
    final finally float for if implements import instanceof int interface long new null package private protected public
    record return static super switch this throw throws try var void while true false yield sealed permits`),
  ts: words(`abstract any as async await boolean break case catch class const constructor continue default delete do else
    enum export extends false finally for from function if implements import in instanceof interface keyof let new null
    number private protected public readonly return static string super switch this throw true try type typeof undefined
    unknown void while of`),
  python: words(`and as assert async await break class continue def del elif else except False finally for from global if
    import in is lambda None nonlocal not or pass raise return True try while with yield`),
  sql: words(`select from where and or not in is null as join left right inner outer on group by order having limit offset
    insert into values update set delete create table index unique primary key references alter add drop if exists
    explain analyze count distinct case when then else end with desc asc between like varchar integer bigint timestamp
    default constraint commit rollback begin fetch first rows only`),
  shell: words(`cd ls git docker npm mvn sudo export echo cat grep tail run exec compose pytest`),
  yaml: words(`true false null`),
};
KEYWORDS.tsx = KEYWORDS.ts;
KEYWORDS.html = new Set();

const BLOCK = { java: ['/*', '*/'], ts: ['/*', '*/'], tsx: ['/*', '*/'], sql: ['/*', '*/'], html: ['<!--', '-->'] };
const LINE_COMMENT = { java: '//', ts: '//', tsx: '//', python: '#', yaml: '#', shell: '#', sql: '--' };
const TYPED = new Set(['java', 'ts', 'tsx']);
const ANNOTATED = new Set(['java', 'ts', 'tsx', 'python']);
const TAGGED = new Set(['html', 'tsx']);

export function tokenizeLine(line, lang, state = { inBlockComment: false }) {
  const tokens = [];
  const kw = KEYWORDS[lang] || new Set();
  const [blockStart, blockEnd] = BLOCK[lang] || [];
  const lineComment = LINE_COMMENT[lang];
  const identRe = lang === 'html' ? /[A-Za-z_$][\w$-]*/y : /[A-Za-z_$][\w$]*/y;
  let inBlock = state.inBlockComment;
  let i = 0;
  const push = (text, kind) => text && tokens.push({ text, kind });
  const matchAt = (re) => {
    re.lastIndex = i;
    const m = re.exec(line);
    return m ? m[0] : null;
  };

  while (i < line.length) {
    if (inBlock || (blockStart && line.startsWith(blockStart, i))) {
      const from = inBlock ? i : i + blockStart.length;
      const end = line.indexOf(blockEnd, from);
      if (end < 0) {
        push(line.slice(i), 'com');
        inBlock = true;
        break;
      }
      push(line.slice(i, end + blockEnd.length), 'com');
      i = end + blockEnd.length;
      inBlock = false;
      continue;
    }
    if (lineComment && line.startsWith(lineComment, i)) {
      push(line.slice(i), 'com');
      break;
    }
    const ch = line[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) j += line[j] === '\\' ? 2 : 1;
      const end = Math.min(j + 1, line.length);
      push(line.slice(i, end), 'str');
      i = end;
      continue;
    }
    let m;
    if (ANNOTATED.has(lang) && (m = matchAt(/@[\w.]+/y))) {
      push(m, 'ann');
      i += m.length;
      continue;
    }
    if (TAGGED.has(lang) && (m = matchAt(/<\/?(?=[A-Za-z])/y))) {
      push(m, 'punc');
      i += m.length;
      const name = matchAt(/[A-Za-z][\w.-]*/y);
      push(name, 'tag');
      i += name.length;
      continue;
    }
    if (/\d/.test(ch) && !/[\w$]/.test(line[i - 1] || '') && (m = matchAt(/\d[\d_.]*[a-zA-Z]?/y))) {
      push(m, 'num');
      i += m.length;
      continue;
    }
    if ((m = matchAt(identRe))) {
      push(m, classify(m, lang, kw, line, i + m.length));
      i += m.length;
      continue;
    }
    if ((m = matchAt(/\s+/y))) {
      push(m, 'plain');
      i += m.length;
      continue;
    }
    push(ch, 'punc');
    i += 1;
  }

  return { tokens, state: { inBlockComment: inBlock } };
}

function classify(word, lang, kw, line, after) {
  if (kw.has(lang === 'sql' ? word.toLowerCase() : word)) return 'kw';
  const next = line[after];
  if (lang === 'html' && /^\s*=/.test(line.slice(after))) return 'attr';
  if (lang === 'tsx' && next === '=' && /["{]/.test(line[after + 1] || '')) return 'attr';
  if (lang === 'yaml' && next === ':') return 'attr';
  if (next === '(') return 'fn';
  if (TYPED.has(lang) && /^[A-Z]/.test(word)) return 'type';
  return 'plain';
}
