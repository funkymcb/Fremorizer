package main

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/funkymcb/fremorizer/instrument"
)

func main() {
	p := tea.NewProgram(initialModel())
	if _, err := p.Run(); err != nil {
		log.Fatal(err)
	}
}

type tickMsg time.Time

type errMsg struct{ err error }

func (e errMsg) Error() string { return e.err.Error() }

type model struct {
	// gameModes     []string // TODO: add different game modes
	textInput textinput.Model
	guitar    *instrument.Guitar // TODO: model should contain instrument, not a guitar
	blink     int
	err       error
}

func initialModel() model {
	ti := textinput.New()
	ti.Placeholder = "E"
	ti.Focus()
	ti.CharLimit = 5
	ti.Width = 20

	// TODO: ask the user for tuning and frets
	g, err := instrument.NewGuitar([]string{"E", "A", "D", "G", "B", "E"}, 24)
	if err != nil {
		return model{
			textInput: ti,
			guitar:    g,
			blink:     0,
			err:       err,
		}
	}

	return model{
		textInput: ti,
		guitar:    g,
		blink:     0,
		err:       nil,
	}
}

func tick() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func (m model) Init() tea.Cmd {
	return tick()
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	// m.guitar.Strings[5].Notes[1].ToBeDetermined = true

	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyCtrlC, tea.KeyEsc:
			return m, tea.Quit
		}

		switch msg.String() {
		case "q":
			return m, tea.Quit
		}

	case tickMsg:
		// Toggle between 0 and 1
		if m.blink == 0 {
			m.blink = 1
		} else {
			m.blink = 0
		}
		return m, tick()

	// We handle errors just like any other message
	case errMsg:
		m.err = msg
		return m, nil
	}

	m.textInput, cmd = m.textInput.Update(msg)
	return m, cmd
}

func (m model) View() string {
	if m.err != nil {
		return fmt.Sprintf("\nWe had some trouble: %v\n\n(esc to quit)\n", m.err)
	}

	view := strings.Builder{}
	view.WriteString(instrument.Render(m.guitar, m.blink))
	view.WriteString(m.textInput.View())
	view.WriteString("\n(esc to quit)\n")

	return view.String()
}
