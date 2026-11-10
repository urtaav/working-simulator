// Generic names only: nothing that reveals a business domain.
export const PROJECTS = ['app-core', 'platform-api', 'shared-lib', 'core-services', 'common-utils'];

export const ENTITIES = [
  'User', 'Account', 'Session', 'Address', 'Notification', 'AuditEntry', 'Setting', 'Token', 'Role', 'Attachment',
  'Profile', 'Preference', 'Tag', 'Comment', 'Device',
];

export const UTIL_TOPICS = ['String', 'Date', 'Validation', 'Json', 'Collection', 'File', 'Number', 'Text', 'Time', 'Path'];

// [name, javaType, tsType, pyType]
export const FIELDS = [
  ['name', 'String', 'string', 'str'],
  ['description', 'String', 'string', 'str'],
  ['email', 'String', 'string', 'str'],
  ['status', 'String', 'string', 'str'],
  ['createdAt', 'Instant', 'string', 'datetime'],
  ['updatedAt', 'Instant', 'string', 'datetime'],
  ['enabled', 'boolean', 'boolean', 'bool'],
  ['version', 'Integer', 'number', 'int'],
  ['locale', 'String', 'string', 'str'],
  ['timezone', 'String', 'string', 'str'],
  ['expiresAt', 'Instant', 'string', 'datetime'],
  ['ownerId', 'Long', 'number', 'int'],
  ['label', 'String', 'string', 'str'],
  ['priority', 'Integer', 'number', 'int'],
  ['tags', 'List<String>', 'string[]', 'list[str]'],
];

export const BRANCHES = [
  'feature/date-helpers', 'fix/null-locale', 'chore/deps-update', 'refactor/validation-utils', 'feature/token-refresh',
  'fix/timezone-parsing', 'refactor/config-properties', 'feature/audit-logging', 'test/mapper-coverage',
];

export const COMMIT_MESSAGES = [
  'refactor: extract date helpers', 'fix: handle null locale in formatter', 'test: cover token expiry edge cases',
  'chore: bump spring boot to 3.4.1', 'feat: add audit entry mapper', 'fix: trim whitespace before validation',
  'refactor: simplify config properties binding', 'docs: update local setup notes', 'chore: tidy imports',
  'feat: expose health details for db', 'fix: avoid NPE when tags are missing', 'test: add slugify cases',
  'refactor: move constants to shared module', 'perf: add index on sessions.expires_at', 'ci: cache maven repository',
];

export const pascal = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const camel = (s) => s.charAt(0).toLowerCase() + s.slice(1);
export const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
export const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
export const plural = (s) => (s.endsWith('y') ? s.slice(0, -1) + 'ies' : s.endsWith('s') ? s + 'es' : s + 's');
export const tableOf = (entity) => plural(snake(entity));

export function pickFields(rng, min, max) {
  return rng.shuffle(FIELDS).slice(0, rng.int(min, max));
}
