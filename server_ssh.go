package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/ssh"
	"github.com/charmbracelet/wish"
	wishbt "github.com/charmbracelet/wish/bubbletea"
	"github.com/muesli/termenv"
)

func serveSSH() {
	addr := "0.0.0.0:2222"
	hostKey := "/opt/fremorizer/host_key"
	// Fall back to a local path when running outside of the server environment.
	if _, err := os.Stat(hostKey); os.IsNotExist(err) {
		hostKey = "./host_key"
	}

	s, err := wish.NewServer(
		wish.WithAddress(addr),
		wish.WithHostKeyPath(hostKey),
		wish.WithMiddleware(
			wishbt.MiddlewareWithColorProfile(func(sess ssh.Session) (tea.Model, []tea.ProgramOption) {
				return initialModel(wishbt.MakeRenderer(sess)), []tea.ProgramOption{tea.WithAltScreen()}
			}, termenv.TrueColor),
		),
	)
	if err != nil {
		log.Fatal("failed to create SSH server:", err)
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	log.Printf("SSH server listening on %s — connect with: ssh -p 2222 <host>", addr)

	errCh := make(chan error, 1)
	go func() { errCh <- s.ListenAndServe() }()

	select {
	case err := <-errCh:
		log.Fatal("SSH server error:", err)
	case <-quit:
	}

	log.Println("Shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
}
