# Step 1: Fetch Headers

Fetch the HTTP response headers for the target URL.

```bash
curl -sI -L -o /dev/null -D - "<url>" 2>/dev/null | head -50
```

Use `-L` to follow redirects. Capture the final response headers (after all redirects).

If the URL does not include a protocol, prepend `https://`.

If curl fails (timeout, DNS resolution, etc.), report the error and stop.

---

**Next:** Read `steps/02-analyze-headers.md`
