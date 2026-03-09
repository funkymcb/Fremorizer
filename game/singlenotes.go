package game

import (
	"math/rand"
	"strings"

	"github.com/funkymcb/fremorizer/instrument"
)

// TODO: fix to not use guitar but instrument interface instead
type SingleNoteGame struct {
	Instrument *instrument.Guitar
}

func NewSingleNoteGame(g *instrument.Guitar) Game {
	stringIndex, noteIndex := randomNote(g)
	g.Strings[stringIndex].Notes[noteIndex].ToBeDetermined = true

	return &SingleNoteGame{
		Instrument: g,
	}
}

func (g *SingleNoteGame) CheckAnswer(answer string) bool {
	if answer == "" {
		return false
	}

	for _, s := range g.Instrument.Strings {
		for _, n := range s.Notes {
			if n.ToBeDetermined {
				note := strings.ToLower(n.Name)
				answer = strings.ToLower(answer)
				return strings.Contains(note, answer) // FIX: either note is correct. split longer notes into slices and check if any matches
			}
		}
	}
	return false
}

// TODO: check this impl
func (g *SingleNoteGame) Next() error {
	// Reset the current note to be determined
	for _, s := range g.Instrument.Strings {
		for i := range s.Notes {
			s.Notes[i].ToBeDetermined = false
		}
	}

	stringIndex, noteIndex := randomNote(g.Instrument)
	g.Instrument.Strings[stringIndex].Notes[noteIndex].ToBeDetermined = true

	return nil
}

func randomNote(g *instrument.Guitar) (int, int) {
	stringIndex := rand.Intn(len(g.Strings))
	noteIndex := rand.Intn(len(g.Strings[stringIndex].Notes))

	return stringIndex, noteIndex
}
