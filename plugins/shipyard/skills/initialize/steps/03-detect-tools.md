# Step 3: Detect Installed CI/CD Tools

Check for available tooling. Run each with version flag, suppress errors:

```bash
actionlint --version 2>/dev/null    # GitHub Actions linter
act --version 2>/dev/null            # Local GitHub Actions runner
hadolint --version 2>/dev/null       # Dockerfile linter
docker --version 2>/dev/null         # Container runtime
kubectl version --client 2>/dev/null # Kubernetes CLI
terraform --version 2>/dev/null      # IaC
vercel --version 2>/dev/null         # Vercel CLI
netlify --version 2>/dev/null        # Netlify CLI
flyctl version 2>/dev/null           # Fly.io CLI
railway version 2>/dev/null          # Railway CLI
gh --version 2>/dev/null             # GitHub CLI
gitlab --version 2>/dev/null         # GitLab CLI
```

Record installed tools with their versions. For tools that are NOT installed but would be useful based on the detected platform, suggest installation using the system installer.

**System installer detection** (same pattern as Sentinel):

```bash
brew --version 2>/dev/null   # macOS
apt --version 2>/dev/null    # Debian/Ubuntu
dnf --version 2>/dev/null    # Fedora/RHEL
pacman --version 2>/dev/null # Arch
choco --version 2>/dev/null  # Windows
nix --version 2>/dev/null    # NixOS/cross-platform
```

Use the preferred system installer for suggestions. Example:

```
actionlint is not installed. It validates GitHub Actions workflow syntax.

Install with:
  brew install actionlint          # macOS (Homebrew)
  go install github.com/rhysd/actionlint/cmd/actionlint@latest  # Go

actionlint is optional but enables /shipyard:ci-validate for deep workflow analysis.
```

Only suggest tools relevant to the detected platform. Do not suggest `hadolint` if there is no Dockerfile.

---

**Next:** Read `steps/04-context7-queries.md`
