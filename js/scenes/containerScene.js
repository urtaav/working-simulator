import { dockerPs, dockerStats, springLogLine } from '../content/shellGen.js';
import { runCommand, writeLines, drift, pointAt } from './common.js';

function composeFile(project) {
  return `services:
  api:
    image: ${project}:latest
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: local
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/app_db
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app_db
      POSTGRES_USER: app
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 10s
      retries: 5

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
`;
}

// Containers: ps, follow the api logs for a while, check resource usage.
export async function containerScene(ctx) {
  const { ide, rng, scheduler: s, project } = ctx;
  ide.showPanel(ide.skin() === 'intellij' ? 'services' : 'terminal');
  ide.setTabs(['docker-compose.yml', 'application.yml'], 'docker-compose.yml');
  ide.setTree(['docker-compose.yml', 'Dockerfile'], 'docker-compose.yml');
  ide.setLang('yaml');
  ctx.identity('docker-compose.yml');
  ide.editor.open({ name: 'docker-compose.yml', lang: 'yaml', content: composeFile(project), cursor: { line: 0, col: 0 } });

  for (;;) {
    await pointAt(ctx, '.term', 220, 30);
    await runCommand(ctx, 'docker ps');
    await writeLines(ctx, dockerPs(rng), 10, 40);
    await s.sleep(rng.int(3000, 8000));

    await runCommand(ctx, 'docker compose logs -f --tail=20 api');
    const until = rng.int(40, 120) * 1000;
    let elapsed = 0;
    while (elapsed < until) {
      const gap = rng.chance(0.15) ? rng.int(30, 120) : rng.int(300, 2500);
      await s.sleep(gap);
      elapsed += gap;
      const line = springLogLine(rng, new Date());
      ide.panel.write(line, /\bWARN\b/.test(line) ? 'warn' : undefined);
      if (rng.chance(0.02)) await drift(ctx, 1);
    }
    ide.panel.write('^C');
    await s.sleep(rng.int(1500, 4000));

    await runCommand(ctx, 'docker stats --no-stream');
    await writeLines(ctx, dockerStats(rng), 10, 40);
    await s.sleep(rng.int(5000, 15000));
    await drift(ctx, rng.int(1, 2));
  }
}
