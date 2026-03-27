# Rust Security Patterns

Patterns used by `/sentinel:scan` and `insecure-pattern-guard.sh` for Rust codebases. Each pattern includes detection logic, risk explanation, and fix.

## Unsafe Code

### Undocumented Unsafe Blocks
- **Pattern:** `unsafe { ... }` without a preceding `// SAFETY:` comment
- **Example:** `unsafe { ptr.read() }`
- **Risk:** Undefined behavior potential with no documented justification. Violates Rust community convention and makes auditing impossible.
- **Fix:** Always document the safety invariant:
  ```rust
  // SAFETY: ptr is guaranteed non-null and aligned by the allocator above
  unsafe { ptr.read() }
  ```
- **Note:** The `// SAFETY:` comment convention is enforced by `clippy::undocumented_unsafe_blocks`

### std::mem::transmute
- **Pattern:** `std::mem::transmute` or `mem::transmute`
- **Risk:** Bypasses the entire type system. Can create invalid values, cause UB, or violate invariants.
- **Fix:** Almost never needed. Prefer safe alternatives:
  - `as` casts for numeric conversions
  - `from_ne_bytes` / `to_ne_bytes` for byte reinterpretation
  - `TryFrom` / `TryInto` for fallible conversions
- **Semgrep:** `rust.lang.security.unsafe-transmute`

### Unsafe impl Send/Sync
- **Pattern:** `unsafe impl Send for` or `unsafe impl Sync for`
- **Risk:** Incorrect Send/Sync implementations cause data races (UB) in safe code
- **Fix:** Requires rigorous proof that the type is safe to send/share across threads. Document with `// SAFETY:` explaining thread-safety guarantees.

## Error Handling

### Unwrap in Production Code
- **Pattern:** `.unwrap()` on `Result` or `Option` types outside of tests
- **Example:** `let config = File::open("config.toml").unwrap();`
- **Risk:** Panics on `Err` or `None`, crashing the process. Denial of service.
- **Fix:** Use `?` operator for propagation, `.unwrap_or()` or `.unwrap_or_default()` for defaults, or `match` / `if let` for explicit handling
- **Note:** `.unwrap()` is acceptable in tests (`#[cfg(test)]`), examples, and after infallible checks (e.g., `regex.captures().unwrap()` when match was already confirmed)

### expect() Without Context
- **Pattern:** `.expect("failed")` with a generic message
- **Risk:** Still panics in production — same as unwrap but with a message
- **Fix:** If a panic is truly acceptable (startup config), use descriptive messages: `.expect("DATABASE_URL must be set")`. Otherwise, use `?`.

## Command Injection

### Process::Command with User Input
- **Pattern:** `std::process::Command::new()` where arguments are derived from user input
- **Example:** `Command::new("sh").arg("-c").arg(format!("convert {}", user_path)).output()`
- **Risk:** Command injection via shell metacharacters in user input
- **Fix:** Never pass user input through a shell. Use direct invocation: `Command::new("convert").arg(&validated_path).output()`. Validate inputs against an allowlist.
- **Semgrep:** `rust.lang.security.command-injection`

### std::process::exit in Libraries
- **Pattern:** `std::process::exit()` in library code (non-`main` crate)
- **Risk:** Abrupt termination without cleanup, destructor skipping, resource leaks
- **Fix:** Return `Result<(), Error>` and let the caller decide how to handle failure

## SQL Injection

### Format Strings in SQL
- **Pattern:** `format!()` or string concatenation used to build SQL queries
- **Example:** `sqlx::query(&format!("SELECT * FROM users WHERE name = '{}'", name))`
- **Risk:** SQL injection — attacker controls query structure
- **Fix:** Use parameterized queries. With sqlx: `sqlx::query!("SELECT * FROM users WHERE name = $1", name)`. The `query!` macro validates at compile time.
- **Note:** The `query!` macro is strongly preferred over `query()` because it checks SQL at compile time

### diesel Raw SQL
- **Pattern:** `diesel::sql_query()` with interpolated strings
- **Risk:** Same as above — raw SQL bypass of ORM protections
- **Fix:** Use Diesel's query builder: `users.filter(name.eq(&input))`. If raw SQL is necessary, use `sql_query` with `.bind::<Text, _>(input)`.

## Cryptography

### Weak Random
- **Pattern:** `rand::thread_rng()` for security-sensitive values (tokens, keys, nonces)
- **Risk:** `rand::thread_rng()` is actually CSPRNG (ChaCha) in Rust, but check for `rand::rngs::SmallRng` or `rand::rngs::StdRng::seed_from_u64()`
- **Fix:** Use `rand::rngs::OsRng` directly for critical secrets, or verify `thread_rng()` usage is appropriate
- **Note:** Unlike most languages, Rust's `thread_rng()` IS cryptographically secure. Only flag `SmallRng` or seeded RNGs.

## Dependency Safety

### Crate Audit
- **Pattern:** Dependencies not audited via `cargo audit`
- **Risk:** Known vulnerabilities in transitive dependencies
- **Fix:** Run `cargo audit` in CI. Use `cargo deny` for policy enforcement (license, advisory, source).

## False Positive Exclusions

These are intentionally NOT flagged:
- `.unwrap()` in `#[cfg(test)]` modules or files matching `*_test.rs`
- `unsafe` blocks with a `// SAFETY:` comment on the preceding line
- `Command::new()` with hardcoded string arguments (no user input)
- `format!()` in non-SQL contexts (logging, display, etc.)
- `transmute` in FFI boundary code with documented safety invariants
