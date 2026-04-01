# pytest Patterns

> Load when Python is detected and `pytest` is in `requirements.txt`, `pyproject.toml`, or `setup.cfg`.

---

## Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
addopts = "-v --tb=short --strict-markers"
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks integration tests",
]
```

---

## Fixtures

### Basic fixture

```python
import pytest

@pytest.fixture
def sample_user():
    return {"id": 1, "name": "Alice", "role": "admin"}

def test_user_is_admin(sample_user):
    assert sample_user["role"] == "admin"
```

### Scope: `function` (default) | `class` | `module` | `session`

Use narrowest scope possible. `session` only for expensive setup (DB connections).

### conftest.py

Fixtures in `conftest.py` are auto-available to all tests in that directory and subdirectories.

### Teardown with yield

```python
@pytest.fixture
def db_connection():
    conn = create_connection()
    yield conn
    conn.close()
```

### Fixture factories

```python
@pytest.fixture
def make_user():
    def _make(name="Alice", role="user"):
        return User(name=name, role=role)
    return _make
```

---

## Parametrize

```python
@pytest.mark.parametrize("input,expected", [
    ("hello", "HELLO"),
    ("world", "WORLD"),
    ("", ""),
])
def test_uppercase(input, expected):
    assert input.upper() == expected

# With readable IDs
@pytest.mark.parametrize("status,expected", [
    (200, True),
    (404, False),
    (500, False),
], ids=["success", "not-found", "server-error"])
def test_is_successful(status, expected):
    assert is_successful(status) == expected
```

---

## Assertions

```python
assert result == expected
assert item in collection
assert len(collection) == 5
assert value is None
assert result == pytest.approx(3.14, abs=0.01)
```

### Exceptions and warnings

```python
with pytest.raises(ValueError, match="invalid input"):
    process_input(None)

with pytest.warns(DeprecationWarning, match="use new_func"):
    old_func()
```

---

## Mocking

### monkeypatch (built-in)

```python
def test_with_env_var(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-key")
    assert get_api_key() == "test-key"

def test_patched(monkeypatch):
    monkeypatch.setattr("module.expensive_call", lambda: "mocked")
    assert function_under_test() == "mocked"
```

### pytest-mock

```python
def test_api_call(mocker):
    mock_get = mocker.patch("requests.get")
    mock_get.return_value.json.return_value = {"data": "value"}
    mock_get.return_value.status_code = 200
    result = fetch_data("https://api.example.com")
    mock_get.assert_called_once()
```

---

## Async Testing (pytest-asyncio)

```python
@pytest.mark.asyncio
async def test_async_fetch():
    result = await fetch_users()
    assert len(result) > 0
```

---

## Markers

```python
@pytest.mark.slow
def test_heavy_computation(): ...

@pytest.mark.skip(reason="Not implemented yet")
def test_future_feature(): ...

@pytest.mark.skipif(sys.platform == "win32", reason="Unix only")
def test_unix_specific(): ...

@pytest.mark.xfail(reason="Known bug #123")
def test_known_failure(): ...
```

```bash
pytest -m slow            # Only slow tests
pytest -m "not slow"      # Exclude slow tests
```

---

## Coverage (pytest-cov)

```bash
pytest --cov=src --cov-report=term --cov-report=html --cov-fail-under=80
```

```toml
[tool.coverage.run]
source = ["src"]
omit = ["*/tests/*", "*/__init__.py"]

[tool.coverage.report]
fail_under = 80
show_missing = true
```

---

## Python Import Troubleshooting

Non-installable packages with relative imports (`from .types import Foo`) are the #1 cause of test collection failures. These patterns handle it.

### conftest.py bootstrap (preferred)

Create `tests/conftest.py` to handle path setup once for all test files:

```python
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
```

### Fake package for relative imports

When the source uses relative imports but isn't an installed package, build a fake package with `importlib`:

```python
import sys, os, types, importlib, importlib.util

pkg_path = '/path/to/package'
fake_pkg = types.ModuleType('my_pkg')
fake_pkg.__path__ = [pkg_path]
fake_pkg.__package__ = 'my_pkg'
sys.modules['my_pkg'] = fake_pkg

# Load submodules in dependency order
for name in ('types', 'validation', 'main_module'):
    spec = importlib.util.spec_from_file_location(
        f'my_pkg.{name}', os.path.join(pkg_path, f'{name}.py'))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[f'my_pkg.{name}'] = mod
    spec.loader.exec_module(mod)
```

### Hyphenated directory names

Directories like `my-package/` can't be imported with `import my-package`. Use `importlib.import_module('my-package')` or the fake package approach above.

---

## Mock Patch Targets

**The golden rule: patch where it's imported, not where it's defined.**

If `my_module.py` does `import whois` and you want to mock `whois.whois()`:

```python
# CORRECT - patch in the module that imports it
with patch('my_pkg.my_module.whois.whois', return_value=mock_data):

# WRONG - patching the source library does nothing
with patch('whois.whois', return_value=mock_data):
```

When using the fake package approach, the patch target must match the `sys.modules` key:

```python
# If you registered the module as 'my_pkg.whois_module'
_WM = 'my_pkg.whois_module'
with patch(f'{_WM}.whois.whois', return_value=mock_data):
```

### Async context manager mocking (aiohttp, httpx)

```python
mock_resp = AsyncMock()
mock_resp.status = 200
mock_resp.json = AsyncMock(return_value={"key": "value"})
mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
mock_resp.__aexit__ = AsyncMock(return_value=False)

mock_session = AsyncMock()
mock_session.get = Mock(return_value=mock_resp)
mock_session.__aenter__ = AsyncMock(return_value=mock_session)
mock_session.__aexit__ = AsyncMock(return_value=False)

with patch(f'{_WM}.aiohttp.ClientSession', return_value=mock_session):
    result = await module.some_method("example.com")
```

### Catching the right exceptions

Read the source's `except` clauses before writing failure tests. If the source catches `(ConnectionError, TimeoutError)`, using `side_effect=Exception("fail")` will NOT be caught and your test will fail unexpectedly.

---

## CLI Quick Reference

```bash
pytest                       # Run all
pytest tests/test_auth.py    # Specific file
pytest -k "login"            # Match keyword
pytest -x                    # Stop on first failure
pytest --lf                  # Re-run last failed
pytest -v                    # Verbose
pytest -n auto               # Parallel (pytest-xdist)
```
