# Step 4: Write Failures to Task Queue

**Default mode:** Write only FAIL results to `tasks-plans/tasks.md`:

```markdown
- [ ] **[Preflight]** No health endpoint -- create /api/health route that returns 200
- [ ] **[Preflight]** .env files tracked in git -- add .env to .gitignore and remove from tracking
```

**Strict mode (--strict):** Write FAIL and WARN results:

```markdown
- [ ] **[Preflight]** No health endpoint -- create /api/health route
- [ ] **[Preflight]** Missing env vars in .env.example: DATABASE_URL, REDIS_URL
- [ ] **[Preflight]** 14 console.log calls -- replace with structured logging (pino recommended)
- [ ] **[Preflight]** No connection pooling -- configure for production load
```

Tasks use `**[Preflight]**` prefix for grep-ability and to distinguish from other Shipyard tasks (`**[CI]**`, `**[Docker]**`, `**[CVE-...]**`).

**Done.**
