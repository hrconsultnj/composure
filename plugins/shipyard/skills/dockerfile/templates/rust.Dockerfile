# Template: Rust Dockerfile (Alpine multi-stage)
# Placeholders: {{RUST_VERSION}}, {{BINARY_NAME}}
# Used by: steps/02-generate.md

# ── Build ────────────────────────────────────────────────────
FROM rust:1.82-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

COPY . .
RUN cargo build --release

# ── Runner ───────────────────────────────────────────────────
FROM alpine:3.20 AS runner

RUN adduser -D -u 1001 appuser
COPY --from=builder /app/target/release/app /usr/local/bin/app

USER appuser

EXPOSE 8080

ENTRYPOINT ["app"]
