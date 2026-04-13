package game

import (
	"math/rand"

	"github.com/funkymcb/fremorizer/instrument"
)

// FretSetGameImpl implements game mode 2: find all occurrences of a note in a fret set.
type FretSetGameImpl struct {
	inst         *instrument.Instrument
	targetNote   string
	fretStart    int // 1-indexed
	fretEnd      int // inclusive
	cursorString int
	cursorFret   int // absolute fret index (1-indexed)
}

func NewFretSetGame(inst *instrument.Instrument) *FretSetGameImpl {
	g := &FretSetGameImpl{inst: inst}
	g.pickRandom()
	return g
}

func (g *FretSetGameImpl) GetInstrument() *instrument.Instrument {
	return g.inst
}

func (g *FretSetGameImpl) GetTargetNote() string {
	return g.targetNote
}

func (g *FretSetGameImpl) GetFretSetBounds() (int, int) {
	return g.fretStart, g.fretEnd
}

func (g *FretSetGameImpl) GetCursor() (int, int) {
	return g.cursorString, g.cursorFret
}

func (g *FretSetGameImpl) MoveCursor(ds, df int) {
	newS := g.cursorString + ds
	newF := g.cursorFret + df

	numStrings := len(g.inst.Strings)
	if newS < 0 {
		newS = 0
	} else if newS >= numStrings {
		newS = numStrings - 1
	}

	if newF < g.fretStart {
		newF = g.fretStart
	} else if newF > g.fretEnd {
		newF = g.fretEnd
	}

	g.cursorString = newS
	g.cursorFret = newF
}

func (g *FretSetGameImpl) ToggleMark(stringIdx, fretIdx int) {
	if fretIdx < g.fretStart || fretIdx > g.fretEnd {
		return
	}
	if stringIdx < 0 || stringIdx >= len(g.inst.Strings) {
		return
	}
	note := &g.inst.Strings[stringIdx].Notes[fretIdx]
	note.Marked = !note.Marked
}

// IsComplete returns true when all correct positions are marked and no incorrect ones.
func (g *FretSetGameImpl) IsComplete() bool {
	for _, s := range g.inst.Strings {
		for fret := g.fretStart; fret <= g.fretEnd; fret++ {
			note := s.Notes[fret]
			isTarget := instrument.NoteMatches(note.Name, g.targetNote)
			if isTarget != note.Marked {
				return false
			}
		}
	}
	return true
}

// CheckAnswer is not used for fret set mode (navigation-based), always returns false.
func (g *FretSetGameImpl) CheckAnswer(_ string) bool {
	return false
}

func (g *FretSetGameImpl) Next() error {
	// clear marks from current fret set
	for si := range g.inst.Strings {
		for fret := g.fretStart; fret <= g.fretEnd; fret++ {
			g.inst.Strings[si].Notes[fret].Marked = false
		}
	}
	g.pickRandom()
	return nil
}

func (g *FretSetGameImpl) pickRandom() {
	// pick a random fret set start (ensure 3 frets fit)
	maxStart := g.inst.Frets - 2
	if maxStart < 1 {
		maxStart = 1
	}
	g.fretStart = rand.Intn(maxStart) + 1
	g.fretEnd = g.fretStart + 2

	// pick a random target note from the chromatic scale
	notes := instrument.NoteNames()
	g.targetNote = notes[rand.Intn(len(notes))]

	// reset cursor to top-left of fret set
	g.cursorString = 0
	g.cursorFret = g.fretStart
}
