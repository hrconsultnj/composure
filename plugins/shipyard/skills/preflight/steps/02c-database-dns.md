# Step 2c: Checks -- Database & DNS/SSL

#### Category 5: Database

**5.1: Migrations in CI**

Check if the CI workflow includes a migration step:

```bash
grep -n "migrate\|db:push\|prisma migrate\|drizzle.*push\|supabase.*push" .github/workflows/*.yml 2>/dev/null
```

- PASS: Migration step found in CI
- WARN: No migration step in CI (manual migration risk)
- SKIP: No database detected

**5.2: Connection pooling**

Check for connection pooling configuration:

| Pattern | Pooling |
|---------|---------|
| `?pgbouncer=true` in connection string | PgBouncer |
| `connection_limit` in Prisma schema | Prisma pool |
| `pool` in drizzle config | Drizzle pool |
| Supabase uses built-in pooler (port 6543) | Supabase pooler |

- PASS: Connection pooling configured
- WARN: No connection pooling detected (may exhaust connections under load)
- SKIP: No database detected

**5.3: Backups configured**

This is documentation-only (cannot detect from code):

- WARN: Verify database backups are configured and tested
- SKIP: No database detected

---

#### Category 6: DNS and SSL (requires --url)

If `--url` is not provided, SKIP this entire category.

**6.1: SSL certificate valid**

```bash
echo | openssl s_client -connect {host}:443 -servername {host} 2>/dev/null | openssl x509 -noout -dates 2>/dev/null
```

Parse the `notAfter` date and check:

- PASS: SSL valid, expires in > 30 days
- WARN: SSL valid but expires in < 30 days
- FAIL: SSL expired or invalid

**6.2: HSTS enabled**

```bash
curl -sI {url} 2>/dev/null | grep -i "strict-transport-security"
```

- PASS: HSTS header present with `max-age` >= 31536000 (1 year)
- WARN: HSTS header present but `max-age` < 31536000
- FAIL: No HSTS header

**6.3: HTTP to HTTPS redirect**

```bash
curl -sI http://{host} 2>/dev/null | grep -i "location"
```

- PASS: HTTP redirects to HTTPS (301/302 with `Location: https://`)
- FAIL: HTTP does not redirect to HTTPS

---

**Next:** Read `steps/03-report.md`
