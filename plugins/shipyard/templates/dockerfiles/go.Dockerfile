# Stage 1: Build
FROM golang:1.23-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

# Stage 2: Runner (distroless -- no shell, minimal attack surface)
FROM gcr.io/distroless/static:nonroot
WORKDIR /app

COPY --from=build /app/server ./server

USER nonroot:nonroot
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD ["/app/server", "-healthcheck"]

ENTRYPOINT ["/app/server"]
