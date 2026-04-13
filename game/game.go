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
func New(mode string, inst *instrument.Instrument) (Game, error) {
	switch mode {
	case "single":
		return NewSingleNoteGame(inst), nil
	case "fretset":
		return NewFretSetGame(inst), nil
	default:
		return nil, fmt.Errorf("unknown game mode: %s", mode)
	}
}
