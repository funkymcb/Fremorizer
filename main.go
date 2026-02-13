package main

// A simple program demonstrating the text input component from the Bubbles
// component library.

import (
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

type (
	errMsg error
)

type model struct {
	textInput textinput.Model
	guitar    *instruments.Guitar
	err       error
}

func initialModel() model {
	ti := textinput.New()
	ti.Placeholder = "E"
	ti.Focus()
	ti.CharLimit = 5
	ti.Width = 20

	// TODO: ask the user for tuning and frets
	g := instruments.NewGuitar([]string{"E", "A", "D", "G", "B", "E"}, 12)

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
	view := strings.Builder{}
	view.WriteString(m.guitar.Render())
	view.WriteString(m.textInput.View())
	view.WriteString("\n(esc to quit)\n")

	return view.String()
}
