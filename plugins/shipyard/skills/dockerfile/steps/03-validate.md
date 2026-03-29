# Step 3: Validate Dockerfile (--validate)

If `--validate` or a Dockerfile already exists, run validation.

## External Linter: hadolint

```bash
hadolint --version 2>/dev/null
```

If available, run `hadolint Dockerfile` and parse output for rule violations (code + severity).

If not available:
```
hadolint not available -- using built-in checks only.
Install for comprehensive Dockerfile linting: brew install hadolint
```

## Built-in Checks

Run these regardless of hadolint availability:

**Check 1: Running as root** -- Look for `USER` instruction in the final stage. If missing or set to `root`:
```
ISSUE: Container runs as root
  The final stage has no USER instruction, meaning the process runs as root.
  This is a security risk -- if the application is compromised, the attacker has root access.
  Suggestion: Add a non-root user and switch to it before CMD/ENTRYPOINT.
  Severity: Critical
```

**Check 2: Using :latest tag** -- Check `FROM` instructions for `:latest` or no tag:
```
ISSUE: Base image uses :latest tag
  FROM node:latest is unpredictable -- builds may break when the tag moves.
  Suggestion: Pin to a specific version (e.g., node:22-alpine).
  Severity: High
```

**Check 3: Missing .dockerignore** -- Run `ls .dockerignore 2>/dev/null`. If missing:
```
ISSUE: Missing .dockerignore
  Without .dockerignore, COPY . . sends everything to the Docker daemon,
  including node_modules, .git, .env, and other unnecessary files.
  Suggestion: Run /shipyard:dockerfile --generate to create one.
  Severity: High
```

**Check 4: Poor layer caching** -- Check if `COPY . .` appears before `RUN install` commands:
```
ISSUE: Poor layer caching order
  COPY . . appears before dependency install. Any source code change invalidates
  the dependency install cache, causing full re-download.
  Suggestion: Copy lockfile first, install deps, then COPY source.
  Severity: Medium
```

**Check 5: No HEALTHCHECK** -- Check for `HEALTHCHECK` instruction:
```
ISSUE: No HEALTHCHECK defined
  Without HEALTHCHECK, orchestrators cannot detect if the application is responsive.
  Suggestion: Add HEALTHCHECK instruction (wget or curl to health endpoint).
  Severity: Medium
```

**Check 6: Secrets in build** -- Check for `COPY .env`, `ARG` with secret-looking defaults (`ARG API_KEY=sk-...`), `ENV` with hardcoded credentials:
```
ISSUE: Possible secret exposure
  COPY .env copies environment file into the image. Secrets in images
  are extractable by anyone with access to the image.
  Suggestion: Use runtime environment variables or Docker secrets instead.
  Severity: Critical
```

**Check 7: Unnecessary EXPOSE** -- Check if EXPOSE matches the application port. Warn about non-standard ports without justification.

**Check 8: No multi-stage build** -- If only one `FROM` and build tools in the final image:
```
ISSUE: Single-stage build includes build tools
  The final image contains build dependencies (compilers, dev packages)
  that are not needed at runtime, increasing image size and attack surface.
  Suggestion: Use multi-stage build -- build in one stage, copy artifacts to a minimal runtime stage.
  Severity: Medium
```

## Report Format

```
Dockerfile Validation: ./Dockerfile
hadolint: passed (0 errors, 2 warnings)
  DL3018 (warning): Pin versions in apk add
Built-in checks:
  Critical (0): none
  High (1):
    1. Base image uses :latest tag -- Fix: Pin to node:22-alpine (Line 1)
  Medium (2):
    2. Poor layer caching order -- Fix: Copy lockfile first (Lines 5-6)
    3. No HEALTHCHECK defined -- Fix: Add HEALTHCHECK instruction
Summary: 0 critical, 1 high, 2 medium, 0 low
Image estimate: ~180MB (could reduce to ~120MB with multi-stage + alpine)
```

## Write Critical Issues to Task Queue

Write Critical severity issues to `tasks-plans/tasks.md` with `**[Docker]**` prefix:

```markdown
- [ ] **[Docker]** Container runs as root -- Dockerfile has no USER instruction. Add non-root user in final stage.
- [ ] **[Docker]** Secret exposure -- COPY .env copies secrets into image. Use runtime env vars instead.
```

---

**Done.** Validation complete.
