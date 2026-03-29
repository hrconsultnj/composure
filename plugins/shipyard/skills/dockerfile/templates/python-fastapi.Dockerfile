# Template: Python/FastAPI Dockerfile
# Placeholders: {{PYTHON_VERSION}}, {{INSTALL_COMMAND}}
# Used by: steps/02-generate.md

# ── Build ────────────────────────────────────────────────────
FROM python:3.12-slim AS builder
WORKDIR /app

# Install build dependencies
RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Runner ───────────────────────────────────────────────────
FROM python:3.12-slim AS runner
WORKDIR /app

# Copy installed packages from build stage
COPY --from=builder /install /usr/local

# Non-root user
RUN useradd --create-home --shell /bin/bash appuser
COPY . .
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
