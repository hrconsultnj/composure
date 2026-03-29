# Step 2: Detect CI Platform and Deployment Targets

Scan project root for deployment configuration files. Check each in order and record ALL matches (a project can have both Vercel and Docker):

| File / Directory | Platform |
|-----------------|----------|
| `.github/workflows/` | GitHub Actions |
| `.gitlab-ci.yml` | GitLab CI |
| `bitbucket-pipelines.yml` | Bitbucket Pipelines |
| `.circleci/config.yml` | CircleCI |
| `Jenkinsfile` | Jenkins |
| `vercel.json` or `.vercel/` | Vercel |
| `netlify.toml` | Netlify |
| `fly.toml` | Fly.io |
| `railway.toml` or `railway.json` | Railway |
| `render.yaml` | Render |
| `Dockerfile` | Docker (container deployment) |
| `docker-compose.yml` or `docker-compose.yaml` or `compose.yml` | Docker Compose |
| `k8s/` or `kubernetes/` or any `*.yaml` with `apiVersion:` | Kubernetes |
| `terraform/` or `*.tf` files | Terraform |
| `pulumi/` or `Pulumi.yaml` | Pulumi |
| `serverless.yml` or `serverless.ts` | Serverless Framework |
| `amplify.yml` or `amplify/` | AWS Amplify |
| `appspec.yml` | AWS CodeDeploy |

If none found, check `package.json` scripts and devDependencies for clues:
- `"vercel"` in scripts or deps -> Vercel
- `"netlify-cli"` in deps -> Netlify
- `"wrangler"` in deps -> Cloudflare Workers

For GitHub Actions, also list existing workflows:

```bash
ls .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null
```

Record filenames for the config output.

**Determine primary CI platform** (the one that runs tests/builds) vs **deployment target** (where code ships to). A project typically has one CI platform and one or more deployment targets.

---

**Next:** Read `steps/03-detect-tools.md`
