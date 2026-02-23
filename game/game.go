package game

import (
	"fmt"

	"github.com/funkymcb/fremorizer/instrument"
)

type Game interface {
	Next() error
	CheckAnswer(answer string) bool
}

// TODO: fix to not use guitar but instrument interface instead
func New(mode string, inst *instrument.Guitar) (Game, error) {
	switch mode {
	case "single":
		return NewSingleNoteGame(inst), nil
	// TODO: add more game modes
	// case "chords":
	// 	return NewChordsGame(inst), nil
	default:
		return nil, fmt.Errorf("unknown game mode: %s", mode)
	}
}

func Next(g Game) error {
	return g.Next()
}

func CheckAnswer(g Game, answer string) bool {
	return g.CheckAnswer(answer)
}
