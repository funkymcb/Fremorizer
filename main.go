package main

import (
	"flag"
	"log"

	tea "github.com/charmbracelet/bubbletea"
)

func main() {
	flagServeSSH := flag.Bool("serve-ssh", false, "run as SSH game server")
	flagServeHTTP := flag.Bool("serve-http", false, "run as HTTP/HTTPS game server")
	flagDomain := flag.String("domain", "fremorizer.com", "domain for TLS certificate (used with --serve-http standalone)")
	flagAddr := flag.String("addr", "", "listen address for HTTP when behind a reverse proxy, e.g. 127.0.0.1:3000 (disables built-in TLS)")
	flag.Parse()

	switch {
	case *flagServeSSH:
		serveSSH()
	case *flagServeHTTP:
		serveHTTP(*flagDomain, *flagAddr)
	default:
		p := tea.NewProgram(initialModel(nil), tea.WithAltScreen())
		if _, err := p.Run(); err != nil {
			log.Fatal(err)
		}
	}
}
