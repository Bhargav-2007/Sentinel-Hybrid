# Gujarat Sentinel — Model 4: Central VMS & Vehicle Tracking (Go)
FROM golang:1.23-alpine AS builder
RUN apk add --no-cache git ca-certificates
WORKDIR /build
COPY . .
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /sentinel-model4 ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates curl wget
COPY --from=builder /sentinel-model4 /usr/local/bin/sentinel-model4
EXPOSE 8004
HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8004/health || exit 1
ENTRYPOINT ["sentinel-model4"]
