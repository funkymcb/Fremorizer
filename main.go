package main

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/funkymcb/fremorizer/game"
	"github.com/funkymcb/fremorizer/instrument"
)

func main() {
	p := tea.NewProgram(initialModel())
	if _, err := p.Run(); err != nil {
		log.Fatal(err)
	}
}

type tickMsg time.Time

type gameMsg struct{ msg string }

type errMsg struct{ err error }

func (e errMsg) Error() string { return e.err.Error() }

type model struct {
	// gameModes     []string // TODO: add different game modes
	blink     int
	err       error
	game      game.Game
	gameMsg   string
	guitar    *instrument.Guitar // TODO: model should contain instrument, not a guitar
	textInput textinput.Model
}

func initialModel() model {
	ti := textinput.New()
	ti.Placeholder = "_"
	ti.Focus()
	ti.CharLimit = 5
	ti.Width = 20

	// TODO: ask the user for tuning and frets
	g, err := instrument.NewGuitar([]string{"E", "A", "D", "G", "B", "E"}, 24)
	game, _ := game.New("single", g)
	if err != nil {
		return model{
			blink:     0,
			err:       err,
			game:      game,
			gameMsg:   "Find the note",
			guitar:    g,
			textInput: ti,
		}
	}

	return model{
		blink:     0,
		err:       nil,
		game:      game,
		gameMsg:   "Find the note",
		guitar:    g,
		textInput: ti,
	}
}

func tick() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func (m model) Init() tea.Cmd {
	return tea.Batch(
		tick(),
		textinput.Blink,
	)
}

// FIX: game stops after a few rounds,
// likely due to a bug in the game logic where the note is not being reset properly after each round.
// Need to investigate and fix the issue to ensure the game continues indefinitely as intended.

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyCtrlC, tea.KeyEsc:
			return m, tea.Quit
		case tea.KeyEnter:
			input := m.textInput.Value()
			if m.game.CheckAnswer(input) {
				return m, func() tea.Msg {
					game.Next(m.game)
					return gameMsg{msg: fmt.Sprintf("Correct! The answer was '%s'.", input)}
				}
			} else {
				// return error message if answer is incorrect
				return m, func() tea.Msg {
					return gameMsg{msg: fmt.Sprintf("Incorrect. The answer was not '%s'. Try again!", input)}
				}
			}
		}

		switch msg.String() {
		case "q":
			return m, tea.Quit
		}

	case gameMsg:
		m.textInput.Reset()
		m.gameMsg = msg.msg
		return m, nil

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
	view.WriteString("\n" + m.gameMsg + "\n")
	view.WriteString("\n(esc to quit)\n")

	return view.String()
}
