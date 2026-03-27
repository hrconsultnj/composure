# Go Security Patterns

Patterns used by `/sentinel:scan` and `insecure-pattern-guard.sh` for Go codebases. Each pattern includes detection logic, risk explanation, and fix.

## SQL Injection

### String Interpolation in Queries
- **Pattern:** `fmt.Sprintf` or string concatenation (`+`) used to build SQL query strings
- **Example:** `db.Query(fmt.Sprintf("SELECT * FROM users WHERE id = '%s'", userID))`
- **Risk:** Full SQL injection — attacker controls query structure
- **Fix:** Use parameterized queries: `db.Query("SELECT * FROM users WHERE id = $1", userID)`
- **Semgrep:** `go.lang.security.audit.sqli.string-formatted-query`

### Raw String Queries with Variables
- **Pattern:** `db.Exec()` or `db.Query()` where the query argument contains variable interpolation
- **Example:** `db.Exec("DELETE FROM orders WHERE id = " + orderID)`
- **Risk:** SQL injection via unescaped user input
- **Fix:** Always use `?` (MySQL) or `$1` (Postgres) placeholders: `db.Exec("DELETE FROM orders WHERE id = $1", orderID)`

## TLS / Network

### HTTP Without TLS
- **Pattern:** `http.ListenAndServe()` without corresponding TLS configuration
- **Example:** `http.ListenAndServe(":8080", handler)`
- **Risk:** Traffic interception, credential theft, session hijacking
- **Fix:** Use `http.ListenAndServeTLS(":443", "cert.pem", "key.pem", handler)` or deploy behind a TLS-terminating reverse proxy (nginx, Caddy, cloud LB)
- **Note:** Acceptable for local development or behind a reverse proxy. Flag only when detected in production config.

### Missing Server Timeouts
- **Pattern:** `http.Server{}` without `ReadTimeout`, `WriteTimeout`, or `IdleTimeout`
- **Example:** `server := &http.Server{Addr: ":8080", Handler: mux}`
- **Risk:** Slowloris attacks, resource exhaustion, connection starvation
- **Fix:** Always set timeouts:
  ```go
  server := &http.Server{
      Addr:         ":8080",
      Handler:      mux,
      ReadTimeout:  5 * time.Second,
      WriteTimeout: 10 * time.Second,
      IdleTimeout:  120 * time.Second,
  }
  ```
- **Semgrep:** `go.lang.security.audit.net.use-tls`

## Memory / Resource Exhaustion

### Unbounded Read
- **Pattern:** `ioutil.ReadAll()` or `io.ReadAll()` on untrusted input without size limit
- **Example:** `body, err := io.ReadAll(r.Body)`
- **Risk:** Memory exhaustion — attacker sends multi-GB request body
- **Fix:** Use `io.LimitReader()`: `body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))` (1 MB limit)
- **Note:** `ioutil.ReadAll` is deprecated since Go 1.16, but both variants have the same risk

### Missing Request Body Limit
- **Pattern:** HTTP handler reads `r.Body` without `http.MaxBytesReader`
- **Risk:** Same as unbounded read — OOM on large payloads
- **Fix:** Wrap the body: `r.Body = http.MaxBytesReader(w, r.Body, maxBytes)`

## Cross-Site Scripting (XSS)

### Unsafe HTML in Templates
- **Pattern:** `template.HTML()` type conversion on user input
- **Example:** `template.HTML(userComment)`
- **Risk:** XSS — user-controlled HTML rendered without escaping
- **Fix:** Use `template.HTMLEscapeString()` or let `html/template` auto-escape (it does by default for `{{.}}` actions)
- **Semgrep:** `go.lang.security.audit.xss.template-html-unescaped`

### text/template for HTML
- **Pattern:** Using `text/template` instead of `html/template` for HTML output
- **Risk:** `text/template` does NOT auto-escape. All output is raw.
- **Fix:** Always use `html/template` for any HTML rendering

## Error Handling

### Discarded Errors
- **Pattern:** `_ = someFunction()` where `someFunction` returns an error
- **Example:** `_ = db.Close()` or `_ = file.Chmod(0600)`
- **Risk:** Masked security failures — failed permission changes, unclosed resources, silent auth errors
- **Fix:** Handle every error. At minimum, log it: `if err := db.Close(); err != nil { log.Printf("close error: %v", err) }`
- **Note:** `_ = fmt.Fprintf()` is acceptable (write to stdout rarely fails meaningfully)

### Panic in HTTP Handlers
- **Pattern:** `panic()` called inside an HTTP handler function
- **Example:** `panic("unexpected state")`
- **Risk:** Crashes the entire server process. Denial of service.
- **Fix:** Return errors instead. Use `http.Error(w, "internal error", 500)` and log the details. If panic recovery is needed, use middleware: `defer func() { if r := recover(); r != nil { ... } }()`

## Cryptography

### Weak Random for Security
- **Pattern:** `math/rand` used for tokens, IDs, or security-sensitive values
- **Example:** `token := fmt.Sprintf("%d", rand.Int63())`
- **Risk:** Predictable output — `math/rand` is not cryptographically secure
- **Fix:** Use `crypto/rand`: `b := make([]byte, 32); crypto/rand.Read(b)`

### Hardcoded Crypto Keys
- **Pattern:** `[]byte("some-secret-key")` in encryption or HMAC calls
- **Risk:** Key exposure in source code, no rotation capability
- **Fix:** Load keys from environment variables or a secrets manager

## Command Injection

### exec.Command with User Input
- **Pattern:** `exec.Command()` where arguments include user-controlled strings
- **Example:** `exec.Command("sh", "-c", "convert " + filename)`
- **Risk:** Command injection via shell metacharacters
- **Fix:** Pass arguments as separate parameters (not via `sh -c`): `exec.Command("convert", filename)`. Validate and sanitize all inputs.
- **Semgrep:** `go.lang.security.audit.command-injection`

## False Positive Exclusions

These are intentionally NOT flagged:
- `http.ListenAndServe` in files matching `*_test.go` or `*_dev.go`
- `io.ReadAll` on known-bounded sources (e.g., reading from `strings.NewReader`)
- `_ = fmt.Fprintf` and `_ = fmt.Fprintln` (write to stdout/stderr)
- `template.HTML` on compile-time string constants (no user input)
- `panic()` in `init()` functions or `main()` (acceptable for startup validation)
