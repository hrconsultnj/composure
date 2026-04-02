# Step 1: Identify Changes and Setup

Determine what is being reviewed, resolve linked issues, and ensure the code graph is current.

## 1a. Determine the PR

**If a PR number is provided:**

```bash
gh pr diff <number>
gh pr view <number> --json title,body,labels,url,headRefName,baseRefName
```

Extract:
- Changed files list from the diff
- PR title and body (for linked issue detection)
- Base branch name (for graph operations)

**If a branch name is provided:**

```bash
git diff main...<branch> --name-only
git log main...<branch> --oneline
```

**If neither is provided:**

Auto-detect from the current branch vs main/master:

```bash
git diff main...HEAD --name-only
git log main...HEAD --oneline
```

If on `main` with no divergence, STOP: "No changes to review. Provide a PR number or switch to a feature branch."

## 1b. Linked Issues

Parse the PR title and body for issue references:

- GitHub issues: `#123`, `fixes #123`, `closes #456`
- Jira/Linear: `PROJ-123`, `ENG-456`
- Full URLs: `github.com/org/repo/issues/123`

For each GitHub issue found:

```bash
gh issue view <number> --json title,body,labels,state
```

Store the issue context — it informs step 08 (recommendations can validate whether the PR actually addresses the linked issue).

If no linked issues found, skip this sub-step silently.

## 1c. Update the Graph

Ensure the code graph reflects the current state of the branch being reviewed:

```
build_or_update_graph({ base: "<base_branch>" })
```

Where `<base_branch>` is the PR's base branch (usually `main`).

If the graph MCP is unavailable, STOP: "The composure-graph MCP server is disconnected. Restart Claude Code to reconnect, then re-run this command."

## Output

Store for use in subsequent steps:
- `CHANGED_FILES` — list of files in the PR diff
- `PR_TITLE` — PR title (or branch name if no PR)
- `BASE_BRANCH` — base branch for comparison
- `LINKED_ISSUES` — array of issue numbers with titles (may be empty)
- `COMMIT_COUNT` — number of commits in the PR

---

**Next:** Read `steps/02-context-building.md`
