package game

import (
	"math/rand"

	"github.com/funkymcb/fremorizer/instrument"
)

// SingleNoteGame implements game mode 1: guess a random note on the fretboard.
type SingleNoteGame struct {
	inst        *instrument.Instrument
	stringIndex int
	noteIndex   int
}

func NewSingleNoteGame(inst *instrument.Instrument) *SingleNoteGame {
	g := &SingleNoteGame{inst: inst}
	g.pickRandom()
	return g
}

func (g *SingleNoteGame) GetInstrument() *instrument.Instrument {
	return g.inst
}

func (g *SingleNoteGame) CheckAnswer(answer string) bool {
	note := g.inst.Strings[g.stringIndex].Notes[g.noteIndex]
	return instrument.NoteMatches(note.Name, answer)
}

func (g *SingleNoteGame) Next() error {
	// clear previous
	g.inst.Strings[g.stringIndex].Notes[g.noteIndex].ToBeDetermined = false
	g.inst.Strings[g.stringIndex].Notes[g.noteIndex].Revealed = false
	g.inst.Strings[g.stringIndex].Notes[g.noteIndex].Correct = false
	g.pickRandom()
	return nil
}

// RevealNote marks the current note as revealed with the given correctness.
func (g *SingleNoteGame) RevealNote(correct bool) {
	g.inst.Strings[g.stringIndex].Notes[g.noteIndex].ToBeDetermined = false
	g.inst.Strings[g.stringIndex].Notes[g.noteIndex].Revealed = true
	g.inst.Strings[g.stringIndex].Notes[g.noteIndex].Correct = correct
}

// CurrentNoteName returns the name of the current note to be guessed.
func (g *SingleNoteGame) CurrentNoteName() string {
	return g.inst.Strings[g.stringIndex].Notes[g.noteIndex].Name
}

func (g *SingleNoteGame) pickRandom() {
	g.stringIndex = rand.Intn(len(g.inst.Strings))
	// fret 1..Frets (skip open string at index 0)
	g.noteIndex = rand.Intn(g.inst.Frets) + 1
	g.inst.Strings[g.stringIndex].Notes[g.noteIndex].ToBeDetermined = true
}
