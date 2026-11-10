import { BRANCHES, COMMIT_MESSAGES, PROJECTS, ENTITIES, pascal } from './vocab.js';

const hex = (rng, n) => Array.from({ length: n }, () => '0123456789abcdef'[rng.int(0, 15)]).join('');
const pad2 = (n) => String(n).padStart(2, '0');
const col = (values, widths) => values.map((v, i) => (i < widths.length ? String(v).padEnd(widths[i]) : v)).join('');

const CONTAINERS = [
  { image: 'postgres:16-alpine', cmd: '"docker-entrypoint.s…"', ports: '0.0.0.0:5432->5432/tcp', name: 'db' },
  { image: 'redis:7-alpine', cmd: '"docker-entrypoint.s…"', ports: '0.0.0.0:6379->6379/tcp', name: 'cache' },
  { image: 'rabbitmq:3.13-management', cmd: '"docker-entrypoint.s…"', ports: '0.0.0.0:5672->5672/tcp, 15672/tcp', name: 'broker' },
  { image: 'nginx:1.27-alpine', cmd: '"/docker-entrypoint.…"', ports: '0.0.0.0:80->80/tcp', name: 'proxy' },
  { image: 'gvenzl/oracle-free:23-slim', cmd: '"container-entrypoint"', ports: '0.0.0.0:1521->1521/tcp', name: 'oracle' },
  { image: 'mailhog/mailhog:v1.0.1', cmd: '"MailHog"', ports: '0.0.0.0:8025->8025/tcp', name: 'mail' },
  { image: 'localstack/localstack:3.8', cmd: '"docker-entrypoint.sh"', ports: '0.0.0.0:4566->4566/tcp', name: 'aws' },
];

// Same rng consumption in ps and stats so both list the same containers for the same seed.
function pickContainers(rng) {
  const project = rng.pick(PROJECTS);
  const api = { image: `${project}:latest`, cmd: '"java -jar /app/app.…"', ports: '0.0.0.0:8080->8080/tcp', name: 'api' };
  const extra = rng.shuffle(CONTAINERS).slice(0, rng.int(1, 4));
  return { project, list: [api, ...extra].map((c) => ({ ...c, id: hex(rng, 12), name: `${project}-${c.name}-1` })) };
}

export function dockerPs(rng) {
  const { list } = pickContainers(rng);
  const w = [15, 28, 26, 16, 26, 38];
  return [
    col(['CONTAINER ID', 'IMAGE', 'COMMAND', 'CREATED', 'STATUS', 'PORTS', 'NAMES'], w),
    ...list.map((c) => {
      const up = `${rng.int(2, 50)} ${rng.pick(['minutes', 'hours'])}`;
      return col([c.id, c.image, c.cmd, `${up} ago`, `Up ${up}${c.name.includes('-api-') || c.name.includes('-db-') ? ' (healthy)' : ''}`, c.ports, c.name], w);
    }),
  ];
}

export function dockerStats(rng) {
  const { list } = pickContainers(rng);
  const w = [15, 30, 9, 22, 8, 20, 18];
  return [
    col(['CONTAINER ID', 'NAME', 'CPU %', 'MEM USAGE / LIMIT', 'MEM %', 'NET I/O', 'BLOCK I/O', 'PIDS'], w),
    ...list.map((c) => {
      const mem = c.name.includes('-api-') ? rng.int(380, 720) : rng.int(12, 220);
      return col([c.id, c.name, `${(rng.next() * (c.name.includes('-api-') ? 12 : 3)).toFixed(2)}%`, `${mem}MiB / 7.66GiB`, `${((mem / 7843) * 100).toFixed(2)}%`,
        `${rng.int(1, 90)}MB / ${rng.int(1, 40)}MB`, `${rng.int(0, 60)}MB / ${rng.int(0, 9)}MB`, String(rng.int(4, 60))], w);
    }),
  ];
}

const PID = 1000 + Math.floor(Math.random() * 60000);
const LOGGERS = [
  'c.e.c.web.RequestLoggingFilter', 'o.s.web.servlet.DispatcherServlet', 'com.zaxxer.hikari.HikariPool',
  'c.e.c.scheduling.CleanupJob', 'c.e.c.config.CacheConfig', 'c.e.c.security.TokenService', 'o.s.b.a.h.HealthEndpoint',
  'c.e.c.audit.AuditListener', 'o.h.engine.jdbc.batch.internal.BatchingBatch',
];
const THREADS = ['nio-8080-exec-1', 'nio-8080-exec-2', 'nio-8080-exec-4', 'nio-8080-exec-7', 'scheduling-1', 'task-2', 'main'];
const PATHS = ['/actuator/health', '/api/v1/settings', '/api/v1/profile', '/api/v1/notifications', '/api/v1/sessions/current', '/api/v1/tags'];

function message(rng, level) {
  if (level === 'WARN') {
    return rng.pick([
      `Slow query detected (${rng.int(300, 1400)} ms) on ${rng.pick(ENTITIES)}Repository.findAll`,
      `HikariPool-1 - Thread starvation or clock leap detected (housekeeper delta=${rng.int(60, 90)}s).`,
      `Retrying request to http://localhost:${rng.pick([8081, 9000, 4566])} (attempt ${rng.int(2, 3)}/3)`,
    ]);
  }
  if (level === 'DEBUG') {
    return rng.pick([
      `Cache '${rng.pick(['settings', 'profiles', 'tokens', 'roles'])}' hit ratio ${(0.7 + rng.next() * 0.29).toFixed(2)}`,
      `Bound request parameters: page=${rng.int(0, 5)}, size=${rng.pick([10, 20, 50])}`,
      `Executing prepared SQL statement [select ... from ${rng.pick(ENTITIES).toLowerCase()}s where id=?]`,
    ]);
  }
  return rng.pick([
    `GET ${rng.pick(PATHS)} -> 200 in ${rng.int(2, 120)} ms`,
    `POST ${rng.pick(PATHS)} -> ${rng.pick([200, 201, 204])} in ${rng.int(8, 300)} ms`,
    `Scheduled task cleanupExpiredTokens finished in ${rng.int(3, 90)} ms (${rng.int(0, 40)} removed)`,
    `Refreshing feature flags (${rng.int(8, 30)} entries)`,
    `${pascal(rng.pick(ENTITIES))}Service warmed up in ${rng.int(10, 400)} ms`,
    'HikariPool-1 - Pool stats (total=10, active=' + rng.int(0, 6) + ', idle=' + rng.int(4, 10) + ', waiting=0)',
  ]);
}

export function springLogLine(rng, now) {
  const r = rng.next();
  const level = r < 0.05 ? 'WARN' : r < 0.2 ? 'DEBUG' : 'INFO';
  const off = -now.getTimezoneOffset();
  const tz = `${off >= 0 ? '+' : '-'}${pad2(Math.floor(Math.abs(off) / 60))}:${pad2(Math.abs(off) % 60)}`;
  const stamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}.${String(now.getMilliseconds()).padStart(3, '0')}${tz}`;
  const thread = rng.pick(THREADS).padStart(15);
  return `${stamp} ${level.padStart(5)} ${PID} --- [app] [${thread}] ${rng.pick(LOGGERS).padEnd(40)} : ${message(rng, level)}`;
}

const FILES = [
  'src/main/java/com/example/core/common/util/StringUtils.java', 'src/main/java/com/example/core/config/CacheProperties.java',
  'src/main/java/com/example/core/mapper/ProfileMapper.java', 'src/test/java/com/example/core/common/util/DateUtilsTest.java',
  'src/app/shared/pipes/truncate.pipe.ts', 'src/app/core/models/session.model.ts', 'app/utils/text_utils.py', 'README.md',
];

const STEPS = {
  gitStatus: (rng) => {
    const branch = rng.pick(BRANCHES);
    const changed = rng.shuffle(FILES).slice(0, rng.int(1, 3));
    return { cmd: 'git status', output: [
      `On branch ${branch}`, `Your branch is up to date with 'origin/${branch}'.`, '', 'Changes not staged for commit:',
      '  (use "git add <file>..." to update what will be committed)', '  (use "git restore <file>..." to discard changes in working directory)',
      ...changed.map((f) => `\tmodified:   ${f}`), '', 'no changes added to commit (use "git add" and/or "git commit -a")'] };
  },
  gitLog: (rng) => ({ cmd: 'git log --oneline -n 8', output: rng.shuffle(COMMIT_MESSAGES).slice(0, 8).map((m, i) => `${hex(rng, 7)} ${i === 0 ? `(HEAD -> ${rng.pick(BRANCHES)}) ` : ''}${m}`) }),
  gitDiffStat: (rng) => {
    const files = rng.shuffle(FILES).slice(0, rng.int(2, 4));
    let ins = 0;
    let del = 0;
    const out = files.map((f) => {
      const a = rng.int(1, 40);
      const d = rng.int(0, 20);
      ins += a;
      del += d;
      return ` ${f.padEnd(62)} | ${String(a + d).padStart(3)} ${'+'.repeat(Math.min(a, 20))}${'-'.repeat(Math.min(d, 10))}`;
    });
    return { cmd: 'git diff --stat', output: [...out, ` ${files.length} files changed, ${ins} insertions(+), ${del} deletions(-)`] };
  },
  gitPull: (rng) => ({ cmd: 'git pull --rebase', output: rng.chance(0.5) ? ['Already up to date.'] : [`Successfully rebased and updated refs/heads/${rng.pick(BRANCHES)}.`] }),
  mvnTest: (rng) => {
    const classes = rng.shuffle(['StringUtilsTest', 'DateUtilsTest', 'ProfileMapperTest', 'TokenServiceTest', 'CachePropertiesTest', 'ValidationUtilsTest', 'SessionDtoTest']).slice(0, rng.int(3, 6));
    let total = 0;
    const lines = classes.map((c) => {
      const n = rng.int(3, 24);
      total += n;
      return `[INFO] Tests run: ${n}, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: ${(rng.next() * 2 + 0.05).toFixed(3)} s -- in com.example.core.${c}`;
    });
    return { cmd: './mvnw -q test', output: [
      '[INFO] -------------------------------------------------------', '[INFO]  T E S T S', '[INFO] -------------------------------------------------------',
      ...lines, '[INFO] ', '[INFO] Results:', '[INFO] ', `[INFO] Tests run: ${total}, Failures: 0, Errors: 0, Skipped: 0`, '[INFO] ',
      '[INFO] ------------------------------------------------------------------------', '[INFO] BUILD SUCCESS',
      '[INFO] ------------------------------------------------------------------------', `[INFO] Total time:  ${(rng.next() * 30 + 8).toFixed(3)} s`] };
  },
  npmBuild: (rng) => ({ cmd: 'npm run build', output: [
    '', '> web@0.0.0 build', '> ng build', '',
    'Initial chunk files   | Names         |  Raw size | Estimated transfer size',
    `main-${hex(rng, 8).toUpperCase()}.js      | main          | ${rng.int(180, 420)}.${rng.int(10, 99)} kB |                ${rng.int(50, 110)}.${rng.int(10, 99)} kB`,
    `polyfills-${hex(rng, 8).toUpperCase()}.js | polyfills     |  34.58 kB |                11.32 kB`,
    `styles-${hex(rng, 8).toUpperCase()}.css    | styles        |  ${rng.int(8, 40)}.${rng.int(10, 99)} kB |                 ${rng.int(2, 8)}.${rng.int(10, 99)} kB`,
    '', `Application bundle generation complete. [${(rng.next() * 10 + 4).toFixed(3)} seconds]`] }),
  pytest: (rng) => {
    const n = rng.int(12, 80);
    return { cmd: 'pytest -q', output: [`${'.'.repeat(Math.min(n, 60))}${' '.repeat(Math.max(1, 62 - Math.min(n, 60)))}[100%]`, `${n} passed in ${(rng.next() * 3 + 0.2).toFixed(2)}s`] };
  },
};

export function consoleSession(rng) {
  const names = rng.shuffle(Object.keys(STEPS));
  // tests are what people run most, so put one near the start most of the time
  const runner = rng.pick(['mvnTest', 'mvnTest', 'npmBuild', 'pytest']);
  const picked = [...new Set(['gitStatus', runner, ...names])].slice(0, rng.int(3, 5));
  return picked.map((n) => STEPS[n](rng));
}
