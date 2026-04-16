package game

import (
	"math/rand"

	"github.com/funkymcb/fremorizer/instrument"
)

// NoteListGame implements mode 5: a shuffled list of all 12 notes for
// reference while practising on a real instrument. No fretboard, no scoring.
type NoteListGame struct {
	notes []string
}

func NewNoteListGame() *NoteListGame {
	g := &NoteListGame{}
	g.Shuffle()
	return g
}

// Shuffle randomises the order of the 12 notes.
func (g *NoteListGame) Shuffle() {
	src := instrument.NoteNames()
	rand.Shuffle(len(src), func(i, j int) { src[i], src[j] = src[j], src[i] })
	g.notes = src
}

// Notes returns the current shuffled note list.
func (g *NoteListGame) Notes() []string { return g.notes }

// Game interface stubs — not meaningful for this mode.
func (g *NoteListGame) CheckAnswer(_ string) bool          { return false }
func (g *NoteListGame) Next() error                        { return nil }
func (g *NoteListGame) GetInstrument() *instrument.Instrument { return nil }
