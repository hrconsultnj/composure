# Step 6: Generate Test Scaffolding

> Read `references/testing-patterns.md` for per-language tool recommendations.

## 6a. Test Strategy by Language

| Language | HTTP Mocking | Contract Testing | Test Runner | Webhook Testing |
|---|---|---|---|---|
| TypeScript | MSW v2 | Pact | Vitest / Jest | MSW handler for POST |
| Python | `responses` / `httpx-mock` / `respx` | Pact Python | pytest | FastAPI TestClient |
| Go | `net/http/httptest` | Pact Go | `go test` + testify | `httptest.NewServer` |
| Rust | `wiremock` / `mockito` | N/A (use wiremock) | `cargo test` | `actix-web::test` |
| Ruby | `webmock` + VCR | Pact Ruby | RSpec / Minitest | Rack::Test |

## 6b. Client Unit Tests

Test the integration client with mocked HTTP responses. DO NOT call the real API in unit tests.

**Required test cases:**
1. **Successful request** — Mock a 200 response, verify the client parses it correctly
2. **Authentication** — Verify auth headers are sent correctly
3. **Error handling** — Mock 4xx/5xx responses, verify IntegrationError is thrown with correct fields
4. **Rate limiting** — Mock a 429 response, verify retry behavior
5. **Timeout** — Verify the client handles timeouts gracefully

### TypeScript: MSW v2 Pattern
```
// Use setupServer for Node.js test environment
// Define request handlers that intercept at the network level
// Handlers match on URL + method, return mock responses
// After tests, verify handlers were called (if needed)
```

### MSW + Pact Bridge (TypeScript only)
If the service has a Pact broker, or if you want consumer-driven contracts:
- Install `@pactflow/pact-msw-adapter`
- MSW handlers automatically generate Pact contract files
- Provider team can verify contracts in their CI

## 6c. Auth Flow Tests

1. **API Key** — Verify key is injected in the correct location (header/query)
2. **OAuth** — Test token exchange flow with mocked auth endpoint
3. **Token refresh** — Test automatic refresh when token is expired
4. **Missing credentials** — Verify meaningful error when credentials not configured

## 6d. Webhook Tests (if webhooks implemented)

1. **Valid signature** — Generate a valid HMAC signature, verify handler processes the event
2. **Invalid signature** — Send a bad signature, verify handler rejects it
3. **Expired timestamp** — Send an old timestamp, verify rejection
4. **Idempotency** — Send the same event twice, verify it's processed only once
5. **Unknown event type** — Send an unrecognized event type, verify graceful handling (log, don't error)

## 6e. Environment Setup

Ensure tests can run without real API credentials:

- Mock all external HTTP calls (never hit real APIs in CI)
- Use environment variable stubs or test fixtures for credentials
- If the SDK requires initialization with a key, mock the SDK client or use the SDK's test mode (e.g., Stripe test keys)

## 6f. Done

"Integration complete:
- **Client**: `{path}/client.{ext}` — {N} endpoint methods
- **Auth**: `{path}/auth.{ext}` — {auth method}
- **Webhooks**: `{path}/webhooks.{ext}` — {N} event handlers (or 'not applicable')
- **Tests**: `{path}/tests/` — {N} test files
- **SDK installed**: `{package}@{version}`

Run `{test command}` to verify."

**Done.** Next: `/composure:review` to review changes, then `/composure:commit` to commit.
