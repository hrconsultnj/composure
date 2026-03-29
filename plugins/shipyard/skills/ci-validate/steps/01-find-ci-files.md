# Step 1: Find CI Config Files

If a specific file was provided as argument, validate only that file.

Otherwise, find all CI configuration files in the project:

```bash
# GitHub Actions
ls .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null

# GitLab CI
ls .gitlab-ci.yml 2>/dev/null

# Bitbucket Pipelines
ls bitbucket-pipelines.yml 2>/dev/null

# CircleCI
ls .circleci/config.yml 2>/dev/null

# Jenkinsfile (Groovy -- limited validation)
ls Jenkinsfile 2>/dev/null
```

If no CI config files are found:

```
No CI/CD configuration files found. Run /shipyard:ci-generate to create one.
```

---

**Next:** Read `steps/02-external-linter.md`
