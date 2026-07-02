// precompile-jsx rewrites html/Fremorizer.html in place for production:
// the inline <script type="text/babel"> block is compiled to plain JS with
// esbuild and the @babel/standalone loader tag is removed. The page then
// starts without downloading Babel (~3 MB) or compiling JSX in the browser,
// and the server can drop 'unsafe-eval' from its CSP (see pageHandler).
//
// Run from the repo root before `go build` (the Dockerfile does this):
//
//	go run ./tools/precompile-jsx [path/to/Fremorizer.html]
//
// The checked-in HTML keeps the Babel setup so local development needs no
// build step.
package main

import (
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"

	"github.com/evanw/esbuild/pkg/api"
)

func main() {
	path := "html/Fremorizer.html"
	if len(os.Args) > 1 {
		path = os.Args[1]
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		log.Fatalf("read %s: %v", path, err)
	}
	html := string(raw)

	const openTag = `<script type="text/babel">`
	const closeTag = `</script>`
	start := strings.Index(html, openTag)
	if start < 0 {
		log.Fatalf("%s: no %q block found (already precompiled?)", path, openTag)
	}
	rel := strings.Index(html[start:], closeTag)
	if rel < 0 {
		log.Fatalf("%s: unterminated babel script block", path)
	}
	end := start + rel

	src := html[start+len(openTag) : end]
	result := api.Transform(src, api.TransformOptions{
		Loader:           api.LoaderJSX,
		MinifyWhitespace: true,
		MinifySyntax:     true,
		// Keep identifiers: the script runs in the page's global scope.
	})
	for _, w := range result.Warnings {
		log.Printf("esbuild warning: %s", w.Text)
	}
	if len(result.Errors) > 0 {
		for _, e := range result.Errors {
			log.Printf("esbuild error: %s", e.Text)
		}
		log.Fatalf("%s: JSX compilation failed", path)
	}

	html = html[:start] + "<script>" + string(result.Code) + closeTag + html[end+len(closeTag):]

	// The Babel loader is no longer needed.
	babelTag := regexp.MustCompile(`(?m)^\s*<script src="https://unpkg\.com/@babel/standalone[^\n]*\n`)
	if !babelTag.MatchString(html) {
		log.Fatalf("%s: @babel/standalone script tag not found", path)
	}
	html = babelTag.ReplaceAllString(html, "")

	if err := os.WriteFile(path, []byte(html), 0o644); err != nil {
		log.Fatalf("write %s: %v", path, err)
	}
	fmt.Printf("precompiled %s: %d bytes JSX → %d bytes JS\n", path, len(src), len(result.Code))
}
