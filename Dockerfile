# ── build stage ───────────────────────────────────────────────────────────────
FROM golang:1.26-alpine AS builder

# Install only what's needed for the build
RUN apk add --no-cache git

WORKDIR /build

# Cache dependency downloads separately from source compilation
COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .

# Build a fully static binary:
#   CGO_ENABLED=0  — no C bindings, avoids libc dependency
#   -trimpath      — remove local file paths from binary (no info leakage)
#   -ldflags       — strip debug info and symbol table to reduce size
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o fremorizer .

# ── final stage ───────────────────────────────────────────────────────────────
FROM scratch

# Copy CA certificates for any future HTTPS calls (harmless if unused)
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy only the binary
COPY --from=builder /build/fremorizer /fremorizer

# Run as a non-root user (UID 65534 = nobody, available even in scratch)
USER 65534:65534

ENTRYPOINT ["/fremorizer"]
