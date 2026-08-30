# Gujarat Sentinel — Hybrid Gateway (Go)
FROM golang:1.23-alpine AS builder
RUN apk add --no-cache git ca-certificates
WORKDIR /build
COPY . .
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /sentinel-gateway ./cmd/gateway

FROM alpine:3.20
RUN apk add --no-cache ca-certificates curl wget
COPY --from=builder /sentinel-gateway /usr/local/bin/sentinel-gateway
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8000/health || exit 1
ENTRYPOINT ["sentinel-gateway"]
