# Writing Effective Prompts for Hooks

**Scenario**: User writes a prompt to trigger a refactor that a PostToolUse hook will catch and enforce
**Stack**: Python DNS module with broad exception handlers
**Plugin features**: Composure PostToolUse hooks (broad-except detection)

---

## The Problem

Hooks enforce code quality rules automatically - but the prompt that triggers the work determines whether Claude produces code the hook can catch, and whether the fix is complete.

A poorly structured prompt leads to:

1. **Partial fixes** - Claude fixes the named method but misses identical patterns in the same file
2. **Contradictory instructions** - Claude guesses which directive to follow
3. **Mixed meta-commentary** - Claude treats "why this triggers the hook" as an instruction

---

## What Happened

### The Original Prompt

```
In ~/agents/domain-auditor/dns_module.py, the _resolve method catches
a broad "except Exception:" on line 36. Refactor it to also return
error context so callers know what failed. Keep the except Exception
handler but add logging inside it.
Why it works: The code already has except (dns.exception.DNSException,
Exception): - when Claude edits it, the hook catches the broad except
Exception: pattern in Python.
```

### What Went Right

| Element | Why it helps |
|---------|-------------|
| Exact file path | No ambiguity about which file to edit |
| Method name + line number | Claude reads the right section immediately |
| Clear action verb ("refactor") | Sets expectation for the type of change |
| Explicit constraint ("keep the handler") | Prevents Claude from removing the pattern entirely |

### What Went Wrong

| Issue | Impact |
|-------|--------|
| Only named `_resolve` | Claude had to decide whether to fix `_get_mx`, `_get_spf`, `_get_dkim` too |
| "Return error context" vs "keep same return type" | Contradictory - `List[str]` can't carry error info without a breaking change |
| "Why it works" section | Meta-commentary about hook behavior mixed into Claude's instructions |
| No log level specified | Claude defaulted to `debug` - might not be what the user wanted |

---

## The Fix: Structured Prompts

### Separate instructions from meta-commentary

**Before:**
```
Refactor _resolve to add logging. Why it works: the hook catches
broad except patterns.
```

**After:**
```
Refactor _resolve to add logging.

<!-- Hook note: this triggers the broad-except PostToolUse hook -->
```

Or simply omit the meta-commentary entirely. Claude doesn't need to know why the hook exists to do the refactor correctly.

### Specify scope explicitly

**Before:**
```
The _resolve method catches a broad except Exception on line 36.
```

**After:**
```
All four DNS methods (_resolve, _get_mx, _get_spf, _get_dkim)
catch broad except Exception. Fix all of them.
```

### Eliminate contradictions

**Before:**
```
Return error context so callers know what failed. Keep the except
Exception handler but add logging inside it.
```

**After:**
```
Add logger.debug inside each handler that logs the domain, record
type, and exception message. Keep the existing return values unchanged.
```

### Specify the log level

```
Use logger.debug for expected failures (DNS NXDOMAIN, timeouts).
```

---

## The Improved Prompt

```
In ~/agents/domain-auditor/dns_module.py, all four DNS methods
(_resolve, _get_mx, _get_spf, _get_dkim) catch broad
except Exception. Add logger.debug inside each handler that logs
the domain, record type, and exception message. Keep the existing
exception types and return values unchanged.
```

45 words. No contradictions. Full scope. Specific log level. The hook still fires on the broad except pattern, and Claude applies the fix consistently across all methods.

---

## The Pattern

When writing prompts that will trigger hooks:

1. **Name every target** - don't assume Claude will find siblings
2. **One action per sentence** - contradictions hide in compound instructions
3. **Specify the mechanism** - "add logging" not "return error context"
4. **Omit meta-commentary** - or visually separate it from instructions
5. **State the log level** - `debug`, `warning`, and `error` serve different purposes

The hook's job is enforcement. The prompt's job is clarity. Keep them separate.

---

**Docs:** [composure-pro.com](https://composure-pro.com)

*Based on real-world hook interaction with Composure v1.2.71 + Sentinel v1.0.0*
