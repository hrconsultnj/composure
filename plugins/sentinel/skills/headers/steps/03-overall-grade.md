# Step 3: Overall Grade

Calculate an overall grade based on weighted risk:

| Header | Weight | Rationale |
|--------|--------|-----------|
| CSP | 30% | Primary XSS defense |
| HSTS | 25% | HTTPS enforcement, SSL stripping prevention |
| X-Frame-Options / frame-ancestors | 15% | Clickjacking prevention |
| X-Content-Type-Options | 15% | MIME confusion prevention |
| Referrer-Policy | 10% | Information leakage |
| Permissions-Policy | 5% | Feature restriction (low direct risk) |
| X-XSS-Protection | 0% | Deprecated — only flag if set to `1` |

**Grading scale:**
- **A** (90-100%) — Strong security posture
- **B** (70-89%) — Good with minor gaps
- **C** (50-69%) — Significant gaps, action needed
- **D** (30-49%) — Weak, multiple critical headers missing
- **F** (0-29%) — Minimal security headers

---

**Next:** Read `steps/04-report.md`
