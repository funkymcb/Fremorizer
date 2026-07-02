package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"crypto/tls"
	"embed"
	"encoding/hex"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"golang.org/x/crypto/acme/autocert"
)

//go:embed html/Fremorizer.html
var htmlPage []byte

//go:embed html/styles.css
var cssPage []byte

//go:embed html/lib.js
var libJS []byte

//go:embed html/favicon.ico
var faviconBytes []byte

// Strat samples — medium-velocity layer only (~11MB). Extend the glob to
// embed gt1-*.wav / gt3-*.wav if SAMPLE_LAYER in the page is changed.
//
//go:embed html/assets/sounds/strat/gt2-*.wav
var stratSamples embed.FS

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

// assetHash is a short content hash used to version asset URLs.
func assetHash(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:4])
}

// versionedPage rewrites the embedded page's asset references to carry a
// content hash (lib.js → lib.js?v=<hash>). lib.js and styles.css are served
// with a 24h shared-cache lifetime, so CDNs (e.g. Cloudflare) hold on to them
// across deploys; versioned URLs make every deploy an automatic cache miss,
// so a fresh page can never run against a stale cached lib.js.
func versionedPage() []byte {
	page := htmlPage
	page = bytes.ReplaceAll(page,
		[]byte(`src="lib.js"`),
		[]byte(`src="lib.js?v=`+assetHash(libJS)+`"`))
	page = bytes.ReplaceAll(page,
		[]byte(`href="styles.css"`),
		[]byte(`href="styles.css?v=`+assetHash(cssPage)+`"`))
	return page
}

// pageHandler returns an http.Handler that serves the embedded HTML page with
// security headers.
func pageHandler() http.Handler {
	page := versionedPage()
	mux := http.NewServeMux()
	mux.HandleFunc("/styles.css", func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Type", "text/css; charset=utf-8")
		h.Set("Cache-Control", "public, max-age=86400")
		w.Write(cssPage)
	})
	mux.HandleFunc("/lib.js", func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Type", "application/javascript; charset=utf-8")
		h.Set("Cache-Control", "public, max-age=86400")
		w.Write(libJS)
	})
	mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Type", "image/x-icon")
		h.Set("Cache-Control", "public, max-age=604800")
		w.Write(faviconBytes)
	})
	mux.HandleFunc("/assets/sounds/strat/", func(w http.ResponseWriter, r *http.Request) {
		// Only serve .wav files from the embedded sample bank; reject
		// anything else (defense in depth, even though embed.FS is
		// traversal-safe).
		if !strings.HasSuffix(r.URL.Path, ".wav") {
			http.NotFound(w, r)
			return
		}
		data, err := stratSamples.ReadFile("html" + r.URL.Path)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		h := w.Header()
		h.Set("Content-Type", "audio/wav")
		h.Set("Cache-Control", "public, max-age=604800")
		w.Write(data)
	})
	// Dev builds ship raw JSX and need Babel standalone, which requires
	// 'unsafe-eval'. Production images run tools/precompile-jsx before
	// `go build`, so the embedded page is plain JS and eval stays blocked.
	scriptSrc := "script-src 'self' https://unpkg.com 'unsafe-inline'"
	if bytes.Contains(htmlPage, []byte(`type="text/babel"`)) {
		scriptSrc += " 'unsafe-eval'"
	}
	csp := "default-src 'none'; " +
		scriptSrc + "; " +
		"style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; " +
		"font-src https://fonts.gstatic.com; " +
		"connect-src 'self'; " +
		"img-src 'self'; " +
		"frame-ancestors 'none';"

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Content-Security-Policy", csp)
		// The page must always revalidate: it carries the versioned asset
		// URLs, so a cached copy would defeat the cache busting above.
		h.Set("Cache-Control", "no-cache")
		h.Set("Content-Type", "text/html; charset=utf-8")
		w.Write(page)
	})
	return mux
}

func redirectToHTTPS(w http.ResponseWriter, r *http.Request) {
	target := "https://" + r.Host + r.URL.RequestURI()
	http.Redirect(w, r, target, http.StatusMovedPermanently)
}
