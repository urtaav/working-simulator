import { createNoRepeat } from '../core/noRepeat.js';
import { ENTITIES, UTIL_TOPICS, PROJECTS, pascal, camel, kebab, snake, pickFields } from './vocab.js';

const recentKinds = createNoRepeat(6);
const recentNames = createNoRepeat(8);

const EXT = { java: '.java', ts: '.ts', tsx: '.tsx', python: '.py', html: '.html' };

export function pickLang(rng) {
  const r = rng.next();
  if (r < 0.4) return 'java';
  if (r < 0.6) return 'ts';
  if (r < 0.75) return 'tsx';
  if (r < 0.9) return 'python';
  return 'html';
}

// `project` should match the one shown in the IDE so packages and prefixes line up
export function generateFile(rng, lang, project = rng.pick(PROJECTS)) {
  const gen = recentKinds.pickFresh(rng, GENERATORS[lang], (g) => g.name);
  const { dir, base, lines } = gen(rng, project);
  const name = base + EXT[lang];
  return { path: `${dir}/${name}`, name, lang, content: lines.join('\n') + '\n' };
}

const freshEntity = (rng) => recentNames.pickFresh(rng, ENTITIES);
const pkgOf = (project, sub) => `com.example.${project.replace(/-/g, '')}.${sub}`;
const javaDir = (project, sub) => `src/main/java/com/example/${project.replace(/-/g, '')}/${sub}`;
const indent = (n, lines) => lines.map((l) => (l ? ' '.repeat(n) + l : l));

// ---------------------------------------------------------------- Java

const JAVA_METHODS = [
  { imports: [], body: (t) => [
    `/** Returns {@code true} when the value is null, empty or only whitespace. */`,
    'public static boolean isBlank(String value) {',
    '    return value == null || value.isBlank();',
    '}'] },
  { imports: [], body: () => [
    'public static String defaultIfBlank(String value, String fallback) {',
    '    return isBlank(value) ? fallback : value.trim();',
    '}'] },
  { imports: [], body: (t, rng) => [
    `public static String truncate(String value, int max) {`,
    '    if (value == null || value.length() <= max) {',
    '        return value;',
    '    }',
    `    return value.substring(0, Math.max(0, max - ${rng.pick([1, 3])})) + "${rng.pick(['...', '…'])}";`,
    '}'] },
  { imports: ['java.text.Normalizer', 'java.util.Locale'], body: () => [
    '/** Lowercase, ascii-only, dash separated. Used for keys and file names. */',
    'public static String toSlug(String value) {',
    '    String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)',
    '            .replaceAll("\\\\p{M}", "");',
    '    return normalized.toLowerCase(Locale.ROOT)',
    '            .replaceAll("[^a-z0-9]+", "-")',
    '            .replaceAll("(^-|-$)", "");',
    '}'] },
  { imports: [], body: (t, rng) => [
    'public static String mask(String value, int visible) {',
    '    if (value == null || value.length() <= visible) {',
    '        return value;',
    '    }',
    `    return "${rng.pick(['*', '•'])}".repeat(value.length() - visible) + value.substring(value.length() - visible);`,
    '}'] },
  { imports: [], body: () => [
    'public static int parseIntOrDefault(String value, int fallback) {',
    '    try {',
    '        return Integer.parseInt(value.trim());',
    '    } catch (NumberFormatException | NullPointerException ex) {',
    '        return fallback;',
    '    }',
    '}'] },
  { imports: [], body: () => [
    'public static int clamp(int value, int min, int max) {',
    '    if (min > max) {',
    '        throw new IllegalArgumentException("min must be <= max");',
    '    }',
    '    return Math.max(min, Math.min(max, value));',
    '}'] },
  { imports: ['java.util.ArrayList', 'java.util.List'], body: () => [
    'public static <T> List<List<T>> partition(List<T> source, int size) {',
    '    if (size <= 0) {',
    '        throw new IllegalArgumentException("size must be positive");',
    '    }',
    '    List<List<T>> chunks = new ArrayList<>();',
    '    for (int i = 0; i < source.size(); i += size) {',
    '        chunks.add(source.subList(i, Math.min(source.size(), i + size)));',
    '    }',
    '    return chunks;',
    '}'] },
  { imports: ['java.time.LocalDate', 'java.time.temporal.ChronoUnit'], body: () => [
    'public static long daysBetween(LocalDate from, LocalDate to) {',
    '    return ChronoUnit.DAYS.between(from, to);',
    '}'] },
  { imports: ['java.time.Instant', 'java.time.ZoneId'], body: () => [
    'public static Instant startOfDay(Instant instant, ZoneId zone) {',
    '    return instant.atZone(zone).toLocalDate().atStartOfDay(zone).toInstant();',
    '}'] },
  { imports: ['java.time.Clock', 'java.time.Instant'], body: () => [
    '// Clock is passed in so tests can freeze time',
    'public static boolean isExpired(Instant expiresAt, Clock clock) {',
    '    return expiresAt != null && !expiresAt.isAfter(Instant.now(clock));',
    '}'] },
  { imports: ['java.util.Collection'], body: () => [
    'public static <C extends Collection<?>> C requireNonEmpty(C values, String name) {',
    '    if (values == null || values.isEmpty()) {',
    '        throw new IllegalArgumentException(name + " must not be empty");',
    '    }',
    '    return values;',
    '}'] },
  { imports: ['java.util.Arrays', 'java.util.Objects'], body: () => [
    '@SafeVarargs',
    'public static <T> T firstNonNull(T... values) {',
    '    return Arrays.stream(values)',
    '            .filter(Objects::nonNull)',
    '            .findFirst()',
    '            .orElse(null);',
    '}'] },
  { imports: ['java.util.List', 'java.util.stream.Collectors'], body: (t, rng) => [
    'public static String joinNonBlank(List<String> parts) {',
    '    return parts.stream()',
    '            .filter(p -> p != null && !p.isBlank())',
    '            .map(String::trim)',
    `            .collect(Collectors.joining("${rng.pick([', ', ' ', ' · ', '/'])}"));`,
    '}'] },
];

function javaUtils(rng, project) {
  const topic = rng.pick(UTIL_TOPICS);
  const methods = rng.shuffle(JAVA_METHODS).slice(0, rng.int(4, 7));
  const imports = [...new Set(methods.flatMap((m) => m.imports))].sort();
  const cls = `${topic}Utils`;
  const lines = [`package ${pkgOf(project, 'common.util')};`, ''];
  if (imports.length) lines.push(...imports.map((i) => `import ${i};`), '');
  lines.push(`public final class ${cls} {`, '', `    private ${cls}() {`, '        // static helpers only', '    }');
  for (const m of methods) lines.push('', ...indent(4, m.body(topic, rng)));
  lines.push('}');
  return { dir: javaDir(project, 'common/util'), base: cls, lines };
}

const SERVICE_METHODS = [
  (E, e) => ['Finds a ' + e + ' by its identifier.', ['@param id the identifier', `@return the ${e}, if present`], `Optional<${E}Dto> findById(Long id);`],
  (E, e) => [`Loads several ${e} entries in one round trip.`, ['@param ids identifiers to load', '@return the entries found, in no particular sequence'], `List<${E}Dto> findAllByIds(Collection<Long> ids);`],
  (E, e) => ['Checks whether the name is already taken.', ['@param name the name to check', '@return {@code true} if it exists'], 'boolean existsByName(String name);'],
  (E, e) => [`Counts ${e} entries that are currently enabled.`, ['@return number of enabled entries'], 'long countEnabled();'],
  (E, e) => [`Searches ${e} entries by a free text term.`, ['@param term text to look for', '@param page paging information', '@return one page of results'], `Page<${E}Dto> search(String term, Pageable page);`],
  (E, e) => [`Marks the ${e} as archived. Archived entries are kept for auditing.`, ['@param id the identifier'], 'void archive(Long id);'],
  (E, e) => [`Restores a previously archived ${e}.`, ['@param id the identifier'], 'void restore(Long id);'],
  (E, e) => [`Validates the ${e} before it is stored.`, ['@param candidate value to validate', '@throws ValidationException when a rule is broken'], `void validate(${E}Dto candidate);`],
];

function javaServiceInterface(rng, project) {
  const E = freshEntity(rng);
  const e = kebab(E).replace(/-/g, ' ');
  const methods = rng.shuffle(SERVICE_METHODS).slice(0, rng.int(4, 6)).map((m) => m(E, e));
  const lines = [
    `package ${pkgOf(project, 'service')};`, '',
    `import ${pkgOf(project, 'dto')}.${E}Dto;`,
    'import java.util.Collection;', 'import java.util.List;', 'import java.util.Optional;',
    'import org.springframework.data.domain.Page;', 'import org.springframework.data.domain.Pageable;', '',
    '/**', ` * Read and maintenance operations for {@link ${E}Dto}.`, ' */',
    `public interface ${E}Service {`,
  ];
  for (const [summary, tags, sig] of methods) {
    lines.push('', '    /**', `     * ${summary}`, '     *', ...tags.map((t) => `     * ${t}`), '     */', `    ${sig}`);
  }
  lines.push('}');
  return { dir: javaDir(project, 'service'), base: `${E}Service`, lines };
}

function javaRecord(rng, project) {
  const E = freshEntity(rng);
  const fields = [['id', 'Long'], ...pickFields(rng, 4, 7).map((f) => [f[0], f[1]])];
  const refs = fields.filter(([, t]) => !/^[a-z]/.test(t)).slice(0, rng.int(2, 3));
  const defaults = { String: '""', Long: 'null', Integer: '0', boolean: 'false', Instant: 'Instant.EPOCH', 'List<String>': 'List.of()' };
  const lines = [
    `package ${pkgOf(project, 'dto')};`, '',
    'import java.time.Instant;', 'import java.util.List;', 'import java.util.Objects;', '',
    '/**', ` * Immutable view of a ${kebab(E).replace(/-/g, ' ')} exposed by the API.`, ' */',
    `public record ${E}Dto(`,
    ...fields.map(([n, t], i) => `        ${t} ${n}${i < fields.length - 1 ? ',' : ''}`),
    ') {', '',
    `    public ${E}Dto {`,
    ...refs.map(([n]) => `        Objects.requireNonNull(${n}, "${n} must not be null");`),
    '    }', '',
    `    public static ${E}Dto empty() {`,
    `        return new ${E}Dto(${fields.map(([, t]) => defaults[t]).join(', ')});`,
    '    }',
  ];
  for (const [n, t] of rng.shuffle(fields.slice(1)).slice(0, 2)) {
    const args = fields.map(([fn]) => (fn === n ? n : fn)).join(', ');
    lines.push('', `    public ${E}Dto with${pascal(n)}(${t} ${n}) {`, `        return new ${E}Dto(${args});`, '    }');
  }
  lines.push('}');
  return { dir: javaDir(project, 'dto'), base: `${E}Dto`, lines };
}

const CONFIG_FIELDS = [
  ['timeout', 'Duration', 'Duration.ofSeconds(30)'],
  ['maxRetries', 'int', '3'],
  ['enabled', 'boolean', 'true'],
  ['batchSize', 'int', '100'],
  ['baseUrl', 'String', '"http://localhost:8080"'],
  ['cacheTtl', 'Duration', 'Duration.ofMinutes(10)'],
  ['allowedOrigins', 'List<String>', 'List.of()'],
  ['poolSize', 'int', '8'],
];

function javaConfig(rng, project) {
  const area = rng.pick(['cache', 'client', 'security', 'storage', 'scheduler', 'mail', 'audit', 'http']);
  const cls = `${pascal(area)}Properties`;
  const fields = rng.shuffle(CONFIG_FIELDS).slice(0, rng.int(3, 5));
  const lines = [
    `package ${pkgOf(project, 'config')};`, '',
    'import java.time.Duration;', 'import java.util.List;',
    'import org.springframework.boot.context.properties.ConfigurationProperties;', '',
    `/** Bound from {@code app.${area}.*} in application.yml. */`,
    `@ConfigurationProperties(prefix = "app.${area}")`,
    `public class ${cls} {`, '',
    ...fields.map(([n, t, d]) => `    private ${t} ${n} = ${d};`),
  ];
  for (const [n, t] of fields) {
    const getter = t === 'boolean' ? `is${pascal(n)}` : `get${pascal(n)}`;
    lines.push('', `    public ${t} ${getter}() {`, `        return ${n};`, '    }', '',
      `    public void set${pascal(n)}(${t} ${n}) {`, `        this.${n} = ${n};`, '    }');
  }
  lines.push('}');
  return { dir: javaDir(project, 'config'), base: cls, lines };
}

function javaException(rng, project) {
  const kind = rng.pick(['Validation', 'Configuration', 'Resource', 'Access', 'Serialization', 'Integration', 'Conflict']);
  const cls = `${kind}Exception`;
  const codes = rng.shuffle(['INVALID_FORMAT', 'MISSING_VALUE', 'OUT_OF_RANGE', 'NOT_FOUND', 'ALREADY_EXISTS', 'EXPIRED', 'NOT_ALLOWED', 'TIMEOUT', 'UNSUPPORTED'])
    .slice(0, rng.int(4, 7));
  const lines = [
    `package ${pkgOf(project, 'common.error')};`, '',
    '/**', ` * Raised when a ${kind.toLowerCase()} rule fails. The code is mapped to an HTTP status by the error handler.`, ' */',
    `public class ${cls} extends RuntimeException {`, '',
    '    private static final long serialVersionUID = 1L;', '',
    '    public enum Code {',
    ...codes.map((c, i) => `        ${c}${i < codes.length - 1 ? ',' : ''}`),
    '    }', '',
    '    private final Code code;', '',
    `    public ${cls}(Code code, String message) {`, '        super(message);', '        this.code = code;', '    }', '',
    `    public ${cls}(Code code, String message, Throwable cause) {`, '        super(message, cause);', '        this.code = code;', '    }', '',
    '    public Code getCode() {', '        return code;', '    }', '',
    `    public static ${cls} of(Code code, String format, Object... args) {`,
    `        return new ${cls}(code, String.format(format, args));`,
    '    }',
    '}',
  ];
  return { dir: javaDir(project, 'common/error'), base: cls, lines };
}

function javaMapper(rng, project) {
  const E = freshEntity(rng);
  const v = camel(E);
  const fields = ['id', ...pickFields(rng, 3, 6).map((f) => f[0])];
  const lines = [
    `package ${pkgOf(project, 'mapper')};`, '',
    `import ${pkgOf(project, 'domain')}.${E};`, `import ${pkgOf(project, 'dto')}.${E}Dto;`,
    'import java.util.Collection;', 'import java.util.List;', 'import org.springframework.stereotype.Component;', '',
    '@Component',
    `public class ${E}Mapper {`, '',
    `    public ${E}Dto toDto(${E} ${v}) {`,
    `        if (${v} == null) {`, '            return null;', '        }',
    `        return new ${E}Dto(`,
    ...fields.map((f, i) => `                ${v}.get${pascal(f)}()${i < fields.length - 1 ? ',' : ');'}`),
    '    }', '',
    `    public ${E} toEntity(${E}Dto dto) {`,
    `        ${E} ${v} = new ${E}();`,
    ...fields.map((f) => `        ${v}.set${pascal(f)}(dto.${f}());`),
    `        return ${v};`, '    }', '',
    `    public List<${E}Dto> toDtoList(Collection<${E}> source) {`,
    '        return source.stream().map(this::toDto).toList();', '    }',
    '}',
  ];
  return { dir: javaDir(project, 'mapper'), base: `${E}Mapper`, lines };
}

// ---------------------------------------------------------------- TypeScript

function tsModel(rng) {
  const E = freshEntity(rng);
  const fields = [['id', 'number'], ...pickFields(rng, 4, 7).map((f) => [f[0], f[2]])];
  const empty = { string: "''", number: '0', boolean: 'false', 'string[]': '[]' };
  const optional = new Set(rng.shuffle(fields.slice(1)).slice(0, 2).map(([n]) => n));
  const lines = [
    `/** Shape returned by the API for ${kebab(E).replace(/-/g, ' ')} resources. */`,
    `export interface ${E} {`,
    ...fields.map(([n, t]) => `  ${n}${optional.has(n) ? '?' : ''}: ${t};`),
    '}', '',
    `export type ${E}Id = ${E}['id'];`, '',
    `export interface ${E}Filter {`,
    '  term?: string;', '  enabledOnly?: boolean;', `  page: number;`, `  size: number;`,
    '}', '',
    `export const DEFAULT_${snake(E).toUpperCase()}_FILTER: ${E}Filter = {`,
    `  page: 0,`, `  size: ${rng.pick([10, 20, 25, 50])},`,
    '};', '',
    `export const EMPTY_${snake(E).toUpperCase()}: ${E} = {`,
    ...fields.filter(([n]) => !optional.has(n)).map(([n, t]) => `  ${n}: ${empty[t]},`),
    '};', '',
    `export function is${E}(value: unknown): value is ${E} {`,
    "  return typeof value === 'object' && value !== null && 'id' in value;",
    '}',
  ];
  return { dir: 'src/app/core/models', base: `${kebab(E)}.model`, lines };
}

function tsPipe(rng) {
  const variants = [
    () => ({ name: 'truncate', cls: 'TruncatePipe', body: [
      `  transform(value: string | null | undefined, limit = ${rng.pick([20, 30, 40, 60])}, suffix = '${rng.pick(['…', '...'])}'): string {`,
      '    if (!value) {', "      return '';", '    }',
      '    if (value.length <= limit) {', '      return value;', '    }',
      '    return this.cut(value, limit).trimEnd() + suffix;', '  }', '',
      '  // avoid cutting in the middle of a word when there is a space close by',
      '  private cut(value: string, limit: number): string {',
      "    const lastSpace = value.lastIndexOf(' ', limit);",
      `    return lastSpace > limit - ${rng.pick([8, 10, 12])} ? value.slice(0, lastSpace) : value.slice(0, limit);`, '  }'] }),
    () => ({ name: 'initials', cls: 'InitialsPipe', body: [
      `  transform(value: string | null | undefined, max = ${rng.pick([2, 3])}): string {`,
      '    if (!value) {', "      return '';", '    }',
      '    return value', '      .split(/\\s+/)', '      .filter(Boolean)', '      .slice(0, max)',
      '      .map((part) => this.firstLetter(part))', "      .join('');", '  }', '',
      '  private firstLetter(part: string): string {', '    return part.charAt(0).toUpperCase();', '  }'] }),
    () => ({ name: 'fileSize', cls: 'FileSizePipe', body: [
      `  private readonly units = ['B', 'KB', 'MB', 'GB', 'TB'];`, '',
      `  transform(bytes: number | null | undefined, decimals = ${rng.pick([0, 1, 2])}): string {`,
      '    if (bytes == null || Number.isNaN(bytes)) {', "      return '—';", '    }',
      '    let value = bytes;', '    let unit = 0;',
      '    while (value >= 1024 && unit < this.units.length - 1) {', '      value /= 1024;', '      unit++;', '    }',
      '    return `${value.toFixed(decimals)} ${this.units[unit]}`;', '  }'] }),
    () => ({ name: 'relativeTime', cls: 'RelativeTimePipe', body: [
      `  private readonly rtf = new Intl.RelativeTimeFormat('${rng.pick(['en', 'es'])}', { numeric: 'auto' });`, '',
      '  transform(value: string | Date | null | undefined): string {',
      '    if (!value) {', "      return '';", '    }',
      '    const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);',
      '    const abs = Math.abs(seconds);',
      "    if (abs < 60) return this.rtf.format(seconds, 'second');",
      "    if (abs < 3600) return this.rtf.format(Math.round(seconds / 60), 'minute');",
      "    if (abs < 86400) return this.rtf.format(Math.round(seconds / 3600), 'hour');",
      "    return this.rtf.format(Math.round(seconds / 86400), 'day');", '  }'] }),
  ];
  const v = rng.pick(variants)();
  const lines = [
    "import { Pipe, PipeTransform } from '@angular/core';", '',
    '@Pipe({', `  name: '${v.name}',`, '  standalone: true,', '})',
    `export class ${v.cls} implements PipeTransform {`, ...v.body, '}',
  ];
  return { dir: 'src/app/shared/pipes', base: `${kebab(v.name)}.pipe`, lines };
}

const STORAGE_METHODS = [
  ['  get<T>(key: string, fallback: T): T {', '    try {', '      const raw = localStorage.getItem(this.prefix + key);', '      return raw ? (JSON.parse(raw) as T) : fallback;', '    } catch {', '      return fallback;', '    }', '  }'],
  ['  set<T>(key: string, value: T): void {', '    try {', '      localStorage.setItem(this.prefix + key, JSON.stringify(value));', '    } catch {', '      // storage full or blocked: nothing else to do', '    }', '  }'],
  ['  remove(key: string): void {', '    localStorage.removeItem(this.prefix + key);', '  }'],
  ['  keys(): string[] {', '    return Object.keys(localStorage)', '      .filter((k) => k.startsWith(this.prefix))', '      .map((k) => k.slice(this.prefix.length));', '  }'],
  ['  clear(): void {', '    this.keys().forEach((k) => this.remove(k));', '  }'],
  ['  has(key: string): boolean {', '    return localStorage.getItem(this.prefix + key) !== null;', '  }'],
];

function tsService(rng, project) {
  const kind = rng.pick(['Storage', 'Preferences', 'Session', 'Cache']);
  const methods = rng.shuffle(STORAGE_METHODS).slice(0, rng.int(3, 5));
  const lines = [
    "import { Injectable } from '@angular/core';", '',
    `/** Thin wrapper around localStorage with a namespaced key. */`,
    "@Injectable({ providedIn: 'root' })",
    `export class ${kind}Service {`,
    `  private readonly prefix = '${project}.${kind.toLowerCase()}.';`,
  ];
  for (const m of methods) lines.push('', ...m);
  lines.push('}');
  return { dir: 'src/app/core/services', base: `${kebab(kind)}.service`, lines };
}

function tsApiTypes(rng) {
  const lines = [
    '/** Envelope used by every endpoint of the backend. */',
    'export interface ApiResponse<T> {', '  data: T;', '  timestamp: string;', '  traceId?: string;', '}', '',
    'export interface PageRequest {', '  page: number;', '  size: number;', "  sort?: `${string},${'asc' | 'desc'}`;", '}', '',
    'export interface PageResponse<T> {', '  content: T[];', '  totalElements: number;', '  totalPages: number;', '  number: number;', '}', '',
    'export interface ApiError {', '  status: number;', '  code: string;', '  message: string;', '  fieldErrors?: Record<string, string>;', '}', '',
    `export const DEFAULT_PAGE: PageRequest = { page: 0, size: ${rng.pick([10, 20, 50])} };`, '',
    'export function isApiError(value: unknown): value is ApiError {',
    "  return typeof value === 'object' && value !== null && 'status' in value && 'code' in value;",
    '}',
  ];
  if (rng.chance(0.5)) {
    lines.push('', 'export function toQueryParams(page: PageRequest): Record<string, string> {',
      '  const params: Record<string, string> = { page: String(page.page), size: String(page.size) };',
      '  if (page.sort) {', '    params.sort = page.sort;', '  }', '  return params;', '}');
  }
  return { dir: 'src/app/core/api', base: rng.pick(['api.types', 'api.models', 'http.types']), lines };
}

// ---------------------------------------------------------------- TSX

const HOOKS = {
  useDebounce: (rng) => [
    "import { useEffect, useState } from 'react';", '',
    '/**', ' * Returns the value only after it stopped changing for `delay` ms.', ' * Handy for search inputs so we do not fire on every keystroke.', ' */',
    `export function useDebounce<T>(value: T, delay = ${rng.pick([250, 300, 400, 500])}): T {`,
    '  const [debounced, setDebounced] = useState(value);', '',
    '  useEffect(() => {', '    const id = setTimeout(() => setDebounced(value), delay);', '    return () => clearTimeout(id);', '  }, [value, delay]);', '',
    '  return debounced;', '}'],
  useLocalStorage: () => [
    "import { useCallback, useState } from 'react';", '',
    '/** useState that survives reloads. Falls back to the initial value if storage is blocked. */',
    'export function useLocalStorage<T>(key: string, initial: T) {',
    '  const [value, setValue] = useState<T>(() => {', '    try {', '      const raw = window.localStorage.getItem(key);', '      return raw ? (JSON.parse(raw) as T) : initial;', '    } catch {', '      return initial;', '    }', '  });', '',
    '  const update = useCallback(', '    (next: T) => {', '      setValue(next);', '      try {', '        window.localStorage.setItem(key, JSON.stringify(next));', '      } catch {', '        // ignore quota or privacy mode errors', '      }', '    },', '    [key],', '  );', '',
    '  return [value, update] as const;', '}'],
  useMediaQuery: () => [
    "import { useEffect, useState } from 'react';", '',
    'export function useMediaQuery(query: string): boolean {',
    '  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);', '',
    '  useEffect(() => {', '    const mql = window.matchMedia(query);', '    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);',
    "    mql.addEventListener('change', onChange);", '    setMatches(mql.matches);', "    return () => mql.removeEventListener('change', onChange);", '  }, [query]);', '',
    '  return matches;', '}', '',
    "export const useIsMobile = () => useMediaQuery('(max-width: 640px)');",
    "export const usePrefersDark = () => useMediaQuery('(prefers-color-scheme: dark)');"],
  useInterval: () => [
    "import { useEffect, useRef } from 'react';", '',
    '/**', ' * setInterval that always calls the latest callback.', ' * Pass `null` as delay to pause it.', ' */',
    'export function useInterval(callback: () => void, delay: number | null) {',
    '  const saved = useRef(callback);', '',
    '  useEffect(() => {', '    saved.current = callback;', '  }, [callback]);', '',
    '  useEffect(() => {', '    if (delay === null) {', '      return;', '    }',
    '    const id = setInterval(() => saved.current(), delay);', '    return () => clearInterval(id);', '  }, [delay]);', '}'],
};

const COMPONENT_NAMES = ['Button', 'Badge', 'Spinner', 'EmptyState', 'Tooltip', 'Avatar', 'Panel', 'Tag', 'IconButton', 'Alert', 'Skeleton', 'SectionHeader'];
const PROPS = [
  ['label', 'string'], ['variant', "'primary' | 'secondary' | 'ghost'"], ['size', "'sm' | 'md' | 'lg'"], ['disabled', 'boolean'],
  ['className', 'string'], ['icon', 'ReactNode'], ['title', 'string'], ['onClick', '() => void'], ['loading', 'boolean'],
];

const HOOK_NOTES = [
  '// kept framework-agnostic on purpose, no external deps',
  '// covered by tests in __tests__/hooks',
  '// SSR is not a concern here, we only render on the client',
  '// see the README for usage examples',
  '// prefer this over ad-hoc effects in components',
];

function tsxHook(rng) {
  const name = rng.pick(Object.keys(HOOKS));
  const lines = HOOKS[name](rng);
  lines.splice(1, 0, rng.pick(HOOK_NOTES));
  return { dir: 'src/hooks', base: name, lines };
}

// components are far more varied than the handful of hooks, so they come up more often
function tsxFile(rng) {
  return rng.chance(0.3) ? tsxHook(rng) : tsxComponent(rng);
}

function tsxComponent(rng) {
  const name = rng.pick(COMPONENT_NAMES);
  const props = [['label', 'string'], ...rng.shuffle(PROPS.slice(1)).slice(0, rng.int(3, 5))];
  const names = props.map(([n]) => n);
  const lines = [
    "import type { ReactNode } from 'react';", '',
    `export interface ${name}Props {`,
    ...props.map(([n, t], i) => `  ${n}${i ? '?' : ''}: ${t};`),
    '}', '',
    'const sizes = {', "  sm: 'px-2 py-1 text-xs',", "  md: 'px-3 py-1.5 text-sm',", "  lg: 'px-4 py-2 text-base',", '} as const;', '',
    `export function ${name}({`,
    ...names.map((n) => `  ${n}${n === 'size' ? " = 'md'" : n === 'variant' ? " = 'primary'" : ''},`),
    `}: ${name}Props) {`,
    '  return (',
    '    <div',
    `      className={\`inline-flex items-center gap-2 rounded-md ${names.includes('size') ? '${sizes[size]}' : "${sizes.md}"} ${names.includes('className') ? "${className ?? ''}" : ''}\`}`,
    names.includes('title') ? '      title={title}' : '      role="status"',
    '    >',
    names.includes('icon') ? '      {icon}' : '      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />',
    '      <span>{label}</span>',
    '    </div>',
    '  );',
    '}', '',
    `export default ${name};`,
  ];
  if (names.includes('icon')) lines[0] = "import type { ReactNode } from 'react';";
  else lines.splice(0, 2);
  return { dir: 'src/components', base: name, lines };
}

// ---------------------------------------------------------------- Python

const PY_FUNCS = [
  { imports: ['import re', 'import unicodedata'], body: [
    'def slugify(value: str) -> str:', '    """Lowercase, ascii-only, dash separated."""',
    '    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()',
    '    return re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")'] },
  { imports: ['from collections.abc import Iterable, Iterator', 'from itertools import islice'], body: [
    'def chunked(items: Iterable[T], size: int) -> Iterator[list[T]]:',
    '    if size <= 0:', '        raise ValueError("size must be positive")',
    '    it = iter(items)', '    while chunk := list(islice(it, size)):', '        yield chunk'] },
  { imports: [], body: [
    'def parse_bool(value: str | None, default: bool = False) -> bool:',
    '    if value is None:', '        return default',
    '    return value.strip().lower() in {"1", "true", "yes", "on"}'] },
  { imports: ['import os'], body: [
    'def env_int(name: str, default: int) -> int:',
    '    raw = os.getenv(name)', '    try:', '        return int(raw) if raw is not None else default',
    '    except ValueError:', '        return default'] },
  { imports: ['from datetime import datetime, timezone'], body: [
    'def utc_now() -> datetime:', '    # always timezone-aware, naive datetimes caused bugs before', '    return datetime.now(timezone.utc)'] },
  { imports: ['import json', 'from pathlib import Path', 'from typing import Any'], body: [
    'def read_json(path: Path) -> dict[str, Any]:',
    '    with path.open(encoding="utf-8") as fh:', '        return json.load(fh)'] },
  { imports: ['from typing import Any'], body: [
    'def safe_get(data: dict[str, Any], dotted: str, default: Any = None) -> Any:',
    '    current: Any = data', '    for key in dotted.split("."):',
    '        if not isinstance(current, dict) or key not in current:', '            return default',
    '        current = current[key]', '    return current'] },
  { imports: ['from collections.abc import Iterable'], body: [
    'def flatten(nested: Iterable[Iterable[T]]) -> list[T]:', '    return [item for group in nested for item in group]'] },
  { imports: ['import functools', 'import time', 'from collections.abc import Callable'], body: [
    'def retry(times: int = 3, delay: float = 0.5) -> Callable:',
    '    def decorator(fn: Callable) -> Callable:', '        @functools.wraps(fn)', '        def wrapper(*args, **kwargs):',
    '            for attempt in range(1, times + 1):', '                try:', '                    return fn(*args, **kwargs)',
    '                except Exception:', '                    if attempt == times:', '                        raise',
    '                    time.sleep(delay * attempt)', '        return wrapper', '    return decorator'] },
  { imports: [], body: [
    'def truncate(text: str, limit: int = 80, suffix: str = "...") -> str:',
    '    if len(text) <= limit:', '        return text', '    return text[: max(0, limit - len(suffix))] + suffix'] },
  { imports: ['from collections.abc import Iterable'], body: [
    'def unique(items: Iterable[T]) -> list[T]:', '    """Keeps the first occurrence, preserves original position."""',
    '    seen: set[T] = set()', '    result: list[T] = []', '    for item in items:',
    '        if item not in seen:', '            seen.add(item)', '            result.append(item)', '    return result'] },
];

function pyHelpers(rng) {
  const topic = rng.pick(['text', 'string', 'date', 'env', 'io', 'collection', 'common', 'misc', 'data', 'config']);
  const funcs = rng.shuffle(PY_FUNCS).slice(0, rng.int(4, 6));
  const imports = [...new Set(funcs.flatMap((f) => f.imports))].sort();
  const needsT = funcs.some((f) => f.body.join('\n').includes('[T]'));
  const lines = [`"""Small ${topic} helpers shared across modules."""`, '', 'from __future__ import annotations', ''];
  if (imports.length) lines.push(...imports);
  if (needsT) lines.push('from typing import TypeVar', '', 'T = TypeVar("T")');
  lines.push('', `__all__ = [${funcs.map((f) => `"${f.body[0].match(/def (\w+)/)[1]}"`).join(', ')}]`);
  for (const f of funcs) lines.push('', '', ...f.body);
  return { dir: 'app/utils', base: `${topic}_${rng.pick(['utils', 'helpers'])}`, lines };
}

function pySettings(rng, project) {
  const fields = rng.shuffle([
    ['debug', 'bool', 'False', 'parse_bool(os.getenv("APP_DEBUG"))'],
    ['log_level', 'str', '"INFO"', 'os.getenv("APP_LOG_LEVEL", "INFO")'],
    ['timeout_seconds', 'float', '30.0', 'float(os.getenv("APP_TIMEOUT", "30"))'],
    ['max_workers', 'int', '4', 'int(os.getenv("APP_MAX_WORKERS", "4"))'],
    ['base_url', 'str', '"http://localhost:8080"', 'os.getenv("APP_BASE_URL", "http://localhost:8080")'],
    ['cache_ttl', 'int', '600', 'int(os.getenv("APP_CACHE_TTL", "600"))'],
  ]).slice(0, rng.int(3, 5));
  const lines = [
    `"""Runtime settings for ${project}, read once from the environment."""`, '',
    'from __future__ import annotations', '', 'import os', 'from dataclasses import dataclass', 'from functools import lru_cache', '', '',
    'def parse_bool(value: str | None) -> bool:', '    return (value or "").strip().lower() in {"1", "true", "yes"}', '', '',
    '@dataclass(frozen=True)', 'class Settings:',
    ...fields.map(([n, t, d]) => `    ${n}: ${t} = ${d}`), '',
    '    @classmethod', '    def from_env(cls) -> "Settings":', '        return cls(',
    ...fields.map(([n, , , e]) => `            ${n}=${e},`), '        )', '', '',
    '@lru_cache(maxsize=1)', 'def get_settings() -> Settings:', '    return Settings.from_env()',
  ];
  return { dir: 'app/core', base: rng.pick(['settings', 'config']), lines };
}

// ---------------------------------------------------------------- HTML

const NAV = ['Overview', 'Profile', 'Settings', 'Notifications', 'Security', 'Preferences', 'Help', 'Activity'];

function htmlLayout(rng) {
  const E = freshEntity(rng);
  const kind = rng.pick(['layout', 'panel', 'details', 'settings', 'sidebar', 'header']);
  const nav = rng.shuffle(NAV).slice(0, rng.int(3, 6));
  const sections = rng.int(2, 4);
  const lines = [
    '<div class="flex min-h-screen bg-slate-50 text-slate-800">',
    '  <aside class="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">',
    '    <nav class="flex flex-col gap-1 p-4">',
    ...nav.map((n, i) => `      <a href="#" class="rounded-md px-3 py-2 text-sm ${i === 0 ? 'bg-slate-100 font-medium' : 'hover:bg-slate-100'}">${n}</a>`),
    '    </nav>',
    '  </aside>',
    '',
    '  <main class="flex-1 p-6">',
    '    <header class="mb-6 flex items-center justify-between">',
    `      <h1 class="text-xl font-semibold">${nav[0]}</h1>`,
    '      <button type="button" class="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500">',
    `        ${rng.pick(['Save', 'Apply', 'Continue', 'Done'])}`,
    '      </button>',
    '    </header>',
    '',
  ];
  for (let i = 0; i < sections; i++) {
    lines.push(
      `    <section class="mb-4 rounded-lg bg-white p-4 shadow-sm">`,
      `      <h2 class="mb-2 text-sm font-medium text-slate-500">${rng.pick(['General', 'Details', 'Advanced', 'Display', 'Language', 'Access'])}</h2>`,
      '      <div class="grid gap-3 sm:grid-cols-2">',
      '        <label class="flex flex-col gap-1 text-sm">',
      `          ${rng.pick(['Name', 'Title', 'Label', 'Display name'])}`,
      '          <input type="text" class="rounded-md border border-slate-300 px-2 py-1.5" />',
      '        </label>',
      '        <label class="flex items-center gap-2 text-sm">',
      '          <input type="checkbox" class="h-4 w-4 rounded" />',
      `          ${rng.pick(['Enabled', 'Visible', 'Remember choice', 'Send updates'])}`,
      '        </label>',
      '      </div>',
      '    </section>',
    );
  }
  lines.push('  </main>', '</div>');
  return { dir: `src/app/features/${kebab(E)}`, base: `${kebab(E)}-${kind}.component`, lines };
}

const GENERATORS = {
  java: [javaUtils, javaServiceInterface, javaRecord, javaConfig, javaException, javaMapper],
  ts: [tsModel, tsPipe, tsService, tsApiTypes],
  tsx: [tsxFile],
  python: [pyHelpers, pySettings],
  html: [htmlLayout],
};
