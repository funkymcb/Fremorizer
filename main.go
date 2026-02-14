package main

// A simple program demonstrating the text input component from the Bubbles
// component library.

import (
	"fmt"
	"log"
	"strings"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/funkymcb/fremorizer/instruments"
)

func main() {
	p := tea.NewProgram(initialModel())
	if _, err := p.Run(); err != nil {
		log.Fatal(err)
	}
}

type errMsg struct{ err error }

func (e errMsg) Error() string { return e.err.Error() }

type model struct {
	textInput textinput.Model
	guitar    *instruments.Guitar // TODO: model should contain instrument, not a guitar
	err       error
}

func initialModel() model {
	ti := textinput.New()
	ti.Placeholder = "E"
	ti.Focus()
	ti.CharLimit = 5
	ti.Width = 20

	// TODO: ask the user for tuning and frets
	g, err := instruments.NewGuitar([]string{"E", "A", "D", "G", "B", "E"}, 24)
	if err != nil {
		return model{
			textInput: ti,
			guitar:    g,
			err:       err,
		}
	}

	return model{
		textInput: ti,
		guitar:    g,
		err:       nil,
	}
}

func (m model) Init() tea.Cmd {
	return textinput.Blink
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	// m.guitar.Strings[5].Notes[24].Hidden = false

	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyEnter, tea.KeyCtrlC, tea.KeyEsc:
			return m, tea.Quit
		}

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
	view.WriteString(m.guitar.Render())
	view.WriteString(m.textInput.View())
	view.WriteString("\n(esc to quit)\n")

	return view.String()
}
