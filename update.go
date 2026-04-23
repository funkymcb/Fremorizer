package main

import (
	"fmt"
	"math"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/funkymcb/fremorizer/game"
	"github.com/funkymcb/fremorizer/instrument"
)

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
	modes := []string{"single", "fretset", "chords", "freelearning", "notelist"}

	switch msg.String() {
	case "ctrl+c", "q":
		return m, tea.Quit
	case "up", "k":
		m.modeCursor = (m.modeCursor - 1 + len(modes)) % len(modes)
	case "down", "j":
		m.modeCursor = (m.modeCursor + 1) % len(modes)
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
		"sequential":  m.fretSetSequential,
		"difficulty":  m.chordDifficulty,
		"chordCount":  m.chordCount,
		"accidentals": m.noteListAccidentals,
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
	return m, tea.ClearScreen
}

func (m model) updateOptions(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c":
		return m, tea.Quit
	case "esc", "b", "q":
		m.state = stateModeSelect
		return m, tea.ClearScreen
	case "up", "k":
		m.optCursor = (m.optCursor - 1 + int(optItemCount)) % int(optItemCount)
	case "down", "j":
		m.optCursor = (m.optCursor + 1) % int(optItemCount)
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
		case optItemNoteListAccidentals:
			m.noteListAccidentals = nextAccidentals(m.noteListAccidentals)
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
		case optItemNoteListAccidentals:
			m.noteListAccidentals = prevAccidentals(m.noteListAccidentals)
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
				names := instrument.NoteNames()
				for _, n := range names {
					if strings.EqualFold(n, val) || strings.EqualFold(strings.Split(n, "/")[0], val) {
						parts := strings.Split(n, "/")
						tuningIdx := len(m.tuning) - 1 - m.tuneCursor
						m.tuning[tuningIdx] = parts[0]
						break
					}
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
	if flGame, ok := m.activeGame.(*game.FreeLearningGame); ok {
		return m.updateFreeLearningMode(msg, flGame)
	}
	if nlGame, ok := m.activeGame.(*game.NoteListGame); ok {
		return m.updateNoteListMode(msg, nlGame)
	}
	return m.updateSingleNoteMode(msg)
}

func (m model) updateNoteListMode(msg tea.KeyMsg, nlGame *game.NoteListGame) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c", "q":
		return m, tea.Quit
	case "esc", "b":
		m.state = stateModeSelect
		return m, tea.ClearScreen
	case "n":
		nlGame.Shuffle()
	}
	return m, nil
}

func (m model) updateSingleNoteMode(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	snGame, _ := m.activeGame.(*game.SingleNoteGame)

	switch msg.String() {
	case "ctrl+c":
		return m, tea.Quit
	case "esc":
		m.state = stateModeSelect
		m.feedback = ""
		return m, tea.ClearScreen
	case "enter":
		if m.revealed {
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
			_ = snGame.Next()
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
		return m, tea.ClearScreen
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
		return m, tea.ClearScreen
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
				_ = cg.Next()
				m.feedback = ""
			}
		}
		return m, nil
	}

	switch msg.String() {
	case "enter":
		if cg.Phase() == game.ChordPhaseComplete {
			_ = cg.Next()
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
			_ = cg.Next()
			m.textInput.Reset()
			if cg.IsMarking() {
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

func (m model) updateFreeLearningMode(msg tea.KeyMsg, flGame *game.FreeLearningGame) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c":
		return m, tea.Quit
	case "esc":
		m.state = stateModeSelect
		m.feedback = ""
		return m, tea.ClearScreen
	case "up", "k":
		flGame.MoveCursor(-1, 0)
	case "down", "j":
		flGame.MoveCursor(1, 0)
	case "left", "h":
		flGame.MoveCursor(0, -1)
	case "right", "l":
		flGame.MoveCursor(0, 1)
	case " ":
		flGame.RevealNote()
	case "s":
		flGame.RevealString()
	case "f":
		flGame.RevealFret()
	case "m":
		flGame.RevealScale(true)
	case "M":
		flGame.RevealScale(false)
	case "r":
		flGame.ClearAll()
	}
	return m, nil
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
