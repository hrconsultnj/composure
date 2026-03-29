# Step 2b: Deployment Target Templates and Diff Check

## Deployment Target Templates

### Vercel

For Vercel deployments, use the Vercel CLI approach (more control than the GitHub integration):

```yaml
- name: Deploy to Vercel
  run: |
    vercel pull --yes --environment=${{ env.DEPLOY_ENV }} --token=${{ secrets.VERCEL_TOKEN }}
    vercel build ${{ env.VERCEL_BUILD_FLAGS }} --token=${{ secrets.VERCEL_TOKEN }}
    vercel deploy --prebuilt ${{ env.VERCEL_DEPLOY_FLAGS }} --token=${{ secrets.VERCEL_TOKEN }}
  env:
    VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
    VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    DEPLOY_ENV: ${{ github.ref == 'refs/heads/main' && 'production' || 'preview' }}
    VERCEL_BUILD_FLAGS: ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
    VERCEL_DEPLOY_FLAGS: ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
```

### Netlify

Use the Netlify CLI:

```yaml
- name: Deploy to Netlify
  run: netlify deploy ${{ github.ref == 'refs/heads/main' && '--prod' || '' }} --dir=dist
  env:
    NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
    NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Docker (Container Registry)

Build and push to a container registry:

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v6
  with:
    context: .
    push: ${{ github.ref == 'refs/heads/main' }}
    tags: |
      ghcr.io/${{ github.repository }}:${{ github.sha }}
      ghcr.io/${{ github.repository }}:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Fly.io

```yaml
- name: Deploy to Fly.io
  uses: superfly/flyctl-actions/setup-flyctl@master
- run: flyctl deploy --remote-only
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Railway

```yaml
- name: Deploy to Railway
  run: railway up --service ${{ secrets.RAILWAY_SERVICE_ID }}
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Diff Check (Preserve Existing Workflows)

Before writing, check if the target file already exists:

```bash
cat .github/workflows/ci.yml 2>/dev/null
```

**If the file exists:**

1. Generate the new workflow content
2. Show a clear diff of what would change:
   ```
   Existing workflow: .github/workflows/ci.yml

   Changes:
   + Added typecheck stage (tsconfig.json detected)
   + Added pnpm cache step (was missing)
   + Updated actions/checkout from v3 to v4
   - Removed npm install (project uses pnpm)
   ~ Changed Node version from 18 to 22

   Write these changes? The existing file will be OVERWRITTEN.
   ```
3. Wait for confirmation before writing. NEVER silently overwrite an existing CI workflow.

**If the file does not exist:** Write directly, no confirmation needed.

---

**Next:** Read `steps/03-validate-and-report.md`
