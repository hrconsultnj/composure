# Python Security Patterns

Patterns used by `/sentinel:scan` when Python projects are detected. Covers injection, deserialization, framework-specific (FastAPI, Django), and general anti-patterns.

---

## Injection Attacks

### Code Injection via `eval()` / `exec()`
- **Regex:** `\beval\s*\(` or `\bexec\s*\(`
- **Severity:** Critical
- **Risk:** Arbitrary code execution from attacker-controlled strings.
- **Fix:** Use `ast.literal_eval()` for safe literal parsing. Never pass user input.
```python
# BAD
result = eval(request.query_params.get("expr"))
# GOOD
result = ast.literal_eval(user_expr)  # only parses str, int, list, dict, etc.
```

### Command Injection via `os.system()`
- **Regex:** `\bos\.system\s*\(`
- **Severity:** High
- **Risk:** Shell command injection via concatenated user input.
- **Fix:** Use `subprocess.run()` with argument list and `shell=False`.
```python
# BAD
os.system(f"ping {user_input}")  # attacker: ; rm -rf /
# GOOD
subprocess.run(["ping", "-c", "4", user_input], shell=False, check=True)
```

### `subprocess` with `shell=True`
- **Regex:** `subprocess\.(run|call|Popen|check_output|check_call)\s*\(.*shell\s*=\s*True`
- **Severity:** High
- **Risk:** Shell metacharacters (`;`, `|`, `&&`) enable injection.
- **Fix:** Use `shell=False` (default) with argument lists.
```python
# BAD
subprocess.run(f"convert {filename} output.pdf", shell=True)
# GOOD
subprocess.run(["convert", filename, "output.pdf"])
```

### Dynamic Import via `__import__()`
- **Regex:** `__import__\s*\(`
- **Severity:** Low (with allowlist), High (without)
- **Risk:** Attacker-controlled module names load arbitrary modules.
- **Fix:** Validate against allowlist. Prefer static imports.

---

## Deserialization

### `pickle.loads()` — Arbitrary Code Execution
- **Regex:** `pickle\.(loads?|Unpickler)\s*\(` or `cPickle\.`
- **Severity:** Critical
- **Risk:** Executes arbitrary Python during deserialization. Attacker-crafted payloads achieve RCE.
- **Fix:** Never unpickle untrusted data. Use JSON, MessagePack, or Protobuf.
```python
# BAD
data = pickle.loads(request.body)
# GOOD
data = json.loads(request.body)
```

### `yaml.load()` Without SafeLoader
- **Regex:** `yaml\.load\s*\(` without `Loader\s*=\s*(Safe|yaml\.Safe)Loader`
- **Severity:** High
- **Risk:** Default Loader can instantiate arbitrary Python objects.
- **Fix:** Use `yaml.safe_load()` or pass `Loader=SafeLoader`.
```python
# BAD
config = yaml.load(user_data)
# GOOD
config = yaml.safe_load(user_data)
```

---

## FastAPI Specific

### CORS: Wildcard with Credentials
- **Regex:** `allow_origins\s*=\s*\[["']\*["']\]` + `allow_credentials\s*=\s*True`
- **Severity:** Medium
- **Risk:** Browsers reject `*` origin with credentials. Broken config signals insecure intent.
- **Fix:** Specify exact origins when credentials are enabled.
```python
# BAD
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True)
# GOOD
app.add_middleware(CORSMiddleware,
    allow_origins=["https://app.example.com"], allow_credentials=True)
```

### CVE-2021-32677: CSRF via Content-Type Bypass
- **Versions:** FastAPI < 0.65.2, Starlette < 0.14.2
- **Severity:** High
- **Risk:** Form submissions with `application/x-www-form-urlencoded` bypass CSRF on JSON endpoints.
- **Fix:** Upgrade to FastAPI >= 0.65.2.

### Raw Request Data Without Pydantic
- **Regex:** `request\.(json|body|form)\s*\(\)` without Pydantic model parameter
- **Severity:** Medium
- **Risk:** Bypasses automatic validation, allowing malformed data through.
- **Fix:** Declare Pydantic models as endpoint parameters.
```python
# BAD
@app.post("/users")
async def create_user(request: Request):
    data = await request.json()  # unvalidated
# GOOD
class CreateUser(BaseModel):
    name: str
    email: EmailStr
@app.post("/users")
async def create_user(user: CreateUser):
    db.insert(user.model_dump())
```

### Missing Auth in Dependency Injection
- **Severity:** High
- **Risk:** Middleware-only auth leaves new routes unprotected.
- **Fix:** Use `Depends()` for endpoint-level auth.
```python
# BAD — auth only in middleware
@app.post("/admin/delete-user")
async def delete_user(user_id: int): ...
# GOOD — explicit dependency
@app.post("/admin/delete-user")
async def delete_user(user_id: int, admin=Depends(get_current_admin)): ...
```

### Missing Rate Limiting
- **Severity:** Medium
- **Risk:** No built-in rate limiting. Vulnerable to brute-force, credential stuffing, DoS.
- **Fix:** Use `slowapi` or custom middleware.
```python
limiter = Limiter(key_func=get_remote_address)
@app.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, creds: LoginCredentials): ...
```

---

## Django Specific

### XSS via `mark_safe()`
- **Regex:** `mark_safe\s*\(`
- **Severity:** High
- **Risk:** Skips HTML escaping. User input creates XSS.
- **Fix:** Only use on trusted content. Escape user data with `django.utils.html.escape()` first.
```python
# BAD
return mark_safe(f"<p>Welcome, {user.display_name}</p>")
# GOOD
from django.utils.html import escape
return mark_safe(f"<p>Welcome, {escape(user.display_name)}</p>")
```

### XSS via `|safe` Template Filter
- **Regex (templates):** `\|\s*safe\b`
- **Severity:** High
- **Risk:** Disables auto-escaping. Same as `mark_safe()`.
- **Fix:** Avoid `|safe` on user-controlled variables. Django auto-escapes by default.

### Disabled CSRF Middleware
- **Regex:** `CsrfViewMiddleware` commented out, or `@csrf_exempt`
- **Severity:** High
- **Risk:** Enables cross-site request forgery on state-changing endpoints.
- **Fix:** Keep middleware enabled. Only exempt webhooks with signature verification.
```python
# BAD
@csrf_exempt
def update_profile(request): ...
# OK — webhook verifies signature
@csrf_exempt
def stripe_webhook(request):
    stripe.Webhook.construct_event(request.body, sig, endpoint_secret)
```

### SQL Injection via `extra()` and `raw()`
- **Regex:** `\.extra\s*\(` or `\.raw\s*\(`
- **Severity:** Critical (with string formatting)
- **Risk:** Raw SQL with string formatting leads to injection.
- **Fix:** Use parameterized queries or ORM methods.
```python
# BAD
User.objects.raw(f"SELECT * FROM users WHERE name = '{user_input}'")
# GOOD
User.objects.raw("SELECT * FROM users WHERE name = %s", [user_input])
# BEST
User.objects.filter(name=user_input)
```

---

## General Python Security

### `Any` Type Annotations
- **Regex:** `:\s*Any\b` or `->\s*Any\b`
- **Severity:** Medium
- **Risk:** Disables type checking. Masks injection points and missing validations on security-critical functions.
- **Fix:** Use specific types, `Union`, `TypeVar`, or `Protocol`.

### Bare `except:` Clauses
- **Regex:** `except\s*:` (without exception type)
- **Severity:** Medium
- **Risk:** Catches `SystemExit`, `KeyboardInterrupt`, and security exceptions (`PermissionError`, `ssl.SSLError`). Silently swallowing these masks attacks.
- **Fix:** Catch specific exceptions. At minimum use `except Exception:`.
```python
# BAD — silently accepts invalid tokens
try:
    verify_token(token)
except:
    pass
# GOOD
except TokenExpiredError:
    raise HTTPException(status_code=401, detail="Token expired")
```

### `type: ignore` Comments
- **Regex:** `#\s*type:\s*ignore`
- **Severity:** Low
- **Risk:** Suppresses type errors that may indicate security issues.
- **Fix:** Fix the underlying error. If unavoidable, use specific code: `# type: ignore[arg-type]`.

### SQL Injection via f-strings
- **Regex:** `(execute|cursor\.execute|\.raw)\s*\(\s*f["']` or `%` formatting in SQL
- **Severity:** Critical
- **Risk:** Most common SQL injection vector in Python.
- **Fix:** Parameterized queries.
```python
# BAD
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
cursor.execute("SELECT * FROM users WHERE id = %s" % user_id)
# GOOD
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
session.execute(text("SELECT * FROM users WHERE id = :id"), {"id": user_id})
```

### `requests` Without Timeout
- **Regex:** `requests\.(get|post|put|patch|delete|head|options)\s*\(` without `timeout`
- **Severity:** Medium
- **Risk:** Hangs indefinitely, causing thread exhaustion and DoS.
- **Fix:** Always set `timeout`. Tuple for (connect, read).
```python
# BAD
response = requests.get(url)
# GOOD
response = requests.get(url, timeout=10)
response = requests.post(url, json=data, timeout=(3.05, 27))
```

### Hardcoded Secrets
- **Regex:** `(API_KEY|SECRET_KEY|PASSWORD|TOKEN|DATABASE_URL)\s*=\s*["'][^"']{8,}["']`
- **Severity:** Critical
- **Risk:** Secrets in source control exposed to all with repo access, persist in git history.
- **Fix:** Environment variables or secrets manager (`pydantic-settings`, `python-decouple`).
```python
# BAD
SECRET_KEY = "django-insecure-abc123def456ghi789"
# GOOD
SECRET_KEY = os.environ["SECRET_KEY"]
```

---

## Severity Classification

| Severity | Patterns |
|----------|----------|
| **Critical** | `eval()`/`exec()`, `pickle.loads()`, SQL injection via f-strings, hardcoded secrets |
| **High** | `os.system()`, `shell=True`, `yaml.load()` w/o SafeLoader, `mark_safe()`, disabled CSRF, missing endpoint auth |
| **Medium** | CORS wildcard+credentials, missing rate limiting, bare `except:`, `Any` types, `requests` w/o timeout |
| **Low** | `type: ignore` w/o specific code, `__import__()` with allowlist, `|safe` on static content |

## False Positive Exclusions

Not flagged:
- `eval()`/`exec()` in test files (`*_test.py`, `test_*.py`, `conftest.py`)
- `pickle` in test fixtures or migration scripts
- `mark_safe()` on string literals with no variable interpolation
- `shell=True` in build scripts (`setup.py`, `noxfile.py`, `tasks.py`) with hardcoded commands
- `yaml.load()` when `Loader=SafeLoader` is present
- `# type: ignore[specific-code]` with explicit error code
- `requests` calls inside test files (local test servers)
