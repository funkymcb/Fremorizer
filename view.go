package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/funkymcb/fremorizer/game"
	"github.com/funkymcb/fremorizer/instrument"
)

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
	sb.WriteString(m.styles.title.Render("Fremorizer") + "\n\n")
	sb.WriteString("Choose a game mode:\n\n")

	modes := []string{
		"1. Guess a random note (per string)",
		"2. Find notes in a set of 3 frets",
		"3. Identify chord notes (CAGED system)",
		"4. Free learning (explore the fretboard)",
		"5. Simple random note list",
	}
	for i, mode := range modes {
		if i == m.modeCursor {
			sb.WriteString(m.styles.selected.Render("> "+mode) + "\n")
		} else {
			sb.WriteString("  " + mode + "\n")
		}
	}

	sb.WriteString("\n")
	if m.feedback != "" {
		if m.feedbackOK {
			sb.WriteString(m.styles.result.Render(m.feedback) + "\n\n")
		} else {
			sb.WriteString(m.styles.hint.Render(m.feedback) + "\n\n")
		}
	}
	sb.WriteString(m.styles.hint.Render("↑/↓: navigate  Enter: select  o: options  q: quit"))
	return sb.String()
}

func (m model) viewOptions() string {
	var sb strings.Builder
	sb.WriteString(m.styles.title.Render("Options") + "\n\n")

	fretSetModeLabel := "random"
	if m.fretSetSequential {
		fretSetModeLabel = "sequential (fret 1 → 24)"
	}
	labels := []string{
		fmt.Sprintf("Instrument:      %s", m.instrType),
		fmt.Sprintf("Strings:         %d  (range: %d-%d)", m.numStrings, minStrings(m.instrType), maxStrings(m.instrType)),
		fmt.Sprintf("Tuning:          %s", strings.Join(m.tuning, "-")),
		fmt.Sprintf("Frets:           %d  (range: 12-24)", m.frets),
		fmt.Sprintf("Fret set mode:   %s", fretSetModeLabel),
		fmt.Sprintf("Chord mode:      %s", chordDifficultyLabel(m.chordDifficulty)),
		fmt.Sprintf("Chord count:     %d  (range: 1-99)", m.chordCount),
		fmt.Sprintf("Note list:       %s", noteListAccidentalsLabel(m.noteListAccidentals)),
		"Back",
	}

	for i, label := range labels {
		if i == m.optCursor {
			sb.WriteString(m.styles.selected.Render("> "+label) + "\n")
		} else {
			sb.WriteString("  " + label + "\n")
		}
	}

	sb.WriteString("\n")
	sb.WriteString(m.styles.hint.Render("↑/↓: navigate  Enter: select/cycle  +/-: adjust values  Esc/b: back"))
	return sb.String()
}

func (m model) viewTuning() string {
	var sb strings.Builder
	sb.WriteString(m.styles.title.Render("Edit Tuning") + "\n\n")

	// display strings in reverse (high to low as shown on fretboard)
	for i := len(m.tuning) - 1; i >= 0; i-- {
		displayIdx := len(m.tuning) - 1 - i
		label := fmt.Sprintf("String %d: %s", i+1, m.tuning[i])
		if displayIdx == m.tuneCursor {
			if m.tuneEditMode {
				sb.WriteString(m.styles.selected.Render("> String "+fmt.Sprint(i+1)+": ") + m.tuneInput.View() + "\n")
			} else {
				sb.WriteString(m.styles.selected.Render("> "+label) + "\n")
			}
		} else {
			sb.WriteString("  " + label + "\n")
		}
	}

	sb.WriteString("\n")
	if m.tuneEditMode {
		sb.WriteString(m.styles.hint.Render("Enter note name and press Enter. Valid: C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B"))
	} else {
		sb.WriteString(m.styles.hint.Render("↑/↓: navigate  Enter: edit  Esc/b: back"))
	}
	return sb.String()
}

func (m model) viewPlaying() string {
	var sb strings.Builder

	opts := instrument.RenderOpts{Blink: m.blink, Renderer: m.styles.renderer}

	if cgGame, ok := m.activeGame.(*game.ChordsGame); ok {
		return m.viewChordsMode(cgGame, opts)
	}

	if flGame, ok := m.activeGame.(*game.FreeLearningGame); ok {
		return m.viewFreeLearningMode(flGame, opts)
	}

	if nlGame, ok := m.activeGame.(*game.NoteListGame); ok {
		return m.viewNoteListMode(nlGame)
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
			m.styles.title.Render(fsGame.GetTargetNote())))
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
			sb.WriteString(m.styles.errStyle.Render(hint) + "\n\n")
		}
		setCorrect, setTotal, boardCorrect, boardTotal := fsGame.Progress()
		sb.WriteString(m.renderProgressBar(setCorrect, setTotal, 30) + " Fret set\n")
		sb.WriteString(m.renderProgressBar(boardCorrect, boardTotal, 30) + " Fretboard\n")
		sb.WriteString(m.styles.hint.Render("Time: "+formatDuration(time.Since(m.gameStartTime))) + "\n\n")
		sb.WriteString(m.styles.hint.Render("hjkl/arrows: move  Space/Enter: mark  Esc: back"))
	} else {
		sb.WriteString(instrument.Render(m.activeGame.GetInstrument(), opts))
		sb.WriteString("\n")
		sb.WriteString(m.textInput.View() + "\n")
		if m.feedback != "" {
			if m.feedbackOK {
				sb.WriteString(m.styles.success.Render(m.feedback) + "\n")
			} else {
				sb.WriteString(m.styles.errStyle.Render(m.feedback) + "\n")
			}
		} else {
			sb.WriteString("Find the note!\n\n")
		}
		if snGame, ok := m.activeGame.(*game.SingleNoteGame); ok {
			correct, total := snGame.Progress()
			sb.WriteString(m.renderProgressBar(correct, total, 30) + "\n")
			sb.WriteString(m.styles.hint.Render("Time: "+formatDuration(time.Since(m.gameStartTime))) + "\n\n")
		}
		sb.WriteString(m.styles.hint.Render("Type note name and press Enter  Esc: back"))
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
		sb.WriteString(fmt.Sprintf("Chord: %s\n", m.styles.title.Render(cg.ChordDisplayName())))
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
			sb.WriteString(m.styles.errStyle.Render(hint) + "\n")
		}
	case cg.Phase() == game.ChordPhaseNaming:
		sb.WriteString("Which chord is this? ")
		sb.WriteString(m.textInput.View() + "\n")
	case cg.Phase() == game.ChordPhaseIntervals:
		sb.WriteString(fmt.Sprintf("Chord: %s\n", m.styles.title.Render(cg.ChordDisplayName())))
		sb.WriteString(cg.CurrentIntervalPrompt() + " ")
		sb.WriteString(m.textInput.View() + "\n")
	case cg.Phase() == game.ChordPhaseComplete:
		sb.WriteString(fmt.Sprintf("Chord: %s\n", m.styles.title.Render(cg.ChordDisplayName())))
		sb.WriteString(m.styles.success.Render("All intervals found! Press Enter for next chord.") + "\n")
	}

	if m.feedback != "" {
		if m.feedbackOK {
			sb.WriteString(m.styles.success.Render(m.feedback) + "\n")
		} else {
			sb.WriteString(m.styles.errStyle.Render(m.feedback) + "\n")
		}
	}

	sb.WriteString("\n")
	completed, total := cg.Progress()
	sb.WriteString(m.renderProgressBar(completed, total, 30) + "\n")
	sb.WriteString(m.styles.hint.Render("Time: "+formatDuration(time.Since(m.gameStartTime))) + "\n\n")
	if cg.IsMarking() {
		sb.WriteString(m.styles.hint.Render("hjkl/arrows: move  Space/Enter: mark  Esc: back"))
	} else {
		sb.WriteString(m.styles.hint.Render("Type answer and press Enter  Esc: back"))
	}
	return sb.String()
}

func (m model) viewFreeLearningMode(flGame *game.FreeLearningGame, opts instrument.RenderOpts) string {
	var sb strings.Builder

	cs, cf := flGame.GetCursor()
	opts.ShowCursor = true
	opts.CursorString = cs
	opts.CursorFret = cf

	sb.WriteString(instrument.Render(flGame.GetInstrument(), opts))
	sb.WriteString("\n")

	if msg := flGame.GetMessage(); msg != "" {
		sb.WriteString(m.styles.success.Render(msg) + "\n")
	} else {
		sb.WriteString("\n")
	}

	sb.WriteString(m.styles.hint.Render("hjkl/arrows: move  Space: reveal note") + "\n")
	sb.WriteString(m.styles.hint.Render("s: string  f: fret  m: minor scale  M: major scale  r: clear  Esc: back"))
	return sb.String()
}

func (m model) viewNoteListMode(nlGame *game.NoteListGame) string {
	var sb strings.Builder
	sb.WriteString(m.styles.title.Render("Note List") + "\n\n")

	notes := nlGame.Notes()
	maxLen := 0
	for _, n := range notes {
		if len(n) > maxLen {
			maxLen = len(n)
		}
	}

	for _, note := range notes {
		leftPad := strings.Repeat(" ", (maxLen-len(note))/2)
		sb.WriteString(fmt.Sprintf("\t\t%s%s\n", leftPad, note))
	}
	sb.WriteString("\n")
	sb.WriteString(m.styles.hint.Render("n: shuffle  Esc/b: back  q: quit"))
	return sb.String()
}

func (m model) renderProgressBar(correct, total, width int) string {
	if total == 0 {
		return ""
	}
	filled := correct * width / total
	pct := correct * 100 / total
	bar := m.styles.success.Render(strings.Repeat("█", filled)) + strings.Repeat("░", width-filled)
	return fmt.Sprintf("Progress: [%s] %d%% (%d/%d)", bar, pct, correct, total)
}
