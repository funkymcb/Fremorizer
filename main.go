package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"os"
	"os/signal"
	"slices"
	"strings"
	"syscall"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/ssh"
	"github.com/charmbracelet/wish"
	wishbt "github.com/charmbracelet/wish/bubbletea"
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
	styleResult   = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("2")).
			Foreground(lipgloss.Color("15")).
			Bold(true).
			Padding(0, 2)
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
	optItemFretSetMode
	optItemChordDifficulty
	optItemChordCount
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
	instrType         string
	numStrings        int
	tuning            []string
	frets             int
	fretSetSequential bool
	chordDifficulty   string // "easy", "medium", "hard"
	chordCount        int    // number of chords to find per session

	// active game
	selectedMode  int
	blink         int
	activeGame    game.Game
	feedback      string
	feedbackOK    bool
	wrongGuesses  int
	textInput     textinput.Model
	revealed      bool
	gameStartTime time.Time
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
		state:             stateModeSelect,
		modeCursor:        0,
		optCursor:         0,
		instrType:         "guitar",
		numStrings:        6,
		tuning:            instrument.DefaultGuitarTuning(6),
		frets:             12,
		fretSetSequential: true,
		chordDifficulty:   "easy",
		chordCount:        20,
		textInput:         ti,
		tuneInput:         tuneInput,
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
		return m.startGame(modes[m.modeCursor])
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

	g, err := game.New(mode, inst, map[string]any{
		"sequential": m.fretSetSequential,
		"difficulty": m.chordDifficulty,
		"chordCount": m.chordCount,
	})
	if err != nil {
		m.feedback = fmt.Sprintf("Error: %v", err)
		return m, nil
	}

	m.activeGame = g
	m.state = statePlaying
	m.feedback = ""
	m.gameStartTime = time.Now()
	m.wrongGuesses = 0
	m.revealed = false
	m.textInput.Reset()
	m.textInput.Focus()
	return m, nil
}

func (m model) updateOptions(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
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
	case "enter", " ", "+", "=", "right", "l":
		switch optItem(m.optCursor) {
		case optItemInstrument:
			m.cycleInstrument(+1)
		case optItemStrings:
			max := maxStrings(m.instrType)
			if m.numStrings < max {
				m.numStrings++
				m.tuning = defaultTuning(m.instrType, m.numStrings)
			}
		case optItemTuning:
			m.state = stateOptionsTuning
			m.tuneCursor = 0
			m.tuneEditMode = false
		case optItemFrets:
			if m.frets < 24 {
				m.frets++
			}
		case optItemFretSetMode:
			m.fretSetSequential = !m.fretSetSequential
		case optItemChordDifficulty:
			m.chordDifficulty = nextChordDifficulty(m.chordDifficulty)
		case optItemChordCount:
			if m.chordCount < 99 {
				m.chordCount++
			}
		case optItemBack:
			m.state = stateModeSelect
		}
	case "-", "left", "h":
		switch optItem(m.optCursor) {
		case optItemInstrument:
			m.cycleInstrument(-1)
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
		case optItemFretSetMode:
			m.fretSetSequential = !m.fretSetSequential
		case optItemChordDifficulty:
			m.chordDifficulty = prevChordDifficulty(m.chordDifficulty)
		case optItemChordCount:
			if m.chordCount > 1 {
				m.chordCount--
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
	if fsGame, ok := m.activeGame.(*game.FretSetGameImpl); ok {
		return m.updateFretSetMode(msg, fsGame)
	}
	if cgGame, ok := m.activeGame.(*game.ChordsGame); ok {
		return m.updateChordsMode(msg, cgGame)
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
			m.feedback = "Find the note!\n"
			return m, nil
		}

		input := strings.TrimSpace(m.textInput.Value())
		if !instrument.IsValidNote(input) {
			m.textInput.Reset()
			return m, func() tea.Msg {
				return gameFeedbackMsg{
					text:    fmt.Sprintf("'%s' is not a valid note. Try: C, C#, Db, D, D#, Eb, E, F, F#, Gb, G, G#, Ab, A, A#, Bb, B\n", input),
					correct: false,
				}
			}
		}
		if m.activeGame.CheckAnswer(input) {
			noteName := snGame.CurrentNoteName()
			snGame.RevealNote(true)
			snGame.Next() //nolint
			m.wrongGuesses = 0
			m.textInput.Reset()
			if snGame.IsGameOver() {
				m.state = stateModeSelect
				elapsed := time.Since(m.gameStartTime)
				_, total := snGame.Progress()
				avg := elapsed.Seconds() / math.Max(1, float64(total))
				m.feedback = fmt.Sprintf("All notes green — well done! Time: %s | Avg: %.1fs per note",
					formatDuration(elapsed), avg)
				m.feedbackOK = true
				return m, nil
			}
			return m, func() tea.Msg {
				return gameFeedbackMsg{
					text:    fmt.Sprintf("Correct! '%s' — find the next note!\n", noteName),
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
					text:    fmt.Sprintf("The note was '%s' — press Enter to continue.\n", noteName),
					correct: false,
				}
			}
		}

		remaining := 3 - m.wrongGuesses
		return m, func() tea.Msg {
			return gameFeedbackMsg{
				text:    fmt.Sprintf("Wrong! %d attempt(s) remaining.\n", remaining),
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
			prevNote := fsGame.GetTargetNote()
			fretSetDone := fsGame.IsFretSetComplete()
			boardDone := fsGame.IsBoardComplete()
			if err := fsGame.Next(); err != nil {
				m.feedback = fmt.Sprintf("Error: %v", err)
			} else if boardDone {
				elapsed := time.Since(m.gameStartTime)
				sets := fsGame.FretSetsCompleted()
				avg := elapsed.Seconds() / math.Max(1, float64(sets))
				m.state = stateModeSelect
				m.feedback = fmt.Sprintf("Fretboard complete — well done! Time: %s | Avg: %.1fs per fret set",
					formatDuration(elapsed), avg)
				m.feedbackOK = true
			} else if fretSetDone {
				m.feedback = fmt.Sprintf("Fret set complete! Now find '%s'.", fsGame.GetTargetNote())
			} else {
				m.feedback = fmt.Sprintf("Found all '%s'! Now find '%s'.", prevNote, fsGame.GetTargetNote())
			}
		}
	}

	return m, nil
}

func (m model) updateChordsMode(msg tea.KeyMsg, cg *game.ChordsGame) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c":
		return m, tea.Quit
	case "esc":
		m.state = stateModeSelect
		m.feedback = ""
		return m, nil
	}

	// Medium difficulty: cursor-marking sub-phase.
	if cg.IsMarking() {
		switch msg.String() {
		case "up", "k":
			cg.MoveCursor(-1, 0)
		case "down", "j":
			cg.MoveCursor(1, 0)
		case "left", "h":
			cg.MoveCursor(0, -1)
		case "right", "l":
			cg.MoveCursor(0, 1)
		case " ", "enter":
			cs, cf := cg.GetCursor()
			cg.ToggleMark(cs, cf)
			if cg.IsMarkingComplete() {
				cg.Next() //nolint
				m.feedback = ""
			}
		}
		return m, nil
	}

	switch msg.String() {
	case "enter":
		if cg.Phase() == game.ChordPhaseComplete {
			cg.Next() //nolint
			if cg.IsGameOver() {
				elapsed := time.Since(m.gameStartTime)
				_, total := cg.Progress()
				avg := elapsed.Seconds() / math.Max(1, float64(total))
				m.state = stateModeSelect
				m.feedback = fmt.Sprintf("All %d chords found — well done! Time: %s | Avg: %.1fs per chord",
					total, formatDuration(elapsed), avg)
				m.feedbackOK = true
				return m, nil
			}
			m.feedback = ""
			m.textInput.Reset()
			return m, nil
		}

		input := strings.TrimSpace(m.textInput.Value())
		if input == "" {
			return m, nil
		}

		if cg.CheckAnswer(input) {
			prevPhase := cg.Phase()
			cg.Next() //nolint
			m.textInput.Reset()
			if cg.IsMarking() {
				// Entering marking sub-phase — clear feedback so view shows prompt.
				m.feedback = ""
				return m, nil
			}
			switch {
			case prevPhase == game.ChordPhaseNaming:
				m.feedback = fmt.Sprintf("Correct! Now identify the intervals of %s.", cg.ChordDisplayName())
				m.feedbackOK = true
			case cg.Phase() == game.ChordPhaseComplete:
				m.feedback = ""
			default:
				m.feedback = "Correct!"
				m.feedbackOK = true
			}
		} else {
			m.textInput.Reset()
			if cg.Phase() == game.ChordPhaseNaming {
				m.feedback = "Incorrect chord name. Try again!"
			} else {
				m.feedback = "Incorrect note. Try again!"
			}
			m.feedbackOK = false
		}
		return m, nil
	}

	var cmd tea.Cmd
	m.textInput, cmd = m.textInput.Update(msg)
	return m, cmd
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
		"2. Find notes in a set of 3 frets",
		"3. Identify chord notes (CAGED system)",
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
		if m.feedbackOK {
			sb.WriteString(styleResult.Render(m.feedback) + "\n\n")
		} else {
			sb.WriteString(styleHint.Render(m.feedback) + "\n\n")
		}
	}
	sb.WriteString(styleHint.Render("↑/↓: navigate  Enter: select  o: options  q: quit"))
	return sb.String()
}

func (m model) viewOptions() string {
	var sb strings.Builder
	sb.WriteString(styleTitle.Render("Options") + "\n\n")

	fretSetModeLabel := "random"
	if m.fretSetSequential {
		fretSetModeLabel = "sequential (fret 1 → 24)"
	}
	chordDiffLabel := chordDifficultyLabel(m.chordDifficulty)
	labels := []string{
		fmt.Sprintf("Instrument:      %s", m.instrType),
		fmt.Sprintf("Strings:         %d  (range: %d-%d)", m.numStrings, minStrings(m.instrType), maxStrings(m.instrType)),
		fmt.Sprintf("Tuning:          %s", strings.Join(m.tuning, "-")),
		fmt.Sprintf("Frets:           %d  (range: 12-24)", m.frets),
		fmt.Sprintf("Fret set mode:   %s", fretSetModeLabel),
		fmt.Sprintf("Chord mode:      %s", chordDiffLabel),
		fmt.Sprintf("Chord count:     %d  (range: 1-99)", m.chordCount),
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

	if cgGame, ok := m.activeGame.(*game.ChordsGame); ok {
		return m.viewChordsMode(cgGame, opts)
	}

	if fsGame, ok := m.activeGame.(*game.FretSetGameImpl); ok {
		start, end := fsGame.GetFretSetBounds()
		cs, cf := fsGame.GetCursor()
		opts.FretSetMode = true
		opts.FretSetStart = start
		opts.FretSetEnd = end
		opts.CursorString = cs
		opts.CursorFret = cf

		sb.WriteString(instrument.Render(fsGame.GetInstrument(), opts))
		sb.WriteString(fmt.Sprintf("\nNote to find: %s\n\n",
			styleTitle.Render(fsGame.GetTargetNote())))
		if m.feedback != "" {
			sb.WriteString(m.feedback + "\n\n")
		}
		if hintCorrect, hintWrong := fsGame.HintInfo(); hintWrong > 0 && hintCorrect+hintWrong >= 2 {
			var hint string
			if hintCorrect > 0 {
				hint = fmt.Sprintf("Hint: %d correct mark(s) but %d wrong — remove the wrong ones.", hintCorrect, hintWrong)
			} else {
				hint = "Hint: None of your marks are correct yet."
			}
			sb.WriteString(styleError.Render(hint) + "\n\n")
		}
		setCorrect, setTotal, boardCorrect, boardTotal := fsGame.Progress()
		sb.WriteString(renderProgressBar(setCorrect, setTotal, 30) + " Fret set\n")
		sb.WriteString(renderProgressBar(boardCorrect, boardTotal, 30) + " Fretboard\n")
		sb.WriteString(styleHint.Render("Time: "+formatDuration(time.Since(m.gameStartTime))) + "\n\n")
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
			sb.WriteString("Find the note!\n\n")
		}
		if snGame, ok := m.activeGame.(*game.SingleNoteGame); ok {
			correct, total := snGame.Progress()
			sb.WriteString(renderProgressBar(correct, total, 30) + "\n")
			sb.WriteString(styleHint.Render("Time: "+formatDuration(time.Since(m.gameStartTime))) + "\n\n")
		}
		sb.WriteString(styleHint.Render("Type note name and press Enter  Esc: back"))
	}

	return sb.String()
}

func (m model) viewChordsMode(cg *game.ChordsGame, opts instrument.RenderOpts) string {
	var sb strings.Builder

	opts.ChordMode = true
	if cg.Difficulty() == "medium" {
		opts.HideIntervals = true
	}
	if cg.IsMarking() {
		cs, cf := cg.GetCursor()
		opts.ShowCursor = true
		opts.CursorString = cs
		opts.CursorFret = cf
	}

	sb.WriteString(instrument.Render(cg.GetInstrument(), opts))
	sb.WriteString("\n")

	switch {
	case cg.IsMarking():
		sb.WriteString(fmt.Sprintf("Chord: %s\n", styleTitle.Render(cg.ChordDisplayName())))
		sb.WriteString(cg.CurrentMarkingPrompt() + "\n")
		if hintCorrect, hintWrong := cg.MarkingHintInfo(); hintCorrect+hintWrong >= 2 {
			var hint string
			if hintWrong == 0 {
				hint = fmt.Sprintf("Hint: %d correct mark(s) — keep going!", hintCorrect)
			} else if hintCorrect > 0 {
				hint = fmt.Sprintf("Hint: %d correct mark(s) but %d wrong — remove the wrong ones.", hintCorrect, hintWrong)
			} else {
				hint = "Hint: None of your marks are correct yet."
			}
			sb.WriteString(styleError.Render(hint) + "\n")
		}
	case cg.Phase() == game.ChordPhaseNaming:
		sb.WriteString("Which chord is this? ")
		sb.WriteString(m.textInput.View() + "\n")
	case cg.Phase() == game.ChordPhaseIntervals:
		sb.WriteString(fmt.Sprintf("Chord: %s\n", styleTitle.Render(cg.ChordDisplayName())))
		sb.WriteString(cg.CurrentIntervalPrompt() + " ")
		sb.WriteString(m.textInput.View() + "\n")
	case cg.Phase() == game.ChordPhaseComplete:
		sb.WriteString(fmt.Sprintf("Chord: %s\n", styleTitle.Render(cg.ChordDisplayName())))
		sb.WriteString(styleSuccess.Render("All intervals found! Press Enter for next chord.") + "\n")
	}

	if m.feedback != "" {
		if m.feedbackOK {
			sb.WriteString(styleSuccess.Render(m.feedback) + "\n")
		} else {
			sb.WriteString(styleError.Render(m.feedback) + "\n")
		}
	}

	sb.WriteString("\n")
	completed, total := cg.Progress()
	sb.WriteString(renderProgressBar(completed, total, 30) + "\n")
	sb.WriteString(styleHint.Render("Time: "+formatDuration(time.Since(m.gameStartTime))) + "\n\n")
	if cg.IsMarking() {
		sb.WriteString(styleHint.Render("hjkl/arrows: move  Space/Enter: mark  Esc: back"))
	} else {
		sb.WriteString(styleHint.Render("Type answer and press Enter  Esc: back"))
	}
	return sb.String()
}

func renderProgressBar(correct, total, width int) string {
	if total == 0 {
		return ""
	}
	filled := correct * width / total
	pct := correct * 100 / total
	green := lipgloss.NewStyle().Foreground(lipgloss.Color("2"))
	bar := green.Render(strings.Repeat("█", filled)) + strings.Repeat("░", width-filled)
	return fmt.Sprintf("Progress: [%s] %d%% (%d/%d)", bar, pct, correct, total)
}

func (m *model) cycleInstrument(dir int) {
	instruments := []string{"guitar", "bass", "ukulele"}
	for i, name := range instruments {
		if name == m.instrType {
			n := len(instruments)
			m.instrType = instruments[(i+dir%n+n)%n]
			break
		}
	}
	m.numStrings = defaultStringCount(m.instrType)
	m.tuning = defaultTuning(m.instrType, m.numStrings)
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

func formatDuration(d time.Duration) string {
	s := int(d.Seconds())
	if s < 60 {
		return fmt.Sprintf("%ds", s)
	}
	return fmt.Sprintf("%dm %02ds", s/60, s%60)
}

func nextChordDifficulty(cur string) string {
	switch cur {
	case "easy":
		return "medium"
	case "medium":
		return "hard"
	default:
		return "easy"
	}
}

func prevChordDifficulty(cur string) string {
	switch cur {
	case "hard":
		return "medium"
	case "medium":
		return "easy"
	default:
		return "hard"
	}
}

func chordDifficultyLabel(d string) string {
	switch d {
	case "medium":
		return "medium (hidden intervals)"
	case "hard":
		return "hard (coming soon)"
	default:
		return "easy (basic CAGED major/minor)"
	}
}

func main() {
	if slices.Contains(os.Args[1:], "--serve-ssh") {
		serveSSH()
		return
	}

	p := tea.NewProgram(initialModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		log.Fatal(err)
	}
}

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
			wishbt.Middleware(func(sess ssh.Session) (tea.Model, []tea.ProgramOption) {
				return initialModel(), []tea.ProgramOption{tea.WithAltScreen()}
			}),
		),
	)
	if err != nil {
		log.Fatal("failed to create SSH server:", err)
	}

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
	log.Printf("SSH server listening on %s — connect with: ssh -p 2222 <host>", addr)
	go func() {
		if err := s.ListenAndServe(); err != nil {
			log.Fatal(err)
		}
	}()
	<-done

	log.Println("Shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
}
