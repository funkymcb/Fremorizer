package game

import (
	"fmt"

	"github.com/funkymcb/fremorizer/instrument"
)

// Game is the base game interface.
type Game interface {
	// CheckAnswer validates the user's input. Returns true if correct.
	CheckAnswer(answer string) bool
	// Next moves to the next question. Returns true if the game should continue.
	Next() error
	// GetInstrument returns the underlying instrument for rendering.
	GetInstrument() *instrument.Instrument
}

// FretSetGame extends Game with mode-2 specific operations.
type FretSetGame interface {
	Game
	GetTargetNote() string
	GetFretSetBounds() (start, end int)
	ToggleMark(stringIdx, fretIdx int)
	IsComplete() bool
	GetCursor() (stringIdx, fretIdx int)
	MoveCursor(ds, df int)
}

// New creates a Game for the given mode and instrument.
// opts is an optional map of mode-specific settings (e.g. "sequential": true).
func New(mode string, inst *instrument.Instrument, opts map[string]any) (Game, error) {
	switch mode {
	case "single":
		return NewSingleNoteGame(inst), nil
	case "fretset":
		sequential, _ := opts["sequential"].(bool)
		return NewFretSetGame(inst, sequential), nil
	case "chords":
		difficulty, _ := opts["difficulty"].(string)
		if difficulty != "easy" {
			return nil, fmt.Errorf("%s difficulty is coming soon — only 'easy' is available", difficulty)
		}
		if inst.Type != "guitar" {
			return nil, fmt.Errorf("chord mode requires a guitar (CAGED system)")
		}
		if len(inst.Strings) < 6 {
			return nil, fmt.Errorf("chord mode requires at least 6 strings")
		}
		chordCount, _ := opts["chordCount"].(int)
		return NewChordsGame(inst, chordCount), nil
	default:
		return nil, fmt.Errorf("unknown game mode: %s", mode)
	}
}
