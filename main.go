package main

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/funkymcb/fremorizer/game"
	"github.com/funkymcb/fremorizer/instrument"
)

// ── styles ────────────────────────────────────────────────────────────────────

var (
	styleTitle    = lipgloss.NewStyle().Bold(true).Underline(true)
	styleSelected = lipgloss.NewStyle().Foreground(lipgloss.Color("5")).Bold(true)
	styleHint     = lipgloss.NewStyle().Faint(true)
	styleSuccess  = lipgloss.NewStyle().Foreground(lipgloss.Color("2")).Bold(true)
	styleError    = lipgloss.NewStyle().Foreground(lipgloss.Color("1")).Bold(true)
)

// ── app states ────────────────────────────────────────────────────────────────

type appState int

const (
	stateModeSelect appState = iota
	stateOptions
	stateOptionsTuning
	statePlaying
)

type optItem int

const (
	optItemInstrument optItem = iota
	optItemStrings
	optItemTuning
	optItemFrets
	optItemBack
	optItemCount
)

// ── messages ──────────────────────────────────────────────────────────────────

type (
	tickMsg         time.Time
	gameFeedbackMsg struct {
		text    string
		correct bool
	}
)

// ── model ─────────────────────────────────────────────────────────────────────

type model struct {
	state appState

	// mode selection
	modeCursor int

	// options
	optCursor    int
	tuneCursor   int // which string is being edited in tuning sub-menu
	tuneEditMode bool
	tuneInput    textinput.Model

	// current instrument config
	instrType  string
	numStrings int
	tuning     []string
	frets      int

	// active game
	selectedMode int
	blink        int
	activeGame   game.Game
	feedback     string
	feedbackOK   bool
	wrongGuesses int
	textInput    textinput.Model
	revealed     bool
}

func initialModel() model {
	ti := textinput.New()
	ti.Placeholder = "_"
	ti.Focus()
	ti.CharLimit = 5
	ti.Width = 20

	tuneInput := textinput.New()
	tuneInput.CharLimit = 5
	tuneInput.Width = 10

	return model{
		state:      stateModeSelect,
		modeCursor: 0,
		optCursor:  0,
		instrType:  "guitar",
		numStrings: 6,
		tuning:     instrument.DefaultGuitarTuning(6),
		frets:      12,
		textInput:  ti,
		tuneInput:  tuneInput,
	}
}

func tick() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func (m model) Init() tea.Cmd {
	return tea.Batch(tick(), textinput.Blink)
}

// ── update ────────────────────────────────────────────────────────────────────

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tickMsg:
		if m.blink == 0 {
			m.blink = 1
		} else {
			m.blink = 0
		}
		return m, tick()

	case gameFeedbackMsg:
		m.feedback = msg.text
		m.feedbackOK = msg.correct
		m.textInput.Reset()
		return m, nil

	case tea.KeyMsg:
		switch m.state {
		case stateModeSelect:
			return m.updateModeSelect(msg)
		case stateOptions:
			return m.updateOptions(msg)
		case stateOptionsTuning:
			return m.updateTuning(msg)
		case statePlaying:
			return m.updatePlaying(msg)
		}
	}

	return m, nil
}

func (m model) updateModeSelect(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	modes := []string{"single", "fretset", "chords"}

	switch msg.String() {
	case "ctrl+c", "q":
		return m, tea.Quit
	case "up", "k":
		if m.modeCursor > 0 {
			m.modeCursor--
		}
	case "down", "j":
		if m.modeCursor < len(modes)-1 {
			m.modeCursor++
		}
	case "o":
		m.state = stateOptions
		m.optCursor = 0
		return m, nil
	case "enter", " ":
		m.selectedMode = m.modeCursor
		selected := modes[m.modeCursor]
		if selected == "chords" {
			m.feedback = "Game mode 3 (chords) is coming soon!"
			return m, nil
		}
		return m.startGame(selected)
	}

	return m, nil
}

func (m model) startGame(mode string) (tea.Model, tea.Cmd) {
	var inst *instrument.Instrument
	var err error

	switch m.instrType {
	case "guitar":
		inst, err = instrument.NewGuitar(m.tuning, m.frets)
	case "bass":
		inst, err = instrument.NewBass(m.tuning, m.frets)
	case "ukulele":
		inst, err = instrument.NewUkulele(m.tuning, m.frets)
	}

	if err != nil {
		m.feedback = fmt.Sprintf("Error: %v", err)
		return m, nil
	}

	g, err := game.New(mode, inst)
	if err != nil {
		m.feedback = fmt.Sprintf("Error: %v", err)
		return m, nil
	}

	m.activeGame = g
	m.state = statePlaying
	m.feedback = ""
	m.wrongGuesses = 0
	m.revealed = false
	m.textInput.Reset()
	m.textInput.Focus()
	return m, nil
}

func (m model) updateOptions(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	instruments := []string{"guitar", "bass", "ukulele"}

	switch msg.String() {
	case "ctrl+c":
		return m, tea.Quit
	case "esc", "b", "q":
		m.state = stateModeSelect
	case "up", "k":
		if m.optCursor > 0 {
			m.optCursor--
		}
	case "down", "j":
		if m.optCursor < int(optItemCount)-1 {
			m.optCursor++
		}
	case "enter", " ":
		switch optItem(m.optCursor) {
		case optItemInstrument:
			// cycle instrument
			for i, name := range instruments {
				if name == m.instrType {
					m.instrType = instruments[(i+1)%len(instruments)]
					break
				}
			}
			// update defaults for new instrument
			m.numStrings = defaultStringCount(m.instrType)
			m.tuning = defaultTuning(m.instrType, m.numStrings)
		case optItemStrings:
			// handled by +/-
		case optItemTuning:
			m.state = stateOptionsTuning
			m.tuneCursor = 0
			m.tuneEditMode = false
		case optItemFrets:
			// handled by +/-
		case optItemBack:
			m.state = stateModeSelect
		}
	case "+", "=", "right", "l":
		switch optItem(m.optCursor) {
		case optItemStrings:
			max := maxStrings(m.instrType)
			if m.numStrings < max {
				m.numStrings++
				m.tuning = defaultTuning(m.instrType, m.numStrings)
			}
		case optItemFrets:
			if m.frets < 24 {
				m.frets++
			}
		}
	case "-", "left", "h":
		switch optItem(m.optCursor) {
		case optItemStrings:
			min := minStrings(m.instrType)
			if m.numStrings > min {
				m.numStrings--
				m.tuning = defaultTuning(m.instrType, m.numStrings)
			}
		case optItemFrets:
			if m.frets > 12 {
				m.frets--
			}
		}
	}

	return m, nil
}

func (m model) updateTuning(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.tuneEditMode {
		switch msg.String() {
		case "enter":
			val := strings.ToUpper(strings.TrimSpace(m.tuneInput.Value()))
			if val != "" {
				// validate
				names := instrument.NoteNames()
				valid := false
				for _, n := range names {
					if strings.EqualFold(n, val) || strings.EqualFold(strings.Split(n, "/")[0], val) {
						valid = true
						// normalize
						parts := strings.Split(n, "/")
						tuningIdx := len(m.tuning) - 1 - m.tuneCursor
						m.tuning[tuningIdx] = parts[0]
						break
					}
				}
				if !valid {
					// keep old value, just exit edit
				}
			}
			m.tuneEditMode = false
			m.tuneInput.Reset()
		case "esc":
			m.tuneEditMode = false
			m.tuneInput.Reset()
		default:
			var cmd tea.Cmd
			m.tuneInput, cmd = m.tuneInput.Update(msg)
			return m, cmd
		}
		return m, nil
	}

	switch msg.String() {
	case "ctrl+c":
		return m, tea.Quit
	case "esc", "b", "q":
		m.state = stateOptions
	case "up", "k":
		if m.tuneCursor > 0 {
			m.tuneCursor--
		}
	case "down", "j":
		if m.tuneCursor < len(m.tuning)-1 {
			m.tuneCursor++
		}
	case "enter", " ":
		m.tuneEditMode = true
		tuningIdx := len(m.tuning) - 1 - m.tuneCursor
		m.tuneInput.SetValue(m.tuning[tuningIdx])
		m.tuneInput.Focus()
	}

	return m, nil
}

func (m model) updatePlaying(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// check if this is fret set mode
	if fsGame, ok := m.activeGame.(*game.FretSetGameImpl); ok {
		return m.updateFretSetMode(msg, fsGame)
	}
	return m.updateSingleNoteMode(msg)
}

func (m model) updateSingleNoteMode(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	snGame, _ := m.activeGame.(*game.SingleNoteGame)

	switch msg.String() {
	case "ctrl+c":
		return m, tea.Quit
	case "esc":
		m.state = stateModeSelect
		m.feedback = ""
		return m, nil
	case "enter":
		if m.revealed {
			// advance to next note; name disappears, color fill stays
			if err := m.activeGame.Next(); err != nil {
				m.feedback = fmt.Sprintf("Error: %v", err)
				return m, nil
			}
			m.revealed = false
			m.wrongGuesses = 0
			m.textInput.Reset()

			if snGame != nil && snGame.IsGameOver() {
				m.state = stateModeSelect
				m.feedback = "All notes green — well done!"
				return m, nil
			}
			m.feedback = "Find the note!"
			return m, nil
		}

		input := strings.TrimSpace(m.textInput.Value())
		if m.activeGame.CheckAnswer(input) {
			noteName := snGame.CurrentNoteName()
			snGame.RevealNote(true)
			m.revealed = true
			m.wrongGuesses = 0
			return m, func() tea.Msg {
				return gameFeedbackMsg{
					text:    fmt.Sprintf("Correct! '%s' — press Enter to continue.", noteName),
					correct: true,
				}
			}
		}

		m.wrongGuesses++
		if m.wrongGuesses >= 3 {
			noteName := snGame.CurrentNoteName()
			snGame.RevealNote(false)
			m.revealed = true
			return m, func() tea.Msg {
				return gameFeedbackMsg{
					text:    fmt.Sprintf("The note was '%s' — press Enter to continue.", noteName),
					correct: false,
				}
			}
		}

		remaining := 3 - m.wrongGuesses
		return m, func() tea.Msg {
			return gameFeedbackMsg{
				text:    fmt.Sprintf("Wrong! %d attempt(s) remaining.", remaining),
				correct: false,
			}
		}
	}

	var cmd tea.Cmd
	m.textInput, cmd = m.textInput.Update(msg)
	return m, cmd
}

func (m model) updateFretSetMode(msg tea.KeyMsg, fsGame *game.FretSetGameImpl) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c":
		return m, tea.Quit
	case "esc":
		m.state = stateModeSelect
		m.feedback = ""
		return m, nil
	case "up", "k":
		fsGame.MoveCursor(-1, 0)
	case "down", "j":
		fsGame.MoveCursor(1, 0)
	case "left", "h":
		fsGame.MoveCursor(0, -1)
	case "right", "l":
		fsGame.MoveCursor(0, 1)
	case " ", "enter":
		cs, cf := fsGame.GetCursor()
		fsGame.ToggleMark(cs, cf)
		if fsGame.IsComplete() {
			if err := fsGame.Next(); err != nil {
				m.feedback = fmt.Sprintf("Error: %v", err)
			}
			m.feedback = fmt.Sprintf("Correct! Find '%s' in the new fret set.", fsGame.GetTargetNote())
		}
	}

	return m, nil
}

// ── view ──────────────────────────────────────────────────────────────────────

func (m model) View() string {
	switch m.state {
	case stateModeSelect:
		return m.viewModeSelect()
	case stateOptions:
		return m.viewOptions()
	case stateOptionsTuning:
		return m.viewTuning()
	case statePlaying:
		return m.viewPlaying()
	}
	return ""
}

func (m model) viewModeSelect() string {
	var sb strings.Builder
	sb.WriteString(styleTitle.Render("Fremorizer") + "\n\n")
	sb.WriteString("Choose a game mode:\n\n")

	modes := []string{
		"1. Guess a random note (per string)",
		"2. Find all occurrences in a fret set",
		"3. Chord notes (coming soon)",
	}
	for i, mode := range modes {
		if i == m.modeCursor {
			sb.WriteString(styleSelected.Render("> "+mode) + "\n")
		} else {
			sb.WriteString("  " + mode + "\n")
		}
	}

	sb.WriteString("\n")
	if m.feedback != "" {
		sb.WriteString(styleHint.Render(m.feedback) + "\n\n")
	}
	sb.WriteString(styleHint.Render("↑/↓: navigate  Enter: select  o: options  q: quit"))
	return sb.String()
}

func (m model) viewOptions() string {
	var sb strings.Builder
	sb.WriteString(styleTitle.Render("Options") + "\n\n")

	labels := []string{
		fmt.Sprintf("Instrument:  %s", m.instrType),
		fmt.Sprintf("Strings:     %d  (range: %d-%d)", m.numStrings, minStrings(m.instrType), maxStrings(m.instrType)),
		fmt.Sprintf("Tuning:      %s", strings.Join(m.tuning, "-")),
		fmt.Sprintf("Frets:       %d  (range: 12-24)", m.frets),
		"Back",
	}

	for i, label := range labels {
		if i == m.optCursor {
			sb.WriteString(styleSelected.Render("> "+label) + "\n")
		} else {
			sb.WriteString("  " + label + "\n")
		}
	}

	sb.WriteString("\n")
	sb.WriteString(styleHint.Render("↑/↓: navigate  Enter: select/cycle  +/-: adjust values  Esc/b: back"))
	return sb.String()
}

func (m model) viewTuning() string {
	var sb strings.Builder
	sb.WriteString(styleTitle.Render("Edit Tuning") + "\n\n")

	// display strings in reverse (high to low as shown on fretboard)
	for i := len(m.tuning) - 1; i >= 0; i-- {
		displayIdx := len(m.tuning) - 1 - i
		label := fmt.Sprintf("String %d: %s", i+1, m.tuning[i])
		if displayIdx == m.tuneCursor {
			if m.tuneEditMode {
				sb.WriteString(styleSelected.Render("> String "+fmt.Sprint(i+1)+": ") + m.tuneInput.View() + "\n")
			} else {
				sb.WriteString(styleSelected.Render("> "+label) + "\n")
			}
		} else {
			sb.WriteString("  " + label + "\n")
		}
	}

	sb.WriteString("\n")
	if m.tuneEditMode {
		sb.WriteString(styleHint.Render("Enter note name and press Enter. Valid: C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B"))
	} else {
		sb.WriteString(styleHint.Render("↑/↓: navigate  Enter: edit  Esc/b: back"))
	}
	return sb.String()
}

func (m model) viewPlaying() string {
	var sb strings.Builder

	opts := instrument.RenderOpts{Blink: m.blink}

	if fsGame, ok := m.activeGame.(*game.FretSetGameImpl); ok {
		start, end := fsGame.GetFretSetBounds()
		cs, cf := fsGame.GetCursor()
		opts.FretSetMode = true
		opts.FretSetStart = start
		opts.FretSetEnd = end
		opts.CursorString = cs
		opts.CursorFret = cf

		sb.WriteString(fmt.Sprintf("Note to find: %s\n\n",
			styleTitle.Render(fsGame.GetTargetNote())))
		sb.WriteString(instrument.Render(fsGame.GetInstrument(), opts))
		sb.WriteString("\n")
		if m.feedback != "" {
			sb.WriteString(m.feedback + "\n")
		}
		sb.WriteString(styleHint.Render("hjkl/arrows: move  Space/Enter: mark  Esc: back"))
	} else {
		sb.WriteString(instrument.Render(m.activeGame.GetInstrument(), opts))
		sb.WriteString("\n")
		sb.WriteString(m.textInput.View() + "\n")
		if m.feedback != "" {
			if m.feedbackOK {
				sb.WriteString(styleSuccess.Render(m.feedback) + "\n")
			} else {
				sb.WriteString(styleError.Render(m.feedback) + "\n")
			}
		} else {
			sb.WriteString("Find the note!\n")
		}
		sb.WriteString("\n" + styleHint.Render("Type note name and press Enter  Esc: back"))
	}

	return sb.String()
}

// ── helpers ───────────────────────────────────────────────────────────────────

func defaultStringCount(instrType string) int {
	switch instrType {
	case "bass":
		return 4
	case "ukulele":
		return 4
	default:
		return 6
	}
}

func defaultTuning(instrType string, numStrings int) []string {
	switch instrType {
	case "bass":
		return instrument.DefaultBassTuning(numStrings)
	case "ukulele":
		return instrument.DefaultUkuleleTuning()
	default:
		return instrument.DefaultGuitarTuning(numStrings)
	}
}

func minStrings(instrType string) int {
	switch instrType {
	case "bass":
		return 4
	case "ukulele":
		return 4
	default:
		return 6
	}
}

func maxStrings(instrType string) int {
	switch instrType {
	case "bass":
		return 6
	case "ukulele":
		return 4
	default:
		return 8
	}
}

func main() {
	p := tea.NewProgram(initialModel())
	if _, err := p.Run(); err != nil {
		log.Fatal(err)
	}
}
