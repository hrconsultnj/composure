# Step 2: Detect Package Managers

Check for installed package managers in priority order:

**JavaScript/TypeScript:**
1. `bun --version` — preferred if available
2. `pnpm --version` — recommended default
3. `yarn --version`
4. `npm --version` — always available with Node

**Python:**
1. `pip --version` or `pip3 --version`
2. `pipenv --version`
3. `poetry --version`
4. `uv --version`

**Go:**
1. `go version` (built-in module system)

**Rust:**
1. `cargo --version`

**System installers:**
1. `brew --version` (macOS)
2. `apt --version` (Debian/Ubuntu)
3. `dnf --version` (Fedora/RHEL)
4. `pacman --version` (Arch)
5. `choco --version` (Windows)
6. `winget --version` (Windows)
7. `nix --version` (NixOS/cross-platform)

Record the detected version for each. Store the **preferred** package manager (first detected in priority order) and all available ones.

## npm Migration Check

If the project uses npm (has `package-lock.json` but no other lockfile):

```
NOTE: This project uses npm. Consider migrating to pnpm for:
  - Faster installs (content-addressable storage)
  - Stricter dependency resolution (no phantom dependencies)
  - Better monorepo support
  - Built-in audit with pnpm audit

Migration commands:
  1. npm install -g pnpm
  2. pnpm import           # converts package-lock.json to pnpm-lock.yaml
  3. rm package-lock.json
  4. pnpm install           # verify everything resolves
  5. Update CI scripts to use pnpm

This is a recommendation, not a blocker. Sentinel works with any package manager.
```

---

**Next:** Read `steps/03-check-security-tools.md`
