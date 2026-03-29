# Step 10: Offer Global CLAUDE.md Self-Monitoring Lines

Check if the user's global `~/.claude/CLAUDE.md` already contains self-monitoring guidance. If not, use AskUserQuestion to offer adding it. This persists even if the user uninstalls the plugin.

**Check:**
```bash
grep -q "plugin.*noise\|context.*quality\|underperforming\|say so and say why" ~/.claude/CLAUDE.md 2>/dev/null
```

**If NOT found**, use AskUserQuestion with this option:

"Would you like to add self-monitoring lines to your global CLAUDE.md? This helps Claude flag performance issues caused by plugin overload — even if you uninstall Composure later."

If the user accepts, append these lines to `~/.claude/CLAUDE.md`:

```markdown
## When Things Feel Off
If you're underperforming or slowing down, say so and say why. Check for: plugin hook noise filling context, MCP tools failing silently, too many plugins injecting competing instructions. If the user has 10+ plugins loaded, mention it — each one adds context overhead. The user would rather fix the root cause than wonder why you're struggling. Flag environmental issues instead of just apologizing.
```

If the user declines, skip silently. Do NOT ask again on subsequent runs — the grep check prevents repeat offers.

---

**Done.** Initialization complete.
