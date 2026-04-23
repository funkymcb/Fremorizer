package main

import (
	"context"
	"crypto/tls"
	_ "embed"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"golang.org/x/crypto/acme/autocert"
)

//go:embed html/Fremorizer.html
var htmlPage []byte

func serveHTTP(domain, addr string) {
	if addr != "" {
		serveHTTPProxy(addr)
		return
	}
	serveHTTPStandalone(domain)
}

// serveHTTPProxy runs a plain HTTP server on addr for use behind a reverse
// proxy (e.g. Caddy) that terminates TLS. The server binds only to the given
// address, which should be a localhost interface so it is not reachable from
// outside the machine.
func serveHTTPProxy(addr string) {
	srv := &http.Server{
		Addr:              addr,
		Handler:           pageHandler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	errCh := make(chan error, 1)
	go func() {
		log.Printf("HTTP server listening on %s (proxy mode)", addr)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		log.Fatal("HTTP server error:", err)
	case <-quit:
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
	}
}

// serveHTTPStandalone runs a self-contained HTTPS server with automatic
// Let's Encrypt certificates. Use this when Caddy (or another reverse proxy)
// is not in front of fremorizer.
func serveHTTPStandalone(domain string) {
	certCache := "/var/cache/fremorizer-certs"
	if _, err := os.Stat(certCache); os.IsNotExist(err) {
		certCache = ".certs" // fallback for local testing
	}

	certManager := &autocert.Manager{
		Cache:      autocert.DirCache(certCache),
		Prompt:     autocert.AcceptTOS,
		HostPolicy: autocert.HostWhitelist(domain),
	}

	tlsCfg := certManager.TLSConfig()
	tlsCfg.MinVersion = tls.VersionTLS12
	// Prefer forward-secret AEAD cipher suites; drop legacy CBC and RC4.
	tlsCfg.CipherSuites = []uint16{
		tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
		tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
		tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
		tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
		tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256,
		tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
	}

	httpsServer := &http.Server{
		Addr:              ":443",
		Handler:           pageHandler(),
		TLSConfig:         tlsCfg,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// Port 80 only exists to redirect to HTTPS and satisfy ACME HTTP-01 challenges.
	httpServer := &http.Server{
		Addr:              ":80",
		Handler:           certManager.HTTPHandler(http.HandlerFunc(redirectToHTTPS)),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("HTTP server listening on :80 (redirects to HTTPS)")
		if err := httpServer.ListenAndServe(); err != http.ErrServerClosed {
			log.Printf("HTTP server error: %v", err)
		}
	}()

	errCh := make(chan error, 1)
	go func() {
		log.Printf("HTTPS server listening on :443 — https://%s", domain)
		errCh <- httpsServer.ListenAndServeTLS("", "")
	}()

	select {
	case err := <-errCh:
		log.Fatal("HTTPS server error:", err)
	case <-quit:
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = httpsServer.Shutdown(ctx)
		_ = httpServer.Shutdown(ctx)
	}
}

// pageHandler returns an http.Handler that serves the embedded HTML page with
// security headers.
func pageHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		// Babel standalone requires 'unsafe-eval' and 'unsafe-inline' at runtime;
		// all script/font origins are pinned to the CDNs the page actually uses.
		h.Set("Content-Security-Policy",
			"default-src 'none'; "+
				"script-src https://unpkg.com 'unsafe-inline' 'unsafe-eval'; "+
				"style-src https://fonts.googleapis.com 'unsafe-inline'; "+
				"font-src https://fonts.gstatic.com; "+
				"connect-src 'none'; "+
				"img-src 'none'; "+
				"frame-ancestors 'none';")
		h.Set("Content-Type", "text/html; charset=utf-8")
		w.Write(htmlPage)
	})
	return mux
}

func redirectToHTTPS(w http.ResponseWriter, r *http.Request) {
	target := "https://" + r.Host + r.URL.RequestURI()
	http.Redirect(w, r, target, http.StatusMovedPermanently)
}
